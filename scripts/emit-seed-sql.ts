/**
 * Emits the seed corpus as plain SQL, for environments where it is easier to
 * pipe into psql than to run the Supabase client (no service-role key to hand).
 *
 *   npx tsx scripts/emit-seed-sql.ts | psql "$DATABASE_URL"
 */
import { SEED_CASES } from "../src/lib/seed-cases";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const rows = SEED_CASES.map(
  (c) =>
    `(${q(c.case_ref)}, ${q(c.business_name)}, ${q(c.case_type)}::case_type, ` +
    `'cleared'::case_status, ${q(c.assignee)}, ${q(`${c.opened_at}T09:00:00Z`)}, ` +
    `${q(`${c.closed_at}T17:00:00Z`)}, true, ${q(c.raw_narrative)})`,
).join(",\n");

console.log(`begin;
delete from cases where synthetic = true;
insert into cases (case_ref, business_name, case_type, status, assignee, opened_at, closed_at, synthetic, raw_narrative) values
${rows};
commit;`);
