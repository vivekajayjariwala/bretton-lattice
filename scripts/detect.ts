/** Stage 2 standalone: detect connections between extracted entities. */
import "dotenv/config";
import { createWriteClient } from "../src/lib/supabase";
import { runDetection } from "../src/lib/pipeline/detect";

runDetection(createWriteClient(), null, (stage, done, total) =>
  console.log(`  ${stage} ${done}/${total}`),
)
  .then((r) =>
    console.log(
      `Done. ${r.deterministic} deterministic + ${r.adjudicated} Claude-adjudicated ` +
        `(from ${r.candidatesConsidered} candidates). Tokens in/out: ${r.usage.input}/${r.usage.output}`,
    ),
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
