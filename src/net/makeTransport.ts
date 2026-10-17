import { createBroadcastTransport } from "./broadcastTransport";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";
import { makeSupabaseLoader } from "./supabaseClient";
import { createSupabaseTransport } from "./supabaseTransport";
import type { TeamMode, TeamTransport } from "./transport";

/** Builds the transport factory for a given server config (the app uses the one from config.ts). */
export function makeTransportWith({ url, key }: { url: string; key: string }) {
  // supabase-js is only downloaded the first time someone goes online (or signs in).
  const loadClient = makeSupabaseLoader({ url, key });
  return (mode: TeamMode): TeamTransport =>
    mode === "local" ? createBroadcastTransport() : createSupabaseTransport(loadClient);
}

export const makeTransport = makeTransportWith({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });
