import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AssigneeChip, ClearedBadge, ENTITY_LABELS } from "@/components/badges";
import { getCase } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Read-only view of an original case file. Deliberately minimal — Lattice does
 * not re-investigate or re-decide individual cases. This screen exists so the
 * network briefs can link back to their source material.
 */
export default async function CasePage({
  params,
}: {
  params: Promise<{ caseRef: string }>;
}) {
  const { caseRef } = await params;
  const result = await getCase(decodeURIComponent(caseRef));
  if (!result) notFound();

  const { caseRow, entities } = result;
  const grouped = entities.reduce<Record<string, typeof entities>>(
    (acc, e) => {
      (acc[e.entity_type] ??= []).push(e);
      return acc;
    },
    {},
  );

  return (
    <>
      <PageHeader
        title={caseRow.business_name}
        crumbs={[
          { label: "Cleared cases", href: "/cases" },
          { label: caseRow.case_ref },
        ]}
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Building2 className="size-5" strokeWidth={1.75} />
          </span>
        }
        pill={<ClearedBadge />}
        meta={
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <Field label="Case reference" value={caseRow.case_ref} />
            <Field label="Review type" value={caseRow.case_type} />
            <Field label="Opened" value={formatDate(caseRow.opened_at)} />
            <Field label="Closed" value={formatDate(caseRow.closed_at)} />
            <div>
              <dt className="text-[13px] text-muted-foreground">Analyst</dt>
              <dd className="mt-1 text-[15px]">
                <AssigneeChip name={caseRow.assignee} />
              </dd>
            </div>
          </dl>
        }
      />

      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-xl border border-border bg-card p-8">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Original case file
            </h2>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-[14.5px] leading-[1.75]">
              {caseRow.raw_narrative}
            </pre>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Extracted attributes
              </h2>
              {entities.length === 0 ? (
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                  No entities extracted yet. Run the cross-case analysis to
                  populate this panel.
                </p>
              ) : (
                <dl className="mt-4 space-y-4">
                  {Object.entries(grouped).map(([type, list]) => (
                    <div key={type}>
                      <dt className="text-[12px] font-medium text-muted-foreground">
                        {ENTITY_LABELS[type as keyof typeof ENTITY_LABELS] ??
                          type}
                      </dt>
                      <dd className="mt-1 space-y-1">
                        {list.map((e) => (
                          <p key={e.id} className="text-[13.5px] leading-snug">
                            {e.value}
                          </p>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <p className="px-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Lattice does not re-open or re-decide individual cases. This view
              is read-only source material for the cross-case layer.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[15px]">{value}</dd>
    </div>
  );
}
