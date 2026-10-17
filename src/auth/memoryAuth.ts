import type { ClassId } from "../game/classes";
import type { Account, AuthClient, AuthEvent, Result } from "./authClient";
import { accountKey, validateName, validatePassword } from "./nameRules";

type Stored = { userId: string; name: string; password: string; playerClass: ClassId | null };
export type MemoryAuth = AuthClient & {
  accounts: Map<string, Stored>;
  /** Set false to make every call fail as unreachable. */
  reachable: boolean;
  session: Account | null;
  /** Fire an auth event by hand (for example "recovery"). */
  emit(e: AuthEvent): void;
  lastForgot: string | null;
  emailAdded: string | null;
};

/** An in-memory AuthClient for tests: it behaves like the server (same rules, same errors). */
export function createMemoryAuth(): MemoryAuth {
  const listeners = new Set<(e: AuthEvent) => void>();
  const unreachable = (): Result => ({ ok: false, error: "unreachable" });
  let next = 1;
  const auth: MemoryAuth = {
    accounts: new Map(),
    reachable: true,
    session: null,
    lastForgot: null,
    emailAdded: null,
    emit: (e) => listeners.forEach((cb) => cb(e)),
    async getAccount() {
      if (!auth.reachable) throw new Error("unreachable");
      return auth.session ? { ...auth.session } : null;
    },
    onChange(cb) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    async signUp(name, password) {
      if (!auth.reachable) return unreachable();
      const bad = validateName(name) ?? validatePassword(password);
      if (bad) return { ok: false, error: bad };
      if (auth.accounts.has(accountKey(name))) return { ok: false, error: "name-taken" };
      const userId = `u${next++}`;
      auth.accounts.set(accountKey(name), { userId, name, password, playerClass: null });
      auth.session = { userId, name, hasRealEmail: false, playerClass: null };
      auth.emit("signedIn");
      return { ok: true };
    },
    async logIn(name, password) {
      if (!auth.reachable) return unreachable();
      const found = auth.accounts.get(accountKey(name));
      if (!found || found.password !== password) return { ok: false, error: "wrong-credentials" };
      auth.session = { userId: found.userId, name: found.name, hasRealEmail: false, playerClass: found.playerClass };
      auth.emit("signedIn");
      return { ok: true };
    },
    async logInWithGoogle() {
      if (!auth.reachable) return unreachable();
      auth.session = { userId: `g${next++}`, name: null, hasRealEmail: true, playerClass: null };
      auth.emit("signedIn");
      return { ok: true };
    },
    async forgot(name) {
      if (!auth.reachable) return unreachable();
      auth.lastForgot = name;
      return { ok: true };
    },
    async setPassword(password) {
      if (!auth.reachable) return unreachable();
      const weak = validatePassword(password);
      if (weak) return { ok: false, error: weak };
      if (!auth.session) auth.session = { userId: `r${next++}`, name: null, hasRealEmail: true, playerClass: null };
      for (const stored of auth.accounts.values()) if (stored.userId === auth.session.userId) stored.password = password;
      return { ok: true };
    },
    async addEmail(email) {
      if (!auth.reachable) return unreachable();
      auth.emailAdded = email;
      if (auth.session) auth.session = { ...auth.session, hasRealEmail: true };
      return { ok: true };
    },
    async chooseName(name) {
      if (!auth.reachable) return unreachable();
      const bad = validateName(name);
      if (bad) return { ok: false, error: bad };
      if (!auth.session) return { ok: false, error: "expired" };
      if (auth.accounts.has(accountKey(name))) return { ok: false, error: "name-taken" };
      auth.accounts.set(accountKey(name), { userId: auth.session.userId, name, password: "", playerClass: auth.session.playerClass });
      auth.session = { ...auth.session, name };
      return { ok: true };
    },
    async setClass(cls) {
      if (!auth.reachable) return unreachable();
      if (!auth.session) return { ok: false, error: "expired" };
      auth.session = { ...auth.session, playerClass: cls };
      for (const stored of auth.accounts.values()) if (stored.userId === auth.session.userId) stored.playerClass = cls;
      return { ok: true };
    },
    async logOut() {
      auth.session = null;
      auth.emit("signedOut");
    },
  };
  return auth;
}
