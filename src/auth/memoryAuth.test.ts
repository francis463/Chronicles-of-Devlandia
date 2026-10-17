import { describe, expect, it } from "vitest";
import { createMemoryAuth } from "./memoryAuth";

describe("createMemoryAuth", () => {
  it("signs up, then logs in; the name is unique ignoring case", async () => {
    const auth = createMemoryAuth();
    expect(await auth.signUp("Kai", "password1")).toEqual({ ok: true });
    expect(await auth.getAccount()).toMatchObject({ name: "Kai", hasRealEmail: false });
    await auth.logOut();
    expect(await auth.getAccount()).toBeNull();
    expect(await auth.signUp("kai", "password2")).toEqual({ ok: false, error: "name-taken" });
    expect(await auth.logIn("KAI", "password1")).toEqual({ ok: true });
  });

  it("validates like the server", async () => {
    const auth = createMemoryAuth();
    expect(await auth.signUp("x", "password1")).toEqual({ ok: false, error: "invalid-name" });
    expect(await auth.signUp("Kai", "short")).toEqual({ ok: false, error: "weak-password" });
  });

  it("gives wrong-credentials for both a wrong password and an unknown name", async () => {
    const auth = createMemoryAuth();
    await auth.signUp("Kai", "password1");
    expect(await auth.logIn("Kai", "nope-nope")).toEqual({ ok: false, error: "wrong-credentials" });
    expect(await auth.logIn("Zed", "password1")).toEqual({ ok: false, error: "wrong-credentials" });
  });

  it("is unreachable on demand", async () => {
    const auth = createMemoryAuth();
    auth.reachable = false;
    expect(await auth.logIn("Kai", "password1")).toEqual({ ok: false, error: "unreachable" });
    await expect(auth.getAccount()).rejects.toThrow();
  });

  it("emits events, supports Google, choose-name, recovery and add-email", async () => {
    const auth = createMemoryAuth();
    const seen: string[] = [];
    auth.onChange((e) => seen.push(e));
    await auth.logInWithGoogle();
    expect(await auth.getAccount()).toMatchObject({ name: null, hasRealEmail: true });
    expect(await auth.chooseName("Kai")).toEqual({ ok: true });
    expect(await auth.getAccount()).toMatchObject({ name: "Kai" });
    auth.emit("recovery");
    expect(await auth.setPassword("brand-new-pass")).toEqual({ ok: true });
    await auth.logOut();
    expect(seen).toEqual(["signedIn", "recovery", "signedOut"]);
  });

  it("forgot is always ok and remembers who asked", async () => {
    const auth = createMemoryAuth();
    expect(await auth.forgot("Nobody")).toEqual({ ok: true });
    expect(auth.lastForgot).toBe("Nobody");
  });
});
