/**
 * Loads .env.local (Next.js's convention) for the CLI scripts. Importing this
 * first in every script keeps them consistent with what `next dev` sees.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
