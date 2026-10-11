import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { NO_FLAGS, type RankedPlayer } from "../game/team";
import type { TeamSession } from "../hooks/useTeamSession";
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
