import { createBroadcastTransport } from "./broadcastTransport";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";
import { createSupabaseTransport, type RealtimeClientLike } from "./supabaseTransport";
import type { TeamMode, TeamTransport } from "./transport";

/** Builds the transport factory for a given server config (the app uses the one from config.ts). */
export function makeTransportWith({ url, key }: { url: string; key: string }) {
  let client: Promise<RealtimeClientLike> | null = null;
  // supabase-js is only downloaded the first time someone goes online.
  const loadClient = () => {
    if (!url || !key) return Promise.reject(new Error("Team server not configured"));
    client ??= import("@supabase/supabase-js").then(
      ({ createClient }) =>
        createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } }) as unknown as RealtimeClientLike,
    );
    return client;
  };
  return (mode: TeamMode): TeamTransport =>
    mode === "local" ? createBroadcastTransport() : createSupabaseTransport(loadClient);
}

export const makeTransport = makeTransportWith({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });
