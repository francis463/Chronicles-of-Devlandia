/** What the app knows about whoever is signed in. `name` is null until a Google player has chosen one. */
export type Account = { userId: string; name: string | null; hasRealEmail: boolean };

export type AuthError =
  | "wrong-credentials"
  | "name-taken"
  | "invalid-name"
  | "rude-name"
  | "weak-password"
  | "unreachable"
  | "expired"
  | "unknown";
export type Result = { ok: true } | { ok: false; error: AuthError };
export type AuthEvent = "signedIn" | "signedOut" | "recovery";

export interface AuthClient {
  /** The current account, or null when signed out. Rejects only when the server can't be reached. */
  getAccount(): Promise<Account | null>;
  onChange(cb: (e: AuthEvent) => void): () => void;
  signUp(name: string, password: string): Promise<Result>;
  logIn(name: string, password: string): Promise<Result>;
  logInWithGoogle(): Promise<Result>;
  /** Always ok (so it never reveals whether a name exists) unless the server is unreachable. */
  forgot(name: string): Promise<Result>;
  setPassword(password: string): Promise<Result>;
  addEmail(email: string): Promise<Result>;
  chooseName(name: string): Promise<Result>;
  logOut(): Promise<void>;
}

export const AUTH_ERROR_COPY: Record<AuthError, string> = {
  "wrong-credentials": "Wrong name or password.",
  "name-taken": "That name is taken.",
  "invalid-name": "Name: 3–12 letters, digits, - or _.",
  "rude-name": "Pick a different name.",
  "weak-password": "Password: at least 8 characters.",
  unreachable: "Can't reach the account server.",
  expired: "That link has expired. Ask for a new one.",
  unknown: "Something went wrong. Try again.",
};
