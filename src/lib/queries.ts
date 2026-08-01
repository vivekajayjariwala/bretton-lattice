import { createReadClient } from "@/lib/supabase";
import type {
  AnalysisRunRow,
  CaseRow,
  ConnectionRow,
  EntityRow,
  NetworkFindingRow,
  NetworkRow,
} from "@/lib/database.types";

/** Read-side data access for the app's server components. */

export type CaseListItem = Pick<
  CaseRow,
  | "id"
  | "case_ref"
  | "business_name"
  | "case_type"
  | "status"
  | "assignee"
  | "opened_at"
  | "closed_at"
>;

export async function getCases(): Promise<CaseListItem[]> {
  const { data, error } = await createReadClient()
    .from("cases")
    .select(
      "id, case_ref, business_name, case_type, status, assignee, opened_at, closed_at",
    )
    .order("closed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCase(
  caseRef: string,
): Promise<{ caseRow: CaseRow; entities: EntityRow[] } | null> {
  const db = createReadClient();
  const { data: caseRow, error } = await db
    .from("cases")
    .select("*")
    .eq("case_ref", caseRef)
    .maybeSingle();
  if (error) throw error;
  if (!caseRow) return null;

  const { data: entities, error: entityError } = await db
    .from("entities")
    .select("*")
    .eq("case_id", caseRow.id)
    .order("entity_type");
  if (entityError) throw entityError;

  return { caseRow, entities: entities ?? [] };
}

export async function getLatestRun(): Promise<AnalysisRunRow | null> {
  const { data, error } = await createReadClient()
    .from("analysis_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type NetworkSummary = NetworkRow & {
  members: CaseListItem[];
  connectionCount: number;
};

export async function getNetworks(): Promise<NetworkSummary[]> {
  const db = createReadClient();
  const { data: networks, error } = await db
    .from("networks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!networks?.length) return [];

  const { data: members, error: memberError } = await db
    .from("network_members")
    .select("network_id, cases(id, case_ref, business_name, case_type, status, assignee, opened_at, closed_at)");
  if (memberError) throw memberError;

  const { data: connections, error: connectionError } = await db
    .from("connections")
    .select("case_a_id, case_b_id");
  if (connectionError) throw connectionError;

  type MemberJoin = { network_id: string; cases: CaseListItem | null };
  const byNetwork = new Map<string, CaseListItem[]>();
  for (const row of (members ?? []) as unknown as MemberJoin[]) {
    if (!row.cases) continue;
    const list = byNetwork.get(row.network_id) ?? [];
    list.push(row.cases);
    byNetwork.set(row.network_id, list);
  }

  return networks.map((n) => {
    const memberList = (byNetwork.get(n.id) ?? []).sort((a, b) =>
      a.case_ref.localeCompare(b.case_ref),
    );
    const ids = new Set(memberList.map((m) => m.id));
    return {
      ...n,
      members: memberList,
      connectionCount: (connections ?? []).filter(
        (c) => ids.has(c.case_a_id) && ids.has(c.case_b_id),
      ).length,
    };
  });
}

export type NetworkDetail = NetworkSummary & {
  findings: NetworkFindingRow[];
  connections: EnrichedConnection[];
};

export type EnrichedConnection = ConnectionRow & {
  case_a_ref: string;
  case_a_name: string;
  case_b_ref: string;
  case_b_name: string;
  value_a: string;
  value_b: string;
};

export async function getNetwork(id: string): Promise<NetworkDetail | null> {
  const networks = await getNetworks();
  const network = networks.find((n) => n.id === id);
  if (!network) return null;

  const db = createReadClient();
  const { data: findings, error } = await db
    .from("network_findings")
    .select("*")
    .eq("network_id", id)
    .order("ordinal");
  if (error) throw error;

  const memberIds = new Set(network.members.map((m) => m.id));
  const all = await getConnections();

  return {
    ...network,
    findings: findings ?? [],
    connections: all.filter(
      (c) => memberIds.has(c.case_a_id) && memberIds.has(c.case_b_id),
    ),
  };
}

/** All connections, joined to the case refs and entity values the UI displays. */
export async function getConnections(): Promise<EnrichedConnection[]> {
  const db = createReadClient();
  const { data: connections, error } = await db.from("connections").select("*");
  if (error) throw error;
  if (!connections?.length) return [];

  const { data: cases } = await db
    .from("cases")
    .select("id, case_ref, business_name");
  const { data: entities } = await db.from("entities").select("id, value");

  const caseById = new Map((cases ?? []).map((c) => [c.id, c]));
  const entityById = new Map((entities ?? []).map((e) => [e.id, e]));

  return connections.map((c) => ({
    ...c,
    case_a_ref: caseById.get(c.case_a_id)?.case_ref ?? "?",
    case_a_name: caseById.get(c.case_a_id)?.business_name ?? "Unknown",
    case_b_ref: caseById.get(c.case_b_id)?.case_ref ?? "?",
    case_b_name: caseById.get(c.case_b_id)?.business_name ?? "Unknown",
    value_a: entityById.get(c.entity_a_id)?.value ?? "",
    value_b: entityById.get(c.entity_b_id)?.value ?? "",
  }));
}

/** Everything the force-directed graph needs, in one round trip. */
export async function getGraphData() {
  const [cases, connections, networks] = await Promise.all([
    getCases(),
    getConnections(),
    getNetworks(),
  ]);

  const networkByCaseId = new Map<string, { id: string; name: string; index: number }>();
  networks.forEach((n, index) => {
    for (const m of n.members) {
      networkByCaseId.set(m.id, { id: n.id, name: n.name, index });
    }
  });

  return { cases, connections, networks, networkByCaseId };
}
