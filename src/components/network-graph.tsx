"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONNECTION_LABELS,
  DetectionBadge,
  ENTITY_LABELS,
  RiskBadge,
} from "@/components/badges";
import { formatConfidence } from "@/lib/format";
import type { EnrichedConnection } from "@/lib/queries";
import type { RiskLevel } from "@/lib/database.types";

// react-force-graph reaches for window/canvas at import time.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[14px] text-muted-foreground">
      Loading graph…
    </div>
  ),
});

export type GraphCase = {
  id: string;
  case_ref: string;
  business_name: string;
  networkId: string | null;
  networkIndex: number | null;
};

export type GraphNetwork = {
  id: string;
  name: string;
  risk_level: RiskLevel;
  memberCount: number;
};

type NodeDatum = GraphCase & {
  x?: number;
  y?: number;
  degree: number;
};

type LinkDatum = {
  source: string | NodeDatum;
  target: string | NodeDatum;
  connection: EnrichedConnection;
};

/**
 * A d3-style positioning force that eases each node toward its own target
 * point. Written by hand rather than pulled from d3-force: react-force-graph
 * already bundles its own copy of d3, and importing a second one breaks the
 * client chunk.
 */
function anchorForce(
  targetOf: (node: NodeDatum) => { x: number; y: number } | null,
  strengthOf: (node: NodeDatum) => number,
) {
  let nodes: NodeDatum[] = [];

  const force = (alpha: number) => {
    for (const node of nodes) {
      const target = targetOf(node);
      if (!target) continue;
      const k = strengthOf(node) * alpha;
      if (k === 0) continue;
      const n = node as NodeDatum & { vx: number; vy: number };
      n.vx += (target.x - (node.x ?? 0)) * k;
      n.vy += (target.y - (node.y ?? 0)) * k;
    }
  };
  force.initialize = (n: NodeDatum[]) => {
    nodes = n;
  };
  return force;
}

/** Cluster palette — matches --net-1..4 in globals.css. */
const NETWORK_COLORS = ["#7c3aed", "#0e7a5f", "#c76a06", "#2563a8"];
const ISOLATED_COLOR = "#c3c0b6";

export function NetworkGraph({
  cases,
  connections,
  networks,
}: {
  cases: GraphCase[];
  connections: EnrichedConnection[];
  networks: GraphNetwork[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selectedLink, setSelectedLink] = useState<EnrichedConnection | null>(
    null,
  );
  const [hoveredNetwork, setHoveredNetwork] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const data = useMemo(() => {
    const degree = new Map<string, number>();
    for (const c of connections) {
      degree.set(c.case_a_id, (degree.get(c.case_a_id) ?? 0) + 1);
      degree.set(c.case_b_id, (degree.get(c.case_b_id) ?? 0) + 1);
    }
    return {
      nodes: cases.map<NodeDatum>((c) => ({
        ...c,
        degree: degree.get(c.id) ?? 0,
      })),
      links: connections.map<LinkDatum>((c) => ({
        source: c.case_a_id,
        target: c.case_b_id,
        connection: c,
      })),
    };
  }, [cases, connections]);

  const colorFor = useCallback(
    (node: NodeDatum) =>
      node.networkIndex === null
        ? ISOLATED_COLOR
        : NETWORK_COLORS[node.networkIndex % NETWORK_COLORS.length],
    [],
  );

  const dimmed = useCallback(
    (networkId: string | null) =>
      hoveredNetwork !== null && networkId !== hoveredNetwork,
    [hoveredNetwork],
  );

  const drawNode = useCallback(
    (node: NodeDatum, ctx: CanvasRenderingContext2D, scale: number) => {
      const clustered = node.networkIndex !== null;
      const radius = clustered ? 7 + Math.min(node.degree, 6) * 0.7 : 4.5;
      const fade = dimmed(node.networkId);

      ctx.globalAlpha = fade ? 0.18 : 1;

      if (clustered) {
        // Halo makes clustered nodes read as a group at a glance.
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius + 5, 0, 2 * Math.PI);
        ctx.fillStyle = `${colorFor(node)}22`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
      ctx.fillStyle = colorFor(node);
      ctx.fill();
      ctx.lineWidth = 1.5 / scale;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Only label clustered nodes until zoomed in — the controls are noise.
      // Dividing by scale keeps labels a constant size on screen at any zoom.
      if (clustered || scale > 1.8) {
        const fontSize = 11 / scale;
        ctx.font = `${clustered ? 600 : 400} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = clustered ? "#171613" : "#8a877e";

        const label = node.business_name.replace(/ (LLC|Inc|Ltd|PLLC|PC|Co)$/, "");
        // Knock the warm background out behind the text so labels stay legible
        // where they overlap an edge.
        const width = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(252, 251, 248, 0.82)";
        ctx.fillRect(
          node.x! - width / 2 - 2 / scale,
          node.y! + radius + 3 / scale,
          width + 4 / scale,
          fontSize * 1.15,
        );

        ctx.fillStyle = clustered ? "#171613" : "#8a877e";
        ctx.fillText(label, node.x!, node.y! + radius + 4 / scale);
      }

      ctx.globalAlpha = 1;
    },
    [colorFor, dimmed],
  );

  const drawLink = useCallback(
    (link: LinkDatum, ctx: CanvasRenderingContext2D) => {
      const source = link.source as NodeDatum;
      const target = link.target as NodeDatum;
      if (source.x === undefined || target.x === undefined) return;

      const { connection } = link;
      const isSelected = selectedLink?.id === connection.id;
      const fade = dimmed(source.networkId);

      ctx.globalAlpha = fade ? 0.12 : isSelected ? 1 : 0.65;
      ctx.beginPath();
      ctx.moveTo(source.x!, source.y!);
      ctx.lineTo(target.x!, target.y!);
      ctx.strokeStyle = isSelected
        ? "#141414"
        : source.networkIndex !== null
          ? NETWORK_COLORS[source.networkIndex % NETWORK_COLORS.length]
          : ISOLATED_COLOR;
      ctx.lineWidth = isSelected ? 3 : 1 + connection.confidence * 2;
      // Dashed = Claude judged it; solid = a rule proved it.
      ctx.setLineDash(connection.detected_by === "claude" ? [4, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
    [selectedLink, dimmed],
  );

  // The default forces pull everything to one point, so 18 nodes land in an
  // unreadable knot. Instead: anchor each network to its own slot around the
  // centre, and push unconnected cases out to a surrounding ring. The layout is
  // doing real explanatory work on this screen, so it is worth steering.
  const networkCount = networks.length;
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || size.width === 0) return;

    const clusterRadius = Math.min(size.width, size.height) * 0.22;
    const orbitRadius = Math.min(size.width, size.height) * 0.52;

    const anchor = (node: NodeDatum) => {
      if (node.networkIndex === null) return null;
      // Spread clusters evenly, starting at the top.
      const angle =
        (node.networkIndex / Math.max(networkCount, 1)) * 2 * Math.PI -
        Math.PI / 2;
      return {
        x: Math.cos(angle) * clusterRadius,
        y: Math.sin(angle) * clusterRadius,
      };
    };

    // Unconnected cases are parked evenly around a surrounding ring, so they
    // read as context rather than competing with the clusters for attention.
    const isolated = cases.filter((c) => c.networkIndex === null);
    const orbitSlot = new Map(isolated.map((c, i) => [c.id, i]));

    // Strong short-range repulsion plus a long link distance: within a cluster
    // the nodes push far enough apart that their labels stop colliding, while
    // distanceMax keeps that repulsion from throwing the clusters off screen.
    graph.d3Force("charge")?.strength(-900).distanceMax(260);
    graph.d3Force("link")?.distance(115).strength(0.75);
    graph.d3Force("center", null);

    graph.d3Force(
      "anchor",
      anchorForce(
        (node) => {
          if (node.networkIndex !== null) return anchor(node);
          const slot = orbitSlot.get(node.id) ?? 0;
          const angle = (slot / Math.max(isolated.length, 1)) * 2 * Math.PI;
          return {
            x: Math.cos(angle) * orbitRadius,
            y: Math.sin(angle) * orbitRadius,
          };
        },
        (node) => (node.networkIndex === null ? 0.09 : 0.3),
      ),
    );

    graph.d3ReheatSimulation?.();
  }, [size.width, size.height, networkCount, cases.length, connections.length]);

  const clusteredCount = cases.filter((c) => c.networkId !== null).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <p className="text-[14px]">
            <strong className="font-semibold">
              {networks.length} hidden network
              {networks.length === 1 ? "" : "s"}
            </strong>{" "}
            <span className="text-muted-foreground">
              across {cases.length} individually-cleared cases —{" "}
              {clusteredCount} case{clusteredCount === 1 ? "" : "s"} involved
            </span>
          </p>
          <Legend />
        </div>

        <div ref={containerRef} className="h-[560px] w-full bg-[#fcfbf8]">
          {size.width > 0 && (
            <ForceGraph2D
              width={size.width}
              height={size.height}
              graphData={data}
              backgroundColor="#fcfbf8"
              nodeRelSize={6}
              nodeCanvasObject={drawNode as never}
              nodePointerAreaPaint={((
                node: NodeDatum,
                color: string,
                ctx: CanvasRenderingContext2D,
              ) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, 12, 0, 2 * Math.PI);
                ctx.fill();
              }) as never}
              linkCanvasObject={drawLink as never}
              linkPointerAreaPaint={((
                link: LinkDatum,
                color: string,
                ctx: CanvasRenderingContext2D,
              ) => {
                const s = link.source as NodeDatum;
                const t = link.target as NodeDatum;
                if (s.x === undefined || t.x === undefined) return;
                ctx.strokeStyle = color;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(s.x!, s.y!);
                ctx.lineTo(t.x!, t.y!);
                ctx.stroke();
              }) as never}
              onLinkClick={((link: LinkDatum) =>
                setSelectedLink(link.connection)) as never}
              onNodeClick={((node: NodeDatum) => {
                setHoveredNetwork(
                  node.networkId === hoveredNetwork ? null : node.networkId,
                );
              }) as never}
              onBackgroundClick={() => {
                setSelectedLink(null);
                setHoveredNetwork(null);
              }}
              ref={graphRef}
              cooldownTicks={200}
              d3VelocityDecay={0.3}
              onEngineStop={() => graphRef.current?.zoomToFit(500, 70)}
            />
          )}
        </div>
      </div>

      <aside className="space-y-4">
        {selectedLink ? (
          <ConnectionCard
            connection={selectedLink}
            onClose={() => setSelectedLink(null)}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-[14px] font-semibold">Reading the graph</h2>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
              <li>
                Grey dots are cases with no link to anything else — the majority.
              </li>
              <li>
                Coloured clusters are cases that share attributes. Click a node
                to isolate its network.
              </li>
              <li>
                Click any edge to see the exact shared value and why it was
                matched.
              </li>
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-[14px] font-semibold">Detected networks</h2>
          {networks.length === 0 ? (
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              No networks yet. Run the cross-case analysis first.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {networks.map((n, i) => (
                <li key={n.id}>
                  <Link
                    href={`/networks/${n.id}`}
                    onMouseEnter={() => setHoveredNetwork(n.id)}
                    onMouseLeave={() => setHoveredNetwork(null)}
                    className="block rounded-lg border border-hairline p-3.5 transition-colors hover:border-ring hover:bg-band"
                  >
                    <span className="flex items-start gap-2.5">
                      <span
                        className="mt-1 size-2.5 shrink-0 rounded-full"
                        style={{
                          background:
                            NETWORK_COLORS[i % NETWORK_COLORS.length],
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium leading-snug">
                          {n.name}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <RiskBadge level={n.risk_level} />
                          <span className="text-[12px] text-muted-foreground">
                            {n.memberCount} cases
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full"
          style={{ background: ISOLATED_COLOR }}
        />
        Unconnected
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="22" height="8" aria-hidden="true">
          <line
            x1="1"
            y1="4"
            x2="21"
            y2="4"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        Rule-based link
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="22" height="8" aria-hidden="true">
          <line
            x1="1"
            y1="4"
            x2="21"
            y2="4"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
        Claude-adjudicated
      </span>
    </div>
  );
}

function ConnectionCard({
  connection,
  onClose,
}: {
  connection: EnrichedConnection;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
            {ENTITY_LABELS[connection.match_basis]}
          </p>
          <p className="mt-1 text-[14px] font-semibold">
            {CONNECTION_LABELS[connection.connection_type]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close connection details"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-4">
        <SharedValue
          caseRef={connection.case_a_ref}
          businessName={connection.case_a_name}
          value={connection.value_a}
        />
        <SharedValue
          caseRef={connection.case_b_ref}
          businessName={connection.case_b_name}
          value={connection.value_b}
        />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <DetectionBadge by={connection.detected_by} />
          <span className="text-[12px] text-muted-foreground">
            {formatConfidence(connection.confidence)} confidence
          </span>
        </div>

        <div className="rounded-lg bg-band px-3.5 py-3">
          <p className="text-[13.5px] leading-relaxed">
            {connection.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}

function SharedValue({
  caseRef,
  businessName,
  value,
}: {
  caseRef: string;
  businessName: string;
  value: string;
}) {
  return (
    <div>
      <Link
        href={`/cases/${caseRef}`}
        className="text-[12px] text-muted-foreground hover:text-foreground hover:underline"
      >
        {caseRef} · {businessName}
      </Link>
      <p
        className={cn(
          "mt-1 rounded-md border border-hairline bg-band/60 px-2.5 py-1.5",
          "font-mono text-[12.5px] leading-snug break-words",
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}
