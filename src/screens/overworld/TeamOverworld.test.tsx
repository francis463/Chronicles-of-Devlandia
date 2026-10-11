import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { NO_FLAGS, POS_INTERVAL_MS } from "../../game/team";
import type { TeamSession } from "../../hooks/useTeamSession";
import type { ChestId } from "../../learn/types";
import { createMemoryHub } from "../../net/memoryTransport";
import type { TeamTransport } from "../../net/transport";
import { Overworld } from "./Overworld";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
type App = ReturnType<typeof within>;

/** Renders apps that share one in-memory hub; only clicks and typing are used, never window-level keys. */
function team() {
  const hub = createMemoryHub();
  const transports: TeamTransport[] = [];
  const make = () => {
    const t = hub.transport();
    transports.push(t);
    return t;
  };
  let clock = Date.now();
  const teamClock = () => (clock += 10);
  const app = () => within(render(<App makeTransport={make} teamClock={teamClock} />).container);
  return { hub, transports, app };
}

async function enterLobby(user: ReturnType<typeof setup>, app: App, name: string) {
  await user.click(app.getByRole("button", { name: /team lobby/i }));
  await user.type(app.getByRole("textbox", { name: "Nickname" }), name);
}

async function startedPair() {
  const user = setup();
  const t = team();
  const ana = t.app();
  const kai = t.app();
  await enterLobby(user, ana, "Ana");
  await user.click(ana.getByRole("button", { name: "[ Create Room ]" }));
  await flush();
  const code = ana.getByRole("heading", { name: /^ROOM / }).textContent!.slice(5);
  await enterLobby(user, kai, "Kai");
  await user.type(kai.getByRole("textbox", { name: "Room code" }), code);
  await user.click(kai.getByRole("button", { name: "[ Join ]" }));
  await flush();
  await user.click(ana.getByRole("button", { name: "[ Start Expedition ]" }));
  await flush();
  return { ...t, user, ana, kai, code };
}

/** Lets pending promise callbacks (transport joins) run under fake timers. */
const flush = () => act(async () => {});

const logText = (app: App) => app.getByRole("log", { name: "Event log" }).textContent ?? "";
const countIn = (text: string, needle: string) => text.split(needle).length - 1;

describe("Overworld in team mode", () => {
  it("shows teammates on the map and mini-map, and moves them", async () => {
    const { user, ana, kai } = await startedPair();
    expect(ana.getByTestId("teammate-Kai")).toBeInTheDocument();
    expect(kai.getByTestId("teammate-Ana")).toBeInTheDocument();
    expect(ana.getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    await user.click(kai.getByRole("button", { name: "Move up" }));
    act(() => vi.advanceTimersByTime(POS_INTERVAL_MS * 2));
    expect(ana.getByTestId("teammate-Kai").style.top).toBe("68%");
  });

  it("a teammate who walks into the village leaves your Peaks map and the log says so", async () => {
    const { user, ana, kai } = await startedPair();
    for (let i = 0; i < 6; i++) await user.click(kai.getByRole("button", { name: "Move left" }));
    act(() => vi.advanceTimersByTime(POS_INTERVAL_MS * 2));
    expect(ana.queryByTestId("teammate-Kai")).toBeNull();
    expect(countIn(logText(ana), "Kai went to Dev Village.")).toBe(1);
    expect(within(ana.getByTestId("minimap-cell-village")).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
  });

  it("shows the room code and how many are online", async () => {
    const { ana, code } = await startedPair();
    expect(ana.getByText(`ROOM ${code} · 2 online`)).toBeInTheDocument();
  });

  it("shares progress: a teammate powering the tower lifts your fog and logs it once", async () => {
    const { user, ana, kai } = await startedPair();
    await user.click(ana.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    await user.click(ana.getByRole("button", { name: "[T] Tower" }));
    await user.click(ana.getByRole("switch", { name: "Switch A" }));
    await user.click(ana.getByRole("switch", { name: "Switch B" }));
    await user.click(ana.getByRole("button", { name: "[ RUN CIRCUIT ]" }));
    expect(countIn(logText(kai), "Ana powered the signal tower. The fog lifts and the bridge returns.")).toBe(1);
    expect(kai.getByTestId("fog").style.opacity).toBe("0");
    expect(logText(ana)).not.toContain("Kai powered the signal tower");
    expect(countIn(logText(ana), "Signal tower online: the fog lifts and the bridge returns.")).toBe(1);
  });

  it("runs the team clock from the start time, even while you have a terminal open", async () => {
    const { user, kai } = await startedPair();
    await user.click(kai.getByRole("button", { name: "[G] Gate" }));
    expect(kai.getByRole("dialog")).toBeInTheDocument();
    const clockText = () => kai.getByText(/^(Day|Dusk|Night) \/ \d\d:\d\d$/).textContent!;
    const minutesOf = (text: string) => {
      const [h, m] = text.slice(-5).split(":").map(Number);
      return h * 60 + m;
    };
    act(() => vi.advanceTimersByTime(2000));
    const before = minutesOf(clockText());
    act(() => vi.advanceTimersByTime(2000));
    expect(minutesOf(clockText()) - before).toBe(5);
  });

  it("a player joining after the start lands in the game with the team's progress (Review Focus 2)", async () => {
    const t = await startedPair();
    const { user, ana, code } = t;
    await user.click(ana.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    const zed = t.app();
    await enterLobby(user, zed, "Zed");
    await user.type(zed.getByRole("textbox", { name: "Room code" }), code);
    await user.click(zed.getByRole("button", { name: "[ Join ]" }));
    await flush();
    expect(zed.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
    expect(zed.getByText("Frozen River")).toBeInTheDocument();
    expect(logText(zed)).toContain("Ana opened the gate.");
    expect(logText(ana)).toContain("Zed joined the team.");
  });

  it("keeps playing through a dropped connection and merges progress on reconnect (Review Focus 4)", async () => {
    const { user, hub, transports, ana, kai } = await startedPair();
    await user.click(kai.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    act(() => hub.drop(transports[1]));
    expect(kai.getByText("Reconnecting…")).toBeInTheDocument();
    await user.click(kai.getByRole("button", { name: "[X] Supply Cache" }));
    expect(logText(ana)).not.toContain("Kai opened the Supply Cache.");
    act(() => hub.restore(transports[1]));
    expect(kai.queryByText("Reconnecting…")).toBeNull();
    expect(logText(ana)).toContain("Kai opened the Supply Cache.");
  });

  it("Kai earns two badges through the UI; Ana's log shows each line once and the personal-badges note once", async () => {
    // Every pick is 0: the HTML chest asks for href, the CSS chest for color.
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const { user, ana, kai } = await startedPair();
      await user.click(kai.getByRole("button", { name: "HTML chest" }));
      await user.type(kai.getByRole("textbox", { name: "answer" }), "href");
      await user.click(kai.getByRole("button", { name: "[ SUBMIT CODE ]" }));
      await user.click(kai.getByRole("button", { name: "[ CONTINUE ]" }));
      await user.click(kai.getByRole("button", { name: "CSS chest" }));
      await user.type(kai.getByRole("textbox", { name: "answer" }), "color");
      await user.click(kai.getByRole("button", { name: "[ SUBMIT CODE ]" }));
      await flush();
      const text = logText(ana);
      for (const line of ["Kai earned the HTML Badge.", "Badges are personal: each explorer opens their own chest.", "Kai earned the CSS Badge."]) {
        expect(countIn(text, line), line).toBe(1);
      }
      expect(logText(kai)).not.toContain("Kai earned");
    } finally {
      random.mockRestore();
    }
  });

  it("[=] Menu leaves the room; teammates see the player leave", async () => {
    const { user, ana, kai } = await startedPair();
    await user.click(kai.getByRole("button", { name: "[=] Menu" }));
    expect(kai.getByRole("button", { name: /solo quest/i })).toBeInTheDocument();
    expect(logText(ana)).toContain("Kai left the team.");
    expect(ana.queryByTestId("teammate-Kai")).toBeNull();
  });
});

describe("Overworld solo mode is unchanged", () => {
  it("shows no teammates and no room label", () => {
    render(<Overworld onMenu={() => {}} />);
    expect(screen.queryByTestId(/^teammate-/)).toBeNull();
    expect(screen.queryByText(/^ROOM /)).toBeNull();
  });
});

describe("Overworld badges with a stub session", () => {
  const stub = (over: Partial<TeamSession> = {}): TeamSession => ({
    phase: "playing",
    status: "online",
    error: null,
    room: "KQZM",
    me: null,
    players: [],
    startedAt: Date.now(),
    teammates: [],
    create: vi.fn(),
    join: vi.fn(),
    start: vi.fn(),
    leave: vi.fn(),
    retry: vi.fn(),
    publishPosition: vi.fn(),
    publishFlags: vi.fn(),
    publishBadge: vi.fn(),
    onProgress: vi.fn(() => () => {}),
    onBadge: vi.fn(() => () => {}),
    sendChat: vi.fn(() => "sent" as const),
    sendPing: vi.fn(() => "sent" as const),
    onChat: vi.fn(() => () => {}),
    onPing: vi.fn(() => () => {}),
    onRoster: vi.fn(() => () => {}),
    onZoneChange: vi.fn(() => () => {}),
    ...over,
  });

  it("in a team, the quest line reads Your badges and the Codex is YOUR CODEX", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} team={stub()} />);
    expect(screen.getByText("Your badges: 0/10")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[C] Codex" }));
    expect(screen.getByRole("dialog", { name: "< YOUR CODEX: 0/10 BADGES >" })).toBeInTheDocument();
  });

  it("teammates get the same access code for one startedAt, whatever their own dice roll (final review)", async () => {
    const user = setup();
    const codeWith = async (roll: number) => {
      const random = vi.spyOn(Math, "random").mockReturnValue(roll);
      const { unmount } = render(
        <Overworld onMenu={() => {}} team={stub({ startedAt: 1_700_000_000_000 })} initial={{ zone: "village", player: { x: 60, y: 64 }, matcherSolved: true }} />,
      );
      random.mockRestore();
      await user.click(screen.getByRole("button", { name: "Syntax Terminal" }));
      const label = screen.getByRole("status", { name: /^ACCESS CODE:/ }).getAttribute("aria-label");
      unmount();
      return label;
    };
    const first = await codeWith(0.1);
    expect(first).toMatch(/^ACCESS CODE: [A-Z2-9] [A-Z2-9] [A-Z2-9] [A-Z2-9]$/);
    expect(await codeWith(0.9)).toBe(first);
  });

  it("each badge in state is published once", () => {
    const session = stub();
    const { rerender } = render(<Overworld onMenu={() => {}} team={session} initial={{ badges: ["chest-html"] }} />);
    expect(session.publishBadge).toHaveBeenCalledTimes(1);
    expect(session.publishBadge).toHaveBeenCalledWith("chest-html");
    rerender(<Overworld onMenu={() => {}} team={session} initial={{ badges: ["chest-html"] }} />);
    expect(session.publishBadge).toHaveBeenCalledTimes(1);
  });

  it("a teammate's badges log their own lines, and the personal-badges note only the first time", () => {
    let report: ((name: string, chest: ChestId) => void) | undefined;
    const session = stub({
      onBadge: vi.fn((cb: (name: string, chest: ChestId) => void) => {
        report = cb;
        return () => {};
      }),
    });
    render(<Overworld onMenu={() => {}} team={session} />);
    act(() => report!("Kai", "chest-html"));
    act(() => report!("Kai", "chest-sql"));
    const text = screen.getByRole("log", { name: "Event log" }).textContent ?? "";
    const lines = ["Kai earned the HTML Badge.", "Badges are personal: each explorer opens their own chest.", "Kai earned the SQL Badge."];
    for (const line of lines) expect(countIn(text, line), line).toBe(1);
    expect(lines.map((l) => text.indexOf(l))).toEqual([...lines.map((l) => text.indexOf(l))].sort((a, b) => a - b));
  });
});

describe("Overworld team chat", () => {
  const chatTab = (app: App) => app.getByRole("tab", { name: /^CHAT/ });
  const openChat = async (user: ReturnType<typeof setup>, app: App) => {
    if (chatTab(app).getAttribute("aria-selected") !== "true") await user.click(chatTab(app));
  };
  const lines = (app: App) => app.getByRole("list", { name: "Team chat", hidden: true });
  const say = async (user: ReturnType<typeof setup>, app: App, text: string) => {
    await openChat(user, app);
    await user.type(app.getByRole("textbox", { name: "Message" }), `${text}{Enter}`);
    act(() => void vi.advanceTimersByTime(1000));
  };

  it("carries a message and a quick reply, and the legend says Chat: [Enter]", async () => {
    const { user, ana, kai } = await startedPair();
    expect(ana.getByText("Chat: [Enter]")).toBeInTheDocument();
    await say(user, kai, "hello");
    expect(lines(ana)).toHaveTextContent("Kai: hello");
    expect(lines(kai)).toHaveTextContent("Kai: hello");
    await user.click(kai.getByRole("button", { name: "Need help" }));
    expect(lines(ana)).toHaveTextContent("Kai: Need help");
  });

  it("/ping gate rings on both maps, writes the lines, and the next ping within 5 s waits", async () => {
    const { user, ana, kai } = await startedPair();
    await say(user, kai, "/ping gate");
    expect(ana.getByTestId(/^minimap-ping-/)).toBeInTheDocument();
    expect(ana.getByTestId(/^ping-/)).toHaveTextContent("Kai");
    expect(lines(ana)).toHaveTextContent("Kai pinged the Terminal Gate.");
    expect(lines(kai)).toHaveTextContent("Ping sent: the Terminal Gate.");
    expect(kai.getByTestId(/^ping-/)).toHaveTextContent("Kai");
    await say(user, kai, "/ping");
    expect(lines(kai)).toHaveTextContent("Wait a moment before pinging again.");
  });

  it("a muted teammate's ring still draws but writes no line, and carries over from the lobby", async () => {
    const user = setup();
    const t = team();
    const ana = t.app();
    const kai = t.app();
    await enterLobby(user, ana, "Ana");
    await user.click(ana.getByRole("button", { name: "[ Create Room ]" }));
    await flush();
    const code = ana.getByRole("heading", { name: /^ROOM / }).textContent!.slice(5);
    await enterLobby(user, kai, "Kai");
    await user.type(kai.getByRole("textbox", { name: "Room code" }), code);
    await user.click(kai.getByRole("button", { name: "[ Join ]" }));
    await flush();

    // In the lobby: Kai talks, Ana half-types and mutes nobody yet.
    await user.type(kai.getByRole("textbox", { name: "Message" }), "from the lobby{Enter}");
    act(() => void vi.advanceTimersByTime(1000));
    expect(ana.getByRole("list", { name: "Team chat" })).toHaveTextContent("Kai: from the lobby");
    await user.type(ana.getByRole("textbox", { name: "Message" }), "half");
    await user.click(ana.getByRole("button", { name: "Mute Kai" }));
    await user.click(ana.getByRole("button", { name: "[ Start Expedition ]" }));
    await flush();

    // In the game: the lobby line, the draft and the mute all carried over; nothing is unread.
    expect(chatTab(ana)).toHaveTextContent(/^CHAT$/);
    await openChat(user, ana);
    expect(ana.getByRole("textbox", { name: "Message" })).toHaveValue("half");
    expect(lines(ana)).not.toHaveTextContent("from the lobby");
    await user.click(ana.getByRole("tab", { name: "LOG" }));

    await say(user, kai, "muted hello");
    await say(user, kai, "/ping gate");
    expect(lines(ana)).not.toHaveTextContent(/muted hello|pinged/);
    expect(chatTab(ana)).toHaveTextContent(/^CHAT$/);
    expect(ana.getByTestId(/^ping-/)).toHaveTextContent("Kai");
    expect(ana.getByTestId(/^minimap-ping-/)).toBeInTheDocument();
  });

  it("the lobby's history is not unread when the game starts (Review Focus 3)", async () => {
    const user = setup();
    const t = team();
    const ana = t.app();
    const kai = t.app();
    await enterLobby(user, ana, "Ana");
    await user.click(ana.getByRole("button", { name: "[ Create Room ]" }));
    await flush();
    const code = ana.getByRole("heading", { name: /^ROOM / }).textContent!.slice(5);
    await enterLobby(user, kai, "Kai");
    await user.type(kai.getByRole("textbox", { name: "Room code" }), code);
    await user.click(kai.getByRole("button", { name: "[ Join ]" }));
    await flush();
    for (const text of ["one", "two"]) {
      await user.type(kai.getByRole("textbox", { name: "Message" }), `${text}{Enter}`);
      act(() => void vi.advanceTimersByTime(1000));
    }
    await user.click(ana.getByRole("button", { name: "[ Start Expedition ]" }));
    await flush();
    expect(chatTab(ana)).toHaveTextContent(/^CHAT$/);
    expect(ana.queryByText(/CHAT \d+$/)).toBeNull();
    await openChat(user, ana);
    expect(lines(ana)).toHaveTextContent("Kai: two");
  });

  it("counts unread teammate lines on the CHAT tab and in the top bar until you look", async () => {
    const { user, ana, kai } = await startedPair();
    expect(chatTab(ana)).toHaveTextContent(/^CHAT$/);
    await say(user, kai, "psst");
    expect(chatTab(ana)).toHaveTextContent("CHAT (1)");
    expect(chatTab(ana)).toHaveAccessibleName("CHAT, 1 new");
    expect(ana.getByText(/CHAT 1$/)).toBeInTheDocument();
    await user.click(chatTab(ana));
    expect(chatTab(ana)).toHaveTextContent(/^CHAT$/);
    expect(ana.queryByText(/CHAT 1$/)).toBeNull();
  });

  it("shows two players named Kai as Kai and Kai (2), in lines and /where", async () => {
    const { user, app, ana, kai, code } = await startedPair();
    const kai2 = app();
    await enterLobby(user, kai2, "Kai");
    await user.type(kai2.getByRole("textbox", { name: "Room code" }), code);
    await user.click(kai2.getByRole("button", { name: "[ Join ]" }));
    await flush();
    await say(user, kai, "first");
    await say(user, kai2, "second");
    expect(lines(ana)).toHaveTextContent("Kai: first");
    expect(lines(ana)).toHaveTextContent("Kai (2): second");
    await say(user, ana, "/where");
    expect(lines(ana)).toHaveTextContent("Kai: C++ Peaks · Kai (2): C++ Peaks");
  });

  it("shows a rude nickname masked in the line, /where and the ring label", async () => {
    const { user, hub, ana, code } = await startedPair();
    const raw = hub.transport();
    await act(async () => {
      await raw.join(code, { id: "rude1", name: "fuck you", joinedAt: Date.now() + 1_000_000, startedAt: null, flags: NO_FLAGS, x: 28, y: 72, zone: "peaks" });
    });
    act(() => {
      raw.send({ type: "chat", id: "rude1", name: "fuck you", text: "hi there" });
      raw.send({ type: "ping", id: "rude1", name: "fuck you", zone: "peaks", x: 40, y: 40, place: null });
    });
    await openChat(user, ana);
    expect(lines(ana)).toHaveTextContent("*** you: hi there");
    expect(ana.getByTestId("ping-rude1")).toHaveTextContent("*** you");
    await say(user, ana, "/where");
    expect(lines(ana)).toHaveTextContent("*** you: C++ Peaks");
    expect(lines(ana)).not.toHaveTextContent("fuck");
  });

  it("a teammate who walks south into the Dense Forest shows in its mini-map cell, in the log and in /where (Review Focus 2)", async () => {
    const { user, ana, kai } = await startedPair();
    for (let i = 0; i < 10; i++) await user.click(kai.getByRole("button", { name: "Move right" }));
    for (let i = 0; i < 6; i++) await user.click(kai.getByRole("button", { name: "Move down" }));
    act(() => vi.advanceTimersByTime(POS_INTERVAL_MS * 2));
    expect(kai.getByText("REGION: DENSE FOREST")).toBeInTheDocument();
    expect(within(ana.getByTestId("minimap-cell-forest")).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(ana.queryByTestId("teammate-Kai")).toBeNull();
    expect(countIn(logText(ana), "Kai went to Dense Forest.")).toBe(1);
    await say(user, ana, "/where");
    expect(lines(ana)).toHaveTextContent("Kai: Dense Forest");
  });

  it("/where follows a teammate into the village", async () => {
    const { user, ana, kai } = await startedPair();
    for (let i = 0; i < 6; i++) await user.click(kai.getByRole("button", { name: "Move left" }));
    act(() => vi.advanceTimersByTime(POS_INTERVAL_MS * 2));
    await say(user, ana, "/where");
    expect(lines(ana)).toHaveTextContent("Kai: Dev Village");
  });

  it("/badges Kai reports a badge you heard about", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const { user, ana, kai } = await startedPair();
      await user.click(kai.getByRole("button", { name: "HTML chest" }));
      await user.type(kai.getByRole("textbox", { name: "answer" }), "href");
      await user.click(kai.getByRole("button", { name: "[ SUBMIT CODE ]" }));
      await flush();
      await say(user, ana, "/badges Kai");
      expect(lines(ana)).toHaveTextContent("Kai has earned 1 that you know of: HTML.");
    } finally {
      random.mockRestore();
    }
  });
});
