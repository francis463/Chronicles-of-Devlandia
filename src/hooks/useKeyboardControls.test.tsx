import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { initialState } from "../game/reducer";
import type { GameState } from "../game/types";
import { Overworld } from "../screens/overworld/Overworld";
import { useKeyboardControls } from "./useKeyboardControls";

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

function Harness({ state = initialState, onChatKey, dispatch = vi.fn(), paused = false, onButton }: { state?: GameState; onChatKey?: (slash: boolean) => void; dispatch?: () => void; paused?: boolean; onButton?: () => void }) {
  useKeyboardControls(state, dispatch, paused, onChatKey);
  return (
    <>
      <button onClick={onButton}>plain button</button>
      <a href="#x">plain link</a>
      <input aria-label="field" />
      <div role="tab" tabIndex={0} aria-selected="true">
        a tab
      </div>
    </>
  );
}

describe("useKeyboardControls: chat keys (Review Focus 4)", () => {
  it("Enter from the page opens the chat and is default-prevented", () => {
    const onChatKey = vi.fn();
    render(<Harness onChatKey={onChatKey} />);
    expect(fireEvent.keyDown(window, { key: "Enter" })).toBe(false);
    expect(fireEvent.keyDown(document.body, { key: "Enter" })).toBe(false);
    expect(onChatKey.mock.calls).toEqual([[false], [false]]);
  });

  it("Enter on a button, link, tab or text field is left alone, and the button still clicks", async () => {
    const user = userEvent.setup();
    const onChatKey = vi.fn();
    const onButton = vi.fn();
    render(<Harness onChatKey={onChatKey} onButton={onButton} />);
    for (const el of [screen.getByRole("button", { name: "plain button" }), screen.getByRole("link"), screen.getByRole("tab"), screen.getByRole("textbox")]) {
      el.focus();
      await user.keyboard("{Enter}");
    }
    expect(onChatKey).not.toHaveBeenCalled();
    expect(onButton).toHaveBeenCalledTimes(1);
  });

  it("ignores a held Enter and Ctrl, Alt or Meta with it", () => {
    const onChatKey = vi.fn();
    render(<Harness onChatKey={onChatKey} />);
    fireEvent.keyDown(window, { key: "Enter", repeat: true });
    for (const mod of ["ctrlKey", "altKey", "metaKey"]) fireEvent.keyDown(window, { key: "Enter", [mod]: true });
    expect(onChatKey).not.toHaveBeenCalled();
  });

  it("/ from the page or a focused button opens the chat with a slash and is default-prevented", () => {
    const onChatKey = vi.fn();
    render(<Harness onChatKey={onChatKey} />);
    expect(fireEvent.keyDown(window, { key: "/" })).toBe(false);
    screen.getByRole("button", { name: "plain button" }).focus();
    expect(fireEvent.keyDown(screen.getByRole("button", { name: "plain button" }), { key: "/" })).toBe(false);
    expect(onChatKey.mock.calls).toEqual([[true], [true]]);
  });

  it("/ typed in a text field is just text", () => {
    const onChatKey = vi.fn();
    render(<Harness onChatKey={onChatKey} />);
    expect(fireEvent.keyDown(screen.getByRole("textbox"), { key: "/" })).toBe(true);
    expect(onChatKey).not.toHaveBeenCalled();
  });

  it("neither fires while a terminal, the Codex or the leave confirmation is open, or while downed", () => {
    const onChatKey = vi.fn();
    const closed: GameState[] = [
      { ...initialState, challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null } },
      { ...initialState, codexOpen: true },
      { ...initialState, logicOpen: true },
      { ...initialState, hp: 0 },
    ];
    for (const state of closed) {
      const { unmount } = render(<Harness state={state} onChatKey={onChatKey} />);
      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyDown(window, { key: "/" });
      unmount();
    }
    render(<Harness paused onChatKey={onChatKey} />);
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "/" });
    expect(onChatKey).not.toHaveBeenCalled();
  });

  it("does nothing when no chat key handler is given", () => {
    render(<Harness />);
    expect(fireEvent.keyDown(window, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(window, { key: "/" })).toBe(true);
  });

  it("w a s d e c and Enter typed in a text field do nothing", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const onChatKey = vi.fn();
    render(<Harness dispatch={dispatch} onChatKey={onChatKey} />);
    await user.type(screen.getByRole("textbox"), "wasdec{Enter}/");
    expect(dispatch).not.toHaveBeenCalled();
    expect(onChatKey).not.toHaveBeenCalled();
  });
});

describe("useKeyboardControls: arrows on tabs", () => {
  it("an arrow whose target is a tab never moves the explorer, but d still does", () => {
    const dispatch = vi.fn();
    render(<Harness dispatch={dispatch} />);
    const tab = screen.getByRole("tab");
    tab.focus();
    fireEvent.keyDown(tab, { key: "ArrowRight" });
    fireEvent.keyDown(tab, { key: "ArrowUp" });
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.keyDown(tab, { key: "d" });
    expect(dispatch).toHaveBeenCalledWith({ type: "move", dir: "right" });
  });

  it("the same arrow on the page moves", () => {
    const dispatch = vi.fn();
    render(<Harness dispatch={dispatch} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(dispatch).toHaveBeenCalledWith({ type: "move", dir: "right" });
  });
});

describe("useKeyboardControls: with the Overworld", () => {
  it("Enter on a focused chest button still opens its terminal", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 10, y: 60 } }} />);
    screen.getByRole("button", { name: "HTML chest" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/CODE CHEST: HTML/i)).toBeInTheDocument();
  });

  it("w a s d e c typed in a plain text input beside it do nothing", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="note" />
        <Overworld onMenu={noop} />
      </>,
    );
    await user.type(screen.getByRole("textbox", { name: "note" }), "wasdec");
    expect(player().style.left).toBe("28%");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
