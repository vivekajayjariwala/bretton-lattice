import { createWriteClient } from "@/lib/supabase";
import { runPipeline, type PipelineEvent } from "@/lib/pipeline/run";

/**
 * Triggers the real pipeline and streams stage progress back as NDJSON.
 * This is the same code path `npm run pipeline` executes — the button is not a
 * simulation of the batch job, it is the batch job.
 */

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await runPipeline(createWriteClient(), send);
      } catch (err) {
        // runPipeline already emitted the error event and marked the run failed.
        if (!(err instanceof Error)) {
          send({ stage: "error", message: String(err) });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
