/** Runs the full pipeline: extract -> detect -> cluster. */
import "./env";
import { createWriteClient } from "../src/lib/supabase";
import { runPipeline } from "../src/lib/pipeline/run";

runPipeline(createWriteClient(), (e) => console.log(`[${e.stage}] ${e.message}`))
  .then((stats) => console.log(JSON.stringify(stats, null, 2)))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
