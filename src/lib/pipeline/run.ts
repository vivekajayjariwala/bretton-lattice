import type { Db } from "@/lib/supabase";
import { runExtraction } from "@/lib/pipeline/extract";
import { runDetection } from "@/lib/pipeline/detect";
import { runClustering } from "@/lib/pipeline/cluster";

/**
 * The full pipeline: extract -> detect -> cluster. The CLI scripts and
 * /api/analysis/run are both thin wrappers over this, so what the demo button
 * triggers is the same code path the batch job runs.
 */

export type PipelineEvent =
  | { stage: "extract" | "detect" | "cluster"; message: string; done?: number; total?: number }
  | { stage: "complete"; message: string; stats: PipelineStats }
  | { stage: "error"; message: string };

export type PipelineStats = {
  cases: number;
  entities: number;
  connections: number;
  deterministicConnections: number;
  claudeConnections: number;
  candidatesAdjudicated: number;
  networks: number;
  findings: number;
  tokens: { input: number; output: number };
};

export async function runPipeline(
  db: Db,
  emit: (event: PipelineEvent) => void = () => {},
): Promise<PipelineStats> {
  const { data: run, error: runError } = await db
    .from("analysis_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  if (runError) throw runError;

  try {
    emit({ stage: "extract", message: "Reading closed case files…" });
    const extraction = await runExtraction(db, (done, total) =>
      emit({
        stage: "extract",
        message: `Extracted entities from ${done} of ${total} cases`,
        done,
        total,
      }),
    );

    emit({
      stage: "detect",
      message: `Comparing ${extraction.entitiesInserted} entities across all cases…`,
    });
    const detection = await runDetection(db, run.id, (_stage, done, total) =>
      emit({
        stage: "detect",
        message: `Adjudicating ambiguous pairs — batch ${done} of ${total}`,
        done,
        total,
      }),
    );

    emit({ stage: "cluster", message: "Grouping connected cases into networks…" });
    const clustering = await runClustering(db, run.id, (done, total) =>
      emit({
        stage: "cluster",
        message: `Wrote brief ${done} of ${total}`,
        done,
        total,
      }),
    );

    const { count: caseCount } = await db
      .from("cases")
      .select("id", { count: "exact", head: true });

    const stats: PipelineStats = {
      cases: caseCount ?? 0,
      entities: extraction.entitiesInserted,
      connections: detection.deterministic + detection.adjudicated,
      deterministicConnections: detection.deterministic,
      claudeConnections: detection.adjudicated,
      candidatesAdjudicated: detection.candidatesConsidered,
      networks: clustering.networksCreated,
      findings: clustering.findingsCreated,
      tokens: {
        input:
          extraction.usage.input + detection.usage.input + clustering.usage.input,
        output:
          extraction.usage.output +
          detection.usage.output +
          clustering.usage.output,
      },
    };

    await db
      .from("analysis_runs")
      .update({
        status: "complete",
        finished_at: new Date().toISOString(),
        stats,
      })
      .eq("id", run.id);

    emit({
      stage: "complete",
      message: `${stats.networks} network${stats.networks === 1 ? "" : "s"} found across ${stats.cases} cleared cases`,
      stats,
    });

    return stats;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("analysis_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error: message,
      })
      .eq("id", run.id);
    emit({ stage: "error", message });
    throw err;
  }
}
