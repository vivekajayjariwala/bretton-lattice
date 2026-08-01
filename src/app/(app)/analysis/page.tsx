import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RunAnalysis } from "@/components/run-analysis";
import { getLatestRun, getNetworks } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import type { PipelineStats } from "@/lib/pipeline/run";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const [run, networks] = await Promise.all([getLatestRun(), getNetworks()]);
  const stats = (run?.stats ?? null) as PipelineStats | null;

  return (
    <>
      <PageHeader
        title="Run analysis"
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Sparkles className="size-5" strokeWidth={1.75} />
          </span>
        }
        pill={
          run?.status === "complete" ? (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-medium text-brand">
              Last run {formatDateTime(run.finished_at)}
            </span>
          ) : undefined
        }
        meta={
          <p className="max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
            The pipeline runs as a batch job over the whole case corpus. Results
            are written to Postgres, so the network views read from cached
            output rather than re-running the model on every page load.
          </p>
        }
      />

      <div className="flex-1 px-4 py-6 sm:px-8">
        <RunAnalysis hasRun={run?.status === "complete"} />

        {run?.status === "complete" && stats && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold">Last completed run</h2>
            <dl className="mt-4 grid gap-x-10 gap-y-4 text-[14px] sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Started" value={formatDateTime(run.started_at)} />
              <Stat label="Finished" value={formatDateTime(run.finished_at)} />
              <Stat
                label="Pairs sent to Claude"
                value={String(stats.candidatesAdjudicated ?? 0)}
              />
              <Stat
                label="Tokens in / out"
                value={`${stats.tokens?.input?.toLocaleString() ?? 0} / ${stats.tokens?.output?.toLocaleString() ?? 0}`}
              />
            </dl>

            {networks.length > 0 && (
              <div className="mt-6 border-t border-hairline pt-5">
                <p className="text-[14px]">
                  Found{" "}
                  <strong className="font-semibold">
                    {networks.length} network
                    {networks.length === 1 ? "" : "s"}
                  </strong>{" "}
                  spanning{" "}
                  {networks.reduce((sum, n) => sum + n.members.length, 0)} of{" "}
                  {stats.cases} cleared cases.{" "}
                  <Link
                    href="/networks"
                    className="font-medium text-brand underline underline-offset-2"
                  >
                    View the graph
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {run?.status === "failed" && (
          <div className="mt-8 rounded-xl border border-danger/25 bg-danger-soft p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-danger">
              Last run failed
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed">{run.error}</p>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
