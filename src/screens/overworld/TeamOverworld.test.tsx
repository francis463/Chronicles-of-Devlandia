import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { POS_INTERVAL_MS } from "../../game/team";
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

  it("shows the room code and how many are online", async () => {
    const { ana, code } = await startedPair();
    expect(ana.getByText(`ROOM ${code} · 2 online`)).toBeInTheDocument();
  });

  it("shares progress: a teammate powering the tower lifts your fog and logs it once", async () => {
    const { user, ana, kai } = await startedPair();
    await user.click(ana.getByRole("button", { name: "[T] Tower" }));
    await user.click(ana.getByRole("switch", { name: "Switch A" }));
    await user.click(ana.getByRole("switch", { name: "Switch B" }));
    await user.click(ana.getByRole("button", { name: "[ RUN CIRCUIT ]" }));
    expect(countIn(logText(kai), "Ana powered the signal tower. The fog lifts.")).toBe(1);
    expect(kai.getByTestId("fog").style.opacity).toBe("0");
    expect(logText(ana)).not.toContain("Kai powered the signal tower");
    expect(countIn(logText(ana), "Signal tower online: the fog lifts across C++ Peaks.")).toBe(1);
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
    expect(zed.getByText("Bridge")).toBeInTheDocument();
    expect(logText(zed)).toContain("Ana restored the bridge.");
    expect(logText(ana)).toContain("Zed joined the team.");
  });

  it("keeps playing through a dropped connection and merges progress on reconnect (Review Focus 4)", async () => {
    const { user, hub, transports, ana, kai } = await startedPair();
    act(() => hub.drop(transports[1]));
    expect(kai.getByText("Reconnecting…")).toBeInTheDocument();
    await user.click(kai.getByRole("button", { name: "[X] Supply Cache" }));
    expect(logText(ana)).not.toContain("Kai opened the Supply Cache.");
    act(() => hub.restore(transports[1]));
    expect(kai.queryByText("Reconnecting…")).toBeNull();
    expect(logText(ana)).toContain("Kai opened the Supply Cache.");
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
