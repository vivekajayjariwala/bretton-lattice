import type Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/supabase";
import type { CaseRow, EntityType } from "@/lib/database.types";
import {
  callStructured,
  emptyUsage,
  mapWithConcurrency,
  type TokenUsage,
} from "@/lib/pipeline/claude";
import { normalizeEntity } from "@/lib/pipeline/normalize";

/**
 * Stage 1 — entity extraction.
 *
 * Claude reads each closed-case narrative and returns the structured attributes
 * a network analysis needs. Normalization happens here in code, not in the
 * model, so the join keys are deterministic.
 */

const ENTITY_TYPES: EntityType[] = [
  "business",
  "person",
  "address",
  "phone",
  "registered_agent",
  "ip",
  "incorporation_date",
];

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "record_entities",
  description:
    "Record every identifying attribute found in the case narrative, verbatim.",
  input_schema: {
    type: "object",
    properties: {
      entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            entity_type: {
              type: "string",
              enum: ENTITY_TYPES,
              description:
                "business = the subject entity or any other company named as a counterparty; " +
                "person = a beneficial owner, control person or named principal; " +
                "address = any physical or mailing address; " +
                "phone = any telephone number; " +
                "registered_agent = the name of the registered agent company only " +
                "(record the agent's address separately as an address); " +
                "ip = an IP address; " +
                "incorporation_date = the date the subject entity was formed.",
            },
            value: {
              type: "string",
              description:
                "The value exactly as written in the narrative. Do not reformat, " +
                "expand abbreviations, or correct spelling — the original string is " +
                "needed for audit citation.",
            },
            confidence: {
              type: "number",
              description:
                "0-1. How confident you are that this is a real attribute of this " +
                "case and that you have typed it correctly.",
            },
            context: {
              type: "string",
              description:
                "The sentence or clause the value was taken from, so a reviewer can " +
                "trace it back to the source narrative.",
            },
          },
          required: ["entity_type", "value", "confidence", "context"],
        },
      },
    },
    required: ["entities"],
  },
};

const SYSTEM = `You are an entity extraction component in a financial-crime compliance pipeline.

You read closed case files and pull out identifying attributes so that a downstream
process can look for structural links between cases that were each individually cleared.

Rules:
- Extract values EXACTLY as written. "2810 W Charleston Blvd, Suite 84" and
  "2810 West Charleston Boulevard, Ste. 84" must be recorded as written, in full,
  including the variant spelling. Downstream matching depends on the original form.
- Record the registered agent's company name and the registered agent's address as
  two separate entities.
- Record every phone number you see, attached to whoever it belongs to, and put the
  owner's name in the context field.
- Do not infer, deduplicate, or editorialise. Do not merge two spellings into one.
- If an attribute is absent, simply omit it. Never invent a value.`;

export type ExtractedEntity = {
  entity_type: EntityType;
  value: string;
  confidence: number;
  context: string;
};

export type ExtractResult = {
  entitiesInserted: number;
  usage: TokenUsage;
};

export async function extractCase(
  caseRow: Pick<CaseRow, "business_name" | "case_ref" | "raw_narrative">,
  usage: TokenUsage,
): Promise<ExtractedEntity[]> {
  const { entities } = await callStructured<{ entities: ExtractedEntity[] }>({
    system: SYSTEM,
    prompt: `Case reference: ${caseRow.case_ref}
Subject: ${caseRow.business_name}

--- CASE NARRATIVE ---
${caseRow.raw_narrative}
--- END CASE NARRATIVE ---

Extract every identifying attribute.`,
    tool: EXTRACT_TOOL,
    usage,
  });

  return entities.filter(
    (e) => ENTITY_TYPES.includes(e.entity_type) && e.value?.trim(),
  );
}

export async function runExtraction(
  db: Db,
  onProgress?: (done: number, total: number) => void,
): Promise<ExtractResult> {
  const { data: cases, error } = await db
    .from("cases")
    .select("id, case_ref, business_name, raw_narrative")
    .order("case_ref");
  if (error) throw error;
  if (!cases?.length) throw new Error("No cases to extract from. Run the seed first.");

  // A re-run replaces prior extraction wholesale; connections cascade away with it.
  const { error: clearError } = await db
    .from("entities")
    .delete()
    .in(
      "case_id",
      cases.map((c) => c.id),
    );
  if (clearError) throw clearError;

  const usage = emptyUsage();
  let done = 0;

  const perCase = await mapWithConcurrency(cases, 4, async (caseRow) => {
    const extracted = await extractCase(caseRow, usage);
    onProgress?.(++done, cases.length);
    return extracted.map((e) => ({
      case_id: caseRow.id,
      entity_type: e.entity_type,
      value: e.value.trim(),
      normalized_value: normalizeEntity(e.entity_type, e.value),
      extracted_confidence: Math.min(1, Math.max(0, e.confidence)),
      context: e.context ?? null,
    }));
  });

  const rows = perCase.flat().filter((r) => r.normalized_value.length > 0);

  const { error: insertError } = await db.from("entities").insert(rows);
  if (insertError) throw insertError;

  return { entitiesInserted: rows.length, usage };
}
