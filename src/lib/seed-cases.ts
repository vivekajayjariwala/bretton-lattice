/**
 * Synthetic closed-case corpus for the Lattice demo.
 *
 * All 18 cases are fictional and every one was CLEARED by its own single-case
 * review — that is the whole point of the demo. Eleven are genuinely
 * independent (the control group; nothing about them should ever link).
 * Seven carry deliberately planted structure:
 *
 *   Ring A (5 cases) — LAT-0004, LAT-0009, LAT-0013 share registered agent
 *     "Meridian Corporate Agents LLC" at 2810 W Charleston Blvd Ste 84,
 *     Las Vegas NV, written three different ways. LAT-0006 and LAT-0016 attach
 *     via a beneficial-owner phone number shared under two different names,
 *     with LAT-0013 as the bridge (its owner carries the same number).
 *
 *   Ring B (2 cases) — LAT-0011 / LAT-0018 are a typosquat pair
 *     ("Harborline" / "Harbourline"), incorporated one day apart, with
 *     otherwise unrelated addresses and owners. Nothing here matches exactly;
 *     this pair exists to prove the LLM adjudication layer earns its keep.
 *
 * The planted attributes are exact strings or mechanical variants, never
 * something requiring a guess.
 */

export type SeedCase = {
  case_ref: string;
  business_name: string;
  case_type: "EDD" | "KYB" | "KYC";
  assignee: string;
  opened_at: string;
  closed_at: string;
  raw_narrative: string;
};

const ANALYSTS = [
  "Casey Bennett",
  "Jordan Ellis",
  "Alex Leung",
  "Jamie Rivers",
  "Priya Raman",
];

export const SEED_CASES: SeedCase[] = [
  // ── Control group ────────────────────────────────────────────────────────
  {
    case_ref: "LAT-0001",
    business_name: "Cedarbrook Dental Group PLLC",
    case_type: "KYB",
    assignee: ANALYSTS[0],
    opened_at: "2026-01-12",
    closed_at: "2026-01-27",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Cedarbrook Dental Group PLLC
Formation: Washington professional limited liability company, incorporated 14 June 2016.
Principal place of business: 4418 Fremont Ave N, Suite 210, Seattle, WA 98103.
Registered agent: Puget Registered Agents Inc., 1201 Third Ave, Seattle, WA 98101.

Beneficial ownership: Dr. Alana Whitfield (72%, contact 206-555-0119) and Dr. Marcus Teague
(28%, contact 206-555-0186). Both principals verified against state dental licensure records;
no adverse media, no PEP association, no sanctions hits.

Business activity: General and cosmetic dentistry serving retail patients in North Seattle.
Revenue is predominantly insurance reimbursement (Delta Dental, Premera) with a minority of
patient card payments. Ten-year operating history, stable premises lease.

Expected activity: 180-240 deposits monthly, average $1,900, concentrated in insurer ACH
credits. Observed activity is consistent with the profile. No structuring indicators, no
cash-intensive behaviour, no third-party wires.

Disposition: CLEARED. Standard periodic review in 24 months.`,
  },
  {
    case_ref: "LAT-0002",
    business_name: "Ridgeway Feed & Supply Co",
    case_type: "KYB",
    assignee: ANALYSTS[1],
    opened_at: "2026-01-19",
    closed_at: "2026-02-03",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Ridgeway Feed & Supply Co
Formation: Iowa corporation, incorporated 3 March 1998.
Principal place of business: 872 County Road E16, Grinnell, IA 50112.
Registered agent: Heartland Agent Services LLC, 400 Locust St, Des Moines, IA 50309.

Beneficial ownership: Ellen Ridgeway-Mahler (100%, contact 641-555-0142). Third-generation
family ownership; transfer from the prior generation documented in 2011 succession filings.

Business activity: Agricultural feed, seed and veterinary supply wholesaler serving farms
within a 60-mile radius. Highly seasonal — receipts concentrate March-May and September-October.

Expected activity: Seasonal peaks to $410,000 monthly, troughs near $60,000. Cash receipts
average 14% of volume, consistent with a rural agricultural counterparty base and supported by
till records sampled for four weeks. No unexplained round-dollar deposits.

Disposition: CLEARED. Seasonality documented in the customer profile to suppress future
volume-variance alerts.`,
  },
  {
    case_ref: "LAT-0003",
    business_name: "Northline Physical Therapy LLC",
    case_type: "KYB",
    assignee: ANALYSTS[2],
    opened_at: "2026-01-22",
    closed_at: "2026-02-06",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Northline Physical Therapy LLC
Formation: Minnesota limited liability company, incorporated 9 September 2019.
Principal place of business: 3311 Hennepin Ave, Suite 4, Minneapolis, MN 55408.
Registered agent: Lakeside Corporate Filings Inc., 220 S 6th St, Minneapolis, MN 55402.

Beneficial ownership: Sara Lindqvist (60%, contact 612-555-0173) and Tomas Beaulieu
(40%, contact 612-555-0158). Both licensed physical therapists in good standing.

Business activity: Outpatient orthopaedic rehabilitation. Payer mix is 71% commercial
insurance, 22% Medicare, 7% self-pay.

Expected activity: 90-130 monthly credits averaging $2,400. Observed activity matches. One
alert in the review period related to a $46,000 equipment purchase; invoice from a recognised
medical equipment vendor obtained and filed.

Disposition: CLEARED.`,
  },

  // ── Ring A — shared registered agent (LAT-0004) ──────────────────────────
  {
    case_ref: "LAT-0004",
    business_name: "Sagebrush Retail Holdings LLC",
    case_type: "EDD",
    assignee: ANALYSTS[3],
    opened_at: "2026-02-02",
    closed_at: "2026-02-17",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Sagebrush Retail Holdings LLC
Formation: Nevada limited liability company, incorporated 11 August 2023.
Principal place of business: 6120 S Rainbow Blvd, Suite 12, Las Vegas, NV 89118.
Registered agent: Meridian Corporate Agents LLC, 2810 W Charleston Blvd, Suite 84,
Las Vegas, NV 89102.

Beneficial ownership: Dean Whitcomb (100%, contact 702-555-0231). Identity verified against
Nevada driver's licence and a utility statement dated within 90 days. No adverse media.

Business activity: Online resale of consumer electronics accessories, fulfilled through a
third-party logistics provider in Henderson, NV. The entity holds no physical retail premises.

Expected activity: 40-70 monthly card-acquirer settlements averaging $6,800, plus occasional
supplier wires to Shenzhen-based accessory manufacturers. Observed activity is within the
stated profile; supplier invoices sampled for three months and matched to outgoing wires.

Analyst note: The entity is young (under three years) and asset-light, but the business model
is coherent, the funds flow is explicable, and documentation was produced promptly on request.

Disposition: CLEARED. Annual review recommended given entity age.`,
  },
  {
    case_ref: "LAT-0005",
    business_name: "Willow & Vine Floral Studio",
    case_type: "KYB",
    assignee: ANALYSTS[0],
    opened_at: "2026-02-05",
    closed_at: "2026-02-19",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Willow & Vine Floral Studio
Formation: Oregon limited liability company, incorporated 27 April 2021.
Principal place of business: 1145 SE Division St, Portland, OR 97202.
Registered agent: Columbia Filing Partners LLC, 1000 SW Broadway, Portland, OR 97205.

Beneficial ownership: Nina Osei-Bonsu (100%, contact 503-555-0164).

Business activity: Retail florist with an event and wedding contract arm. Storefront lease
verified; two employees on payroll.

Expected activity: 200-320 small card transactions monthly plus 4-8 event deposits between
$1,500 and $9,000. Observed activity conforms. Seasonal spikes around February and May are
consistent with the trade.

Disposition: CLEARED.`,
  },

  // ── Ring A — phone-linked owner (LAT-0006) ───────────────────────────────
  {
    case_ref: "LAT-0006",
    business_name: "Vantage Point Consulting Group Inc",
    case_type: "EDD",
    assignee: ANALYSTS[1],
    opened_at: "2026-02-09",
    closed_at: "2026-02-24",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Vantage Point Consulting Group Inc
Formation: Wyoming corporation, incorporated 2 October 2023.
Principal place of business: 1621 Central Ave, Suite 8800, Cheyenne, WY 82001.
Registered agent: Frontier Statutory Agents LLC, 30 N Gould St, Sheridan, WY 82801.

Beneficial ownership: Rosalind Ferrer (100%). Primary contact number on file: (702) 555-0148.
Ms. Ferrer's identity was verified against a Nevada state identification card and a bank
reference letter. No adverse media, no sanctions or PEP match.

Business activity: Management consulting services to small and mid-sized retail operators,
delivered remotely. No physical office beyond a registered mail-forwarding suite.

Expected activity: 6-12 inbound client wires monthly, $8,000-$45,000 each, with corresponding
contractor payments out. Observed activity matched the stated model across the review window.
Two representative client engagement letters were obtained.

Analyst note: Suite 8800 at this address is a virtual office. This is common for consultancies
of this size and was not treated as adverse in isolation.

Disposition: CLEARED.`,
  },
  {
    case_ref: "LAT-0007",
    business_name: "Ironbound Welding & Fabrication LLC",
    case_type: "KYB",
    assignee: ANALYSTS[2],
    opened_at: "2026-02-11",
    closed_at: "2026-02-26",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Ironbound Welding & Fabrication LLC
Formation: New Jersey limited liability company, incorporated 18 January 2009.
Principal place of business: 77 Wilson Ave, Newark, NJ 07105.
Registered agent: Garden State Agents Corp, 830 Bear Tavern Rd, Ewing, NJ 08628.

Beneficial ownership: Anthony Mazzarella (55%, contact 973-555-0128) and Gloria Mazzarella
(45%, contact 973-555-0193).

Business activity: Structural steel fabrication and on-site welding for commercial
construction contractors in the Newark and Jersey City markets. Union shop, 14 employees.

Expected activity: 8-15 monthly contract receipts, $20,000-$180,000, from a stable roster of
general contractors. Observed activity conforms; the largest counterparty accounts for 31% of
inbound volume, which is consistent with a long-running master services agreement on file.

Disposition: CLEARED.`,
  },
  {
    case_ref: "LAT-0008",
    business_name: "Marisol Coffee Roasters Ltd",
    case_type: "KYB",
    assignee: ANALYSTS[3],
    opened_at: "2026-02-16",
    closed_at: "2026-03-02",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Marisol Coffee Roasters Ltd
Formation: Florida corporation, incorporated 6 July 2014.
Principal place of business: 2900 NW 2nd Ave, Miami, FL 33127.
Registered agent: Biscayne Registered Agent Services Inc., 78 SW 7th St, Miami, FL 33130.

Beneficial ownership: Marisol Aguilar-Reyes (100%, contact 305-555-0151).

Business activity: Specialty coffee importer and roaster. Green coffee is sourced directly
from cooperatives in Colombia and Guatemala; roasted product is sold wholesale to regional
cafés and via a direct-to-consumer subscription.

Expected activity: Monthly outbound trade wires of $40,000-$120,000 to Colombian and
Guatemalan cooperative accounts, offset by wholesale ACH receipts and card settlements.
Cross-border payment corridor reviewed; all counterparties are established cooperatives with
verifiable export documentation. Bills of lading sampled for four shipments.

Disposition: CLEARED. Trade corridor documented; no further escalation warranted.`,
  },

  // ── Ring A — shared registered agent, variant spelling (LAT-0009) ────────
  {
    case_ref: "LAT-0009",
    business_name: "Copperline Logistics Partners LLC",
    case_type: "EDD",
    assignee: ANALYSTS[0],
    opened_at: "2026-02-20",
    closed_at: "2026-03-06",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Copperline Logistics Partners LLC
Formation: Nevada limited liability company, incorporated 29 August 2023.
Principal place of business: 4455 E Sahara Ave, Unit 210, Las Vegas, NV 89104.
Registered agent: Meridian Corporate Agents LLC, 2810 West Charleston Boulevard, Ste. 84,
Las Vegas, NV 89102.

Beneficial ownership: Priya Nandakumar (100%, contact 702-555-0287). Identity documents
verified; no adverse media, no sanctions match.

Business activity: Freight brokerage — the entity arranges truckload capacity between
shippers and carriers on the Los Angeles–Las Vegas–Phoenix triangle. Asset-light; no owned
tractors or trailers.

Expected activity: 25-60 monthly shipper receipts averaging $4,200, with matching carrier
disbursements retaining a 12-18% brokerage margin. Observed activity is consistent. Carrier
payment ratios were sampled across two months and fall within the stated margin band.

Analyst note: Broker authority (MC number) confirmed active with FMCSA.

Disposition: CLEARED. Annual review given entity age.`,
  },
  {
    case_ref: "LAT-0010",
    business_name: "Stonefield Veterinary Clinic PC",
    case_type: "KYB",
    assignee: ANALYSTS[1],
    opened_at: "2026-02-24",
    closed_at: "2026-03-10",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Stonefield Veterinary Clinic PC
Formation: Colorado professional corporation, incorporated 21 May 2012.
Principal place of business: 1580 Pearl St, Boulder, CO 80302.
Registered agent: Front Range Agent Co., 1600 Broadway, Denver, CO 80202.

Beneficial ownership: Dr. Helena Vasquez-Moore (80%, contact 303-555-0176) and
Dr. Owen Trask (20%, contact 303-555-0139).

Business activity: Small-animal veterinary practice with an in-house diagnostic laboratory.

Expected activity: 300-450 monthly card transactions averaging $260, plus pet-insurance
reimbursements. Observed activity conforms with no anomalies in the review window.

Disposition: CLEARED.`,
  },

  // ── Ring B — typosquat pair, first half (LAT-0011) ───────────────────────
  {
    case_ref: "LAT-0011",
    business_name: "Harborline Logistics LLC",
    case_type: "EDD",
    assignee: ANALYSTS[2],
    opened_at: "2026-03-01",
    closed_at: "2026-03-16",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Harborline Logistics LLC
Formation: Delaware limited liability company, incorporated 4 March 2024.
Principal place of business: 210 Dock Street, Suite 6, Wilmington, DE 19801.
Registered agent: First State Agents LLC, 3500 South Dupont Highway, Dover, DE 19901.

Beneficial ownership: Gregor Halvorsen (100%, contact 302-555-0117). Norwegian national with
US permanent residency; documents verified, no sanctions or PEP match, no adverse media.

Business activity: Ocean freight forwarding and customs brokerage, principally on the
North Europe–US East Coast lane. Licensed OTI; FMC bond on file.

Expected activity: 15-30 monthly client receipts averaging $11,500, with corresponding
carrier and customs disbursements. Observed activity is consistent with the stated model.
The entity's client concentration is moderate; the top three clients represent 44% of volume.

Analyst note: Entity is newly formed, but the principal has a documented fifteen-year career
at two established forwarders, corroborated by reference letters.

Disposition: CLEARED. Enhanced monitoring for the first 12 months given entity age.`,
  },
  {
    case_ref: "LAT-0012",
    business_name: "Beacon Hill Bookbinders Inc",
    case_type: "KYB",
    assignee: ANALYSTS[3],
    opened_at: "2026-03-04",
    closed_at: "2026-03-18",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Beacon Hill Bookbinders Inc
Formation: Massachusetts corporation, incorporated 2 February 1987.
Principal place of business: 31 Charles St, Boston, MA 02114.
Registered agent: Bay State Corporate Services Inc., 100 Federal St, Boston, MA 02110.

Beneficial ownership: Edward Cahill (50%, contact 617-555-0182) and Ruth Cahill
(50%, contact 617-555-0195).

Business activity: Hand bookbinding, archival restoration and conservation work for
university libraries, museums and private collectors.

Expected activity: 20-40 monthly receipts, $400-$14,000, predominantly from institutional
purchase orders. Long operating history with no prior alerts.

Disposition: CLEARED.`,
  },

  // ── Ring A — the bridge case: shared agent AND the shared phone (LAT-0013)
  {
    case_ref: "LAT-0013",
    business_name: "Ellsworth Trading Company LLC",
    case_type: "EDD",
    assignee: ANALYSTS[0],
    opened_at: "2026-03-09",
    closed_at: "2026-03-23",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Ellsworth Trading Company LLC
Formation: Nevada limited liability company, incorporated 5 September 2023.
Principal place of business: 3773 Howard Hughes Pkwy, Suite 500, Las Vegas, NV 89169.
Registered agent: Meridian Corporate Agents LLC, 2810 W Charleston Blvd, Ste 84,
Las Vegas, NV 89102.

Beneficial ownership: Rosalind M. Ferrer (100%). Contact number on file: 702.555.0148.
Identity verified against a Nevada identification card. No adverse media returned.

Business activity: General merchandise trading — the entity purchases surplus and closeout
inventory from regional distributors and resells it to discount retail chains.

Expected activity: 10-25 monthly inbound settlements averaging $18,000 from a small set of
retail buyers, with corresponding supplier payments. Observed activity is within the stated
range. Purchase orders for three months were obtained and reconciled against outgoing ACH.

Analyst note: Inventory is held on consignment at a third-party warehouse; the warehouse
agreement was provided.

Disposition: CLEARED. Annual review given entity age.`,
  },
  {
    case_ref: "LAT-0014",
    business_name: "Alder Creek Brewing Co",
    case_type: "KYB",
    assignee: ANALYSTS[1],
    opened_at: "2026-03-12",
    closed_at: "2026-03-26",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Alder Creek Brewing Co
Formation: Vermont corporation, incorporated 30 November 2015.
Principal place of business: 88 Mill Brook Rd, Waitsfield, VT 05673.
Registered agent: Green Mountain Agents LLC, 30 Main St, Burlington, VT 05401.

Beneficial ownership: Colin Prewitt (45%, contact 802-555-0134), Hannah Prewitt
(45%, contact 802-555-0121) and a 10% employee stock ownership pool.

Business activity: Craft brewery with an attached taproom and regional keg distribution
across Vermont and New Hampshire. TTB brewer's notice and state licences verified.

Expected activity: Taproom card volume of $55,000-$95,000 monthly, plus 15-25 distributor
ACH receipts. Cash is approximately 9% of taproom revenue, consistent with the segment.

Disposition: CLEARED.`,
  },
  {
    case_ref: "LAT-0015",
    business_name: "Kestrel Analytics Ltd",
    case_type: "KYB",
    assignee: ANALYSTS[2],
    opened_at: "2026-03-17",
    closed_at: "2026-03-31",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Kestrel Analytics Ltd
Formation: Delaware corporation, incorporated 8 April 2018.
Principal place of business: 1201 N Market St, Floor 8, Wilmington, DE 19801.
Registered agent: Delaware Trust Filings Inc., 1209 Orange St, Wilmington, DE 19801.

Beneficial ownership: Institutional. Largest holders are Fernbank Venture Partners (24%),
Lockstep Capital (19%), and founder Daniel Osgood (17%, contact 302-555-0166). No single
natural person exceeds the 25% beneficial ownership threshold; control person recorded as
Mr. Osgood in his capacity as CEO.

Business activity: B2B subscription analytics software sold to logistics operators. Revenue
is recurring annual contracts invoiced in arrears.

Expected activity: 30-50 monthly customer ACH and card receipts, $2,000-$85,000, plus payroll
and cloud infrastructure outflows. Observed activity conforms.

Disposition: CLEARED.`,
  },

  // ── Ring A — phone-linked, different owner name (LAT-0016) ───────────────
  {
    case_ref: "LAT-0016",
    business_name: "Redstone Procurement Services LLC",
    case_type: "EDD",
    assignee: ANALYSTS[3],
    opened_at: "2026-03-20",
    closed_at: "2026-04-03",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Redstone Procurement Services LLC
Formation: Utah limited liability company, incorporated 17 November 2023.
Principal place of business: 2455 E Fort Union Blvd, Suite 30, Salt Lake City, UT 84121.
Registered agent: Wasatch Registered Agents Inc., 60 E South Temple, Salt Lake City, UT 84111.

Beneficial ownership: Diane Colwell (100%). Contact number provided at onboarding:
+1 (702) 555-0148. Ms. Colwell's identity was verified against a Utah driver's licence.
No adverse media, no sanctions or PEP match.

Business activity: Procurement intermediary sourcing industrial fasteners and packaging
consumables for small manufacturers, principally from overseas suppliers.

Expected activity: 8-18 monthly client receipts of $12,000-$60,000, offset by supplier
payments to Taiwanese and Vietnamese manufacturers. Observed activity is consistent with the
stated profile; three supplier invoices and matching proforma documents were obtained.

Analyst note: The principal's contact number is registered to a Nevada area code while the
entity is Utah-domiciled. Ms. Colwell explained she relocated from Las Vegas in 2023 and
retained the number. This was accepted as reasonable.

Disposition: CLEARED. Annual review given entity age.`,
  },
  {
    case_ref: "LAT-0017",
    business_name: "Peregrine Marine Services Inc",
    case_type: "KYB",
    assignee: ANALYSTS[0],
    opened_at: "2026-03-25",
    closed_at: "2026-04-08",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Peregrine Marine Services Inc
Formation: Louisiana corporation, incorporated 12 October 2004.
Principal place of business: 1440 Tchoupitoulas St, New Orleans, LA 70130.
Registered agent: Crescent Agent Services LLC, 909 Poydras St, New Orleans, LA 70112.

Beneficial ownership: Rémy Toussaint (65%, contact 504-555-0188) and Cecile Toussaint
(35%, contact 504-555-0147).

Business activity: Marine engine repair and dry-dock servicing for commercial fishing vessels
and river tugs. Twenty-year operating history at the same premises.

Expected activity: 12-25 monthly service receipts, $3,000-$95,000, from vessel operators and
two marine insurers. Observed activity conforms; the insurer receipts correspond to documented
claim repairs.

Disposition: CLEARED.`,
  },

  // ── Ring B — typosquat pair, second half (LAT-0018) ──────────────────────
  {
    case_ref: "LAT-0018",
    business_name: "Harbourline Logistics LLC",
    case_type: "EDD",
    assignee: ANALYSTS[1],
    opened_at: "2026-03-30",
    closed_at: "2026-04-13",
    raw_narrative: `ENHANCED DUE DILIGENCE — CLOSING MEMORANDUM

Subject: Harbourline Logistics LLC
Formation: Delaware limited liability company, incorporated 5 March 2024.
Principal place of business: 640 Naamans Road, Claymont, DE 19703.
Registered agent: Diamond State Filing Corp, 850 New Burton Rd, Dover, DE 19904.

Beneficial ownership: Tomas Ruzicka (100%, contact 302-555-0192). Czech national with a valid
US work visa; documents verified, no sanctions or PEP match, no adverse media.

Business activity: Freight forwarding and cargo consolidation, principally Central Europe to
US East Coast. The entity subcontracts customs clearance to a licensed broker.

Expected activity: 12-25 monthly client receipts averaging $9,800, with corresponding carrier
disbursements. Observed activity is consistent with the stated model.

Analyst note: Entity is newly formed. The principal provided two trade references from
European consolidators, both of which responded and confirmed a working relationship.

Disposition: CLEARED. Enhanced monitoring for the first 12 months given entity age.`,
  },
];

/** Cases with no planted structure — nothing should ever link these. */
export const CONTROL_CASE_REFS = [
  "LAT-0001",
  "LAT-0002",
  "LAT-0003",
  "LAT-0005",
  "LAT-0007",
  "LAT-0008",
  "LAT-0010",
  "LAT-0012",
  "LAT-0014",
  "LAT-0015",
  "LAT-0017",
];

/** Cases carrying planted structure, grouped by the ring they belong to. */
export const EXPECTED_RINGS: Record<string, string[]> = {
  "Ring A — shared registered agent and owner phone": [
    "LAT-0004",
    "LAT-0006",
    "LAT-0009",
    "LAT-0013",
    "LAT-0016",
  ],
  "Ring B — name variant, incorporated one day apart": ["LAT-0011", "LAT-0018"],
};
