import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Overworld } from "./Overworld";

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
    expect(player().style.top).toBe("68%");
    await user.click(pad("right"));
    expect(player().style.left).toBe("32%");
  });

  it("holding repeats a step every 150 ms until released", () => {
    render(<Overworld onMenu={noop} />);
    fireEvent.pointerDown(pad("up"));
    expect(player().style.top).toBe("68%");
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("56%");
    fireEvent.pointerUp(pad("up"));
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("56%");
  });

  it("sliding off or a cancelled touch stops the repeat", () => {
    render(<Overworld onMenu={noop} />);
    fireEvent.pointerDown(pad("left"));
    fireEvent.pointerLeave(pad("left"));
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.left).toBe("24%");
    fireEvent.pointerDown(pad("down"));
    fireEvent.pointerCancel(pad("down"));
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("76%");
  });

  it("works from the keyboard (Enter on a focused button) without double steps", async () => {
    const user = setup();
    render(<Overworld onMenu={noop} />);
    pad("down").focus();
    await user.keyboard("{Enter}");
    expect(player().style.top).toBe("76%");
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
    render(<Overworld onMenu={noop} />);
    expect(screen.getByRole("button", { name: "[E] Interact" })).toBeDisabled();
  });

  it("names the point of interest in range and interacts with it", async () => {
    const user = setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 58 } }} />);
    await user.click(screen.getByRole("button", { name: "[E] Terminal Gate" }));
    expect(screen.getByRole("dialog", { name: /terminal gate lock/i })).toBeInTheDocument();
  });
});

describe("TouchControls: disabled states", () => {
  it("disables every touch control while downed", () => {
    render(<Overworld onMenu={noop} initial={{ hp: 0, player: { x: 50, y: 58 } }} />);
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeDisabled();
    expect(screen.getByRole("button", { name: "[E] Interact" })).toBeDisabled();
  });

  it("disables every touch control while the terminal is open", () => {
    render(<Overworld onMenu={noop} initial={{ terminalOpen: true, player: { x: 50, y: 58 } }} />);
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeDisabled();
    expect(screen.getByRole("button", { name: "[E] Terminal Gate" })).toBeDisabled();
  });

  it("stops a held move when the controls become disabled", () => {
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 66 } }} />);
    fireEvent.pointerDown(pad("up"));
    expect(player().style.top).toBe("62%");
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    act(() => vi.advanceTimersByTime(450));
    expect(player().style.top).toBe("62%");
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
    render(<Overworld onMenu={noop} initial={{ hasLoot: true, clueDecoded: true, player: { x: 72, y: 80 } }} />);
    await user.click(screen.getByRole("button", { name: "[E] Dig here" }));
    expect(screen.getByText("Artifact found: the Golden Semicolon!")).toBeInTheDocument();
  });

  it("disables the touch controls while the cipher is open", () => {
    render(<Overworld onMenu={noop} initial={{ hasLoot: true, cipherOpen: true }} />);
    for (const dir of ["up", "down", "left", "right"] as const) expect(pad(dir)).toBeDisabled();
  });
});
