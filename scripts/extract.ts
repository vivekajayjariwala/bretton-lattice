/** Stage 1 standalone: extract entities from every seeded case. */
import "dotenv/config";
import { createWriteClient } from "../src/lib/supabase";
import { runExtraction } from "../src/lib/pipeline/extract";

runExtraction(createWriteClient(), (done, total) =>
  console.log(`  extracted ${done}/${total}`),
)
  .then((r) =>
    console.log(
      `Done. ${r.entitiesInserted} entities. Tokens in/out: ${r.usage.input}/${r.usage.output}`,
    ),
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
