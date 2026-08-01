/**
 * Offline check of the deterministic layer — no database, no API calls.
 *
 * Asserts that the attributes planted in the seed corpus fold together under
 * normalization, and, just as importantly, that nothing in the control group
 * collides. This is the correctness property the whole demo rests on: a false
 * link would send an analyst chasing a network that does not exist.
 *
 *   npx tsx scripts/verify-normalization.ts
 */
import {
  normalizeAddress,
  normalizeBusinessName,
  normalizePersonName,
  normalizePhone,
  trigramSimilarity,
} from "../src/lib/pipeline/normalize";
import { SEED_CASES, CONTROL_CASE_REFS } from "../src/lib/seed-cases";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? "  ok  " : "  FAIL"} ${label}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        got      ${JSON.stringify(actual)}`}`,
  );
}

function assert(label: string, condition: boolean, detail = "") {
  if (!condition) failures++;
  console.log(`${condition ? "  ok  " : "  FAIL"} ${label}${condition ? "" : `  ${detail}`}`);
}

console.log("\nRing A — registered agent address folds across three spellings");
const agentAddresses = [
  "2810 W Charleston Blvd, Suite 84, Las Vegas, NV 89102",
  "2810 West Charleston Boulevard, Ste. 84, Las Vegas, NV 89102",
  "2810 W Charleston Blvd, Ste 84, Las Vegas, NV 89102",
];
const foldedAgents = agentAddresses.map(normalizeAddress);
check("all three variants share one canonical form", new Set(foldedAgents).size, 1);
console.log(`        canonical: "${foldedAgents[0]}"`);

console.log("\nRing A — owner phone folds across three formats");
const phones = ["(702) 555-0148", "702.555.0148", "+1 (702) 555-0148"];
check("all three formats share one canonical form", new Set(phones.map(normalizePhone)).size, 1);
check("canonical phone", normalizePhone(phones[0]), "7025550148");

console.log("\nRing A — owner name variant is near-identical, not identical");
const nameA = normalizePersonName("Rosalind Ferrer");
const nameB = normalizePersonName("Rosalind M. Ferrer");
assert("names do not fold together (middle initial survives)", nameA !== nameB);
assert(
  "but they are similar enough to reach Claude for adjudication",
  trigramSimilarity(nameA, nameB) >= 0.7,
  `similarity ${trigramSimilarity(nameA, nameB).toFixed(2)}`,
);

console.log("\nRing B — typosquat pair reaches adjudication but does not auto-match");
const harborA = normalizeBusinessName("Harborline Logistics LLC");
const harborB = normalizeBusinessName("Harbourline Logistics LLC");
assert("distinct legal entities stay distinct after folding", harborA !== harborB);
assert(
  "similarity clears the business blocking threshold (0.62)",
  trigramSimilarity(harborA, harborB) >= 0.62,
  `similarity ${trigramSimilarity(harborA, harborB).toFixed(2)}`,
);

console.log("\nControl group — no accidental collisions");

const controls = SEED_CASES.filter((c) => CONTROL_CASE_REFS.includes(c.case_ref));
check("control group size", controls.length, 11);

// Subject business names must not collide or even come close.
const controlNames = controls.map((c) => ({
  ref: c.case_ref,
  norm: normalizeBusinessName(c.business_name),
}));
let worstPair = { a: "", b: "", score: 0 };
for (let i = 0; i < controlNames.length; i++) {
  for (let j = i + 1; j < controlNames.length; j++) {
    const score = trigramSimilarity(controlNames[i].norm, controlNames[j].norm);
    if (score > worstPair.score) {
      worstPair = { a: controlNames[i].ref, b: controlNames[j].ref, score };
    }
  }
}
assert(
  "no two control business names reach the blocking threshold",
  worstPair.score < 0.62,
  `closest: ${worstPair.a} vs ${worstPair.b} at ${worstPair.score.toFixed(2)}`,
);
console.log(
  `        closest control pair: ${worstPair.a} / ${worstPair.b} at ${worstPair.score.toFixed(2)}`,
);

// Phone numbers appearing anywhere in a control narrative must be unique.
const PHONE_RE = /(?:\+1\s*)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g;
const phoneOwners = new Map<string, string[]>();
for (const c of SEED_CASES) {
  for (const raw of c.raw_narrative.match(PHONE_RE) ?? []) {
    const norm = normalizePhone(raw);
    const list = phoneOwners.get(norm) ?? [];
    if (!list.includes(c.case_ref)) list.push(c.case_ref);
    phoneOwners.set(norm, list);
  }
}
const sharedPhones = [...phoneOwners.entries()].filter(([, refs]) => refs.length > 1);
assert(
  "exactly one phone number is shared across cases, and it is the planted one",
  sharedPhones.length === 1 && sharedPhones[0][0] === "7025550148",
  JSON.stringify(sharedPhones),
);
if (sharedPhones.length === 1) {
  console.log(`        ${sharedPhones[0][0]} appears in ${sharedPhones[0][1].join(", ")}`);
  assert(
    "no control case carries the shared phone",
    sharedPhones[0][1].every((ref) => !CONTROL_CASE_REFS.includes(ref)),
    sharedPhones[0][1].join(", "),
  );
}

// Registered agent lines must be unique outside the planted ring.
const AGENT_RE = /Registered agent: ([^,]+),/g;
const agentOwners = new Map<string, string[]>();
for (const c of SEED_CASES) {
  for (const m of c.raw_narrative.matchAll(AGENT_RE)) {
    const norm = normalizeBusinessName(m[1]);
    const list = agentOwners.get(norm) ?? [];
    if (!list.includes(c.case_ref)) list.push(c.case_ref);
    agentOwners.set(norm, list);
  }
}
const sharedAgents = [...agentOwners.entries()].filter(([, refs]) => refs.length > 1);
assert(
  "exactly one registered agent is shared, and only by the planted ring",
  sharedAgents.length === 1 &&
    sharedAgents[0][1].every((ref) => !CONTROL_CASE_REFS.includes(ref)),
  JSON.stringify(sharedAgents),
);
if (sharedAgents.length === 1) {
  console.log(
    `        "${sharedAgents[0][0]}" appears in ${sharedAgents[0][1].join(", ")}`,
  );
}

console.log(
  failures === 0
    ? "\nAll deterministic checks passed.\n"
    : `\n${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
