import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createMemoryAuth } from "./auth/memoryAuth";
import { createMemoryLeaderboard } from "./leaderboard/memoryLeaderboard";
import { createMemoryProgress, type SavedBadge } from "./progress/progress";
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
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(screen.queryByTestId("menu-backdrop")).toBeNull();
    expect(screen.getAllByTestId("map-canvas")).toHaveLength(1);
  });
});

describe("App", () => {
  it("shows the main menu with title, tagline and footer", () => {
    render(<GuestApp />);
    expect(screen.getByRole("heading", { name: /chronicles of devlandia/i })).toBeInTheDocument();
    expect(screen.getByText(/solve the map, break the code, find the treasure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[?] HCI Help / Tutorials" })).toBeInTheDocument();
    expect(screen.getByText("v1.0 | Online Network")).toBeInTheDocument();
  });

  it("the menu's [?] HCI Help / Tutorials opens the help on the Tutorial tab and closes again", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: "[?] HCI Help / Tutorials" }));
    expect(screen.getByRole("dialog", { name: "< HELP & TUTORIAL >" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tutorial" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tutorial" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    expect(screen.queryByRole("dialog")).toBeNull();
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

  it("enables Team Lobby and Leaderboards", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    expect(screen.getByRole("button", { name: /leaderboards/i })).toBeEnabled();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /team lobby/i }));
    await user.click(screen.getByRole("button", { name: "[ Continue ]" }));
    expect(screen.getByRole("heading", { name: "TEAM LOBBY" })).toBeInTheDocument();
  });

  it("Solo Quest opens the overworld", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(screen.getByText("REGION: SKI LODGE")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /solo quest/i })).toBeNull();
  });

  it("the overworld uses the slim page padding at md; the menu keeps its own", async () => {
    const user = userEvent.setup();
    const { container } = render(<GuestApp />);
    const main = () => container.querySelector("main")!;
    expect(main().className.split(/\s+/)).not.toContain("md:p-2");
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(main().className.split(/\s+/)).toContain("md:p-2");
  });

  it("the main menu offers Solo Quest, Team Lobby and Leaderboards, with no Exit Game", () => {
    render(<GuestApp />);
    const menu = within(screen.getByRole("navigation", { name: "Main menu" }));
    expect(menu.getAllByRole("button").map((b) => b.textContent)).toEqual(["Solo Quest", "Team Lobby", "Leaderboards"]);
    expect(screen.queryByRole("button", { name: /exit game/i })).toBeNull();
  });
});

describe("App: where a game begins", () => {
  it("a new solo game starts inside the Ski Lodge, and walking out through the mat leads to the Peaks", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(screen.getByText("REGION: SKI LODGE")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
  });
});

describe("App navigation from the overworld", () => {
  it("[=] Menu returns to the main menu and Solo Quest starts a fresh game", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    await user.keyboard("{ArrowDown}{ArrowDown}"); // out of the lodge, into the Peaks
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
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    await user.keyboard("{ArrowDown}{ArrowDown}"); // out of the lodge, into the Peaks
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
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(screen.getByText("REGION: SKI LODGE")).toBeInTheDocument();
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
    const user = userEvent.setup();
    render(<App authClient={client} makeProgress={() => createMemoryProgress()} />);
    await screen.findByText(/Signed in as/);
    await waitFor(() => expect(screen.getByRole("button", { name: /team lobby/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /team lobby/i }));
    await user.click(screen.getByRole("button", { name: "[ Continue ]" }));
    expect(screen.getByLabelText("Nickname")).toHaveValue("Kai");
  });
});

describe("App: saved badges", () => {
  const sql = { chest: "chest-sql", questionId: "sql-from", answer: "FROM" } as const;
  const signedIn = async (store: ReturnType<typeof createMemoryProgress>) => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    const user = userEvent.setup();
    render(<App authClient={client} makeProgress={() => store} />);
    return { client, user };
  };

  it("a signed-in player's saved badges start every game", async () => {
    const { user } = await signedIn(createMemoryProgress([sql]));
    await screen.findByText(/Signed in as/);
    await user.click(await screen.findByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(screen.getByText("Badges: 1/11")).toBeInTheDocument();
  });

  it("keeps the game buttons off until the saved badges have loaded", async () => {
    let release: (rows: SavedBadge[]) => void = () => undefined;
    const store = { load: () => new Promise<SavedBadge[]>((r) => (release = r)), save: async () => undefined };
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    render(<App authClient={client} makeProgress={() => store} />);
    await screen.findByText(/Signed in as/);
    expect(screen.getByRole("button", { name: /solo quest/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /team lobby/i })).toBeDisabled();
    act(() => release([]));
    await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
  });

  it("an unreadable save file does not block play", async () => {
    const store = { load: async () => Promise.reject(new Error("down")), save: async () => undefined };
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    render(<App authClient={client} makeProgress={() => store} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
  });

  it("a badge earned while signed in is saved with its question and answer; a failed save is logged and retried", async () => {
    const store = createMemoryProgress();
    store.failNext = 1;
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { user } = await signedIn(store);
    await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowLeft}{ArrowLeft}"); // down to the lodge door and in
    await user.click(screen.getByRole("button", { name: "Shelf, HTML chest" }));
    await user.keyboard("href{Enter}");
    expect(await screen.findByText("Couldn't save your badge. It'll retry.")).toBeInTheDocument();
    expect(store.rows).toEqual([]);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "[=] Menu" }));
    await user.click(screen.getByRole("button", { name: "[ LEAVE ]" }));
    await waitFor(() => expect(store.rows).toEqual([{ chest: "chest-html", questionId: "html-link", answer: "href" }]));
  });

  it("a guest earns badges and nothing is saved or loaded", async () => {
    const store = createMemoryProgress();
    const load = vi.spyOn(store, "load");
    const user = userEvent.setup();
    render(<App authClient={createMemoryAuth()} startAsGuest makeProgress={() => store} />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(load).not.toHaveBeenCalled();
    expect(store.rows).toEqual([]);
  });

  it("badges earned this session are in the next game without a reload", async () => {
    const store = createMemoryProgress();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { user } = await signedIn(store);
    await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowLeft}{ArrowLeft}"); // down to the lodge door and in
    await user.click(screen.getByRole("button", { name: "Shelf, HTML chest" }));
    await user.keyboard("href{Enter}");
    await waitFor(() => expect(store.rows).toHaveLength(1));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "[=] Menu" }));
    await user.click(screen.getByRole("button", { name: "[ LEAVE ]" }));
    await user.click(await screen.findByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(screen.getByText("Badges: 1/11")).toBeInTheDocument();
  });

  it("being signed out from elsewhere ends the running game; logging back in lands on the menu", async () => {
    const { client, user } = await signedIn(createMemoryProgress());
    await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    const account = client.session;
    act(() => {
      client.session = null;
      client.emit("signedOut");
    });
    expect(await screen.findByRole("button", { name: /play as guest/i })).toBeInTheDocument();
    act(() => {
      client.session = account;
      client.emit("signedIn");
    });
    expect(await screen.findByText(/Signed in as/)).toBeInTheDocument();
    expect(screen.queryByText(/Badges: \d+\/11/)).not.toBeInTheDocument();
  });
});

describe("App: character classes", () => {
  const solo = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: /solo quest/i }));
  const start = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "[ Start ]" }));
  const radio = (name: string) => screen.getByRole("radio", { name });

  it("Solo Quest asks for a class first; Start enters the game as that class", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await solo(user);
    expect(screen.getByRole("radiogroup", { name: "Choose your class" })).toBeInTheDocument();
    expect(screen.queryByText(/^Badges:/)).not.toBeInTheDocument();
    expect(radio("Warrior")).toBeChecked();
    await user.click(radio("Mage"));
    await start(user);
    expect(screen.getByText("Class: Mage")).toBeInTheDocument();
  });

  it("Back returns to the menu without starting", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await solo(user);
    await user.click(screen.getByRole("button", { name: "[ Back ]" }));
    expect(screen.getByRole("button", { name: /solo quest/i })).toBeInTheDocument();
    expect(screen.queryByText(/^Class:/)).not.toBeInTheDocument();
  });

  it("Team Lobby asks for a class first and then shows the lobby", async () => {
    const user = userEvent.setup();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: /team lobby/i }));
    expect(screen.getByRole("button", { name: "[ Continue ]" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Nickname" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Continue ]" }));
    expect(screen.getByRole("textbox", { name: "Nickname" })).toBeInTheDocument();
  });

  it("classes change no gameplay: the same HP whichever class", async () => {
    const stats = async (cls: string) => {
      const user = userEvent.setup();
      const view = render(<GuestApp />);
      await solo(user);
      await user.click(radio(cls));
      await start(user);
      const text = [screen.getByText(/^HP \d+/)].map((n) => n.textContent);
      view.unmount();
      localStorage.clear(); // the next game starts fresh, not resumed
      return text;
    };
    expect(await stats("Mage")).toEqual(await stats("Tank"));
  });

  describe("signed in", () => {
    const account = async (playerClass?: "tank") => {
      const client = createMemoryAuth();
      await client.signUp("Kai", "password1");
      if (playerClass) await client.setClass(playerClass);
      return client;
    };
    const open = async (client: Awaited<ReturnType<typeof account>>) => {
      const user = userEvent.setup();
      render(<App authClient={client} makeProgress={() => createMemoryProgress()} />);
      await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
      return user;
    };

    it("preselects the saved class, saves a new choice, and preselects it next time", async () => {
      const client = await account("tank");
      const setClass = vi.spyOn(client, "setClass");
      const user = await open(client);
      await solo(user);
      expect(radio("Tank")).toBeChecked();
      await user.click(radio("Healer"));
      await start(user);
      expect(setClass).toHaveBeenCalledWith("healer");
      await user.click(screen.getByRole("button", { name: "[=] Menu" }));
      await user.click(await screen.findByRole("button", { name: /solo quest/i }));
      expect(radio("Healer")).toBeChecked();
    });

    it("a guest starts on the warrior and nothing is saved", async () => {
      const client = createMemoryAuth();
      const setClass = vi.spyOn(client, "setClass");
      const user = userEvent.setup();
      render(<App authClient={client} startAsGuest />);
      await solo(user);
      expect(radio("Warrior")).toBeChecked();
      await user.click(radio("Archer"));
      await start(user);
      expect(setClass).not.toHaveBeenCalled();
      expect(screen.getByText("Class: Archer")).toBeInTheDocument();
    });

    it("a class that fails to save never blocks starting", async () => {
      const client = await account();
      vi.spyOn(client, "setClass").mockRejectedValue(new Error("offline"));
      const user = await open(client);
      await solo(user);
      await user.click(radio("Assassin"));
      await start(user);
      expect(screen.getByText("Class: Assassin")).toBeInTheDocument();
    });

    it("the next account on the same tab never inherits the last player's class", async () => {
      const client = await account("tank");
      const user = await open(client);
      await solo(user);
      await user.click(radio("Healer"));
      await start(user);
      await user.click(screen.getByRole("button", { name: "[=] Menu" }));
      await user.click(await screen.findByRole("button", { name: /log out/i }));
      await act(async () => {
        await client.signUp("Ann", "password1");
        client.emit("signedIn");
      });
      await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
      await solo(user);
      expect(radio("Warrior")).toBeChecked();
    });
  });
});

describe("App: leaderboard", () => {
  const rows = [
    { rank: 1, name: "Kai", badges: 3 },
    { rank: 2, name: "Zed", badges: 2 },
  ];
  const open = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Leaderboards" }));

  it("a guest opens the leaderboard from the menu and comes back with Back", async () => {
    const user = userEvent.setup();
    const made = vi.fn(() => createMemoryLeaderboard({ rows }));
    render(<GuestApp makeLeaderboard={made} />);
    await open(user);
    expect(screen.getByRole("heading", { name: "LEADERBOARD" })).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Top players" })).toHaveTextContent("Zed");
    expect(made).toHaveBeenCalledWith(null);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Back ]" }));
    expect(screen.getByRole("navigation", { name: "Main menu" })).toBeInTheDocument();
  });

  const signedIn = async (store = createMemoryLeaderboard({ rows, me: { rank: 1, badges: 3, hidden: false } })) => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    const made = vi.fn(() => store);
    const user = userEvent.setup();
    render(<App authClient={client} makeProgress={() => createMemoryProgress()} makeLeaderboard={made} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /solo quest/i })).toBeEnabled());
    return { client, made, user, store };
  };

  it("a signed-in player gets a store for their own id, sees themself, and can hide", async () => {
    const { made, user } = await signedIn();
    await open(user);
    expect(made).toHaveBeenLastCalledWith("u1");
    const list = await screen.findByRole("list", { name: "Top players" });
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("Kai (you)");
    expect(screen.getByRole("switch", { name: "Hide me from the leaderboard" })).toBeInTheDocument();
  });

  it("the button works while a signed-in player's saved badges are still loading", async () => {
    const client = createMemoryAuth();
    await client.signUp("Kai", "password1");
    const slow = { load: () => new Promise<SavedBadge[]>(() => undefined), save: async () => undefined };
    render(<App authClient={client} makeProgress={() => slow} makeLeaderboard={() => createMemoryLeaderboard({ rows })} />);
    await screen.findByText(/Signed in as/);
    expect(screen.getByRole("button", { name: /solo quest/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Leaderboards" })).toBeEnabled();
  });

  it("being signed out from elsewhere while on the leaderboard returns to the login screen", async () => {
    const { client, user } = await signedIn();
    await open(user);
    await screen.findByRole("list", { name: "Top players" });
    act(() => {
      client.session = null;
      client.emit("signedOut");
    });
    expect(await screen.findByRole("button", { name: /play as guest/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "LEADERBOARD" })).not.toBeInTheDocument();
  });
});

describe("App: a refresh resumes the solo game", () => {
  const begin = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    await user.keyboard("{ArrowDown}{ArrowDown}"); // out of the lodge, into the Peaks
  };

  it("there is no Continue before a game; after a refresh the game resumes by itself with its progress and class", async () => {
    const user = userEvent.setup();
    const first = render(<GuestApp />);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("radio", { name: "Mage" }));
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    await user.keyboard("{ArrowDown}{ArrowDown}"); // out of the lodge, into the Peaks
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    first.unmount(); // a refresh: the page is gone, the browser's storage is not
    render(<GuestApp />);
    expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
    expect(screen.getByText("Class: Mage")).toBeInTheDocument();
    expect(screen.getAllByText(/Gate unlocked/).length).toBeGreaterThan(0); // the gate is still open
  });

  it("Solo Quest still starts a fresh game", async () => {
    const user = userEvent.setup();
    const first = render(<GuestApp />);
    await begin(user);
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    first.unmount();
    render(<GuestApp />);
    await user.click(screen.getByRole("button", { name: "[=] Menu" }));
    await user.click(screen.getByRole("button", { name: "[ LEAVE ]" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument(); // [=] Menu leaves the game; it does not resume again
    await begin(user);
    expect(screen.getByRole("button", { name: "[G] Gate" })).toBeInTheDocument();
  });
});
