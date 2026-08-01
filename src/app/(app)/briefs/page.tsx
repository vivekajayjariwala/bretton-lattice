import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/badges";
import { getNetworks } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BriefsPage() {
  const networks = await getNetworks();

  return (
    <>
      <PageHeader
        title="Risk briefs"
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-warn-soft text-warn">
            <FileText className="size-5" strokeWidth={1.75} />
          </span>
        }
        meta={
          <p className="max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
            One brief per detected network. This is the artifact the cross-case
            layer produces — a written assessment about a set of cases, not
            about any one of them.
          </p>
        }
      />

      <div className="flex-1 px-8 py-6">
        {networks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-20 text-center">
            <p className="text-[16px] font-medium">No briefs yet</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
              Briefs are written when the analysis finds a network of two or
              more connected cases.
            </p>
            <Link
              href="/analysis"
              className="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Run cross-case analysis
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {networks.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/networks/${n.id}`}
                  className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[16px] font-semibold leading-snug">
                      {n.name}
                    </h2>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <RiskBadge level={n.risk_level} />
                    <span className="text-[12.5px] text-muted-foreground">
                      {n.members.length} cases · {n.connectionCount} connections
                    </span>
                  </div>

                  {n.summary && (
                    <p className="mt-4 line-clamp-4 text-[14px] leading-relaxed text-foreground/80">
                      {n.summary.split(/\n\s*\n/)[0]}
                    </p>
                  )}

                  <div className="mt-auto pt-5">
                    <p className="flex flex-wrap gap-1.5">
                      {n.members.map((m) => (
                        <span
                          key={m.id}
                          className="rounded bg-secondary px-1.5 py-0.5 text-[12px]"
                        >
                          {m.case_ref}
                        </span>
                      ))}
                    </p>
                    <p className="mt-3 text-[12px] text-muted-foreground">
                      Detected {formatDateTime(n.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
