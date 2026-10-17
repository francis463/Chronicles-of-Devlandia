import type { SessionLike, SupabaseLike } from "../net/supabaseClient";

type Reply = { data: unknown; error: { code?: string; message?: string } | null };
type Calls = { name: string; args: unknown[] }[];

/**
 * A hand-written stand-in for the Supabase client, for the auth and progress tests.
 * Set the `*Reply` fields before the call under test; every call is recorded in `calls`.
 */
export function createFakeSupabase() {
  const calls: Calls = [];
  const listeners = new Set<(event: string, session: SessionLike | null) => void>();
  const fake = {
    calls,
    session: null as SessionLike | null,
    invokeReply: { data: { ok: true }, error: null } as { data: unknown; error: unknown },
    invokeThrows: null as Error | null,
    tableReplies: {} as Record<string, Reply>,
    insertReplies: {} as Record<string, Reply>,
    deleteReplies: {} as Record<string, Reply>,
    rpcReplies: {} as Record<string, Reply>,
    authError: null as unknown,
    emit: (event: string, session: SessionLike | null = null) => listeners.forEach((cb) => cb(event, session)),
  };
  const log = (name: string, ...args: unknown[]) => void calls.push({ name, args });
  const client = {
    auth: {
      getSession: async () => ({ data: { session: fake.session }, error: null }),
      setSession: async (s: unknown) => (log("auth.setSession", s), { error: fake.authError }),
      signInWithOAuth: async (a: unknown) => (log("auth.signInWithOAuth", a), { error: fake.authError }),
      updateUser: async (a: unknown) => (log("auth.updateUser", a), { error: fake.authError }),
      signOut: async () => (log("auth.signOut"), { error: null }),
      onAuthStateChange: (cb: (event: string, session: SessionLike | null) => void) => {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
    },
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (col: string, val: string) => {
          log(`from(${table}).select`, cols, col, val);
          const reply = fake.tableReplies[table] ?? { data: null, error: null };
          return Object.assign(Promise.resolve(reply), { maybeSingle: async () => reply });
        },
      }),
      insert: async (row: unknown) => (log(`from(${table}).insert`, row), fake.insertReplies[table] ?? { data: null, error: null }),
      delete: () => ({
        eq: async (col: string, val: string) => (log(`from(${table}).delete.eq`, col, val), fake.deleteReplies[table] ?? { data: null, error: null }),
      }),
    }),
    rpc: async (fn: string, args?: unknown) => (log("rpc", fn, ...(args === undefined ? [] : [args])), fake.rpcReplies[fn] ?? { data: null, error: null }),
    functions: {
      invoke: async (name: string, opts: { body: unknown }) => {
        log("functions.invoke", name, opts.body);
        if (fake.invokeThrows) throw fake.invokeThrows;
        return fake.invokeReply;
      },
    },
    channel: () => {
      throw new Error("not used");
    },
    removeChannel: async () => undefined,
    getChannels: () => [],
  };
  return { fake, client: client as unknown as SupabaseLike, load: async () => client as unknown as SupabaseLike };
}
