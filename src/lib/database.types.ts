// Generated from the Supabase project schema (supabase/migrations).
// Regenerate with: npx supabase gen types typescript --project-id <ref>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CaseStatus = "cleared" | "escalated";
export type CaseType = "EDD" | "KYB" | "KYC";
export type ConnectionType =
  | "exact_match"
  | "normalized_match"
  | "fuzzy_match"
  | "semantic_match";
export type DetectedBy = "deterministic" | "claude";
export type EntityType =
  | "business"
  | "person"
  | "address"
  | "phone"
  | "registered_agent"
  | "ip"
  | "incorporation_date";
export type RiskLevel = "informational" | "review" | "high_priority";
export type RunStatus = "running" | "complete" | "failed";

export type CaseRow = {
  id: string;
  case_ref: string;
  business_name: string;
  case_type: CaseType;
  status: CaseStatus;
  assignee: string | null;
  opened_at: string | null;
  closed_at: string;
  synthetic: boolean;
  raw_narrative: string;
  created_at: string;
};

export type EntityRow = {
  id: string;
  case_id: string;
  entity_type: EntityType;
  value: string;
  normalized_value: string;
  extracted_confidence: number;
  context: string | null;
  created_at: string;
};

export type ConnectionRow = {
  id: string;
  entity_a_id: string;
  entity_b_id: string;
  case_a_id: string;
  case_b_id: string;
  connection_type: ConnectionType;
  match_basis: EntityType;
  confidence: number;
  explanation: string;
  detected_by: DetectedBy;
  analysis_run_id: string | null;
  created_at: string;
};

export type AnalysisRunRow = {
  id: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  stats: Json;
  error: string | null;
};

export type NetworkRow = {
  id: string;
  name: string;
  summary: string | null;
  risk_level: RiskLevel;
  analysis_run_id: string | null;
  created_at: string;
};

export type NetworkMemberRow = {
  network_id: string;
  case_id: string;
};

export type NetworkFindingRow = {
  id: string;
  network_id: string;
  ordinal: number;
  finding_text: string;
  risk_level: RiskLevel;
  supporting_connection_ids: string[];
  created_at: string;
};

type TableDef<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      cases: TableDef<
        CaseRow,
        Omit<CaseRow, "id" | "created_at"> & { id?: string }
      >;
      entities: TableDef<
        EntityRow,
        Omit<EntityRow, "id" | "created_at"> & { id?: string }
      >;
      connections: TableDef<
        ConnectionRow,
        Omit<ConnectionRow, "id" | "created_at"> & { id?: string }
      >;
      analysis_runs: TableDef<
        AnalysisRunRow,
        Partial<Omit<AnalysisRunRow, "id">> & { id?: string }
      >;
      networks: TableDef<
        NetworkRow,
        Omit<NetworkRow, "id" | "created_at"> & { id?: string }
      >;
      network_members: TableDef<NetworkMemberRow, NetworkMemberRow>;
      network_findings: TableDef<
        NetworkFindingRow,
        Omit<NetworkFindingRow, "id" | "created_at"> & { id?: string }
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      case_status: CaseStatus;
      case_type: CaseType;
      connection_type: ConnectionType;
      detected_by: DetectedBy;
      entity_type: EntityType;
      risk_level: RiskLevel;
      run_status: RunStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
