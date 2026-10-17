import { describe, expect, it } from "vitest";
import { createSupabaseAuth } from "./supabaseAuth";
import { createFakeSupabase } from "./fakeSupabase";

const session = { access_token: "a", refresh_token: "r" };
const setup = () => {
  const s = createFakeSupabase();
  return { ...s, auth: createSupabaseAuth(s.load) };
};
const bodyError = (error: string) => ({ data: null, error: { context: { json: async () => ({ error }) } } });

describe("signUp and logIn", () => {
  it("call the account function, then adopt the returned session", async () => {
    const { fake, auth } = setup();
    fake.invokeReply = { data: { session }, error: null };
    expect(await auth.signUp("Kai", "password1")).toEqual({ ok: true });
    expect(await auth.logIn("Kai", "password1")).toEqual({ ok: true });
    expect(fake.calls.map((c) => c.name)).toEqual(["functions.invoke", "auth.setSession", "functions.invoke", "auth.setSession"]);
    expect(fake.calls[0].args).toEqual(["account", { action: "signup", name: "Kai", password: "password1" }]);
    expect(fake.calls[2].args).toEqual(["account", { action: "login", name: "Kai", password: "password1" }]);
    expect(fake.calls[1].args).toEqual([session]);
  });

  it.each(["name-taken", "invalid-name", "weak-password", "wrong-credentials"] as const)("maps the function's %s error", async (code) => {
    const { fake, auth } = setup();
    fake.invokeReply = bodyError(code);
    expect(await auth.logIn("Kai", "password1")).toEqual({ ok: false, error: code });
  });

  it("treats a network failure as unreachable, anything else as unknown", async () => {
    const { fake, auth } = setup();
    fake.invokeThrows = new TypeError("Failed to fetch");
    expect(await auth.logIn("Kai", "password1")).toEqual({ ok: false, error: "unreachable" });
    fake.invokeThrows = null;
    fake.invokeReply = { data: null, error: { name: "FunctionsFetchError" } };
    expect(await auth.logIn("Kai", "password1")).toEqual({ ok: false, error: "unreachable" });
    fake.invokeReply = bodyError("something-odd");
    expect(await auth.logIn("Kai", "password1")).toEqual({ ok: false, error: "unknown" });
  });
});

describe("the other sign-in paths", () => {
  it("forgot asks the function and is always ok unless unreachable", async () => {
    const { fake, auth } = setup();
    expect(await auth.forgot("Kai")).toEqual({ ok: true });
    expect(fake.calls[0].args).toEqual(["account", { action: "forgot", name: "Kai" }]);
    fake.invokeThrows = new TypeError("Failed to fetch");
    expect(await auth.forgot("Kai")).toEqual({ ok: false, error: "unreachable" });
  });

  it("Google redirects back to this origin", async () => {
    const { fake, auth } = setup();
    await auth.logInWithGoogle();
    expect(fake.calls[0]).toEqual({ name: "auth.signInWithOAuth", args: [{ provider: "google", options: { redirectTo: window.location.origin } }] });
  });

  it("setPassword and addEmail update the user", async () => {
    const { fake, auth } = setup();
    expect(await auth.setPassword("newpassword")).toEqual({ ok: true });
    expect(await auth.addEmail("a@b.com")).toEqual({ ok: true });
    expect(fake.calls.map((c) => c.args[0])).toEqual([{ password: "newpassword" }, { email: "a@b.com" }]);
  });

  it("setClass saves the class in the user's profile data", async () => {
    const { fake, auth } = setup();
    expect(await auth.setClass("mage")).toEqual({ ok: true });
    expect(fake.calls[0]).toEqual({ name: "auth.updateUser", args: [{ data: { class: "mage" } }] });
  });

  it("setClass reports an unreachable server, and any other failure as unknown", async () => {
    const { fake, auth } = setup();
    fake.authError = { message: "boom" };
    expect(await auth.setClass("tank")).toEqual({ ok: false, error: "unknown" });
    fake.authError = { name: "AuthRetryableFetchError", message: "Failed to fetch" };
    expect(await auth.setClass("tank")).toEqual({ ok: false, error: "unreachable" });
  });

  it("an expired recovery link on setPassword reads as expired", async () => {
    const { fake, auth } = setup();
    fake.authError = { message: "Auth session missing!" };
    expect(await auth.setPassword("newpassword")).toEqual({ ok: false, error: "expired" });
  });

  it("chooseName inserts the profile and maps a duplicate to name-taken", async () => {
    const { fake, auth } = setup();
    fake.session = { user: { id: "u1", email: "g@gmail.com" } };
    expect(await auth.chooseName("Kai")).toEqual({ ok: true });
    expect(fake.calls.at(-1)).toEqual({ name: "from(profiles).insert", args: [{ user_id: "u1", name: "Kai" }] });
    fake.insertReplies.profiles = { data: null, error: { code: "23505" } };
    expect(await auth.chooseName("Kai")).toEqual({ ok: false, error: "name-taken" });
  });

  it("logOut signs out", async () => {
    const { fake, auth } = setup();
    await auth.logOut();
    expect(fake.calls[0].name).toBe("auth.signOut");
  });
});

describe("getAccount and onChange", () => {
  it("is null without a session", async () => {
    expect(await setup().auth.getAccount()).toBeNull();
  });

  it("reads the profile name and whether the email is real", async () => {
    const { fake, auth } = setup();
    fake.session = { user: { id: "u1", email: "kai@players.devlandia.invalid" } };
    fake.tableReplies.profiles = { data: { name: "Kai" }, error: null };
    expect(await auth.getAccount()).toEqual({ userId: "u1", name: "Kai", hasRealEmail: false, playerClass: null });
    fake.session = { user: { id: "u2", email: "g@gmail.com" } };
    fake.tableReplies.profiles = { data: null, error: null };
    expect(await auth.getAccount()).toEqual({ userId: "u2", name: null, hasRealEmail: true, playerClass: null });
  });

  it("reads the saved class from the user's profile data; anything else is none", async () => {
    const { fake, auth } = setup();
    fake.tableReplies.profiles = { data: { name: "Kai" }, error: null };
    const withMeta = (user_metadata: unknown) => {
      fake.session = { user: { id: "u1", email: "kai@players.devlandia.invalid", user_metadata } as never };
    };
    withMeta({ class: "mage" });
    expect((await auth.getAccount())?.playerClass).toBe("mage");
    for (const bad of [undefined, {}, { class: "Mage" }, { class: 42 }, { class: "__proto__" }, { class: null }]) {
      withMeta(bad);
      expect((await auth.getAccount())?.playerClass).toBeNull();
    }
  });

  it("rejects when the profile can't be read", async () => {
    const { fake, auth } = setup();
    fake.session = { user: { id: "u1", email: "x@y.z" } };
    fake.tableReplies.profiles = { data: null, error: { message: "boom" } };
    await expect(auth.getAccount()).rejects.toThrow();
  });

  it("maps auth events and unsubscribes", async () => {
    const { fake, auth } = setup();
    const seen: string[] = [];
    const off = auth.onChange((e) => seen.push(e));
    await new Promise((r) => setTimeout(r, 0));
    fake.emit("SIGNED_IN");
    fake.emit("SIGNED_OUT");
    fake.emit("PASSWORD_RECOVERY");
    fake.emit("TOKEN_REFRESHED");
    off();
    fake.emit("SIGNED_IN");
    expect(seen).toEqual(["signedIn", "signedOut", "recovery"]);
  });
});
