-- Bretton Lattice — cross-case network intelligence
-- Core shape: cases -> entities -> pairwise connections -> clustered networks -> written findings.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type case_type as enum ('EDD', 'KYB', 'KYC');
create type case_status as enum ('cleared', 'escalated');

create type entity_type as enum (
  'business',
  'person',
  'address',
  'phone',
  'registered_agent',
  'ip',
  'incorporation_date'
);

create type connection_type as enum (
  'exact_match',      -- byte-identical values
  'normalized_match', -- identical after canonicalization (phone digits, address folding)
  'fuzzy_match',      -- string-similar, adjudicated by Claude
  'semantic_match'    -- different strings, same real-world thing, per Claude
);

create type detected_by as enum ('deterministic', 'claude');

create type risk_level as enum ('informational', 'review', 'high_priority');

create type run_status as enum ('running', 'complete', 'failed');

-- ---------------------------------------------------------------------------
-- Cases: already-closed, already-dispositioned case files ingested by Lattice.
-- ---------------------------------------------------------------------------

create table cases (
  id            uuid primary key default gen_random_uuid(),
  case_ref      text not null unique,
  business_name text not null,
  case_type     case_type not null default 'EDD',
  status        case_status not null default 'cleared',
  assignee      text,
  opened_at     timestamptz,
  closed_at     timestamptz not null,
  synthetic     boolean not null default true,
  raw_narrative text not null,
  created_at    timestamptz not null default now()
);

create index cases_closed_at_idx on cases (closed_at desc);

-- ---------------------------------------------------------------------------
-- Entities: structured attributes extracted from each case narrative by Claude.
-- normalized_value is the deterministic join key; value preserves the original
-- string exactly as written in the case file (needed for audit citation).
-- ---------------------------------------------------------------------------

create table entities (
  id                   uuid primary key default gen_random_uuid(),
  case_id              uuid not null references cases (id) on delete cascade,
  entity_type          entity_type not null,
  value                text not null,
  normalized_value     text not null,
  extracted_confidence real not null default 1.0
    check (extracted_confidence >= 0 and extracted_confidence <= 1),
  context              text,
  created_at           timestamptz not null default now()
);

create index entities_case_id_idx on entities (case_id);
create index entities_norm_idx on entities (entity_type, normalized_value);
create index entities_norm_trgm_idx on entities using gin (normalized_value gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Connections: one detected link between two entities in two different cases.
-- case_a_id/case_b_id are denormalized so clustering and graph edge rendering
-- never need a four-way join.
-- ---------------------------------------------------------------------------

create table connections (
  id              uuid primary key default gen_random_uuid(),
  entity_a_id     uuid not null references entities (id) on delete cascade,
  entity_b_id     uuid not null references entities (id) on delete cascade,
  case_a_id       uuid not null references cases (id) on delete cascade,
  case_b_id       uuid not null references cases (id) on delete cascade,
  connection_type connection_type not null,
  match_basis     entity_type not null,
  confidence      real not null check (confidence >= 0 and confidence <= 1),
  explanation     text not null,
  detected_by     detected_by not null,
  analysis_run_id uuid,
  created_at      timestamptz not null default now(),
  constraint connections_distinct_cases check (case_a_id <> case_b_id),
  constraint connections_unique_pair unique (entity_a_id, entity_b_id)
);

create index connections_case_a_idx on connections (case_a_id);
create index connections_case_b_idx on connections (case_b_id);

-- ---------------------------------------------------------------------------
-- Analysis runs: one execution of extract -> detect -> cluster.
-- ---------------------------------------------------------------------------

create table analysis_runs (
  id          uuid primary key default gen_random_uuid(),
  status      run_status not null default 'running',
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  stats       jsonb not null default '{}'::jsonb,
  error       text
);

alter table connections
  add constraint connections_analysis_run_fk
  foreign key (analysis_run_id) references analysis_runs (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Networks: connected components of 2+ cases, plus the Claude-written brief.
-- ---------------------------------------------------------------------------

create table networks (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  summary         text,
  risk_level      risk_level not null default 'informational',
  analysis_run_id uuid references analysis_runs (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table network_members (
  network_id uuid not null references networks (id) on delete cascade,
  case_id    uuid not null references cases (id) on delete cascade,
  primary key (network_id, case_id)
);

create table network_findings (
  id                        uuid primary key default gen_random_uuid(),
  network_id                uuid not null references networks (id) on delete cascade,
  ordinal                   int not null default 1,
  finding_text              text not null,
  risk_level                risk_level not null default 'informational',
  supporting_connection_ids uuid[] not null default '{}',
  created_at                timestamptz not null default now()
);

create index network_findings_network_idx on network_findings (network_id, ordinal);

-- ---------------------------------------------------------------------------
-- RLS: single-user demo. Anon may read everything; all writes go through the
-- service-role key used by the pipeline scripts and server routes.
-- ---------------------------------------------------------------------------

alter table cases            enable row level security;
alter table entities         enable row level security;
alter table connections      enable row level security;
alter table analysis_runs    enable row level security;
alter table networks         enable row level security;
alter table network_members  enable row level security;
alter table network_findings enable row level security;

create policy "demo read" on cases            for select to anon, authenticated using (true);
create policy "demo read" on entities         for select to anon, authenticated using (true);
create policy "demo read" on connections      for select to anon, authenticated using (true);
create policy "demo read" on analysis_runs    for select to anon, authenticated using (true);
create policy "demo read" on networks         for select to anon, authenticated using (true);
create policy "demo read" on network_members  for select to anon, authenticated using (true);
create policy "demo read" on network_findings for select to anon, authenticated using (true);
