import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";
import type { RealtimeClientLike } from "./supabaseTransport";

export type AuthUserLike = { id: string; email?: string | null };
export type SessionLike = { user: AuthUserLike };
type ErrorLike = { code?: string; message?: string; name?: string } | null;

/** The slice of Supabase Auth the app uses (kept narrow so tests can fake it). */
export type AuthApiLike = {
  getSession(): Promise<{ data: { session: SessionLike | null }; error: unknown }>;
  setSession(s: { access_token: string; refresh_token: string }): Promise<{ error: ErrorLike }>;
  signInWithOAuth(a: { provider: "google"; options?: { redirectTo?: string } }): Promise<{ error: ErrorLike }>;
  updateUser(a: { password?: string; email?: string }): Promise<{ error: ErrorLike }>;
  signOut(): Promise<{ error: ErrorLike }>;
  onAuthStateChange(cb: (event: string, session: SessionLike | null) => void): { data: { subscription: { unsubscribe(): void } } };
};

export type QueryResult = { data: unknown; error: ErrorLike };
export type TableLike = {
  select(cols: string): { eq(col: string, val: string): PromiseLike<QueryResult> & { maybeSingle(): Promise<QueryResult> } };
  insert(row: object): PromiseLike<QueryResult>;
};

/** The whole Supabase client as the app sees it: Realtime for team play, Auth, tables and functions. */
export type SupabaseLike = RealtimeClientLike & {
  auth: AuthApiLike;
  from(table: string): TableLike;
  functions: { invoke(name: string, opts: { body: unknown }): Promise<{ data: unknown; error: unknown }> };
};

/**
 * One memoized client for team play and accounts (two clients would fight over the stored session).
 * supabase-js is only downloaded on first use, so solo and guest play never load it.
 */
export function makeSupabaseLoader({ url, key }: { url: string; key: string }): () => Promise<SupabaseLike> {
  let client: Promise<SupabaseLike> | null = null;
  return () => {
    if (!url || !key) return Promise.reject(new Error("Supabase is not configured"));
    client ??= import("@supabase/supabase-js").then(
      ({ createClient }) => createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } }) as unknown as SupabaseLike,
    );
    return client;
  };
}

export const loadSupabase: () => Promise<SupabaseLike> = makeSupabaseLoader({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });
