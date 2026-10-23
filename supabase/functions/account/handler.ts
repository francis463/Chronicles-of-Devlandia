import { accountKey, internalEmail, isInternalEmail, validateName, validatePassword } from "./rules.ts";

export type Session = { access_token: string; refresh_token: string };

/** What the function needs from Supabase with the service-role key (kept small so the tests can fake it). */
export type AdminLike = {
  profileByKey(nameKey: string): Promise<{ userId: string } | null>;
  emailOf(userId: string): Promise<string | null>;
  createUser(email: string, password: string): Promise<{ userId: string } | { error: "exists" | "failed" }>;
  insertProfile(userId: string, name: string): Promise<{ ok: true } | { error: "duplicate" | "failed" }>;
  deleteUser(userId: string): Promise<void>;
};
/** A fresh, non-persisting client with the public key: the only way a password is ever checked. */
export type AnonLike = {
  signIn(email: string, password: string): Promise<Session | null>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
};
/** `siteUrls` are the only origins a reset link may point to; the request's Origin header is just a claim. */
export type Deps = { admin: AdminLike; anon: () => AnonLike; origin: string | null; siteUrls: string[] };
export type Reply = { status: number; body: { session?: Session; ok?: true; error?: string } };

/** No valid name contains a dot, so this address can never belong to a real player. */
const NO_SUCH_PLAYER = internalEmail("no.such.player");
const WRONG: Reply = { status: 400, body: { error: "wrong-credentials" } };
const fail = (status: number, error: string): Reply => ({ status, body: { error } });
const text = (v: unknown) => (typeof v === "string" ? v : "");

export async function handle(req: { action?: string; name?: string; password?: string }, deps: Deps): Promise<Reply> {
  const name = text(req.name).trim();
  const password = text(req.password);
  const { admin } = deps;

  if (req.action === "signup") {
    const bad = validateName(name) ?? validatePassword(password);
    if (bad) return fail(400, bad);
    if (await admin.profileByKey(accountKey(name))) return fail(409, "name-taken");
    const created = await admin.createUser(internalEmail(name), password);
    if ("error" in created) return fail(created.error === "exists" ? 409 : 500, created.error === "exists" ? "name-taken" : "unknown");
    const saved = await admin.insertProfile(created.userId, name);
    if ("error" in saved) {
      await admin.deleteUser(created.userId);
      return saved.error === "duplicate" ? fail(409, "name-taken") : fail(500, "unknown");
    }
    try {
      const session = await deps.anon().signIn(internalEmail(name), password);
      return session ? { status: 200, body: { session } } : fail(500, "unknown");
    } catch {
      return fail(503, "unknown");
    }
  }

  if (req.action === "login") {
    const profile = validateName(name) ? null : await admin.profileByKey(accountKey(name));
    const email = profile ? await admin.emailOf(profile.userId) : null;
    // An unknown name still makes one sign-in attempt, so both failures cost about the same.
    // A rate-limit or server error is not a wrong password, so it is told apart.
    try {
      const session = await deps.anon().signIn(email ?? NO_SUCH_PLAYER, password);
      return profile && email && session ? { status: 200, body: { session } } : WRONG;
    } catch {
      return fail(503, "unknown");
    }
  }

  if (req.action === "forgot") {
    // Always the same answer, whether or not the name exists or has an email.
    try {
      const profile = validateName(name) ? null : await admin.profileByKey(accountKey(name));
      const email = profile ? await admin.emailOf(profile.userId) : null;
      if (email && !isInternalEmail(email) && deps.origin && deps.siteUrls.includes(deps.origin)) await deps.anon().resetPassword(email, deps.origin);
    } catch {
      /* never reveal anything through an error */
    }
    return { status: 200, body: { ok: true } };
  }

  return fail(400, "unknown");
}
