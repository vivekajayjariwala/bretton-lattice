/**
 * Loads the synthetic closed-case corpus into Supabase.
 * Idempotent: wipes existing synthetic cases (and everything cascading off
 * them) before inserting, so the demo is reproducible.
 *
 *   npm run seed
 */
import "./env";
import { createWriteClient } from "../src/lib/supabase";
import { SEED_CASES } from "../src/lib/seed-cases";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

async function main() {
  const db = createWriteClient();

  console.log("Clearing prior analysis output and synthetic cases…");
  // Networks/findings hang off analysis_runs; connections and entities cascade
  // from cases. Delete the roots and Postgres handles the rest.
  await db.from("analysis_runs").delete().neq("id", ZERO_UUID);
  const { error: deleteError } = await db
    .from("cases")
    .delete()
    .eq("synthetic", true);
  if (deleteError) throw deleteError;

  console.log(`Inserting ${SEED_CASES.length} synthetic closed cases…`);
  const { data, error } = await db
    .from("cases")
    .insert(
      SEED_CASES.map((c) => ({
        case_ref: c.case_ref,
        business_name: c.business_name,
        case_type: c.case_type,
        status: "cleared" as const,
        assignee: c.assignee,
        opened_at: new Date(`${c.opened_at}T09:00:00Z`).toISOString(),
        closed_at: new Date(`${c.closed_at}T17:00:00Z`).toISOString(),
        synthetic: true,
        raw_narrative: c.raw_narrative,
      })),
    )
    .select("case_ref");
  if (error) throw error;

  console.log(`Seeded ${data?.length ?? 0} cases, all with disposition CLEARED.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
