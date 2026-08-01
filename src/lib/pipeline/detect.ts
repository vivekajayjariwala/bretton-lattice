import type Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/supabase";
import type {
  ConnectionType,
  DetectedBy,
  EntityRow,
  EntityType,
} from "@/lib/database.types";
import {
  callStructured,
  emptyUsage,
  mapWithConcurrency,
  type TokenUsage,
} from "@/lib/pipeline/claude";
import { daysApart, trigramSimilarity } from "@/lib/pipeline/normalize";

/**
 * Stage 2 — connection detection.
 *
 * Two passes, deliberately separated:
 *
 *   1. Deterministic. Entities of the same type whose canonical form is
 *      identical are the same thing. No model involved, confidence 1.0, and the
 *      result is reproducible byte-for-byte. Most real links land here.
 *
 *   2. Claude adjudication. Only pairs that survive cheap blocking (similar but
 *      not identical) are sent to the model, in batches, to decide whether they
 *      plausibly refer to the same real-world thing. This is what catches
 *      typosquat business names and reformatted addresses that fold differently.
 */

/** Types where a shared value is meaningful evidence of a link. */
const LINKABLE: EntityType[] = [
  "address",
  "phone",
  "registered_agent",
  "person",
  "business",
  "ip",
];

/** Below this trigram score a pair isn't worth a model call. */
const BLOCKING_THRESHOLD: Record<string, number> = {
  address: 0.55,
  registered_agent: 0.6,
  business: 0.62,
  person: 0.7,
  phone: 0.8,
  ip: 0.8,
};

/** Claude's verdict must clear this to be persisted as a connection. */
const ACCEPT_THRESHOLD = 0.6;

/** Incorporation dates only matter as a cluster signal, within this window. */
const INCORPORATION_WINDOW_DAYS = 3;

export type PendingConnection = {
  entity_a_id: string;
  entity_b_id: string;
  case_a_id: string;
  case_b_id: string;
  connection_type: ConnectionType;
  match_basis: EntityType;
  confidence: number;
  explanation: string;
  detected_by: DetectedBy;
};

type EntityLite = Pick<
  EntityRow,
  "id" | "case_id" | "entity_type" | "value" | "normalized_value"
>;

const ADJUDICATE_TOOL: Anthropic.Tool = {
  name: "record_verdicts",
  description: "Record a verdict for each candidate pair.",
  input_schema: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pair_id: { type: "number" },
            same_real_world_thing: {
              type: "boolean",
              description:
                "True only if the two values almost certainly denote the same " +
                "real-world address, person, company or number.",
            },
            confidence: {
              type: "number",
              description: "0-1 confidence in the verdict.",
            },
            explanation: {
              type: "string",
              description:
                "One or two sentences a compliance analyst can read, naming the " +
                "specific difference between the two strings and why it does or " +
                "does not matter. Be concrete; quote the differing part.",
            },
          },
          required: [
            "pair_id",
            "same_real_world_thing",
            "confidence",
            "explanation",
          ],
        },
      },
    },
    required: ["verdicts"],
  },
};

const ADJUDICATE_SYSTEM = `You are an entity-resolution component in a financial-crime compliance pipeline.

You are given pairs of values pulled from two different, separately-cleared case files.
Each pair has already been screened as textually similar. Your job is to decide, for each
pair, whether the two values denote the SAME real-world thing.

Judge strictly. A false link sends an analyst chasing a network that does not exist.

Guidance:
- Formatting differences are not real differences: "Suite 84" vs "Ste. 84",
  "West Charleston Boulevard" vs "W Charleston Blvd", "(702) 555-0148" vs "702.555.0148".
  These are the SAME thing, high confidence.
- Two different unit numbers at the same street address are DIFFERENT locations, but note
  that sharing a building is still worth surfacing — say so in the explanation and return
  same_real_world_thing false with a low confidence.
- Generic shared words are not a link. "Northline Physical Therapy" and "Copperline
  Logistics" share a suffix pattern and nothing else. Different companies.
- Two company names differing by one or two characters in the ROOT word
  ("Harborline" vs "Harbourline") are NOT the same registered entity — they are distinct
  filings. But that near-identity is itself the finding: return same_real_world_thing
  true with confidence around 0.7 and explain that these are separate legal entities with
  near-identical names, which is the pattern of interest.
- A person's name differing only by a middle initial or accent is the same person.
  Two entirely different names are different people, however similar the surname.`;

/** Pass 1: identical canonical form. No model, no ambiguity. */
export function detectDeterministic(entities: EntityLite[]): PendingConnection[] {
  const buckets = new Map<string, EntityLite[]>();
  for (const e of entities) {
    if (!LINKABLE.includes(e.entity_type)) continue;
    if (!e.normalized_value) continue;
    const key = `${e.entity_type}::${e.normalized_value}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(e);
    else buckets.set(key, [e]);
  }

  const out: PendingConnection[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];
        if (a.case_id === b.case_id) continue;

        const identical = a.value === b.value;
        out.push({
          entity_a_id: a.id,
          entity_b_id: b.id,
          case_a_id: a.case_id,
          case_b_id: b.case_id,
          connection_type: identical ? "exact_match" : "normalized_match",
          match_basis: a.entity_type,
          confidence: 1,
          explanation: identical
            ? `Both cases record the identical ${label(a.entity_type)} "${a.value}".`
            : `Both cases record the same ${label(a.entity_type)}, written differently: ` +
              `"${a.value}" and "${b.value}". These reduce to the same canonical value ` +
              `("${a.normalized_value}") under standard address/number folding.`,
          detected_by: "deterministic",
        });
      }
    }
  }
  return out;
}

/**
 * Incorporation dates are a weak signal alone, so they are only recorded when two
 * cases were formed within a few days of each other — the timing-cluster pattern.
 */
export function detectIncorporationClusters(
  entities: EntityLite[],
): PendingConnection[] {
  const dates = entities.filter((e) => e.entity_type === "incorporation_date");
  const out: PendingConnection[] = [];

  for (let i = 0; i < dates.length; i++) {
    for (let j = i + 1; j < dates.length; j++) {
      const a = dates[i];
      const b = dates[j];
      if (a.case_id === b.case_id) continue;
      const gap = daysApart(a.normalized_value, b.normalized_value);
      if (gap > INCORPORATION_WINDOW_DAYS) continue;

      out.push({
        entity_a_id: a.id,
        entity_b_id: b.id,
        case_a_id: a.case_id,
        case_b_id: b.case_id,
        connection_type: "normalized_match",
        match_basis: "incorporation_date",
        // Same-day is a stronger signal than three days apart.
        confidence: gap === 0 ? 0.75 : 0.65,
        explanation:
          gap === 0
            ? `Both entities were incorporated on the same day (${a.normalized_value}).`
            : `The two entities were incorporated ${gap} day${gap === 1 ? "" : "s"} apart ` +
              `(${a.normalized_value} and ${b.normalized_value}).`,
        detected_by: "deterministic",
      });
    }
  }
  return out;
}

type Candidate = {
  pair_id: number;
  a: EntityLite;
  b: EntityLite;
  similarity: number;
};

/** Cheap blocking: similar enough to be worth a model call, not already matched. */
export function buildCandidates(
  entities: EntityLite[],
  alreadyMatched: Set<string>,
): Candidate[] {
  const byType = new Map<EntityType, EntityLite[]>();
  for (const e of entities) {
    if (!LINKABLE.includes(e.entity_type)) continue;
    const list = byType.get(e.entity_type);
    if (list) list.push(e);
    else byType.set(e.entity_type, [e]);
  }

  const candidates: Candidate[] = [];
  let pairId = 0;

  for (const [type, list] of byType) {
    const threshold = BLOCKING_THRESHOLD[type] ?? 0.7;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.case_id === b.case_id) continue;
        if (a.normalized_value === b.normalized_value) continue; // pass 1 owns these
        if (alreadyMatched.has(pairKey(a.id, b.id))) continue;

        const similarity = trigramSimilarity(a.normalized_value, b.normalized_value);
        if (similarity < threshold) continue;
        candidates.push({ pair_id: pairId++, a, b, similarity });
      }
    }
  }
  return candidates;
}

type Verdict = {
  pair_id: number;
  same_real_world_thing: boolean;
  confidence: number;
  explanation: string;
};

const BATCH_SIZE = 15;

export async function adjudicateCandidates(
  candidates: Candidate[],
  usage: TokenUsage,
  onProgress?: (done: number, total: number) => void,
): Promise<PendingConnection[]> {
  if (candidates.length === 0) return [];

  const batches: Candidate[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  let done = 0;
  const results = await mapWithConcurrency(batches, 3, async (batch) => {
    const listing = batch
      .map(
        (c) =>
          `pair_id ${c.pair_id} — type: ${c.a.entity_type}\n` +
          `  A: "${c.a.value}"\n` +
          `  B: "${c.b.value}"`,
      )
      .join("\n\n");

    const { verdicts } = await callStructured<{ verdicts: Verdict[] }>({
      system: ADJUDICATE_SYSTEM,
      prompt: `Decide each pair. Return one verdict per pair_id.\n\n${listing}`,
      tool: ADJUDICATE_TOOL,
      usage,
    });

    onProgress?.(++done, batches.length);

    const byId = new Map(batch.map((c) => [c.pair_id, c]));
    return verdicts.flatMap<PendingConnection>((v) => {
      const candidate = byId.get(v.pair_id);
      if (!candidate) return [];
      if (!v.same_real_world_thing) return [];
      if (v.confidence < ACCEPT_THRESHOLD) return [];

      return [
        {
          entity_a_id: candidate.a.id,
          entity_b_id: candidate.b.id,
          case_a_id: candidate.a.case_id,
          case_b_id: candidate.b.case_id,
          // A high-similarity string pair is a fuzzy match; a low-similarity one
          // that Claude still accepts is a semantic judgement.
          connection_type: candidate.similarity >= 0.8 ? "fuzzy_match" : "semantic_match",
          match_basis: candidate.a.entity_type,
          confidence: Math.min(1, Math.max(0, v.confidence)),
          explanation: v.explanation,
          detected_by: "claude",
        },
      ];
    });
  });

  return results.flat();
}

export type DetectResult = {
  deterministic: number;
  adjudicated: number;
  candidatesConsidered: number;
  usage: TokenUsage;
};

export async function runDetection(
  db: Db,
  analysisRunId: string | null,
  onProgress?: (stage: string, done: number, total: number) => void,
): Promise<DetectResult> {
  const { data: entities, error } = await db
    .from("entities")
    .select("id, case_id, entity_type, value, normalized_value");
  if (error) throw error;
  if (!entities?.length) {
    throw new Error("No entities found. Run extraction before detection.");
  }

  await db.from("connections").delete().neq("id", ZERO_UUID);

  const deterministic = [
    ...detectDeterministic(entities),
    ...detectIncorporationClusters(entities),
  ];

  const matched = new Set(
    deterministic.map((c) => pairKey(c.entity_a_id, c.entity_b_id)),
  );

  const candidates = buildCandidates(entities, matched);
  const usage = emptyUsage();
  const adjudicated = await adjudicateCandidates(candidates, usage, (d, t) =>
    onProgress?.("adjudicating", d, t),
  );

  const all = dedupe([...deterministic, ...adjudicated]).map((c) => ({
    ...c,
    analysis_run_id: analysisRunId,
  }));

  if (all.length) {
    const { error: insertError } = await db.from("connections").insert(all);
    if (insertError) throw insertError;
  }

  return {
    deterministic: deterministic.length,
    adjudicated: adjudicated.length,
    candidatesConsidered: candidates.length,
    usage,
  };
}

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** The unique index is on the ordered entity pair; keep the strongest of each. */
function dedupe(connections: PendingConnection[]): PendingConnection[] {
  const best = new Map<string, PendingConnection>();
  for (const c of connections) {
    const key = pairKey(c.entity_a_id, c.entity_b_id);
    const existing = best.get(key);
    if (!existing || c.confidence > existing.confidence) best.set(key, c);
  }
  return [...best.values()];
}

function label(type: EntityType): string {
  return type.replace(/_/g, " ");
}
