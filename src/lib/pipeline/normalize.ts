import type { EntityType } from "@/lib/database.types";

/**
 * Canonicalization used as the deterministic join key for entity matching.
 *
 * Everything that can be settled by mechanical string rules is settled here, so
 * the LLM is only ever asked to adjudicate genuinely ambiguous pairs. This keeps
 * the high-confidence findings explainable and reproducible.
 */

const ADDRESS_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bstreet\b/g, "st"],
  [/\bavenue\b/g, "ave"],
  [/\bboulevard\b/g, "blvd"],
  [/\bdrive\b/g, "dr"],
  [/\broad\b/g, "rd"],
  [/\blane\b/g, "ln"],
  [/\bcourt\b/g, "ct"],
  [/\bplace\b/g, "pl"],
  [/\bparkway\b/g, "pkwy"],
  [/\bhighway\b/g, "hwy"],
  [/\bterrace\b/g, "ter"],
  [/\bcircle\b/g, "cir"],
  [/\bsquare\b/g, "sq"],
  [/\bsuite\b/g, "ste"],
  [/\bapartment\b/g, "apt"],
  [/\bunit\b/g, "ste"],
  [/\bfloor\b/g, "fl"],
  [/\bbuilding\b/g, "bldg"],
  [/\bnorth\b/g, "n"],
  [/\bsouth\b/g, "s"],
  [/\beast\b/g, "e"],
  [/\bwest\b/g, "w"],
  [/\bnortheast\b/g, "ne"],
  [/\bnorthwest\b/g, "nw"],
  [/\bsoutheast\b/g, "se"],
  [/\bsouthwest\b/g, "sw"],
];

const US_STATES: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
};

const COMPANY_SUFFIXES =
  /\b(llc|l\.l\.c|inc|incorporated|corp|corporation|co|company|ltd|limited|lp|llp|plc|pllc|holdings|group)\b/g;

const PERSON_TITLES = /\b(mr|mrs|ms|miss|dr|prof|sir|madam)\b/g;
const PERSON_SUFFIXES = /\b(jr|sr|ii|iii|iv|v|esq|phd|md|cpa)\b/g;

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function basicFold(value: string): string {
  return collapse(
    value
      .toLowerCase()
      .normalize("NFKD")
      // strip diacritics so "José" and "Jose" collide
      .replace(/[\u0300-\u036f]/g, ""),
  );
}

/** Phone numbers reduce to their significant digits, US country code dropped. */
export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits;
}

/**
 * Addresses fold to a canonical token string: lowercase, punctuation removed,
 * street types and directionals abbreviated, state names reduced to codes.
 * "2810 West Charleston Boulevard, Suite 84" and "2810 W Charleston Blvd Ste. 84"
 * both land on "2810 w charleston blvd ste 84".
 */
export function normalizeAddress(value: string): string {
  let out = basicFold(value)
    .replace(/[.,#]/g, " ")
    .replace(/\bp\s*o\s+box\b/g, "po box");

  for (const [pattern, replacement] of ADDRESS_ABBREVIATIONS) {
    out = out.replace(pattern, replacement);
  }
  for (const [name, code] of Object.entries(US_STATES)) {
    out = out.replace(new RegExp(`\\b${name}\\b`, "g"), code);
  }
  // "ste 84" / "ste84" / "# 84" all collapse the same way
  out = out.replace(/\bste\s+/g, "ste ").replace(/\b(\d{5})-\d{4}\b/, "$1");

  return collapse(out);
}

/** Business names drop legal suffixes and punctuation; "The" prefix is dropped. */
export function normalizeBusinessName(value: string): string {
  return collapse(
    basicFold(value)
      .replace(/[.,&'"-]/g, " ")
      .replace(COMPANY_SUFFIXES, " ")
      .replace(/^the\s+/, ""),
  );
}

/** Registered agents are businesses, and match on the same rules. */
export const normalizeRegisteredAgent = normalizeBusinessName;

/** Person names drop titles and generational suffixes, then sort-normalize. */
export function normalizePersonName(value: string): string {
  const cleaned = collapse(
    basicFold(value)
      .replace(/[.,]/g, " ")
      .replace(PERSON_TITLES, " ")
      .replace(PERSON_SUFFIXES, " "),
  );
  // "Okoro, Liam" and "Liam Okoro" should agree
  if (value.includes(",")) {
    const parts = cleaned.split(" ").filter(Boolean);
    return parts.slice(1).concat(parts[0] ?? "").join(" ").trim();
  }
  return cleaned;
}

/** Dates normalize to ISO yyyy-mm-dd where parseable, else folded text. */
export function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return basicFold(value);
}

export function normalizeIp(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEntity(type: EntityType, value: string): string {
  switch (type) {
    case "phone":
      return normalizePhone(value);
    case "address":
      return normalizeAddress(value);
    case "business":
      return normalizeBusinessName(value);
    case "registered_agent":
      return normalizeRegisteredAgent(value);
    case "person":
      return normalizePersonName(value);
    case "incorporation_date":
      return normalizeDate(value);
    case "ip":
      return normalizeIp(value);
    default:
      return basicFold(value);
  }
}

/**
 * Dice coefficient over character trigrams — the same similarity notion
 * Postgres pg_trgm uses, reimplemented here so blocking runs in-process.
 */
export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const grams = (s: string) => {
    const padded = `  ${s} `;
    const set = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      set.add(padded.slice(i, i + 3));
    }
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared++;
  return (2 * shared) / (ga.size + gb.size);
}

/** Whole days between two normalized (ISO) dates; Infinity if unparseable. */
export function daysApart(isoA: string, isoB: string): number {
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  return Math.abs(a - b) / 86_400_000;
}
