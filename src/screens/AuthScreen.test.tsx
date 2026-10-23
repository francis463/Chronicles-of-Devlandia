import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMemoryAuth, type MemoryAuth } from "../auth/memoryAuth";
import { useAuth, type Auth } from "../auth/useAuth";
import { AuthScreen } from "./AuthScreen";

let latest: Auth;
function Harness({ client }: { client: MemoryAuth }) {
  latest = useAuth(client);
  return <AuthScreen auth={latest} />;
}
const setup = async (prepare?: (c: MemoryAuth) => void) => {
  const client = createMemoryAuth();
  prepare?.(client);
  const user = userEvent.setup();
  render(<Harness client={client} />);
  await waitFor(() => expect(latest.status).not.toBe("loading"));
  return { client, user };
};
const field = (label: string) => screen.getByLabelText(label);
const press = (name: string) => screen.getByRole("button", { name });

describe("AuthScreen: the tabs", () => {
  it("shows Log in fields first, and Sign up adds the repeat field", async () => {
    const { user } = await setup();
    expect(screen.getByRole("tab", { name: "Log in", selected: true })).toBeInTheDocument();
    expect(field("Name")).toBeInTheDocument();
    expect(field("Password")).toHaveAttribute("type", "password");
    expect(screen.queryByLabelText("Repeat password")).toBeNull();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    expect(field("Repeat password")).toHaveAttribute("type", "password");
    expect(field("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(press("[ Create account ]")).toBeInTheDocument();
  });

  it("has the footer promise and every way in", async () => {
    await setup();
    expect(screen.getByText("Your badges are saved to your account. Guest progress is not saved.")).toBeInTheDocument();
    for (const name of ["[ Log in ]", "[ Sign in with Google ]", "[ Play as guest ]", "Forgot your password?"]) expect(press(name)).toBeInTheDocument();
  });
});

describe("AuthScreen: logging in", () => {
  it("logs in with the trimmed name", async () => {
    const { client, user } = await setup();
    await client.signUp("Kai", "password1");
    await client.logOut();
    const logIn = vi.spyOn(client, "logIn");
    await user.type(field("Name"), "  Kai ");
    await user.type(field("Password"), "password1");
    await user.click(press("[ Log in ]"));
    expect(logIn).toHaveBeenCalledWith("Kai", "password1");
    await waitFor(() => expect(latest.status).toBe("signedIn"));
  });

  it("Enter submits", async () => {
    const { client, user } = await setup();
    await client.signUp("Kai", "password1");
    await client.logOut();
    await user.type(field("Name"), "Kai");
    await user.type(field("Password"), "password1{Enter}");
    await waitFor(() => expect(latest.status).toBe("signedIn"));
  });

  it("checks the fields before calling the server", async () => {
    const { client, user } = await setup();
    const logIn = vi.spyOn(client, "logIn");
    await user.type(field("Name"), "x");
    await user.type(field("Password"), "password1");
    await user.click(press("[ Log in ]"));
    expect(screen.getByRole("alert")).toHaveTextContent("Name: 3–12 letters, digits, - or _.");
    await user.clear(field("Name"));
    await user.type(field("Name"), "Kai");
    await user.clear(field("Password"));
    await user.type(field("Password"), "short");
    await user.click(press("[ Log in ]"));
    expect(screen.getByRole("alert")).toHaveTextContent("Password: at least 8 characters.");
    expect(logIn).not.toHaveBeenCalled();
  });

  it("shows the server's error, the same for a wrong password and an unknown name", async () => {
    const { client, user } = await setup();
    await client.signUp("Kai", "password1");
    await client.logOut();
    await user.type(field("Name"), "Kai");
    await user.type(field("Password"), "not-the-one");
    await user.click(press("[ Log in ]"));
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong name or password.");
    await user.clear(field("Name"));
    await user.type(field("Name"), "Zed");
    await user.click(press("[ Log in ]"));
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong name or password.");
  });

  it("disables the button and says so while the call is pending", async () => {
    const { client, user } = await setup();
    let release: () => void = () => undefined;
    vi.spyOn(client, "logIn").mockImplementation(() => new Promise((r) => (release = () => r({ ok: false, error: "wrong-credentials" }))));
    await user.type(field("Name"), "Kai");
    await user.type(field("Password"), "password1");
    await user.click(press("[ Log in ]"));
    expect(screen.getByRole("button", { name: "Logging in…" })).toBeDisabled();
    release();
    await waitFor(() => expect(press("[ Log in ]")).toBeEnabled());
  });
});

describe("AuthScreen: signing up", () => {
  it("needs matching passwords, then creates the account", async () => {
    const { client, user } = await setup();
    const signUp = vi.spyOn(client, "signUp");
    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    await user.type(field("Name"), "Kai");
    await user.type(field("Password"), "password1");
    await user.type(field("Repeat password"), "password2");
    await user.click(press("[ Create account ]"));
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords don't match.");
    expect(signUp).not.toHaveBeenCalled();
    await user.clear(field("Repeat password"));
    await user.type(field("Repeat password"), "password1");
    await user.click(press("[ Create account ]"));
    expect(signUp).toHaveBeenCalledWith("Kai", "password1");
    await waitFor(() => expect(latest.status).toBe("signedIn"));
  });

  it("says when the name is taken or not allowed", async () => {
    const { client, user } = await setup();
    await client.signUp("Kai", "password1");
    await client.logOut();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    await user.type(field("Name"), "kai");
    await user.type(field("Password"), "password1");
    await user.type(field("Repeat password"), "password1");
    await user.click(press("[ Create account ]"));
    expect(screen.getByRole("alert")).toHaveTextContent("That name is taken.");
    await user.clear(field("Name"));
    await user.type(field("Name"), "bitch");
    await user.click(press("[ Create account ]"));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a different name.");
  });
});

describe("AuthScreen: forgot, Google and guest", () => {
  it("Forgot your password asks for the name and gives the same reassurance every time", async () => {
    const { client, user } = await setup();
    await user.click(press("Forgot your password?"));
    await user.type(field("Name"), "Nobody");
    await user.click(press("[ Send reset link ]"));
    expect(client.lastForgot).toBe("Nobody");
    expect(screen.getByRole("status")).toHaveTextContent("If that account has an email, we sent a reset link.");
    await user.click(press("[ Back ]"));
    expect(screen.getByRole("tab", { name: "Log in", selected: true })).toBeInTheDocument();
  });

  it("Google starts the Google sign-in", async () => {
    const { client, user } = await setup();
    const google = vi.spyOn(client, "logInWithGoogle");
    await user.click(press("[ Sign in with Google ]"));
    expect(google).toHaveBeenCalled();
  });

  it("Play as guest works in every state, including offline (Review Focus 4)", async () => {
    const offline = await setup((c) => (c.reachable = false));
    expect(screen.getByRole("status")).toHaveTextContent("Can't reach the account server.");
    expect(press("[ Play as guest ]")).toBeEnabled();
    await offline.user.click(press("[ Play as guest ]"));
    expect(latest.status).toBe("guest");
  });

  it("Play as guest stays enabled while a login is pending", async () => {
    const { client, user } = await setup();
    vi.spyOn(client, "logIn").mockImplementation(() => new Promise(() => undefined));
    await user.type(field("Name"), "Kai");
    await user.type(field("Password"), "password1");
    await user.click(press("[ Log in ]"));
    expect(press("[ Play as guest ]")).toBeEnabled();
  });
});
