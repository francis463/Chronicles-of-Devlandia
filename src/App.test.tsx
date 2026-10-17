import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createMemoryAuth } from "./auth/memoryAuth";
import { GuestApp } from "./testing/GuestApp";


afterEach(() => vi.restoreAllMocks());

describe("Landing page backdrop", () => {
  it("draws the pixel-art world behind the main menu, hidden from screen readers", () => {
    render(<GuestApp />);
    const backdrop = screen.getByTestId("menu-backdrop");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop.className).toContain("fixed");
    expect(backdrop.className).toContain("-z-10");
    expect(backdrop.className).toContain("pointer-events-none");
    expect(backdrop.querySelector('[data-testid="map-canvas"]')).not.toBeNull();
    // a dark wash keeps the menu readable
    expect(backdrop.querySelector(".bg-\\[rgba\\(15\\,23\\,42\\,0\\.45\\)\\]")).not.toBeNull();
  });

  it("only on the landing page", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.queryByTestId("menu-backdrop")).toBeNull();
    expect(screen.getAllByTestId("map-canvas")).toHaveLength(1);
  });
});

describe("App", () => {
  it("shows the main menu with title, tagline and footer", () => {
    render(<GuestApp />);
    expect(screen.getByRole("heading", { name: /chronicles of devlandia/i })).toBeInTheDocument();
    expect(screen.getByText(/solve the map, break the code, find the treasure/i)).toBeInTheDocument();
    expect(screen.getByText("[?] HCI Help / Tutorials")).toBeInTheDocument();
    expect(screen.getByText("v1.0 | Online Network")).toBeInTheDocument();
  });

  it("shows the browser's real connection status in the footer", () => {
    const onLine = vi.spyOn(navigator, "onLine", "get");
    render(<GuestApp />);
    onLine.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event("offline")));
    expect(screen.getByText("v1.0 | Offline Network")).toBeInTheDocument();
    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(screen.getByText("v1.0 | Online Network")).toBeInTheDocument();
  });

  it("enables Team Lobby and keeps Leaderboards as coming soon", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    expect(screen.getByRole("button", { name: /leaderboards/i })).toBeDisabled();
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /team lobby/i }));
    expect(screen.getByRole("heading", { name: "TEAM LOBBY" })).toBeInTheDocument();
  });

  it("Solo Quest opens the overworld", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /solo quest/i })).toBeNull();
  });

  it("the overworld uses the slim page padding at md; the menu keeps its own", async () => {
    const user = userEvent.setup();
    const { container } = render(<GuestApp />);
    const main = () => container.querySelector("main")!;
    expect(main().className.split(/\s+/)).not.toContain("md:p-2");
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(main().className.split(/\s+/)).toContain("md:p-2");
  });

  it("the main menu offers Solo Quest, Team Lobby and Leaderboards, with no Exit Game", () => {
    render(<GuestApp />);
    const menu = within(screen.getByRole("navigation", { name: "Main menu" }));
    expect(menu.getAllByRole("button").map((b) => b.textContent)).toEqual(["Solo Quest", "Team Lobby", "LeaderboardsComing soon"]);
    expect(screen.queryByRole("button", { name: /exit game/i })).toBeNull();
  });
});

describe("App navigation from the overworld", () => {
  it("[=] Menu returns to the main menu and Solo Quest starts a fresh game", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    // The cache is north of the wall: open the gate first.
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    await user.click(screen.getByRole("button", { name: "[X] Supply Cache" }));
    expect(screen.getByRole("button", { name: "[X] Empty Cache" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[=] Menu" }));
    // The opened gate is an unlock, so the game asks before leaving.
    expect(screen.getByRole("dialog", { name: "< LEAVE GAME? >" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[ STAY ]" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "[ LEAVE ]" }));
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.getByRole("button", { name: "[X] Supply Cache" })).toBeInTheDocument();
  });
});

describe("App: accounts", () => {
  const login = () => screen.findByRole("tab", { name: "Log in", selected: true });
  const renderWith = (client = createMemoryAuth()) => ({ client, user: userEvent.setup(), ...render(<App authClient={client} />) });

  it("shows the login screen before the menu when nobody is signed in", async () => {
    renderWith();
    await login();
    expect(screen.queryByRole("button", { name: /solo quest/i })).toBeNull();
    expect(screen.getByTestId("menu-backdrop")).toBeInTheDocument();
  });

  it("Play as guest shows the menu as a guest, and [ Log in ] goes back to the login screen", async () => {
    const { user } = renderWith();
    await user.click(await screen.findByRole("button", { name: "[ Play as guest ]" }));
    expect(screen.getByText(/^Guest/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solo quest/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Log in ]" }));
    await login();
  });

  it("logging in shows the menu with the account name; [ Log out ] returns to the login screen", async () => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    await client.logOut();
    const { user } = renderWith(client);
    await user.type(await screen.findByLabelText("Name"), "Kai");
    await user.type(screen.getByLabelText("Password"), "password1{Enter}");
    expect(await screen.findByText(/Signed in as/)).toHaveTextContent("Signed in as Kai");
    await user.click(screen.getByRole("button", { name: "[ Log out ]" }));
    await login();
  });

  it("goes straight to the menu when a session already exists", async () => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    renderWith(client);
    expect(await screen.findByText(/Signed in as/)).toHaveTextContent("Kai");
    expect(screen.queryByRole("tab", { name: "Log in" })).toBeNull();
  });

  it("asks a Google player for a name, and a reset link lands on the new-password screen", async () => {
    const google = createMemoryAuth();
    await google.logInWithGoogle();
    renderWith(google);
    expect(await screen.findByRole("heading", { name: "CHOOSE YOUR NAME" })).toBeInTheDocument();

    const reset = createMemoryAuth();
    await reset.signUp("Kai", "password1");
    renderWith(reset);
    await screen.findAllByText(/Signed in as/);
    act(() => reset.emit("recovery"));
    expect(await screen.findByRole("heading", { name: "SET A NEW PASSWORD" })).toBeInTheDocument();
  });

  it("an unreachable account server still lets you play as a guest (Review Focus 4)", async () => {
    const client = createMemoryAuth();
    client.reachable = false;
    const { user } = renderWith(client);
    expect(await screen.findByText("Can't reach the account server.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Play as guest ]" }));
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
  });

  it("[ Add email ] is offered until the account has an email, validates it, and asks the player to confirm", async () => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    const { user } = renderWith(client);
    await user.click(await screen.findByRole("button", { name: "[ Add email ]" }));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "[ Save email ]" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "kai@example.com");
    await user.click(screen.getByRole("button", { name: "[ Save email ]" }));
    expect(await screen.findByText("Check your inbox to confirm it.")).toBeInTheDocument();
    expect(client.emailAdded).toBe("kai@example.com");
  });

  it("hides [ Add email ] once the account has one, and for guests", async () => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    await client.addEmail("kai@example.com");
    renderWith(client);
    await screen.findByText(/Signed in as/);
    expect(screen.queryByRole("button", { name: "[ Add email ]" })).toBeNull();
  });

  it("prefills the team nickname with the account name", async () => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    const { user } = renderWith(client);
    await screen.findByText(/Signed in as/);
    await user.click(screen.getByRole("button", { name: /team lobby/i }));
    expect(screen.getByLabelText("Nickname")).toHaveValue("Kai");
  });
});
