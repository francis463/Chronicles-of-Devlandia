import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Overworld } from "./Overworld";
import { TouchControls } from "./TouchControls";

// A game remembers its questions in localStorage; here every mount rolls from a clean slate (and jsdom's storage would queue a fake timer).
vi.mock("../../learn/recent", async (importActual) => ({ ...(await importActual<typeof import("../../learn/recent")>()), loadRecent: () => ({}), saveRecent: () => {} }));


const noop = () => {};
const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const player = () => screen.getByTestId("player");
const pad = (dir: "up" | "down" | "left" | "right") => screen.getByRole("button", { name: `Move ${dir}` });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TouchControls: D-pad", () => {
  it("renders a labelled group with four direction buttons", () => {
    render(<Overworld onMenu={noop} />);
    expect(screen.getByRole("group", { name: "Touch controls" })).toBeInTheDocument();
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeEnabled();
  });

  it("a tap moves one step", async () => {
    const user = setup();
    render(<Overworld onMenu={noop} />);
    await user.click(pad("up"));
    expect(player().style.top).toBe("70%");
    await user.click(pad("right"));
    expect(player().style.left).toBe("30%");
  });

  it("holding repeats a step every 150 ms until released", () => {
    render(<Overworld onMenu={noop} />);
    fireEvent.pointerDown(pad("up"));
    expect(player().style.top).toBe("70%");
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("64%");
    fireEvent.pointerUp(pad("up"));
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("64%");
  });

  it("sliding off or a cancelled touch stops the repeat", () => {
    render(<Overworld onMenu={noop} />);
    fireEvent.pointerDown(pad("left"));
    fireEvent.pointerLeave(pad("left"));
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.left).toBe("26%");
    fireEvent.pointerDown(pad("down"));
    fireEvent.pointerCancel(pad("down"));
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("74%");
  });

  it("works from the keyboard (Enter on a focused button) without double steps", async () => {
    const user = setup();
    render(<Overworld onMenu={noop} />);
    pad("down").focus();
    await user.keyboard("{Enter}");
    expect(player().style.top).toBe("74%");
  });

  it("clears the repeat timer when the overworld unmounts mid-hold", () => {
    const { unmount } = render(<Overworld onMenu={noop} initial={{ gateUnlocked: true }} />);
    fireEvent.pointerDown(pad("up"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("TouchControls: interact button", () => {
  it("is disabled when nothing is in range", () => {
    render(<Overworld onMenu={noop} initial={{ player: { x: 62, y: 90 } }} />);
    expect(screen.getByRole("button", { name: "[E] Interact" })).toBeDisabled();
  });

  it("names the point of interest in range and interacts with it", async () => {
    const user = setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 54 } }} />);
    await user.click(screen.getByRole("button", { name: "[E] Terminal Gate" }));
    expect(screen.getByRole("dialog", { name: /terminal gate lock/i })).toBeInTheDocument();
  });
});

describe("TouchControls: disabled states", () => {
  it("disables every touch control while downed", () => {
    render(<Overworld onMenu={noop} initial={{ hp: 0, player: { x: 50, y: 54 } }} />);
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeDisabled();
    expect(screen.getByRole("button", { name: "[E] Interact" })).toBeDisabled();
  });

  it("disables every touch control while the terminal is open", () => {
    render(<Overworld onMenu={noop} initial={{ challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null }, player: { x: 50, y: 54 } }} />);
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeDisabled();
    expect(screen.getByRole("button", { name: "[E] Terminal Gate" })).toBeDisabled();
  });

  it("stops a held move when the controls become disabled", () => {
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 58 } }} />);
    fireEvent.pointerDown(pad("up"));
    expect(player().style.top).toBe("56%");
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("56%");
  });
});

describe("Controls legend", () => {
  it("includes the touch hints alongside the keyboard hints", () => {
    render(<Overworld onMenu={noop} />);
    expect(screen.getByText("Move: D-pad")).toBeInTheDocument();
    expect(screen.getByText("Interact: [E] button")).toBeInTheDocument();
    expect(screen.getByText("Move: WASD / Arrows")).toBeInTheDocument();
  });
});

describe("TouchControls: hidden artifact", () => {
  it("the [E] button digs at the revealed spot", async () => {
    const user = setup();
    render(<Overworld onMenu={noop} initial={{ hasLoot: true, clueDecoded: true, zone: "foggaten", player: { x: 84, y: 80 } }} />);
    await user.click(screen.getByRole("button", { name: "[E] Dig here" }));
    expect(screen.getByText("Artifact found: the Golden Semicolon!")).toBeInTheDocument();
  });

  it("disables the touch controls while the cipher is open", () => {
    render(<Overworld onMenu={noop} initial={{ hasLoot: true, challenge: { target: "cipher", error: null, wrongTries: 0, solved: false, lastWrong: null } }} />);
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeDisabled();
  });
});

describe("TouchControls: signal tower", () => {
  it("names the tower on the [E] button and opens its lock", async () => {
    const user = setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 14, y: 22 } }} />);
    await user.click(screen.getByRole("button", { name: "[E] Signal Tower" }));
    expect(screen.getByRole("dialog", { name: "< SIGNAL TOWER: LOGIC LOCK >" })).toBeInTheDocument();
  });

  it("disables the touch controls while the logic lock is open", () => {
    render(<Overworld onMenu={noop} initial={{ logicOpen: true }} />);
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeDisabled();
  });
});

describe("TouchControls: held sideways", () => {
  const floating = (extra: Partial<Parameters<typeof TouchControls>[0]> = {}) =>
    render(<TouchControls floating disabled={false} inRange={null} label={null} onMove={vi.fn()} onInteract={vi.fn()} {...extra} />);
  const group = () => screen.getByRole("group", { name: "Touch controls", hidden: true });
  const pad = (dir: string) => screen.getByRole("button", { name: `Move ${dir}`, hidden: true });

  beforeEach(() => localStorage.clear());

  it("keeps clear of a notch and the rounded corners with the safe-area insets", () => {
    floating();
    expect(group().className).toContain("safe-controls"); // .safe-controls pads left, right and bottom by max(the usual, the inset); see index.css
  });

  it("is see-through when idle, wakes on a touch, and fades again after two seconds", () => {
    floating();
    expect(group()).toHaveAttribute("data-awake", "false");
    fireEvent.pointerDown(pad("up"));
    expect(group()).toHaveAttribute("data-awake", "true");
    fireEvent.pointerUp(pad("up"));
    act(() => vi.advanceTimersByTime(1900));
    expect(group()).toHaveAttribute("data-awake", "true");
    act(() => vi.advanceTimersByTime(200));
    expect(group()).toHaveAttribute("data-awake", "false");
  });

  it("the bar under the map (not held sideways) is never see-through and has no swap button", () => {
    render(<TouchControls disabled={false} inRange={null} label={null} onMove={vi.fn()} onInteract={vi.fn()} />);
    expect(group()).not.toHaveAttribute("data-awake");
    expect(screen.queryByRole("button", { name: "Swap sides", hidden: true })).toBeNull();
  });

  it("the swap button puts the D-pad on the right and [E] on the left, and remembers it", () => {
    const first = floating();
    const part = (name: string) => group().querySelector(`[data-part='${name}']`) as HTMLElement;
    // Unswapped: the D-pad is first (left) and [E] last (right); swapped, flex order puts [E] first and the D-pad last.
    expect([part("pad").className.includes("order-3"), part("act").className.includes("order-1")]).toEqual([false, false]);
    fireEvent.click(screen.getByRole("button", { name: "Swap sides", hidden: true }));
    expect([part("pad").className.includes("order-3"), part("act").className.includes("order-1")]).toEqual([true, true]);
    expect(localStorage.getItem("devlandia.swapHands")).toBe("1");
    first.unmount();
    floating();
    expect(part("pad").className).toContain("order-3");
    fireEvent.click(screen.getByRole("button", { name: "Swap sides", hidden: true }));
    expect(localStorage.getItem("devlandia.swapHands")).toBe("0");
    expect(part("pad").className).not.toContain("order-3");
  });

  it("a blocked or odd saved choice just means the default", () => {
    localStorage.setItem("devlandia.swapHands", "banana");
    floating();
    expect(screen.getByRole("button", { name: "Swap sides", hidden: true })).toHaveAttribute("aria-pressed", "false");
  });

  it("the buttons are smaller and see-through on the map", () => {
    floating();
    expect(pad("up").className).toContain("h-10");
    expect(pad("up").className).toContain("rgba");
  });
});

describe("TouchControls: joystick or arrows", () => {
  const mount = (over: Partial<Parameters<typeof TouchControls>[0]> = {}) => {
    const onMove = vi.fn();
    const view = render(<TouchControls disabled={false} inRange={null} label={null} onMove={onMove} onInteract={vi.fn()} {...over} />);
    return { onMove, ...view };
  };
  const stick = () => screen.getByRole("group", { name: "Joystick", hidden: true });
  const toggle = () => screen.getByRole("button", { name: "Joystick", hidden: true });
  const lean = (el: HTMLElement, x: number, y: number) => fireEvent.pointerMove(el, { clientX: x, clientY: y, pointerId: 1 });

  beforeEach(() => localStorage.clear());

  it("starts with the arrow pad and no joystick, and the toggle is not pressed", () => {
    mount();
    expect(screen.queryByRole("group", { name: "Joystick", hidden: true })).toBeNull();
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("the toggle shows the joystick, keeps the four arrows for keyboards and screen readers, and remembers the choice", () => {
    const first = mount();
    fireEvent.click(toggle());
    expect(stick()).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("devlandia.touchControls")).toBe("stick");
    // The arrows are still there to Tab to, just not drawn.
    expect(pad("up").closest(".sr-only")).not.toBeNull();
    first.unmount();
    mount();
    expect(stick()).toBeInTheDocument();
    fireEvent.click(toggle());
    expect(localStorage.getItem("devlandia.touchControls")).toBe("arrows");
    expect(screen.queryByRole("group", { name: "Joystick", hidden: true })).toBeNull();
  });

  it("an odd saved value means the arrows", () => {
    localStorage.setItem("devlandia.touchControls", "banana");
    mount();
    expect(screen.queryByRole("group", { name: "Joystick", hidden: true })).toBeNull();
  });

  it("leaning the stick steps that way at once and every 150 ms, and a new lean changes the way", () => {
    const { onMove } = mount();
    fireEvent.click(toggle());
    fireEvent.pointerDown(stick(), { clientX: 0, clientY: 0, pointerId: 1 });
    expect(onMove).not.toHaveBeenCalled(); // resting on the middle is not a step
    lean(stick(), 30, 4);
    expect(onMove.mock.calls).toEqual([["right"]]);
    act(() => vi.advanceTimersByTime(300));
    expect(onMove.mock.calls.map((c) => c[0])).toEqual(["right", "right", "right"]);
    lean(stick(), 2, -30);
    expect(onMove.mock.calls.at(-1)).toEqual(["up"]);
    act(() => vi.advanceTimersByTime(150));
    expect(onMove.mock.calls.at(-1)).toEqual(["up"]);
  });

  it("moving the thumb inside the dead zone or lifting it stops the steps", () => {
    const { onMove } = mount();
    fireEvent.click(toggle());
    fireEvent.pointerDown(stick(), { clientX: 30, clientY: 0, pointerId: 1 });
    const steps = onMove.mock.calls.length;
    lean(stick(), 3, 3);
    act(() => vi.advanceTimersByTime(600));
    expect(onMove).toHaveBeenCalledTimes(steps);
    lean(stick(), -30, 0);
    expect(onMove.mock.calls.at(-1)).toEqual(["left"]);
    fireEvent.pointerUp(stick(), { pointerId: 1 });
    const after = onMove.mock.calls.length;
    act(() => vi.advanceTimersByTime(600));
    expect(onMove).toHaveBeenCalledTimes(after);
  });

  it("a cancelled touch stops too, and the knob goes back to the middle", () => {
    const { onMove } = mount();
    fireEvent.click(toggle());
    fireEvent.pointerDown(stick(), { clientX: 0, clientY: 30, pointerId: 1 });
    const knob = screen.getByTestId("stick-knob");
    expect(knob.style.transform).not.toContain("translate(0px, 0px)");
    fireEvent.pointerCancel(stick(), { pointerId: 1 });
    expect(knob.style.transform).toContain("translate(0px, 0px)");
    const n = onMove.mock.calls.length;
    act(() => vi.advanceTimersByTime(600));
    expect(onMove).toHaveBeenCalledTimes(n);
  });

  it("does nothing while the controls are disabled", () => {
    const { onMove } = mount({ disabled: true });
    fireEvent.click(toggle());
    fireEvent.pointerDown(stick(), { clientX: 30, clientY: 0, pointerId: 1 });
    act(() => vi.advanceTimersByTime(600));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("disabling in the middle of a lean stops it", () => {
    const { onMove, rerender } = mount();
    fireEvent.click(toggle());
    fireEvent.pointerDown(stick(), { clientX: 30, clientY: 0, pointerId: 1 });
    const n = onMove.mock.calls.length;
    rerender(<TouchControls disabled inRange={null} label={null} onMove={onMove} onInteract={vi.fn()} />);
    act(() => vi.advanceTimersByTime(600));
    expect(onMove).toHaveBeenCalledTimes(n);
  });

  it("the swap button moves the joystick to the other side like the arrows", () => {
    mount({ floating: true });
    fireEvent.click(toggle());
    const part = () => screen.getByRole("group", { name: "Touch controls", hidden: true }).querySelector("[data-part='pad']") as HTMLElement;
    expect(part().className).not.toContain("order-3");
    fireEvent.click(screen.getByRole("button", { name: "Swap sides", hidden: true }));
    expect(part().className).toContain("order-3");
    expect(part().contains(stick())).toBe(true);
  });
});
