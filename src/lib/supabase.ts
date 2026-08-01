import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Note: supabase-js always constructs a realtime client, which needs a global
// WebSocket. Node 22+ provides one; on Node 20 this throws at client creation.
// See .nvmrc / package.json engines.
export type Db = SupabaseClient<Database>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Read-only client for server components and the browser. Anon key + RLS. */
export function createReadClient(): Db {
  return createClient<Database>(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } },
  );
}

/**
 * Write client for the pipeline (scripts + /api/analysis/run). Service-role key
 * bypasses RLS, so this must never be imported into a client component.
 */
export function createWriteClient(): Db {
  return createClient<Database>(
    process.env.SUPABASE_URL ?? required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}
