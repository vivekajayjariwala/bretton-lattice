/** Stage 3 standalone: cluster connected cases and write network briefs. */
import "dotenv/config";
import { createWriteClient } from "../src/lib/supabase";
import { runClustering } from "../src/lib/pipeline/cluster";

runClustering(createWriteClient(), null, (done, total) =>
  console.log(`  brief ${done}/${total}`),
)
  .then((r) =>
    console.log(
      `Done. ${r.networksCreated} networks, ${r.findingsCreated} findings. ` +
        `Tokens in/out: ${r.usage.input}/${r.usage.output}`,
    ),
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
