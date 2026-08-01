# Bretton Lattice

Cross-case network intelligence for financial crime investigations. Lattice reads a bank's closed case files as one body of evidence rather than one file at a time, and surfaces the structure hiding between them.

**Live demo: [bretton-lattice.vercel.app](https://bretton-lattice.vercel.app)**

Every business, person, address and phone number in this project is synthetic and fictional.

## The problem

An investigation can only see what sits inside the case it was opened for. That constraint is reasonable, and it is also the blind spot.

Picture six shell companies. Each has its own clean file. Each was cleared on its own merits by an analyst who did nothing wrong. They quietly share a registered agent address, or a beneficial owner's phone number, or a run of incorporation dates a few days apart. No single review catches any of it, because no single review has any reason to look at the other five.

Proof of a ring lives in the gaps between cases, never inside one of them.

## What Lattice does

Feed it a batch of investigations that have already been worked and signed off. It extracts the identifying details from each narrative, compares every case against every other case, groups whatever connects into networks, and writes a brief on each one.

It is a layer that sits on top of per-case investigation, not a replacement for it. Nothing here re-opens a case or argues with a disposition.

## How it works

The pipeline runs in four stages. Each is a standalone script over a shared library in `src/lib/pipeline`, so the CLI and the in-app run button execute the same code.

### 1. Seed

18 fictional businesses that all passed enhanced due diligence, written as realistic closing memos. Eleven are genuine controls with nothing in common. Seven carry planted structure across two rings:

- **Five cases** connect through the registered agent *Meridian Corporate Agents LLC* at a Las Vegas address, written three different ways across the files ("Suite 84", "Ste. 84", "West Charleston Boulevard"). Two of those five join the component through a beneficial owner phone number that appears under two different owner names.
- **Two cases** are a typosquat pair, *Harborline Logistics LLC* and *Harbourline Logistics LLC*, incorporated a day apart with different addresses and different owners. Nothing about them matches exactly.

Seeding is idempotent, so the demo is reproducible.

### 2. Extract

One Claude call per case pulls structured entities out of the raw narrative: business names, addresses, phone numbers, registered agents, beneficial owners, incorporation dates, IP addresses. Each entity keeps its original string alongside a normalized form, because an auditor needs to trace a finding back to the exact words in the source file. Calls are concurrency capped and retried on 429 and 5xx.

Current corpus: 143 entities across 18 cases.

### 3. Detect

Matching splits deliberately in two.

**Deterministic first.** Phone numbers reduce to digits, addresses fold through USPS style abbreviations, names casefold and drop their suffixes. Anything canonicalization can settle gets settled with a self join on the normalized value, at confidence 1.0 and zero model calls. These findings are reproducible byte for byte and cost nothing to defend in an audit.

**Claude second, and only for what is left.** Candidate pairs are blocked by trigram similarity within an entity type, batched, and sent for adjudication. The model returns a verdict, a confidence, and a short explanation. Pairs below 0.6 are discarded.

Current corpus: 12 connections, 10 found by rule and 2 by Claude. The typosquat pair is reachable only by the model, which is what earns that half of the pipeline its place.

### 4. Cluster

Union-find over the connection graph at case level. Every connected component with two or more cases becomes a network. Each network then gets one Claude call, given the member narratives and all supporting connections, which produces a summary, a risk level, and a set of discrete findings that each cite the specific connection IDs backing them.

Current corpus: 2 networks (one of five cases at high priority, one of two cases worth reviewing) and 7 findings.

### Correctness

The eleven control cases link to nothing. That number matters more than the two rings the pipeline recovers. A false connection sends an analyst chasing a network that was never there, which is a faster way to lose a compliance team's trust than missing a real one.

## Screens

| Route | Purpose |
| --- | --- |
| `/cases` | All 18 cases, every one showing a green cleared disposition. Establishes that each passed its own review. |
| `/analysis` | Pipeline runner with per stage progress and counts from the last run. |
| `/networks` | Force directed graph. Unconnected cases sit grey on an outer ring, clustered cases are coloured by network. Edges are solid when a rule proved them and dashed when Claude judged them. Clicking an edge shows the shared value and the reasoning. |
| `/networks/[id]` | The risk brief. Shaped unlike a single case narrative: it is about a set of cases, its evidence is connections, and every finding cites the attributes behind it. |
| `/briefs` | Index of briefs, one per detected network. |
| `/cases/[caseRef]` | Read only view of a source narrative and its extracted entities. |
| `/about` | Write up of the problem, the approach, and where this fits. |

## Data model

Seven tables in Postgres, with enums for the constrained columns and a trigram index on normalized entity values to keep candidate blocking cheap.

```
cases              case_ref, business_name, case_type, status, closed_at, raw_narrative, assignee
entities           case_id, entity_type, value, normalized_value, extracted_confidence, context
connections        entity_a_id, entity_b_id, case_a_id, case_b_id, connection_type,
                   match_basis, confidence, explanation, detected_by
networks           name, summary, risk_level, analysis_run_id
network_members    network_id, case_id
network_findings   network_id, finding_text, risk_level, supporting_connection_ids[]
analysis_runs      started_at, finished_at, status, stats
```

Two deviations from a naive shape are worth calling out. `connections` denormalizes both case IDs so clustering and graph rendering avoid a four way join. `entities.normalized_value` exists so exact matching never depends on a model, which is what keeps the strongest findings deterministic.

## Running locally

Requires Node 22 or newer, a Supabase project, and an Anthropic API key.

```bash
git clone https://github.com/vivekajayjariwala/bretton-lattice.git
cd bretton-lattice
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
```

Apply `supabase/migrations/20260731000001_init_lattice_schema.sql` to the project, then populate and analyse:

```bash
npm run seed       # 18 synthetic cases
npm run pipeline   # extract, detect, cluster in order
npm run dev
```

The stages also run one at a time, which helps when iterating on a single step:

```bash
npm run extract
npm run detect
npm run cluster
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run seed` | Write the synthetic corpus |
| `npm run extract` | Entity extraction over every case |
| `npm run detect` | Rule based plus model adjudicated matching |
| `npm run cluster` | Connected components and generated briefs |
| `npm run pipeline` | All three pipeline stages in order |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui
- Supabase Postgres
- Anthropic API, `claude-sonnet-5`
- `react-force-graph-2d` on canvas
- Deployed on Vercel

## Notes on the build

**Pipeline results are cached in Postgres.** The screens read stored output, so nothing in the demo waits on a model call. The run button re-executes the real pipeline against the same library the scripts use, which keeps "structured as if it were a real pipeline" an accurate description rather than a claim.

**Rules before models.** Every match that string canonicalization can decide is decided that way. The model is reserved for judgement calls, which holds cost down, keeps the high confidence findings reproducible, and makes the audit trail easier to defend.

**The interface follows Bretton AI's existing product.** Warm off white canvas, green accents, pill badges, tabular figures, generous row heights.

**Responsive.** Below the `md` breakpoint the sidebar becomes a drawer behind a sticky top bar. The layout sets `viewport-fit=cover` and honours the safe area insets so it behaves on notched iPhones.

## Not in scope

No policy application and no single case investigation. That is the part of the problem this project explicitly does not try to solve, and it is the part Bretton's existing agent already handles well.

Auth is a single demo user. Nothing here is built to scale past roughly 20 cases: pairwise comparison is quadratic, and a production version would need blocking strategies well beyond a trigram threshold.
