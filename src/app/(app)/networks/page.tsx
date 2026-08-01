import Link from "next/link";
import { Share2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  NetworkGraph,
  type GraphCase,
  type GraphNetwork,
} from "@/components/network-graph";
import { getConnections, getCases, getNetworks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NetworksPage() {
  const [cases, connections, networks] = await Promise.all([
    getCases(),
    getConnections(),
    getNetworks(),
  ]);

  // Maps don't survive the server/client boundary, so resolve membership here.
  const networkByCaseId = new Map<string, { id: string; index: number }>();
  networks.forEach((n, index) => {
    for (const m of n.members) networkByCaseId.set(m.id, { id: n.id, index });
  });

  const graphCases: GraphCase[] = cases.map((c) => {
    const membership = networkByCaseId.get(c.id);
    return {
      id: c.id,
      case_ref: c.case_ref,
      business_name: c.business_name,
      networkId: membership?.id ?? null,
      networkIndex: membership?.index ?? null,
    };
  });

  const graphNetworks: GraphNetwork[] = networks.map((n) => ({
    id: n.id,
    name: n.name,
    risk_level: n.risk_level,
    memberCount: n.members.length,
  }));

  return (
    <>
      <PageHeader
        title="Networks"
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Share2 className="size-5" strokeWidth={1.75} />
          </span>
        }
        pill={
          networks.length > 0 ? (
            <span className="rounded-full bg-warn-soft px-3 py-1 text-[12px] font-medium text-warn">
              {networks.length} detected
            </span>
          ) : undefined
        }
        meta={
          <p className="max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
            Each node is a case that already passed its own review. Edges are
            shared attributes found by comparing every case against every other.
            Clusters are what no single-case investigation could see.
          </p>
        }
      />

      <div className="flex-1 px-8 py-6">
        {connections.length === 0 ? (
          <EmptyState />
        ) : (
          <NetworkGraph
            cases={graphCases}
            connections={connections}
            networks={graphNetworks}
          />
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-20 text-center">
      <p className="text-[16px] font-medium">No cross-case analysis yet</p>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
        The graph is built from the connections the pipeline finds. Run the
        analysis to populate it.
      </p>
      <Link
        href="/analysis"
        className="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Run cross-case analysis
      </Link>
    </div>
  );
}
