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
    render(<Overworld onMenu={() => {}} initial={{ terminalOpen: true }} />);
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

describe("Overworld map", () => {
  it("looting the supply cache logs, fills the inventory and empties the cache", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[X] Supply Cache" }));
    expect(screen.getByText("Supply cache opened: +1 Repair Patch.")).toBeInTheDocument();
    expect(screen.getByText("Patch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[X] Empty Cache" })).toBeInTheDocument();
  });

  it("shows an inspection card that can be closed", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
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

  it("labels the river as a bridge once the gate is unlocked", () => {
    const { unmount } = render(<Overworld onMenu={() => {}} />);
    expect(screen.getByText("Frozen River")).toBeInTheDocument();
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true }} />);
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

  it("pauses river damage while the terminal is open", () => {
    render(<Overworld onMenu={() => {}} initial={{ player: { x: 50, y: 33 }, terminalOpen: true }} />);
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
    render(<Overworld onMenu={() => {}} />);
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
    expect(within(card()).getByText("A locked compiler gate. Its terminal leads to the code puzzle.")).toBeInTheDocument();
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ inspected: "river" }} />);
    expect(within(card()).getByText("Ice integrity: 42%. Exposure drains HP while crossing.")).toBeInTheDocument();
  });

  it("describes the open gate and the safe bridge once the bridge is restored", () => {
    const { unmount } = render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true, inspected: "gate" }} />);
    expect(within(card()).getByText("The compiler gate stands open. The bridge beyond it holds.")).toBeInTheDocument();
    unmount();
    render(<Overworld onMenu={() => {}} initial={{ gateUnlocked: true, inspected: "river" }} />);
    expect(within(card()).getByText("The bridge spans the river. Crossing is safe now.")).toBeInTheDocument();
  });

  it("updates the open gate card the moment the puzzle is solved", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    await user.keyboard("block{Enter}");
    expect(within(card()).getByText("The compiler gate stands open. The bridge beyond it holds.")).toBeInTheDocument();
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
    expect(screen.getByRole("alert")).toHaveTextContent("Compile error: display: flex keeps the bridge hidden.");
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

  it("solving the puzzle closes the terminal and restores the bridge", async () => {
    const user = setup();
    render(<Overworld onMenu={() => {}} />);
    await user.click(screen.getByRole("button", { name: "[G] Gate" }));
    expect(screen.getByRole("dialog", { name: /terminal gate lock/i })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "display value" });
    await user.clear(input);
    await user.type(input, "block");
    await user.click(screen.getByRole("button", { name: "[ SUBMIT CODE ]" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Bridge restored. The river can be crossed safely.")).toBeInTheDocument();
    expect(screen.getByText("Bridge")).toBeInTheDocument();
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
    render(<Overworld onMenu={() => {}} />);
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
    render(<Overworld onMenu={() => {}} initial={{ hasLoot: true, cipherOpen: true }} />);
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
