import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Overworld } from "./Overworld";

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Overworld HUD", () => {
  it("shows region, phase/time, full bars, quest and the initial log", () => {
    render(<Overworld onMenu={() => {}} />);
    expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
    expect(screen.getByText("Dusk / 19:29")).toBeInTheDocument();
    const [hp, sta] = screen.getAllByRole("meter");
    expect(hp).toHaveAttribute("aria-valuenow", "100");
    expect(sta).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Quest: Survey Frozen River (0/1)")).toBeInTheDocument();
    expect(screen.getByText("Entered C++ Peaks.")).toBeInTheDocument();
    expect(screen.getByText("Move: WASD / Arrows")).toBeInTheDocument();
    expect(screen.getByText("Interact: [E]")).toBeInTheDocument();
  });

  it("advances the clock five minutes every two seconds", () => {
    render(<Overworld onMenu={() => {}} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("Dusk / 19:34")).toBeInTheDocument();
  });

  it("pauses the clock while the terminal is open", () => {
    render(<Overworld onMenu={() => {}} initial={{ challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null } }} />);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Dusk / 19:29")).toBeInTheDocument();
  });

  it("pauses the clock while downed", () => {
    render(<Overworld onMenu={() => {}} initial={{ hp: 0 }} />);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Dusk / 19:29")).toBeInTheDocument();
  });

  it("shows the completed quest", () => {
    render(<Overworld onMenu={() => {}} initial={{ questComplete: true }} />);
    expect(screen.getByText("Quest: Survey Frozen River (1/1 Complete)")).toBeInTheDocument();
  });

  it("[=] Menu calls onMenu", async () => {
    const onMenu = vi.fn();
    const user = setup();
    render(<Overworld onMenu={onMenu} />);
    await user.click(screen.getByRole("button", { name: "[=] Menu" }));
    expect(onMenu).toHaveBeenCalledOnce();
  });
});

describe("Overworld layout", () => {
  const QUEST_LINES = [
    "Quest: Survey Frozen River (0/1)",
    "Treasure: Golden Semicolon (0/1)",
    "Tower: Power the signal tower (0/1)",
  ];

  it("the quest lines sit in their own Quests section, once each, outside the inventory bar", () => {
    render(<Overworld onMenu={() => {}} />);
    const quests = screen.getByRole("region", { name: "Quests" });
    for (const line of QUEST_LINES) {
      expect(within(quests).getByText(line)).toBeInTheDocument();
      expect(screen.getAllByText(line)).toHaveLength(1);
      expect(within(screen.getByRole("contentinfo")).queryByText(line)).toBeNull();
    }
  });

  it("at md the sidebar holds the mini-map, the quests and the event log, with the map beside them", () => {
    const { container } = render(<Overworld onMenu={() => {}} />);
    const miniMapRoot = screen.getByRole("img", { name: "Mini-map" }).parentElement!;
    const quests = screen.getByRole("region", { name: "Quests" });
    const log = screen.getByRole("log", { name: "Event log" }).closest("aside")!;
    for (const el of [miniMapRoot, quests, log]) expect(el.className.split(/\s+/)).toContain("md:col-start-1");
    const mapColumn = screen.getByTestId("map-canvas").parentElement!.parentElement!;
    expect(mapColumn.className.split(/\s+/)).toContain("md:col-start-2");
    const panel = container.firstElementChild!;
    expect(panel.className.split(/\s+/)).toEqual(expect.arrayContaining(["md:min-h-[calc(100dvh-1rem)]", "max-w-screen-2xl"]));
    expect(miniMapRoot.className.split(/\s+/)).toContain("md:flex-col");
    expect(quests.className.split(/\s+/)).toEqual(expect.arrayContaining(["bg-[var(--bg)]", "md:border-r-2"]));
  });

  it("at md the event log keeps room for its longest entry, so short windows scroll the page instead of cutting it", () => {
    render(<Overworld onMenu={() => {}} />);
    // jsdom has no layout: the browser check measures it; this pins the floor (136 px: a 40-px header offset,
    // Ada's longest line at 80 px, 12 px below), which still lets 1280 × 520 fit without scrolling.
    const classes = screen.getByRole("log", { name: "Event log" }).closest("aside")!.className.split(/\s+/);
    expect(classes).toContain("md:min-h-34");
    expect(classes).not.toContain("md:min-h-0");
  });
});

describe("Overworld map", () => {
  it("looting the supply cache logs, fills the inventory and empties the cache", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true }} />);
    await user.click(screen.getByRole("button", { name: "[X] Supply Cache" }));
    expect(screen.getByText("Supply cache opened: +1 Repair Patch.")).toBeInTheDocument();
    expect(screen.getByText("Patch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[X] Empty Cache" })).toBeInTheDocument();
  });

  it("shows an inspection card that can be closed", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true }} />);
    await user.click(screen.getByRole("button", { name: "[X] Supply Cache" }));
    const card = screen.getByRole("region", { name: "POI Inspection" });
    expect(within(card).getByText("Cache recovered. Repair Patch added to inventory.")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "[X] Close" }));
    expect(screen.queryByRole("region", { name: "POI Inspection" })).toBeNull();
  });

  it("shows the inspect prompt only near a point of interest", () => {
    const { unmount } = render(<Overworld onMenu={() => {}} />);
    expect(screen.queryByText(/\[E\] Inspect/)).toBeNull();
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ player: { x: 50, y: 58 } }} />);
    expect(screen.getByText("[E] Inspect Terminal Gate")).toBeInTheDocument();
  });

  it("labels the river as a bridge once the tower is powered", () => {
    const { unmount } = render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true }} />);
    expect(screen.getByText("Frozen River")).toBeInTheDocument();
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ towerPowered: true }} />);
    expect(screen.getByText("Bridge")).toBeInTheDocument();
  });
});

describe("Overworld timers", () => {
  it("the river drains 8 HP every 1.8 seconds", () => {
    render(<Overworld onMenu={() => {}} initial={{ player: { x: 50, y: 33 } }} />);
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow", "92");
    expect(screen.getByText("Cold exposure: -8 HP.")).toBeInTheDocument();
  });

  it("the village has no cold", () => {
    render(<Overworld onMenu={() => {}} initial={{ zone: "village", player: { x: 50, y: 33 } }} />);
    act(() => vi.advanceTimersByTime(3600));
    expect(screen.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow", "100");
  });

  it("solving the gate does not stop the cold", () => {
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true, player: { x: 50, y: 33 } }} />);
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow", "92");
  });

  it("a powered tower stops the cold", () => {
    render(<Overworld onMenu={() => {}} initial={{ towerPowered: true, player: { x: 50, y: 33 } }} />);
    act(() => vi.advanceTimersByTime(3600));
    expect(screen.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow", "100");
  });

  it("pauses river damage while the terminal is open", () => {
    render(<Overworld onMenu={() => {}} initial={{ player: { x: 50, y: 33 }, challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null } }} />);
    act(() => vi.advanceTimersByTime(3600));
    expect(screen.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow", "100");
  });

  it("the drone follows the player after a short delay", () => {
    render(<Overworld onMenu={() => {}} />);
    const drone = screen.getByTestId("drone");
    expect(drone.style.left).toBe("36%");
    act(() => vi.advanceTimersByTime(320));
    expect(parseFloat(drone.style.left)).toBeCloseTo(36 + (28 - 36) * 0.58);
  });

  it("the drone keeps following while the player moves continuously", () => {
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true, player: { x: 48, y: 72 } }} />);
    const drone = screen.getByTestId("drone");
    act(() => vi.advanceTimersByTime(400));
    const startTop = parseFloat(drone.style.top);
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: "ArrowUp" });
      act(() => vi.advanceTimersByTime(100));
    }
    expect(screen.getByTestId("player").style.top).toBe("32%");
    expect(parseFloat(drone.style.top)).toBeLessThan(startTop - 15);
  });

  it("at 0 HP shows DOWNED and Respawn restores the player", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} initial={{ hp: 0, player: { x: 50, y: 33 } }} />);
    expect(screen.getByText("DOWNED")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Respawn ]" }));
    expect(screen.queryByText("DOWNED")).toBeNull();
    expect(screen.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Drone revived you at base camp.")).toBeInTheDocument();
  });

  it("focuses Respawn when the player goes down and disables the covered map buttons", () => {
    render(<Overworld onMenu={() => {}} initial={{ hp: 8, player: { x: 50, y: 33 } }} />);
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByRole("button", { name: "[ Respawn ]" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "[G] Gate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "[X] Supply Cache" })).toBeDisabled();
    expect(screen.getByText("You are downed. Press Respawn.")).toBeInTheDocument();
  });

  it("clears every timer on unmount", () => {
    const err = vi.spyOn(console, "error");
    const { unmount } = render(<Overworld onMenu={() => {}} initial={{ player: { x: 50, y: 33 } }} />);
    unmount();
    act(() => vi.advanceTimersByTime(10000));
    expect(err).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Overworld inspection text", () => {
  const card = () => screen.getByRole("region", { name: "POI Inspection" });

  it("describes the locked gate and the dangerous river before the bridge is restored", () => {
    const { unmount } = render(<Overworld onMenu={() => {}} initial={{ inspected: "gate" }} />);
    expect(within(card()).getByText("A locked compiler gate in the north wall. Its terminal leads to the code puzzle.")).toBeInTheDocument();
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ inspected: "river" }} />);
    expect(within(card()).getByText("Ice integrity: 42%. Exposure drains HP while crossing.")).toBeInTheDocument();
  });

  it("describes the open gate and the safe bridge once the bridge is restored", () => {
    const { unmount } = render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true, inspected: "gate" }} />);
    expect(within(card()).getByText("The compiler gate stands open. The way north is clear.")).toBeInTheDocument();
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true, towerPowered: true, inspected: "river" }} />);
    expect(within(card()).getByText("The bridge spans the river. Crossing is safe now.")).toBeInTheDocument();
  });

  it("updates the open gate card the moment the puzzle is solved", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    expect(within(card()).getByText("The compiler gate stands open. The way north is clear.")).toBeInTheDocument();
    expect(within(card()).queryByText(/A locked compiler gate/)).toBeNull();
  });
});

describe("Overworld terminal puzzle", () => {
  it("a wrong answer keeps the terminal open with an error", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    const input = screen.getByRole("textbox", { name: "display value" });
    await user.clear(input);
    await user.type(input, "flex{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Not quite: display: flex doesn't open this lock. Check the hint or try again.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("using the hint item reveals the drone's hint", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    await user.click(screen.getByRole("button", { name: "[ USE HINT ITEM ]" }));
    expect(
      screen.getByText(`"Setting display to 'none' hides the object. Try 'block' instead!"`),
    ).toBeInTheDocument();
  });

  it("solving the puzzle closes the terminal and opens the gate", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    expect(screen.getByRole("dialog", { name: /terminal gate lock/i })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "display value" });
    await user.clear(input);
    await user.type(input, "block");
    await user.click(screen.getByRole("button", { name: "[ SUBMIT CODE ]" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Gate unlocked. The way north is open.")).toBeInTheDocument();
    expect(screen.getByText("Frozen River")).toBeInTheDocument();
  });
});

describe("Overworld hidden artifact", () => {
  it("lists the treasure objective from the start", () => {
    render(<Overworld onMenu={() => {}} />);
    expect(screen.getByText("Treasure: Golden Semicolon (0/1)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "[ Decode Scroll ]" })).toBeNull();
  });

  it("looting the cache adds the encrypted scroll and a Decode Scroll button", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true }} />);
    await user.click(screen.getByRole("button", { name: "[X] Supply Cache" }));
    expect(screen.getByText("Found an encrypted scroll: QRAFR SBERFG")).toBeInTheDocument();
    expect(screen.getByText("Scroll")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[ Decode Scroll ]" })).toBeInTheDocument();
  });

  it("decoding the scroll: a wrong answer shows an error, the right one logs the clue", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} initial={{ hasLoot: true }} />);
    await user.click(screen.getByRole("button", { name: "[ Decode Scroll ]" }));
    expect(screen.getByRole("dialog", { name: "< SCROLL CIPHER: ROT13 >" })).toBeInTheDocument();
    await user.keyboard("frozen river{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent('Not quite: "frozen river" is not what the scroll says.');
    const input = screen.getByRole("textbox", { name: "decoded text" });
    await user.clear(input);
    await user.type(input, "dense forest{Enter}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Clue decoded: the artifact rests in the Dense Forest.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "[ Decode Scroll ]" })).toBeNull();
  });

  it("pauses the clock while the cipher is open", () => {
    render(<Overworld onMenu={() => {}} initial={{ hasLoot: true, challenge: { target: "cipher", error: null, wrongTries: 0, solved: false, lastWrong: null } }} />);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Dusk / 19:29")).toBeInTheDocument();
  });

  it("keeps the dig spot hidden until the clue is decoded", () => {
    render(<Overworld onMenu={() => {}} initial={{ hasLoot: true, player: { x: 72, y: 80 } }} />);
    expect(screen.queryByText("[E] Dig here")).toBeNull();
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.queryByText("Artifact found: the Golden Semicolon!")).toBeNull();
    expect(screen.queryByTestId("artifact")).toBeNull();
  });

  it("after decoding, [E] digs up the Golden Semicolon", () => {
    render(<Overworld onMenu={() => {}} initial={{ hasLoot: true, clueDecoded: true, player: { x: 72, y: 80 } }} />);
    // map prompt + touch [E] button (CSS-hidden on desktop)
    expect(screen.getAllByText("[E] Dig here")).toHaveLength(2);
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByText("Artifact found: the Golden Semicolon!")).toBeInTheDocument();
    expect(screen.getByText("Semicolon")).toBeInTheDocument();
    expect(screen.getByText("Treasure: Golden Semicolon (1/1 Found)")).toBeInTheDocument();
    expect(screen.getByTestId("artifact")).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "POI Inspection" });
    expect(
      within(card).getByText("The Golden Semicolon, Devlandia's lost line-ender. Every statement can finally be completed."),
    ).toBeInTheDocument();
    expect(screen.queryAllByText("[E] Dig here")).toHaveLength(0);
  });
});

describe("Overworld signal tower", () => {
  it("lists the tower objective and keeps the fog until the tower is powered", () => {
    render(<Overworld onMenu={() => {}} />);
    expect(screen.getByText("Tower: Power the signal tower (0/1)")).toBeInTheDocument();
    expect(screen.getByTestId("fog").style.background).toContain("radial-gradient");
  });

  it("the tower button opens the logic lock; the right switches power it and lift the fog", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true }} />);
    await user.click(screen.getByRole("button", { name: "[T] Tower" }));
    expect(screen.getByRole("dialog", { name: "< SIGNAL TOWER: LOGIC LOCK >" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ RUN CIRCUIT ]" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Circuit failed: line 2 (A AND B) outputs 0.");
    await user.click(screen.getByRole("switch", { name: "Switch A" }));
    await user.click(screen.getByRole("switch", { name: "Switch B" }));
    await user.click(screen.getByRole("button", { name: "[ RUN CIRCUIT ]" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Signal tower online: the fog lifts and the bridge returns.")).toBeInTheDocument();
    expect(screen.getByText("Bridge")).toBeInTheDocument();
    expect(screen.getByTestId("fog").style.opacity).toBe("0");
    expect(screen.getByRole("button", { name: "[T] Tower ✓" })).toBeInTheDocument();
    expect(screen.getByText("Tower: Power the signal tower (1/1 Online)")).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "POI Inspection" });
    expect(within(card).getByText("The signal tower hums. Its beam keeps the fog away and holds the bridge.")).toBeInTheDocument();
  });

  it("pauses the clock while the logic lock is open", () => {
    render(<Overworld onMenu={() => {}} initial={{ logicOpen: true }} />);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Dusk / 19:29")).toBeInTheDocument();
  });

  it("[E] next to the tower opens the logic lock", () => {
    render(<Overworld onMenu={() => {}} initial={{ player: { x: 14, y: 26 } }} />);
    expect(screen.getByText("[E] Inspect Signal Tower")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByRole("dialog", { name: "< SIGNAL TOWER: LOGIC LOCK >" })).toBeInTheDocument();
  });
});

describe("Overworld inspection card placement", () => {
  it("moves the card to the top when the inspected point is in the lower half, so it never covers it", () => {
    const { unmount } = render(<Overworld onMenu={() => {}} initial={{ hasLoot: true, clueDecoded: true, artifactFound: true, inspected: "artifact" }} />);
    expect(screen.getByRole("region", { name: "POI Inspection" }).className).toContain("top-3");
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ hasLoot: true, inspected: "chest" }} />);
    expect(screen.getByRole("region", { name: "POI Inspection" }).className).toContain("bottom-3");
  });
});

describe("Overworld village", () => {
  it("in the village [E] talks to Ada", () => {
    render(<Overworld onMenu={() => {}} initial={{ zone: "village", player: { x: 34, y: 72 } }} />);
    expect(screen.getAllByText("[E] Talk to Ada")).toHaveLength(2);
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByRole("log", { name: "Event log" }).textContent).toContain(
      'Ada: "Heading north? The gate\'s terminal wants one CSS fix. Get the display right and the wall lets you through."',
    );
  });

  it("by the signpost [E] reads it", () => {
    render(<Overworld onMenu={() => {}} initial={{ zone: "village", player: { x: 90, y: 66 } }} />);
    expect(screen.getAllByText("[E] Read Signpost")).toHaveLength(2);
  });

  it("walking west from camp enters Dev Village", () => {
    render(<Overworld onMenu={() => {}} initial={{ player: { x: 6, y: 72 } }} />);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("REGION: DEV VILLAGE")).toBeInTheDocument();
    expect(screen.getByRole("log", { name: "Event log" }).textContent).toContain("Entered Dev Village.");
    expect(screen.getByRole("button", { name: "[V] Ada" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
  });

  it("in the village [E] opens Ada's card with her hint", () => {
    render(<Overworld onMenu={() => {}} initial={{ zone: "village", player: { x: 34, y: 72 } }} />);
    fireEvent.keyDown(window, { key: "e" });
    const card = screen.getByRole("region", { name: "POI Inspection" });
    expect(within(card).getByText("Ada")).toBeInTheDocument();
    expect(within(card).getByText("Heading north? The gate's terminal wants one CSS fix. Get the display right and the wall lets you through.")).toBeInTheDocument();
  });

  it("in the village the Peaks' places are out of reach", () => {
    render(<Overworld onMenu={() => {}} initial={{ zone: "village", player: { x: 50, y: 58 } }} />);
    expect(screen.queryByText(/\[E\] Inspect/)).toBeNull();
  });
});
