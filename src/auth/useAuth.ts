import { useCallback, useEffect, useMemo, useState } from "react";
import type { Account, AuthClient } from "./authClient";

export type AuthStatus = "loading" | "signedOut" | "needsName" | "signedIn" | "guest" | "recovery";

export type Auth = {
  status: AuthStatus;
  account: Account | null;
  /** The first account check couldn't reach the server. */
  offline: boolean;
  signUp: AuthClient["signUp"];
  logIn: AuthClient["logIn"];
  logInWithGoogle: AuthClient["logInWithGoogle"];
  forgot: AuthClient["forgot"];
  setPassword: AuthClient["setPassword"];
  addEmail: AuthClient["addEmail"];
  chooseName: AuthClient["chooseName"];
  /** Guest lasts until the page reloads or the player goes back to the login screen. */
  playAsGuest(): void;
  leaveGuest(): void;
  logOut(): Promise<void>;
};

type State = { status: AuthStatus; account: Account | null; offline: boolean };

/** Who is playing: loading, signed out, choosing a name, signed in, a guest, or setting a new password. */
export function useAuth(client: AuthClient): Auth {
  const [state, setState] = useState<State>({ status: "loading", account: null, offline: false });

  // `force` is for the player's own actions; events and the first check never pull a guest or a
  // password reset out of what they are doing.
  const refresh = useCallback(
    async (force: boolean) => {
      const keep = (s: State) => !force && (s.status === "guest" || s.status === "recovery");
      try {
        const account = await client.getAccount();
        setState((s) =>
          keep(s) ? s : { status: account ? (account.name ? "signedIn" : "needsName") : "signedOut", account, offline: false },
        );
      } catch {
        setState((s) => (keep(s) ? s : { status: "signedOut", account: null, offline: true }));
      }
    },
    [client],
  );

  useEffect(() => {
    void refresh(false);
    return client.onChange((event) => {
      if (event === "recovery") setState((s) => ({ ...s, status: "recovery" }));
      else void refresh(false);
    });
  }, [client, refresh]);

  return useMemo<Auth>(() => {
    const after =
      <A extends unknown[], R extends { ok: boolean }>(run: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        const result = await run(...args);
        if (result.ok) await refresh(true);
        return result;
      };
    return {
      ...state,
      signUp: after(client.signUp),
      logIn: after(client.logIn),
      logInWithGoogle: after(client.logInWithGoogle),
      forgot: client.forgot,
      setPassword: after(client.setPassword),
      addEmail: after(client.addEmail),
      chooseName: after(client.chooseName),
      playAsGuest: () => setState((s) => ({ ...s, status: "guest", account: null })),
      leaveGuest: () => setState((s) => (s.status === "guest" ? { ...s, status: "signedOut" } : s)),
      async logOut() {
        if (state.status === "guest") return;
        await client.logOut();
        setState({ status: "signedOut", account: null, offline: false });
      },
    };
  }, [client, refresh, state]);
}
