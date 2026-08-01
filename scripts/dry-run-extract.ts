/**
 * Sanity-checks the extraction prompt against the live API for a few cases,
 * without touching the database. Prints what Claude found and how each value
 * normalizes, so prompt problems surface before a full run.
 *
 *   npx tsx scripts/dry-run-extract.ts LAT-0004 LAT-0013
 */
import "./env";
import { extractCase } from "../src/lib/pipeline/extract";
import { emptyUsage } from "../src/lib/pipeline/claude";
import { normalizeEntity } from "../src/lib/pipeline/normalize";
import { SEED_CASES } from "../src/lib/seed-cases";

const refs = process.argv.slice(2);
const targets = refs.length
  ? SEED_CASES.filter((c) => refs.includes(c.case_ref))
  : SEED_CASES.slice(0, 1);

async function main() {
  const usage = emptyUsage();
  for (const c of targets) {
    console.log(`\n=== ${c.case_ref} — ${c.business_name} ===`);
    const entities = await extractCase(c, usage);
    for (const e of entities) {
      console.log(
        `  ${e.entity_type.padEnd(19)} ${JSON.stringify(e.value)}\n` +
          `  ${"".padEnd(19)} -> ${JSON.stringify(normalizeEntity(e.entity_type, e.value))}`,
      );
    }
  }
  console.log(`\nTokens in/out: ${usage.input}/${usage.output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
