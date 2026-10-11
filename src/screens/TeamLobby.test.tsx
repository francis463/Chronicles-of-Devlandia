import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { NO_FLAGS, rankPlayers, type RankedPlayer } from "../game/team";
import { useChat, type ChatFeed } from "../hooks/useChat";
import type { ChatSender, TeamSession } from "../hooks/useTeamSession";
import { createMemoryHub } from "../net/memoryTransport";
import { ROOM_VIEW_GUARD_MS, TeamLobby } from "./TeamLobby";

afterEach(() => vi.useRealTimers());

const stub = (over: Partial<TeamSession> = {}): TeamSession => ({
  phase: "idle",
  status: null,
  error: null,
  room: null,
  me: null,
  players: [],
  startedAt: null,
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

describe("TeamLobby (view)", () => {
  it("rejects an invalid nickname without connecting", async () => {
    const user = userEvent.setup();
    const session = stub();
    render(<TeamLobby session={session} onBack={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[ Create Room ]" }));
    expect(screen.getByText("Enter a nickname (1–12 letters, digits, spaces, - or _).")).toBeInTheDocument();
    expect(session.create).not.toHaveBeenCalled();
  });

  it("creates in the chosen connection mode and joins with a normalized code", async () => {
    const user = userEvent.setup();
    const session = stub();
    render(<TeamLobby session={session} onBack={() => {}} />);
    await user.type(screen.getByRole("textbox", { name: "Nickname" }), " Ana ");
    expect(screen.getByRole("radio", { name: "Online" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Same computer" }));
    await user.click(screen.getByRole("button", { name: "[ Create Room ]" }));
    expect(session.create).toHaveBeenCalledWith("Ana", "local");
    expect(screen.getByRole("button", { name: "[ Join ]" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Room code" }), "kqzm");
    await user.click(screen.getByRole("button", { name: "[ Join ]" }));
    expect(session.join).toHaveBeenCalledWith("Ana", "KQZM", "local");
  });

  it("disables the buttons while connecting and shows Connecting…", () => {
    render(<TeamLobby session={stub({ phase: "connecting" })} onBack={() => {}} />);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[ Create Room ]" })).toBeDisabled();
  });

  it("shows each error, with Retry for an unreachable server", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TeamLobby session={stub({ phase: "error", error: "no-room" })} onBack={() => {}} />);
    expect(screen.getByText("No room with that code.")).toBeInTheDocument();
    rerender(<TeamLobby session={stub({ phase: "error", error: "full" })} onBack={() => {}} />);
    expect(screen.getByText("This room is full.")).toBeInTheDocument();
    const session = stub({ phase: "error", error: "unreachable" });
    rerender(<TeamLobby session={session} onBack={() => {}} />);
    expect(
      screen.getByText("Can't reach the team server. Check your internet connection, or switch to Same computer mode."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Retry ]" }));
    expect(session.retry).toHaveBeenCalledOnce();
  });

  it("Back to Menu calls onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<TeamLobby session={stub()} onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: "[ Back to Menu ]" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe("TeamLobby with two players (App + memory hub)", () => {
  function twoApps() {
    const hub = createMemoryHub();
    const make = vi.fn(() => hub.transport());
    let t = Date.now();
    const clock = () => (t += 10);
    const ana = render(<App makeTransport={make} teamClock={clock} />);
    const kai = render(<App makeTransport={make} teamClock={clock} />);
    return { hub, make, ana: within(ana.container), kai: within(kai.container) };
  }

  async function openLobby(user: ReturnType<typeof userEvent.setup>, app: ReturnType<typeof within>, name: string) {
    await user.click(app.getByRole("button", { name: /team lobby/i }));
    await user.type(app.getByRole("textbox", { name: "Nickname" }), name);
  }

  it("create → join → start takes both players into the overworld", async () => {
    const user = userEvent.setup();
    const { ana, kai } = twoApps();
    await openLobby(user, ana, "Ana");
    await user.click(ana.getByRole("button", { name: "[ Create Room ]" }));
    const code = ana.getByRole("heading", { name: /^ROOM [A-HJ-NP-Z]{4}$/ }).textContent!.slice(5);
    expect(ana.getByRole("list", { name: "Players" })).toHaveTextContent("Ana (you) (host)");
    expect(ana.getByRole("button", { name: "[ Start Expedition ]" })).toBeDisabled();

    await openLobby(user, kai, "Kai");
    await user.type(kai.getByRole("textbox", { name: "Room code" }), code);
    await user.click(kai.getByRole("button", { name: "[ Join ]" }));
    expect(within(kai.getByRole("list", { name: "Players" })).getAllByRole("listitem")).toHaveLength(2);
    expect(kai.getByText("Waiting for the host to start…")).toBeInTheDocument();
    expect(kai.queryByRole("button", { name: "[ Start Expedition ]" })).toBeNull();
    expect(within(ana.getByRole("list", { name: "Players" })).getAllByRole("listitem")).toHaveLength(2);

    await user.click(ana.getByRole("button", { name: "[ Start Expedition ]" }));
    expect(ana.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
    expect(kai.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
  });

  it("double-clicking Create Room creates one room (Review Focus 5)", async () => {
    const user = userEvent.setup();
    const { ana, make } = twoApps();
    await openLobby(user, ana, "Ana");
    await user.dblClick(ana.getByRole("button", { name: "[ Create Room ]" }));
    expect(make).toHaveBeenCalledTimes(1);
  });

  it("Leave Room returns to the main menu", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { ana } = twoApps();
    await openLobby(user, ana, "Ana");
    await user.click(ana.getByRole("button", { name: "[ Create Room ]" }));
    await act(async () => {});
    act(() => vi.advanceTimersByTime(ROOM_VIEW_GUARD_MS));
    await user.click(ana.getByRole("button", { name: "[ Leave Room ]" }));
    expect(ana.getByRole("button", { name: /solo quest/i })).toBeInTheDocument();
  });

  it("ignores Leave Room for half a second after the room appears: the second click of a double-click on Create lands there (final review)", async () => {
    vi.useFakeTimers();
    const onBack = vi.fn();
    const { rerender } = render(<TeamLobby session={stub()} onBack={onBack} />);
    const me: RankedPlayer = { id: "a", name: "Ana", joinedAt: 1, startedAt: null, flags: NO_FLAGS, x: 28, y: 72, zone: "peaks", rank: 0, color: "#22c55e", isHost: true };
    rerender(<TeamLobby session={stub({ phase: "lobby", room: "KQZM", me, players: [me] })} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "[ Leave Room ]" }));
    expect(onBack).not.toHaveBeenCalled();
    expect(ROOM_VIEW_GUARD_MS).toBe(500);
    act(() => vi.advanceTimersByTime(ROOM_VIEW_GUARD_MS));
    fireEvent.click(screen.getByRole("button", { name: "[ Leave Room ]" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("TeamLobby chat", () => {
  const roster = (...names: string[]) =>
    rankPlayers(names.map((name, i) => ({ id: `id${i}`, name, joinedAt: i + 1, startedAt: null, flags: NO_FLAGS, x: 28, y: 72, zone: "peaks" as const })));

  function room(names: string[] = ["Ana", "Kai"]) {
    const players = roster(...names);
    let onChat: ((from: ChatSender, text: string) => void) | null = null;
    const session = stub({
      phase: "lobby",
      room: "KQZM",
      me: players[0],
      players,
      onChat: vi.fn((cb) => {
        onChat = cb;
        return () => {};
      }),
    });
    const hear = (i: number, text: string) => act(() => onChat!({ id: players[i].id, name: players[i].name, color: players[i].color }, text));
    return { session, players, hear };
  }
  function Lobby({ session }: { session: TeamSession }) {
    const chat = useChat(session);
    return <TeamLobby session={session} onBack={() => {}} chat={chat} />;
  }
  const rowOf = (name: RegExp | string) => screen.getAllByRole("listitem").find((li) => (typeof name === "string" ? li.textContent === name : name.test(li.textContent ?? "")))!;

  it("puts the Team chat region under the players and above the start control", () => {
    const { session } = room();
    render(<Lobby session={session} />);
    const region = screen.getByRole("region", { name: "Team chat" });
    const players = screen.getByRole("list", { name: "Players" });
    const start = screen.getByRole("button", { name: "[ Start Expedition ]" });
    expect(players.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(region.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(region).getByRole("textbox", { name: "Message" })).toBeInTheDocument();
  });

  it("speaks a teammate's new message through the region's announcer", () => {
    const { session, hear } = room();
    render(<Lobby session={session} />);
    hear(1, "hello team");
    expect(within(screen.getByRole("region", { name: "Team chat" })).getByRole("status", { name: "Chat announcements" })).toHaveTextContent("Kai says: hello team");
    expect(screen.getByRole("list", { name: "Team chat" })).toHaveTextContent("Kai: hello team");
  });

  it("gives every other player a mute button and you none", () => {
    const { session } = room(["Ana", "Kai", "Mia"]);
    render(<Lobby session={session} />);
    expect(screen.getByRole("button", { name: "Mute Kai" })).toHaveTextContent("[ Mute ]");
    expect(screen.getByRole("button", { name: "Mute Mia" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mute Ana/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Mute Kai" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Mute Kai" }).className).toContain("pointer-coarse:min-h-11");
  });

  it("mutes by raw nickname while names read as displayed", async () => {
    const user = userEvent.setup();
    const { session } = room(["Ana", "Kai", "kai"]);
    const chat: ChatFeed = { lines: [], draft: "", setDraft: vi.fn(), muted: [], mute: vi.fn(), unmute: vi.fn(), post: vi.fn() };
    render(<TeamLobby session={session} onBack={() => {}} chat={chat} />);
    await user.click(screen.getByRole("button", { name: "Mute kai (2)" }));
    expect(chat.mute).toHaveBeenCalledWith("kai");
    await user.click(screen.getByRole("button", { name: "Mute Kai" }));
    expect(chat.mute).toHaveBeenLastCalledWith("Kai");
  });

  it("flips to Unmute and marks the row muted", async () => {
    const user = userEvent.setup();
    const { session } = room();
    render(<Lobby session={session} />);
    await user.click(screen.getByRole("button", { name: "Mute Kai" }));
    expect(screen.getByRole("button", { name: "Unmute Kai" })).toHaveTextContent("[ Unmute ]");
    expect(rowOf(/^Kai/)).toHaveTextContent(/^Kai \(muted\)/);
    expect(screen.getByRole("button", { name: "Unmute Kai" })).not.toHaveAttribute("aria-pressed");
    await user.click(screen.getByRole("button", { name: "Unmute Kai" }));
    expect(screen.getByRole("button", { name: "Mute Kai" })).toBeInTheDocument();
  });

  it("muting one of two players named Kai mutes both, and drops chats from either", async () => {
    const user = userEvent.setup();
    const { session, hear } = room(["Ana", "Kai", "Kai"]);
    render(<Lobby session={session} />);
    await user.click(screen.getByRole("button", { name: "Mute Kai (2)" }));
    expect(screen.getAllByText(/\(muted\)/)).toHaveLength(2);
    hear(1, "first");
    hear(2, "second");
    expect(screen.getByRole("list", { name: "Team chat" })).not.toHaveTextContent(/first|second/);
  });

  it("shows a rude nickname masked in the player list", () => {
    const { session } = room(["Ana", "fuck you"]);
    render(<Lobby session={session} />);
    expect(rowOf(/\*\*\*/)).toHaveTextContent("*** you");
    expect(screen.getByRole("button", { name: "Mute *** you" })).toBeInTheDocument();
  });

  it("renders nothing of this without a chat feed", () => {
    const { session } = room();
    render(<TeamLobby session={session} onBack={() => {}} />);
    expect(screen.queryByRole("region", { name: "Team chat" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Mute/ })).toBeNull();
  });

  it("refuses a nickname that masking changes, and still connects a clean one", async () => {
    const user = userEvent.setup();
    const session = stub();
    render(<TeamLobby session={session} onBack={() => {}} />);
    await user.type(screen.getByRole("textbox", { name: "Nickname" }), "fuck you");
    await user.click(screen.getByRole("button", { name: "[ Create Room ]" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a different nickname.");
    expect(session.create).not.toHaveBeenCalled();
    await user.clear(screen.getByRole("textbox", { name: "Nickname" }));
    await user.type(screen.getByRole("textbox", { name: "Nickname" }), "Ana");
    await user.click(screen.getByRole("button", { name: "[ Create Room ]" }));
    expect(session.create).toHaveBeenCalledWith("Ana", "online");
    expect(screen.queryByText("Pick a different nickname.")).toBeNull();
  });
});

describe("TeamLobby chat between two apps", () => {
  function twoApps() {
    const hub = createMemoryHub();
    const make = vi.fn(() => hub.transport());
    let t = Date.now();
    const clock = () => (t += 10);
    const ana = render(<App makeTransport={make} teamClock={clock} />);
    const kai = render(<App makeTransport={make} teamClock={clock} />);
    return { ana: within(ana.container), kai: within(kai.container) };
  }
  async function bothInLobby() {
    const user = userEvent.setup();
    const { ana, kai } = twoApps();
    await user.click(ana.getByRole("button", { name: /team lobby/i }));
    await user.type(ana.getByRole("textbox", { name: "Nickname" }), "Ana");
    await user.click(ana.getByRole("button", { name: "[ Create Room ]" }));
    const code = ana.getByRole("heading", { name: /^ROOM [A-HJ-NP-Z]{4}$/ }).textContent!.slice(5);
    await user.click(kai.getByRole("button", { name: /team lobby/i }));
    await user.type(kai.getByRole("textbox", { name: "Nickname" }), "Kai");
    await user.type(kai.getByRole("textbox", { name: "Room code" }), code);
    await user.click(kai.getByRole("button", { name: "[ Join ]" }));
    return { user, ana, kai };
  }

  it("carries a message from Kai to Ana and shows it to both", async () => {
    const { user, ana, kai } = await bothInLobby();
    await user.type(kai.getByRole("textbox", { name: "Message" }), "hello team{Enter}");
    expect(ana.getByRole("list", { name: "Team chat" })).toHaveTextContent("Kai: hello team");
    expect(kai.getByRole("list", { name: "Team chat" })).toHaveTextContent("Kai: hello team");
  });

  it("answers /help with the lobby list and /where with the game-only note", async () => {
    const { user, kai } = await bothInLobby();
    await user.type(kai.getByRole("textbox", { name: "Message" }), "/help{Enter}");
    expect(kai.getByRole("list", { name: "Team chat" })).toHaveTextContent("More commands once the expedition starts.");
    await user.type(kai.getByRole("textbox", { name: "Message" }), "/where{Enter}");
    expect(kai.getByRole("list", { name: "Team chat" })).toHaveTextContent("Available once the expedition starts.");
  });
});
