import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMemoryAuth } from "./memoryAuth";
import { useAuth } from "./useAuth";

const setup = () => {
  const client = createMemoryAuth();
  const hook = renderHook(() => useAuth(client));
  return { client, ...hook };
};
const status = (r: ReturnType<typeof setup>) => r.result.current.status;

describe("useAuth", () => {
  it("starts loading, then signed out with no session", async () => {
    const r = setup();
    expect(status(r)).toBe("loading");
    await waitFor(() => expect(status(r)).toBe("signedOut"));
    expect(r.result.current.account).toBeNull();
    expect(r.result.current.offline).toBe(false);
  });

  it("an existing session with a name is signed in", async () => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    const { result } = renderHook(() => useAuth(client));
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(result.current.account?.name).toBe("Kai");
  });

  it("a session with no name (Google) needs a name, then is signed in once it is chosen", async () => {
    const client = createMemoryAuth();
    await client.logInWithGoogle();
    const { result } = renderHook(() => useAuth(client));
    await waitFor(() => expect(result.current.status).toBe("needsName"));
    await act(async () => expect(await result.current.chooseName("Kai")).toEqual({ ok: true }));
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(result.current.account?.name).toBe("Kai");
  });

  it("signUp and logIn sign you in; a failed one returns its error and stays signed out", async () => {
    const r = setup();
    await waitFor(() => expect(status(r)).toBe("signedOut"));
    await act(async () => expect(await r.result.current.signUp("Kai", "password1")).toEqual({ ok: true }));
    await waitFor(() => expect(status(r)).toBe("signedIn"));
    await act(() => r.result.current.logOut());
    await waitFor(() => expect(status(r)).toBe("signedOut"));
    await act(async () => expect(await r.result.current.signUp("kai", "password2")).toEqual({ ok: false, error: "name-taken" }));
    expect(status(r)).toBe("signedOut");
    await act(async () => expect(await r.result.current.logIn("Kai", "password1")).toEqual({ ok: true }));
    await waitFor(() => expect(status(r)).toBe("signedIn"));
  });

  it("playAsGuest gives guest; logOut does nothing to a guest; leaveGuest returns to the login screen", async () => {
    const r = setup();
    await waitFor(() => expect(status(r)).toBe("signedOut"));
    act(() => r.result.current.playAsGuest());
    expect(status(r)).toBe("guest");
    await act(() => r.result.current.logOut());
    expect(status(r)).toBe("guest");
    act(() => r.result.current.leaveGuest());
    expect(status(r)).toBe("signedOut");
  });

  it("can start as a guest, without waiting for the server", async () => {
    const client = createMemoryAuth();
    const { result } = renderHook(() => useAuth(client, "guest"));
    expect(result.current.status).toBe("guest");
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe("guest");
  });

  it("a guest stays a guest when the first account check finishes late", async () => {
    const r = setup();
    act(() => r.result.current.playAsGuest());
    await act(async () => {
      await Promise.resolve();
    });
    expect(status(r)).toBe("guest");
  });

  it("a recovery event shows the new-password screen; setting it signs you in", async () => {
    const r = setup();
    await waitFor(() => expect(status(r)).toBe("signedOut"));
    // The reset link signs the player in (they already have an account), then reports the recovery.
    await act(async () => void (await r.client.signUp("Kai", "password1")));
    await waitFor(() => expect(status(r)).toBe("signedIn"));
    await act(async () => r.client.emit("recovery"));
    expect(status(r)).toBe("recovery");
    await act(async () => expect(await r.result.current.setPassword("brand-new-pass")).toEqual({ ok: true }));
    await waitFor(() => expect(status(r)).toBe("signedIn"));
  });

  it("an unreachable server leaves you signed out and offline, and guest still works", async () => {
    const client = createMemoryAuth();
    client.reachable = false;
    const { result } = renderHook(() => useAuth(client));
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(result.current.offline).toBe(true);
    act(() => result.current.playAsGuest());
    expect(result.current.status).toBe("guest");
  });

  it("forgot and addEmail pass through to the client", async () => {
    const r = setup();
    await waitFor(() => expect(status(r)).toBe("signedOut"));
    await act(async () => void (await r.result.current.forgot("Kai")));
    expect(r.client.lastForgot).toBe("Kai");
    await act(async () => void (await r.result.current.signUp("Kai", "password1")));
    await act(async () => void (await r.result.current.addEmail("k@x.com")));
    expect(r.client.emailAdded).toBe("k@x.com");
    await waitFor(() => expect(r.result.current.account?.hasRealEmail).toBe(true));
  });

  it("a background auth event that can't reach the server keeps a signed-in player signed in", async () => {
    const r = setup();
    await act(async () => void (await r.client.signUp("Kai", "password1")));
    await waitFor(() => expect(status(r)).toBe("signedIn"));
    r.client.reachable = false;
    act(() => r.client.emit("signedIn"));
    await new Promise((res) => setTimeout(res, 20));
    expect(status(r)).toBe("signedIn");
    expect(r.result.current.account?.name).toBe("Kai");
  });
});
