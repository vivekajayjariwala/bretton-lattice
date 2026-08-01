import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  ClearedBadge,
  CONNECTION_LABELS,
  DetectionBadge,
  ENTITY_LABELS,
  RiskBadge,
  RISK_LABELS,
} from "@/components/badges";
import { getNetwork } from "@/lib/queries";
import { formatConfidence, formatDate, formatDateTime } from "@/lib/format";
import type { EnrichedConnection } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * The risk brief. Deliberately shaped unlike a single-case narrative: it is
 * about a set of cases, its evidence is connections rather than documents, and
 * its unit of output is a finding that cites specific shared attributes.
 */
export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const network = await getNetwork(id);
  if (!network) notFound();

  const connectionById = new Map(network.connections.map((c) => [c.id, c]));

  // Group the evidence by what is actually shared — that is how an analyst
  // reads it, not connection by connection.
  const sharedAttributes = groupByAttribute(network.connections);

  return (
    <>
      <PageHeader
        title={network.name}
        crumbs={[
          { label: "Networks", href: "/networks" },
          { label: "Risk brief" },
        ]}
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <FileText className="size-5" strokeWidth={1.75} />
          </span>
        }
        pill={<RiskBadge level={network.risk_level} />}
        actions={
          <Link
            href="/networks"
            className="no-print rounded-lg border border-border bg-card px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-muted"
          >
            Back to graph
          </Link>
        }
        meta={
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <Meta label="Cases in network" value={String(network.members.length)} />
            <Meta
              label="Shared attributes"
              value={String(sharedAttributes.length)}
            />
            <Meta
              label="Connections"
              value={String(network.connections.length)}
            />
            <Meta label="Detected" value={formatDateTime(network.created_at)} />
            <Meta label="Assessment" value={RISK_LABELS[network.risk_level]} />
          </dl>
        }
      />

      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Banner memberCount={network.members.length} />

          {network.summary && (
            <Section title="Assessment">
              <div className="space-y-4 text-[15px] leading-[1.75]">
                {network.summary.split(/\n\s*\n/).map((para, i) => (
                  <p key={i}>{para.trim()}</p>
                ))}
              </div>
            </Section>
          )}

          {network.findings.length > 0 && (
            <Section title="Findings">
              <ol className="space-y-5">
                {network.findings.map((finding) => (
                  <li
                    key={finding.id}
                    className="rounded-lg border border-hairline p-5"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold">
                        {finding.ordinal}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-[1.7]">
                          {finding.finding_text}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <RiskBadge level={finding.risk_level} />
                        </div>

                        {finding.supporting_connection_ids.length > 0 && (
                          <div className="mt-4 border-t border-hairline pt-3.5">
                            <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                              Supporting evidence
                            </p>
                            <ul className="mt-2.5 space-y-2">
                              {finding.supporting_connection_ids.map((cid) => {
                                const c = connectionById.get(cid);
                                if (!c) return null;
                                return (
                                  <li
                                    key={cid}
                                    className="rounded-md bg-band px-3 py-2 text-[13px] leading-relaxed"
                                  >
                                    <span className="font-medium">
                                      {c.case_a_ref} ↔ {c.case_b_ref}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      · {ENTITY_LABELS[c.match_basis]} ·{" "}
                                      {formatConfidence(c.confidence)}
                                    </span>
                                    <span className="mt-1 block font-mono text-[12px] break-words">
                                      {c.value_a}
                                      {c.value_a !== c.value_b && (
                                        <>
                                          {" "}
                                          <span className="text-muted-foreground">
                                            ↔
                                          </span>{" "}
                                          {c.value_b}
                                        </>
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <Section title="Shared attributes">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    <th className="pb-2.5 pr-4 font-medium text-muted-foreground">
                      Attribute
                    </th>
                    <th className="pb-2.5 pr-4 font-medium text-muted-foreground">
                      Value
                    </th>
                    <th className="pb-2.5 pr-4 font-medium text-muted-foreground">
                      Cases
                    </th>
                    <th className="pb-2.5 font-medium text-muted-foreground">
                      Detection
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sharedAttributes.map((attr) => (
                    <tr
                      key={attr.key}
                      className="border-b border-hairline last:border-0 align-top"
                    >
                      <td className="py-3 pr-4">
                        {ENTITY_LABELS[attr.matchBasis]}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[12.5px] leading-snug">
                        {attr.values.map((v) => (
                          <span key={v} className="block break-words">
                            {v}
                          </span>
                        ))}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex flex-wrap gap-1.5">
                          {attr.caseRefs.map((ref) => (
                            <Link
                              key={ref}
                              href={`/cases/${ref}`}
                              className="rounded bg-secondary px-1.5 py-0.5 text-[12px] hover:underline"
                            >
                              {ref}
                            </Link>
                          ))}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="flex flex-col items-start gap-1.5">
                          <DetectionBadge by={attr.detectedBy} />
                          <span className="text-[12px] text-muted-foreground">
                            {CONNECTION_LABELS[attr.connectionType]}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Member cases">
            <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">
              Each of these was individually investigated and closed as cleared.
              Nothing below reverses those dispositions.
            </p>
            <ul className="divide-y divide-hairline">
              {network.members.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/cases/${m.case_ref}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 hover:bg-band/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {m.business_name}
                      </span>
                      <span className="block text-[12.5px] text-muted-foreground">
                        {m.case_ref} · {m.case_type} · closed{" "}
                        {formatDate(m.closed_at)}
                      </span>
                    </span>
                    <ClearedBadge />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <p className="no-print flex items-center gap-2 px-1 pb-4 text-[12.5px] text-muted-foreground">
            <Printer className="size-3.5" />
            This brief is print-friendly — use your browser&apos;s print dialog
            to export a PDF for the case file.
          </p>
        </div>
      </div>
    </>
  );
}

function Banner({ memberCount }: { memberCount: number }) {
  return (
    <div className="rounded-xl border border-warn/25 bg-warn-soft px-5 py-4">
      <p className="text-[14px] leading-relaxed">
        <strong className="font-semibold">
          All {memberCount} cases in this network were previously cleared.
        </strong>{" "}
        This brief describes structure that is only visible when the case files
        are read together. It is a prompt to look again, not a finding of
        wrongdoing.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[15px]">{value}</dd>
    </div>
  );
}

type SharedAttribute = {
  key: string;
  matchBasis: EnrichedConnection["match_basis"];
  connectionType: EnrichedConnection["connection_type"];
  detectedBy: EnrichedConnection["detected_by"];
  values: string[];
  caseRefs: string[];
};

/**
 * Collapses connections into one row per shared thing. Three cases sharing one
 * registered agent produce three pairwise connections but only one attribute.
 */
function groupByAttribute(
  connections: EnrichedConnection[],
): SharedAttribute[] {
  const groups = new Map<string, SharedAttribute>();

  for (const c of connections) {
    // Group on the attribute type plus the canonical-ish value, so spelling
    // variants of the same shared thing land in one row.
    const signature = [c.value_a, c.value_b]
      .map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .sort()[0];
    const key = `${c.match_basis}::${signature}`;

    const existing = groups.get(key);
    if (existing) {
      for (const v of [c.value_a, c.value_b]) {
        if (v && !existing.values.includes(v)) existing.values.push(v);
      }
      for (const ref of [c.case_a_ref, c.case_b_ref]) {
        if (!existing.caseRefs.includes(ref)) existing.caseRefs.push(ref);
      }
      // Prefer showing the rule-based provenance when both exist.
      if (c.detected_by === "deterministic") {
        existing.detectedBy = "deterministic";
        existing.connectionType = c.connection_type;
      }
    } else {
      groups.set(key, {
        key,
        matchBasis: c.match_basis,
        connectionType: c.connection_type,
        detectedBy: c.detected_by,
        values: [...new Set([c.value_a, c.value_b].filter(Boolean))],
        caseRefs: [...new Set([c.case_a_ref, c.case_b_ref])],
      });
    }
  }

  return [...groups.values()].map((g) => ({
    ...g,
    caseRefs: g.caseRefs.sort(),
  }));
}
