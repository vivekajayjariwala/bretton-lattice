import type Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/supabase";
import type { RiskLevel } from "@/lib/database.types";
import {
  callStructured,
  emptyUsage,
  mapWithConcurrency,
  type TokenUsage,
} from "@/lib/pipeline/claude";

/**
 * Stage 3 — clustering and brief generation.
 *
 * Cases that link to each other, directly or transitively, form one network.
 * That is a connected-components problem, so it is solved with union-find in
 * code. Claude is then asked to write the brief for each component — what the
 * network appears to be, what specifically ties it together, and how urgent it is.
 */

export class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    const p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root); // path compression
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/** Groups case ids into connected components of size >= 2. */
export function connectedComponents(
  edges: Array<{ case_a_id: string; case_b_id: string }>,
): string[][] {
  const uf = new UnionFind();
  for (const e of edges) uf.union(e.case_a_id, e.case_b_id);

  const groups = new Map<string, string[]>();
  for (const e of edges) {
    for (const id of [e.case_a_id, e.case_b_id]) {
      const root = uf.find(id);
      const group = groups.get(root);
      if (!group) groups.set(root, [id]);
      else if (!group.includes(id)) group.push(id);
    }
  }
  return [...groups.values()].filter((g) => g.length >= 2);
}

const BRIEF_TOOL: Anthropic.Tool = {
  name: "write_network_brief",
  description:
    "Write the compliance brief for one detected cross-case network.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "A short, specific, neutral name for this network, naming the strongest " +
          "shared attribute. E.g. 'Shared Nevada registered agent — 5 entities' or " +
          "'Near-identical freight forwarder filings'. Not a verdict of guilt.",
      },
      risk_level: {
        type: "string",
        enum: ["informational", "review", "high_priority"],
        description:
          "informational = a benign explanation is likely and no action is needed; " +
          "review = an analyst should look at this within the normal queue; " +
          "high_priority = the pattern is consistent with a shell or mule structure " +
          "and should be escalated now.",
      },
      summary: {
        type: "string",
        description:
          "Two to four paragraphs. What this group of cases appears to be, what " +
          "specifically ties them together, and what a benign explanation would look " +
          "like versus a concerning one. Name the case references and the exact shared " +
          "values. Plain prose, no bullet points, no hedging filler.",
      },
      findings: {
        type: "array",
        description: "Two to four discrete findings, most significant first.",
        items: {
          type: "object",
          properties: {
            finding_text: {
              type: "string",
              description:
                "One specific, self-contained observation naming the case references " +
                "and the exact shared value. A compliance lead should be able to act " +
                "on this sentence alone.",
            },
            risk_level: {
              type: "string",
              enum: ["informational", "review", "high_priority"],
            },
            connection_ids: {
              type: "array",
              items: { type: "string" },
              description:
                "The connection_id values from the evidence list that support this " +
                "finding. Use only ids that appear in the evidence provided.",
            },
          },
          required: ["finding_text", "risk_level", "connection_ids"],
        },
      },
    },
    required: ["name", "risk_level", "summary", "findings"],
  },
};

const BRIEF_SYSTEM = `You write cross-case network briefs for a bank's financial crime team.

Every case you are shown was already investigated individually and CLEARED. That is the
premise, not an oversight — nothing in any single file was wrong. Your job is to describe
what only becomes visible when the files are read together.

Write the way a senior compliance analyst writes for a compliance lead:
- Specific. Name the case references and quote the exact shared values.
- Calibrated. Shared attributes have innocent explanations — commercial registered agent
  services have thousands of clients, families share phone numbers, common words recur in
  company names. Say plainly when the benign reading is the likely one.
- Honest about what this is not. This layer sees structure, not intent. It cannot tell you
  the network is criminal, only that the structure exists and warrants a look.
- No filler, no throat-clearing, no restating the task. Do not use the word "delve".

What actually raises concern: several young entities sharing a single registered agent AND
other attributes; the same phone number under different owner names across different
entities; near-identical company names filed days apart; asset-light entities with
virtual offices clustering together. One shared attribute alone is usually informational.
Two or more independent shared attributes across the same set of cases is what escalates.`;

type BriefResponse = {
  name: string;
  risk_level: RiskLevel;
  summary: string;
  findings: Array<{
    finding_text: string;
    risk_level: RiskLevel;
    connection_ids: string[];
  }>;
};

export type ClusterResult = {
  networksCreated: number;
  findingsCreated: number;
  usage: TokenUsage;
};

export async function runClustering(
  db: Db,
  analysisRunId: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<ClusterResult> {
  const { data: connections, error } = await db
    .from("connections")
    .select(
      "id, case_a_id, case_b_id, connection_type, match_basis, confidence, explanation, detected_by, entity_a_id, entity_b_id",
    );
  if (error) throw error;

  const { data: cases, error: caseError } = await db
    .from("cases")
    .select("id, case_ref, business_name, closed_at, raw_narrative");
  if (caseError) throw caseError;

  const { data: entities, error: entityError } = await db
    .from("entities")
    .select("id, value, entity_type");
  if (entityError) throw entityError;

  const caseById = new Map((cases ?? []).map((c) => [c.id, c]));
  const entityById = new Map((entities ?? []).map((e) => [e.id, e]));

  // Wipe prior networks for this run; findings and members cascade.
  await db.from("networks").delete().neq("id", ZERO_UUID);

  const components = connectedComponents(connections ?? []);
  if (components.length === 0) {
    return { networksCreated: 0, findingsCreated: 0, usage: emptyUsage() };
  }

  const usage = emptyUsage();
  let done = 0;
  let findingsCreated = 0;

  await mapWithConcurrency(components, 2, async (memberIds) => {
    const members = memberIds
      .map((id) => caseById.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => a.case_ref.localeCompare(b.case_ref));

    const memberSet = new Set(memberIds);
    const evidence = (connections ?? []).filter(
      (c) => memberSet.has(c.case_a_id) && memberSet.has(c.case_b_id),
    );

    const evidenceText = evidence
      .map((c) => {
        const a = caseById.get(c.case_a_id);
        const b = caseById.get(c.case_b_id);
        const ea = entityById.get(c.entity_a_id);
        const eb = entityById.get(c.entity_b_id);
        return (
          `connection_id: ${c.id}\n` +
          `  links: ${a?.case_ref} (${a?.business_name}) <-> ${b?.case_ref} (${b?.business_name})\n` +
          `  shared attribute type: ${c.match_basis}\n` +
          `  value in ${a?.case_ref}: "${ea?.value ?? "?"}"\n` +
          `  value in ${b?.case_ref}: "${eb?.value ?? "?"}"\n` +
          `  detection: ${c.connection_type} via ${c.detected_by}, confidence ${c.confidence.toFixed(2)}\n` +
          `  note: ${c.explanation}`
        );
      })
      .join("\n\n");

    const caseText = members
      .map(
        (m) =>
          `### ${m.case_ref} — ${m.business_name} (closed ${m.closed_at.slice(0, 10)})\n${m.raw_narrative}`,
      )
      .join("\n\n");

    const brief = await callStructured<BriefResponse>({
      system: BRIEF_SYSTEM,
      prompt: `${members.length} previously-cleared cases were found to be connected.

--- SHARED-ATTRIBUTE EVIDENCE ---
${evidenceText}
--- END EVIDENCE ---

--- FULL CASE FILES ---
${caseText}
--- END CASE FILES ---

Write the network brief.`,
      tool: BRIEF_TOOL,
      maxTokens: 6000,
      usage,
    });

    const { data: network, error: networkError } = await db
      .from("networks")
      .insert({
        name: brief.name,
        summary: brief.summary,
        risk_level: brief.risk_level,
        analysis_run_id: analysisRunId,
      })
      .select("id")
      .single();
    if (networkError) throw networkError;

    const { error: memberError } = await db.from("network_members").insert(
      memberIds.map((case_id) => ({ network_id: network.id, case_id })),
    );
    if (memberError) throw memberError;

    const validIds = new Set(evidence.map((c) => c.id));
    const findings = brief.findings.map((f, i) => ({
      network_id: network.id,
      ordinal: i + 1,
      finding_text: f.finding_text,
      risk_level: f.risk_level,
      // Drop any id the model invented rather than citing.
      supporting_connection_ids: (f.connection_ids ?? []).filter((id) =>
        validIds.has(id),
      ),
    }));

    if (findings.length) {
      const { error: findingError } = await db
        .from("network_findings")
        .insert(findings);
      if (findingError) throw findingError;
      findingsCreated += findings.length;
    }

    onProgress?.(++done, components.length);
  });

  return {
    networksCreated: components.length,
    findingsCreated,
    usage,
  };
}

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
