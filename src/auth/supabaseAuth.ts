import { isInternalEmail } from "./nameRules";
import type { SupabaseLike } from "../net/supabaseClient";
import type { Account, AuthClient, AuthError, AuthEvent, Result } from "./authClient";

const KNOWN: ReadonlySet<string> = new Set<AuthError>(["wrong-credentials", "name-taken", "invalid-name", "weak-password"]);
const EVENTS: Record<string, AuthEvent | undefined> = { SIGNED_IN: "signedIn", SIGNED_OUT: "signedOut", PASSWORD_RECOVERY: "recovery" };
const ok: Result = { ok: true };
const fail = (error: AuthError): Result => ({ ok: false, error });

const isNetwork = (e: unknown) =>
  e instanceof TypeError || (typeof e === "object" && e !== null && ((e as { name?: string }).name === "FunctionsFetchError" || /fetch|network/i.test((e as { message?: string }).message ?? "")));

/** What the account function said went wrong, from its error body when it sent one. */
async function functionError(error: unknown, data: unknown): Promise<AuthError> {
  if (isNetwork(error)) return "unreachable";
  const body = (data ?? (await (error as { context?: { json?: () => Promise<unknown> } }).context?.json?.().catch(() => null))) as { error?: string } | null;
  return body?.error && KNOWN.has(body.error) ? (body.error as AuthError) : "unknown";
}

/** The accounts client on a (lazily loaded) Supabase client. */
export function createSupabaseAuth(load: () => Promise<SupabaseLike>): AuthClient {
  const call = async (body: Record<string, unknown>): Promise<{ result: Result; data: unknown }> => {
    try {
      const client = await load();
      const { data, error } = await client.functions.invoke("account", { body });
      const failure = error ?? (data as { error?: string } | null)?.error;
      if (failure) return { result: fail(await functionError(error, data)), data: null };
      return { result: ok, data };
    } catch {
      return { result: fail("unreachable"), data: null };
    }
  };

  const withSession = async (body: Record<string, unknown>): Promise<Result> => {
    const { result, data } = await call(body);
    if (!result.ok) return result;
    const session = (data as { session?: { access_token: string; refresh_token: string } } | null)?.session;
    if (!session) return fail("unknown");
    const { error } = await (await load()).auth.setSession(session);
    return error ? fail("unknown") : ok;
  };

  const authResult = async (run: (c: SupabaseLike) => Promise<{ error: { message?: string } | null }>, onError: (m: string) => AuthError = () => "unknown"): Promise<Result> => {
    try {
      const { error } = await run(await load());
      return error ? fail(isNetwork(error) ? "unreachable" : onError(error.message ?? "")) : ok;
    } catch {
      return fail("unreachable");
    }
  };

  return {
    async getAccount(): Promise<Account | null> {
      const client = await load();
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      const { data: profile, error } = await client.from("profiles").select("name").eq("user_id", user.id).maybeSingle();
      if (error) throw new Error("Can't read the profile");
      return { userId: user.id, name: (profile as { name?: string } | null)?.name ?? null, hasRealEmail: !!user.email && !isInternalEmail(user.email) };
    },
    onChange(cb) {
      let off: (() => void) | null = null;
      let stopped = false;
      void load()
        .then((client) => {
          if (stopped) return;
          const { data } = client.auth.onAuthStateChange((event) => {
            const mapped = EVENTS[event];
            if (mapped) cb(mapped);
          });
          off = () => data.subscription.unsubscribe();
        })
        .catch(() => undefined);
      return () => {
        stopped = true;
        off?.();
      };
    },
    signUp: (name, password) => withSession({ action: "signup", name, password }),
    logIn: (name, password) => withSession({ action: "login", name, password }),
    logInWithGoogle: () =>
      authResult((c) => c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })),
    forgot: async (name) => (await call({ action: "forgot", name })).result,
    setPassword: (password) =>
      authResult((c) => c.auth.updateUser({ password }), (m) => (/session/i.test(m) ? "expired" : /password/i.test(m) ? "weak-password" : "unknown")),
    addEmail: (email) => authResult((c) => c.auth.updateUser({ email })),
    async chooseName(name) {
      try {
        const client = await load();
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        if (!user) return fail("expired");
        const { error } = await client.from("profiles").insert({ user_id: user.id, name });
        if (!error) return ok;
        return fail(error.code === "23505" ? "name-taken" : error.code === "23514" ? "invalid-name" : "unknown");
      } catch {
        return fail("unreachable");
      }
    },
    async logOut() {
      try {
        await (await load()).auth.signOut();
      } catch {
        /* signing out of an unreachable server still leaves the page signed out */
      }
    },
  };
}
