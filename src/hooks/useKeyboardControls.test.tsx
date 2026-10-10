import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Overworld } from "../screens/overworld/Overworld";

const noop = () => {};
const player = () => screen.getByTestId("player");

describe("useKeyboardControls: movement", () => {
  it("moves with arrow keys and WASD (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} />);
    await user.keyboard("{ArrowUp}");
    expect(player().style.top).toBe("68%");
    await user.keyboard("D");
    expect(player().style.left).toBe("32%");
    await user.keyboard("s");
    expect(player().style.top).toBe("72%");
    await user.keyboard("{ArrowLeft}");
    expect(player().style.left).toBe("28%");
  });

  it("prevents the default action only for handled keys", () => {
    render(<Overworld onMenu={noop} />);
    expect(fireEvent.keyDown(window, { key: "ArrowDown" })).toBe(false);
    expect(fireEvent.keyDown(window, { key: "q" })).toBe(true);
  });

  it("ignores keys while downed", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ hp: 0 }} />);
    await user.keyboard("{ArrowUp}");
    expect(player().style.top).toBe("72%");
  });

  it("ignores keys while the terminal is open", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null }, player: { x: 50, y: 58 } }} />);
    // Move focus off the puzzle input so the terminal guard (not the text-field guard) is exercised.
    screen.getByRole("button", { name: "[ USE HINT ITEM ]" }).focus();
    await user.keyboard("{ArrowUp}we");
    expect(player().style.top).toBe("58%");
    expect(screen.queryByText("Gate terminal ready. Puzzle link found.")).toBeNull();
  });

  it("ignores keys typed into a text field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="note" />
        <Overworld onMenu={noop} />
      </>,
    );
    await user.type(screen.getByRole("textbox", { name: "note" }), "wwaae");
    expect(player().style.left).toBe("28%");
    expect(player().style.top).toBe("72%");
  });
});

describe("useKeyboardControls: interact", () => {
  it("[E] does nothing out of range", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} />);
    await user.keyboard("e");
    expect(screen.queryByText(/Gate terminal ready/)).toBeNull();
    expect(screen.queryByRole("region", { name: "POI Inspection" })).toBeNull();
  });

  it("[E] interacts with the nearest point of interest in range", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 80, y: 22 } }} />);
    await user.keyboard("E");
    expect(screen.getByText("Supply cache opened: +1 Repair Patch.")).toBeInTheDocument();
  });

  it("[E] next to the gate opens the terminal dialog", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 58 } }} />);
    await user.keyboard("e");
    expect(screen.getByRole("dialog", { name: /terminal gate lock/i })).toBeInTheDocument();
  });

  it("typing in the terminal input does not move the player", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 58 } }} />);
    await user.keyboard("e");
    await user.type(screen.getByRole("textbox", { name: "display value" }), "wwaae");
    expect(player().style.top).toBe("58%");
    expect(player().style.left).toBe("50%");
  });

  it("Esc closes an open challenge", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null }, player: { x: 50, y: 58 } }} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    screen.getByRole("button", { name: "[ USE HINT ITEM ]" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape closes the terminal dialog", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 58 } }} />);
    await user.keyboard("e");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("useKeyboardControls: scroll cipher", () => {
  it("ignores game keys while the cipher is open and Escape closes it", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ hasLoot: true, challenge: { target: "cipher", error: null, wrongTries: 0, solved: false, lastWrong: null }, player: { x: 80, y: 22 } }} />);
    screen.getByRole("button", { name: "[ USE HINT ITEM ]" }).focus();
    await user.keyboard("{ArrowUp}we");
    expect(player().style.top).toBe("22%");
    expect(screen.queryByText("Supply cache already collected.")).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("useKeyboardControls: signal tower lock", () => {
  it("ignores game keys while the logic lock is open and Escape closes it", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ logicOpen: true, player: { x: 14, y: 26 } }} />);
    screen.getByRole("button", { name: "[ USE HINT ITEM ]" }).focus();
    await user.keyboard("{ArrowUp}we");
    expect(player().style.top).toBe("26%");
    expect(screen.queryByText("Signal tower terminal ready. Logic lock found.")).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("useKeyboardControls: the Codex (Review Focus 3)", () => {
  const codex = () => screen.queryByRole("dialog", { name: /CODEX/ });

  it("C opens the Codex only without modifiers and only with no terminal open", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Overworld onMenu={noop} />);
    await user.keyboard("{Control>}c{/Control}");
    expect(codex()).toBeNull();
    await user.keyboard("{Alt>}c{/Alt}");
    expect(codex()).toBeNull();
    await user.keyboard("c");
    expect(codex()).toBeInTheDocument();
    unmount();
    render(<Overworld onMenu={noop} initial={{ challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null } }} />);
    screen.getByRole("button", { name: "[ USE HINT ITEM ]" }).focus();
    await user.keyboard("c");
    expect(codex()).toBeNull();
  });

  it("Esc closes the Codex and it stays closed; C closes it and it stays closed (one toggleCodex per press)", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Overworld onMenu={noop} initial={{ codexOpen: true }} />);
    expect(codex()).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(codex()).toBeNull();
    unmount();
    render(<Overworld onMenu={noop} initial={{ codexOpen: true }} />);
    await user.keyboard("c");
    expect(codex()).toBeNull();
  });

  it("a held C (repeat) dispatches nothing; with the logic lock open, C dispatches nothing", () => {
    const { unmount } = render(<Overworld onMenu={noop} />);
    fireEvent.keyDown(window, { key: "c", repeat: true });
    expect(codex()).toBeNull();
    unmount();
    render(<Overworld onMenu={noop} initial={{ logicOpen: true }} />);
    fireEvent.keyDown(document.body, { key: "c" });
    expect(codex()).toBeNull();
    expect(screen.getByRole("dialog", { name: "< SIGNAL TOWER: LOGIC LOCK >" })).toBeInTheDocument();
  });

  it("typing w a s d e c into a terminal input neither moves, interacts nor opens the Codex", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 50, y: 58 } }} />);
    await user.keyboard("e");
    await user.type(screen.getByRole("textbox", { name: "display value" }), "wasdec");
    expect(player().style.top).toBe("58%");
    expect(player().style.left).toBe("50%");
    expect(codex()).toBeNull();
  });
});
