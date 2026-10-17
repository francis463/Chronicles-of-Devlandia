import { describe, expect, it } from "vitest";
import { handle, type AdminLike, type AnonLike } from "./handler";
import { internalEmail, validateName } from "./rules";

const SESSION = { access_token: "a", refresh_token: "r" };

/** Fakes that record every call; `profiles` maps name_key → user id, `emails` maps user id → auth email. */
function setup(over: { profiles?: Record<string, string>; emails?: Record<string, string>; passwords?: Record<string, string>; origin?: string | null; signInThrows?: boolean } = {}) {
  const calls: string[] = [];
  const profiles = { ...(over.profiles ?? {}) };
  const emails = { ...(over.emails ?? {}) };
  const passwords = { ...(over.passwords ?? {}) };
  let raceOnInsert = false;
  const admin: AdminLike = {
    profileByKey: async (key) => (profiles[key] ? { userId: profiles[key] } : null),
    emailOf: async (id) => emails[id] ?? null,
    createUser: async (email, password) => {
      calls.push(`createUser ${email}`);
      const userId = `u-${email}`;
      emails[userId] = email;
      passwords[email] = password;
      return { userId };
    },
    insertProfile: async (userId, name) => {
      calls.push(`insertProfile ${name}`);
      if (raceOnInsert) return { error: "duplicate" };
      profiles[name.toLowerCase()] = userId;
      return { ok: true };
    },
    deleteUser: async (id) => void calls.push(`deleteUser ${id}`),
  };
  const anon: AnonLike = {
    signIn: async (email, password) => {
      calls.push(`signIn ${email}`);
      if (over.signInThrows) throw new Error("rate limited");
      return passwords[email] === password ? SESSION : null;
    },
    resetPassword: async (email, redirectTo) => void calls.push(`reset ${email} ${redirectTo}`),
  };
  const deps = { admin, anon: () => anon, origin: over.origin === undefined ? "https://game.example" : over.origin, siteUrls: ["https://game.example", "http://localhost:5173"] };
  return { calls, profiles, deps, race: () => (raceOnInsert = true) };
}

describe("signup", () => {
  it("creates the user at the hidden address, inserts the profile, signs in and returns the session", async () => {
    const { calls, deps } = setup();
    const r = await handle({ action: "signup", name: "Kai", password: "password1" }, deps);
    expect(r).toEqual({ status: 200, body: { session: SESSION } });
    expect(calls).toEqual(["createUser kai@players.devlandia.invalid", "insertProfile Kai", "signIn kai@players.devlandia.invalid"]);
  });

  it("refuses a taken name (ignoring case) before creating anything", async () => {
    const { calls, deps } = setup({ profiles: { kai: "u1" } });
    expect(await handle({ action: "signup", name: "KAI", password: "password1" }, deps)).toEqual({ status: 409, body: { error: "name-taken" } });
    expect(calls).toEqual([]);
  });

  it("undoes the new user when the profile insert loses a race", async () => {
    const { calls, deps, race } = setup();
    race();
    expect(await handle({ action: "signup", name: "Kai", password: "password1" }, deps)).toEqual({ status: 409, body: { error: "name-taken" } });
    expect(calls.at(-1)).toBe("deleteUser u-kai@players.devlandia.invalid");
  });

  it("rejects a bad name or password", async () => {
    const { deps } = setup();
    expect((await handle({ action: "signup", name: "x", password: "password1" }, deps)).body).toEqual({ error: "invalid-name" });
    expect((await handle({ action: "signup", name: "Kai", password: "short" }, deps)).body).toEqual({ error: "weak-password" });
  });
});

describe("login", () => {
  const known = () =>
    setup({ profiles: { kai: "u1" }, emails: { u1: internalEmail("Kai") }, passwords: { [internalEmail("Kai")]: "password1" } });

  it("returns the session for the right name and password, using the account's current email", async () => {
    const { calls, deps } = setup({ profiles: { kai: "u1" }, emails: { u1: "kai@real.com" }, passwords: { "kai@real.com": "password1" } });
    expect(await handle({ action: "login", name: "kai", password: "password1" }, deps)).toEqual({ status: 200, body: { session: SESSION } });
    expect(calls).toEqual(["signIn kai@real.com"]);
  });

  it("answers an unknown name and a wrong password identically, and still makes one sign-in attempt for the unknown name (Review Focus 2)", async () => {
    const wrong = known();
    const a = await handle({ action: "login", name: "Kai", password: "not-it-not-it" }, wrong.deps);
    const unknown = known();
    const b = await handle({ action: "login", name: "Zed", password: "password1" }, unknown.deps);
    expect(a).toEqual({ status: 400, body: { error: "wrong-credentials" } });
    expect(b).toEqual(a);
    expect(wrong.calls).toHaveLength(1);
    expect(unknown.calls).toHaveLength(1);
  });

  it("treats a malformed name like an unknown one", async () => {
    const { deps } = known();
    expect(await handle({ action: "login", name: "", password: "" }, deps)).toEqual({ status: 400, body: { error: "wrong-credentials" } });
  });
});

describe("forgot", () => {
  const OK = { status: 200, body: { ok: true } };

  it("sends the reset link to a real email, to the caller's origin", async () => {
    const { calls, deps } = setup({ profiles: { kai: "u1" }, emails: { u1: "kai@real.com" } });
    expect(await handle({ action: "forgot", name: "Kai" }, deps)).toEqual(OK);
    expect(calls).toEqual(["reset kai@real.com https://game.example"]);
  });

  it("does nothing, and answers the same, for a hidden address, an unknown name or no origin", async () => {
    const hidden = setup({ profiles: { kai: "u1" }, emails: { u1: internalEmail("Kai") } });
    expect(await handle({ action: "forgot", name: "Kai" }, hidden.deps)).toEqual(OK);
    const unknown = setup();
    expect(await handle({ action: "forgot", name: "Zed" }, unknown.deps)).toEqual(OK);
    const noOrigin = setup({ profiles: { kai: "u1" }, emails: { u1: "kai@real.com" }, origin: null });
    expect(await handle({ action: "forgot", name: "Kai" }, noOrigin.deps)).toEqual(OK);
    expect([hidden.calls, unknown.calls, noOrigin.calls]).toEqual([[], [], []]);
  });
});

it("rejects an unknown action", async () => {
  expect(await handle({ action: "dance" }, setup().deps)).toEqual({ status: 400, body: { error: "unknown" } });
});

describe("review fixes", () => {
  it("forgot never sends a reset link to an origin that is not one of our own sites", async () => {
    const evil = setup({ profiles: { kai: "u1" }, emails: { u1: "kai@real.com" }, origin: "https://evil.vercel.app" });
    expect(await handle({ action: "forgot", name: "Kai" }, evil.deps)).toEqual({ status: 200, body: { ok: true } });
    expect(evil.calls).toEqual([]);
    const ok = setup({ profiles: { kai: "u1" }, emails: { u1: "kai@real.com" }, origin: "http://localhost:5173" });
    await handle({ action: "forgot", name: "Kai" }, ok.deps);
    expect(ok.calls).toEqual(["reset kai@real.com http://localhost:5173"]);
  });

  it("login answers a server or rate-limit failure as unknown, not as a wrong password", async () => {
    const { deps } = setup({ profiles: { kai: "u1" }, emails: { u1: "kai@players.devlandia.invalid" }, signInThrows: true });
    expect(await handle({ action: "login", name: "Kai", password: "password1" }, deps)).toEqual({ status: 503, body: { error: "unknown" } });
  });

  it("an unknown name signs in against an address no valid name can produce", async () => {
    const { calls, deps } = setup();
    await handle({ action: "login", name: "Zed", password: "password1" }, deps);
    const email = calls[0].replace("signIn ", "");
    expect(validateName(email.split("@")[0])).not.toBeNull();
  });
});
