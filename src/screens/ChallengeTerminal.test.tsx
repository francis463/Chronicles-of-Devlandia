import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChallengeView } from "../game/challenges";
import { ARCHIVE_LOCK, GATE_CSS, SCROLL_CIPHER } from "../learn/bank/builtin";
import { MATCHER_ROUNDS } from "../learn/bank/matcher";
import { chestById } from "../learn/chests";
import { order } from "../learn/shuffle";
import type { BlankMode, Challenge } from "../learn/types";
import { ChallengeTerminal } from "./ChallengeTerminal";

const SQL = chestById("chest-sql").bank[0];
const PY_PRINT = chestById("chest-py-1").bank[0];

const view = (over: Partial<ChallengeView> = {}): ChallengeView => ({
  error: null, wrongTries: 0, solved: false, hintRevealed: false, seed: 0, success: null, yourCode: null, ...over,
});

function renderTerminal(challenge: Challenge, over: Partial<ChallengeView> = {}) {
  const handlers = { onSubmit: vi.fn(), onClose: vi.fn(), onRevealHint: vi.fn(), onModeChange: vi.fn() };
  const props = (v: Partial<ChallengeView>) => ({ challenge, view: view(v), mode: "type" as const, ...handlers });
  const utils = render(<ChallengeTerminal {...props(over)} />);
  return { ...utils, ...handlers, rerenderWith: (v: Partial<ChallengeView>) => utils.rerender(<ChallengeTerminal {...props(v)} />) };
}

const liveLine = () => screen.getByTestId("live-check");
const fakeTimers = () => {
  vi.useFakeTimers();
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
};
const originalMatchMedia = window.matchMedia;
const originalScroll = Element.prototype.scrollIntoView;
afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollIntoView = originalScroll;
});

describe("ChallengeTerminal: the gate (moved from TerminalModal)", () => {
  it("renders a labelled dialog with the title, instructions label and prompt", () => {
    renderTerminal(GATE_CSS);
    expect(screen.getByRole("dialog", { name: "< TERMINAL GATE LOCK: C++ PEAKS >" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("PUZZLE INSTRUCTIONS:")).toBeInTheDocument();
    expect(screen.getByText("Fix the CSS value below to open the north gate.")).toBeInTheDocument();
    expect(screen.getByText("1 | .north-gate {")).toBeInTheDocument();
    expect(screen.getByText("2 |     width: 100%;", { normalizer: (s) => s })).toBeInTheDocument();
    expect(screen.getByText("4 | }")).toBeInTheDocument();
    expect(screen.getByText(";  <-- FIX THIS VALUE", { normalizer: (s) => s })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "display value" }) as HTMLInputElement;
    expect(input).toHaveValue("none");
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 4]);
    expect(screen.getByText("SMART AI DRONE DIAGNOSTIC HINT:")).toBeInTheDocument();
  });

  it("selects the prefilled value so typing replaces it", async () => {
    const user = userEvent.setup();
    renderTerminal(GATE_CSS);
    await user.keyboard("block");
    expect(screen.getByRole("textbox", { name: "display value" })).toHaveValue("block");
  });

  it("submits the typed value with Enter or the Submit button", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderTerminal(GATE_CSS);
    const input = screen.getByRole("textbox", { name: "display value" });
    await user.clear(input);
    await user.type(input, "block{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("block");
    await user.click(screen.getByRole("button", { name: "[ SUBMIT CODE ]" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("locks the hint until the hint item is used", async () => {
    const user = userEvent.setup();
    const { onRevealHint } = renderTerminal(GATE_CSS);
    expect(screen.getByText("Hint locked. Use a hint item to decode.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ USE HINT ITEM ]" }));
    expect(onRevealHint).toHaveBeenCalledOnce();
  });

  it("[X] CLOSE closes", async () => {
    const user = userEvent.setup();
    const { onClose } = renderTerminal(GATE_CSS);
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    renderTerminal(GATE_CSS);
    const close = screen.getByRole("button", { name: "[X] CLOSE" });
    const lastButton = screen.getByRole("button", { name: "[ USE HINT ITEM ]" });
    lastButton.focus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(lastButton).toHaveFocus();
  });

  it("clicking the dim backdrop does not move focus out of the dialog", async () => {
    const user = userEvent.setup();
    renderTerminal(GATE_CSS);
    const input = screen.getByRole("textbox", { name: "display value" });
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(input).toHaveFocus();
  });
});

describe("ChallengeTerminal: the scroll cipher (moved from CipherModal)", () => {
  it("renders the ROT13 scroll with its own labels", () => {
    renderTerminal(SCROLL_CIPHER);
    expect(screen.getByRole("dialog", { name: "< SCROLL CIPHER: ROT13 >" })).toBeInTheDocument();
    expect(screen.getByText("SCROLL INSTRUCTIONS:")).toBeInTheDocument();
    expect(screen.getByText("Decode the scroll to learn where the artifact is hidden.")).toBeInTheDocument();
    expect(screen.getByText("1 | // ROT13: every letter is shifted 13 places")).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "decoded text" });
    expect(input).toHaveAttribute("placeholder", "plain text");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "[ SUBMIT DECODE ]" })).toBeInTheDocument();
  });

  it("submits the typed answer with Enter or the Submit button", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderTerminal(SCROLL_CIPHER);
    await user.keyboard("dense forest{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("dense forest");
    await user.click(screen.getByRole("button", { name: "[ SUBMIT DECODE ]" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("shows the decode error and the revealed letter shifts", () => {
    renderTerminal(SCROLL_CIPHER, { error: 'Not quite: "frozen river" is not what the scroll says.', hintRevealed: true });
    expect(screen.getByRole("alert")).toHaveTextContent('Not quite: "frozen river" is not what the scroll says.');
    expect(screen.getByText("Shift each letter 13 places: Q→D, R→E, A→N, F→S, S→F, B→O, E→R, G→T.")).toBeInTheDocument();
  });
});

describe("ChallengeTerminal: the live check", () => {
  it("before the first edit the live line reads `Fill the blank, then submit.` with no aria-invalid", () => {
    renderTerminal(SQL);
    expect(liveLine()).toHaveTextContent("Fill the blank, then submit.");
    expect(screen.getByRole("textbox", { name: "answer" })).not.toHaveAttribute("aria-invalid");
  });

  it("phone keyboards can't change what you type", () => {
    const { unmount } = renderTerminal(PY_PRINT);
    const answer = screen.getByRole("textbox", { name: "answer" });
    for (const [attr, value] of [["autocapitalize", "off"], ["autocorrect", "off"], ["spellcheck", "false"], ["autocomplete", "off"]]) {
      expect(answer).toHaveAttribute(attr, value);
    }
    unmount();
    const gate = renderTerminal(GATE_CSS);
    expect(screen.getByRole("textbox", { name: "display value" })).toHaveAttribute("autocapitalize", "off");
    gate.unmount();
    renderTerminal(SCROLL_CIPHER);
    const decoded = screen.getByRole("textbox", { name: "decoded text" });
    expect(decoded).toHaveAttribute("autocapitalize", "characters");
    expect(decoded).toHaveAttribute("spellcheck", "false");
    expect(decoded).toHaveAttribute("autocomplete", "off");
  });

  it("after typing, the result appears after a 500 ms pause, on blur or on submit, and is announced only when it changes", async () => {
    const user = fakeTimers();
    renderTerminal(SQL);
    const input = screen.getByRole("textbox", { name: "answer" });
    await user.type(input, "FORM");
    act(() => vi.advanceTimersByTime(400));
    expect(liveLine()).toHaveTextContent("Fill the blank, then submit.");
    act(() => vi.advanceTimersByTime(100));
    expect(liveLine()).toHaveTextContent("⚠ 'FORM' is not an SQL keyword.");
    expect(liveLine()).toHaveAttribute("aria-live", "polite");
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.clear(input);
    await user.type(input, "FRM");
    act(() => vi.advanceTimersByTime(500));
    expect(liveLine()).toHaveTextContent("⚠ 'FRM' is not an SQL keyword.");

    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(liveLine(), { subtree: true, childList: true, characterData: true });
    await user.clear(input);
    await user.type(input, "FRM");
    act(() => vi.advanceTimersByTime(500));
    await act(async () => {});
    observer.disconnect();
    expect(mutations).toHaveLength(0);

    await user.clear(input);
    await user.type(input, "FORMS");
    fireEvent.blur(input);
    expect(liveLine()).toHaveTextContent("Syntax OK. Submit to check your answer.");
  });

  it("a valid entry reads `Syntax OK. Submit to check your answer.` (no ✓)", async () => {
    const user = fakeTimers();
    renderTerminal(SQL);
    await user.type(screen.getByRole("textbox", { name: "answer" }), "WHERE");
    act(() => vi.advanceTimersByTime(500));
    expect(liveLine()).toHaveTextContent("Syntax OK. Submit to check your answer.");
    expect(liveLine().textContent).not.toContain("✓");
  });
});

describe("ChallengeTerminal: an honest SUBMIT", () => {
  it("SUBMIT is aria-disabled with a visible reason; pressing it or Enter doesn't submit and re-announces the reason", async () => {
    const user = fakeTimers();
    const { onSubmit, rerenderWith } = renderTerminal(SQL);
    const input = screen.getByRole("textbox", { name: "answer" });
    const submit = screen.getByRole("button", { name: "[ SUBMIT CODE ]" });
    await user.type(input, "FORM");
    act(() => vi.advanceTimersByTime(500));

    const live = () => [...document.querySelectorAll("[aria-live], [role=status], [role=alert]")];
    expect(live().filter((el) => el.textContent?.includes("'FORM' is not an SQL keyword."))).toHaveLength(1);

    expect(submit).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("submit-reason")).toHaveTextContent("'FORM' is not an SQL keyword.");
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(submit).toHaveFocus();
    const status = () => screen.getByTestId("submit-announce");
    expect(status()).toHaveAttribute("role", "status");
    expect(status()).toHaveTextContent("'FORM' is not an SQL keyword.");
    const first = status();
    await user.click(submit);
    expect(status()).not.toBe(first);
    expect(status()).toHaveTextContent("'FORM' is not an SQL keyword.");
    const second = status();
    await user.type(input, "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(status()).not.toBe(second);

    await user.clear(input);
    await user.type(input, "INTO");
    expect(submit).not.toHaveAttribute("aria-disabled");
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith("INTO");
    rerenderWith({ error: 'Not quite: "INTO" isn\'t the answer. Check the hint or try again.', wrongTries: 1 });
    expect(screen.getByTestId("submit-reason")).toHaveTextContent("Change your answer to try again.");
    expect(submit).toHaveAttribute("aria-disabled", "true");
    await user.type(input, "X");
    expect(submit).not.toHaveAttribute("aria-disabled");
  });

  it("the error line is an alert; after two wrong tries the hint panel shows `Drone: stuck? Here's a tip.` and the hint", () => {
    renderTerminal(SQL, { error: "Not quite: \"INTO\" isn't the answer. Check the hint or try again. The drone has a tip below.", wrongTries: 2, hintRevealed: true });
    expect(screen.getByRole("alert")).toHaveTextContent("The drone has a tip below.");
    expect(screen.getByText("Drone: stuck? Here's a tip.")).toBeInTheDocument();
    expect(screen.getByText("You select columns from a table.")).toBeInTheDocument();
  });

  it("a revealed hint shows without the stuck line", () => {
    renderTerminal(SQL, { hintRevealed: true });
    expect(screen.getByText("You select columns from a table.")).toBeInTheDocument();
    expect(screen.queryByText("Drone: stuck? Here's a tip.")).toBeNull();
  });

  it("reaching two wrong tries scrolls the hint panel into view, instantly under reduced motion", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const first = renderTerminal(SQL, { wrongTries: 1 });
    first.rerenderWith({ wrongTries: 2, hintRevealed: true });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    first.rerenderWith({ wrongTries: 3, hintRevealed: true });
    expect(scroll).toHaveBeenCalledTimes(1);
    first.unmount();

    const byButton = renderTerminal(SQL);
    await userEvent.setup().click(screen.getByRole("button", { name: "[ USE HINT ITEM ]" }));
    byButton.rerenderWith({ hintRevealed: true });
    expect(scroll).toHaveBeenCalledTimes(1);
    byButton.unmount();

    window.matchMedia = ((query: string) => ({
      media: query, matches: true, addEventListener: () => {}, removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const reduced = renderTerminal(SQL, { wrongTries: 1 });
    reduced.rerenderWith({ wrongTries: 2, hintRevealed: true });
    expect(scroll).toHaveBeenLastCalledWith({ block: "nearest", behavior: "auto" });
  });
});

describe("ChallengeTerminal: success views", () => {
  it("success view, solved in place", async () => {
    const user = userEvent.setup();
    const { onClose, rerenderWith } = renderTerminal(SQL);
    expect(screen.getByRole("textbox", { name: "answer" })).toHaveFocus();
    rerenderWith({
      solved: true,
      success: { line: "✓ SQL Badge earned", spoken: "SQL Badge earned", explain: SQL.explain, answer: "FROM" },
    });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("1 | SELECT name", { exact: false }).parentElement).toHaveTextContent("1 | SELECT name FROM users;");
    const status = screen.getByRole("status", { name: "SQL Badge earned" });
    expect(status).toHaveTextContent("✓ SQL Badge earned");
    expect(screen.getByText(SQL.explain)).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "[ CONTINUE ]" });
    expect(next).toHaveFocus();
    await user.click(next);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Matcher success shows the access code, spelled out for screen readers; a reopened Matcher focuses [ CONTINUE ]", () => {
    renderTerminal(MATCHER_ROUNDS[0], { solved: true, success: { code: "KQZM", explain: MATCHER_ROUNDS[0].explain } });
    const status = screen.getByRole("status", { name: "ACCESS CODE: K Q Z M" });
    expect(status).toHaveTextContent("ACCESS CODE: KQZM");
    expect(screen.getByRole("button", { name: "[ CONTINUE ]" })).toHaveFocus();
  });

  it("the keypad shows `Your code: <CODE>` once the Matcher is solved, and its pristine line is `Type the 4-character code.`", () => {
    const { unmount } = renderTerminal(ARCHIVE_LOCK);
    expect(liveLine()).toHaveTextContent("Type the 4-character code.");
    expect(screen.queryByText(/Your code:/)).toBeNull();
    expect(screen.getByRole("dialog", { name: "< ARCHIVE LOCK: DEV VILLAGE >" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "access code" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "[ ENTER CODE ]" })).toBeInTheDocument();
    unmount();
    renderTerminal(ARCHIVE_LOCK, { yourCode: "KQZM" });
    expect(screen.getByText("Your code: KQZM")).toBeInTheDocument();
  });
});

/** The terminal with its mode held in state, as Overworld holds it. */
function Harness({ challenge, start = "type", seed = 0 }: { challenge: Challenge; start?: BlankMode; seed?: number }) {
  const [mode, setMode] = useState<BlankMode>(start);
  return (
    <ChallengeTerminal
      challenge={challenge}
      view={view({ seed })}
      mode={mode}
      onModeChange={setMode}
      onSubmit={vi.fn()}
      onRevealHint={vi.fn()}
      onClose={vi.fn()}
    />
  );
}
const slot = () => screen.getByTestId("block-slot");
const tile = (name: string) => within(screen.getByTestId("block-tray")).getByRole("button", { name });
const SQL_TILES = SQL.kind === "blank" ? SQL.blocks! : [];

describe("ChallengeTerminal: Blocks mode, Undo and Reset", () => {
  it("the toggle `Type | Blocks` shows only on code blanks (not the cipher or keypad)", () => {
    const { unmount } = render(<Harness challenge={SQL} />);
    expect(screen.getByRole("button", { name: "Type" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Blocks" })).toHaveAttribute("aria-pressed", "false");
    unmount();
    for (const c of [SCROLL_CIPHER, ARCHIVE_LOCK]) {
      const view = render(<Harness challenge={c} start="blocks" />);
      expect(screen.queryByRole("button", { name: "Blocks" })).toBeNull();
      expect(screen.getByRole("button", { name: "[ UNDO ]" })).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      view.unmount();
    }
  });

  it("Blocks mode turns the blank into a slot button and shows the tiles in the seeded order", () => {
    render(<Harness challenge={SQL} start="blocks" seed={5} />);
    expect(slot().tagName).toBe("BUTTON");
    expect(slot()).toHaveTextContent("___");
    const expected = order(SQL_TILES.length, 5, "sql-from").map((i) => SQL_TILES[i]);
    const tiles = within(screen.getByTestId("block-tray")).getAllByRole("button");
    expect(tiles.map((t) => t.textContent)).toEqual(expected);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(tiles[0]).toHaveFocus();
  });

  it("tap, Enter or Space places a tile; a new tile replaces it; pressing the filled slot empties it", async () => {
    const user = userEvent.setup();
    render(<Harness challenge={SQL} start="blocks" />);
    await user.click(tile("INTO"));
    expect(slot()).toHaveTextContent("INTO");
    tile("WHERE").focus();
    await user.keyboard("{Enter}");
    expect(slot()).toHaveTextContent("WHERE");
    tile("FROM").focus();
    await user.keyboard(" ");
    expect(slot()).toHaveTextContent("FROM");
    await user.click(slot());
    expect(slot()).toHaveTextContent("___");
  });

  it("mouse drag places a tile", () => {
    render(<Harness challenge={SQL} start="blocks" />);
    fireEvent.pointerDown(tile("WHERE"), { pointerType: "mouse", pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(slot(), { pointerType: "mouse", pointerId: 1, clientX: 40, clientY: 0 });
    fireEvent.pointerUp(slot(), { pointerType: "mouse", pointerId: 1, clientX: 40, clientY: 0 });
    expect(slot()).toHaveTextContent("WHERE");
  });

  it("touch drag", () => {
    vi.useFakeTimers();
    render(<Harness challenge={SQL} start="blocks" />);
    const touch = { pointerType: "touch", pointerId: 2 };

    fireEvent.pointerDown(tile("WHERE"), { ...touch, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(300));
    expect(fireEvent.touchMove(tile("WHERE"))).toBe(false);
    fireEvent.pointerMove(slot(), { ...touch, clientX: 60, clientY: 0 });
    fireEvent.pointerUp(slot(), { ...touch, clientX: 60, clientY: 0 });
    expect(slot()).toHaveTextContent("WHERE");

    fireEvent.pointerDown(tile("INTO"), { ...touch, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(200));
    expect(fireEvent.touchMove(tile("INTO"))).toBe(true);
    fireEvent.pointerUp(slot(), { ...touch, clientX: 60, clientY: 0 });
    expect(slot()).toHaveTextContent("WHERE");

    fireEvent.pointerDown(tile("INTO"), { ...touch, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerMove(tile("INTO"), { ...touch, clientX: 20, clientY: 0 });
    act(() => vi.advanceTimersByTime(300));
    expect(fireEvent.touchMove(tile("INTO"))).toBe(true);
    fireEvent.pointerUp(slot(), { ...touch, clientX: 60, clientY: 0 });
    expect(slot()).toHaveTextContent("WHERE");

    fireEvent.pointerDown(tile("INTO"), { ...touch, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerCancel(tile("INTO"), touch);
    fireEvent.pointerUp(slot(), { ...touch, clientX: 60, clientY: 0 });
    expect(slot()).toHaveTextContent("WHERE");
  });

  it("switching modes keeps the value", async () => {
    const user = userEvent.setup();
    render(<Harness challenge={SQL} />);
    await user.type(screen.getByRole("textbox", { name: "answer" }), "WHERE");
    await user.click(screen.getByRole("button", { name: "Blocks" }));
    expect(slot()).toHaveTextContent("WHERE");
    await user.click(screen.getByRole("button", { name: "Type" }));
    expect(screen.getByRole("textbox", { name: "answer" })).toHaveValue("WHERE");
  });

  it("switching modes ends a typing run", async () => {
    const user = fakeTimers();
    render(<Harness challenge={SQL} />);
    await user.type(screen.getByRole("textbox", { name: "answer" }), "a");
    await user.click(screen.getByRole("button", { name: "Blocks" }));
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByRole("textbox", { name: "answer" }), "b");
    await user.click(screen.getByRole("button", { name: "[ UNDO ]" }));
    expect(screen.getByRole("textbox", { name: "answer" })).toHaveValue("a");
  });

  it("the live line in Blocks mode updates at once, and an empty slot reads `⚠ Place a block first.` after an edit", async () => {
    const user = userEvent.setup();
    render(<Harness challenge={SQL} start="blocks" />);
    expect(liveLine()).toHaveTextContent("Fill the blank, then submit.");
    await user.click(tile("WHERE"));
    expect(liveLine()).toHaveTextContent("Syntax OK. Submit to check your answer.");
    await user.click(slot());
    expect(liveLine()).toHaveTextContent("⚠ Place a block first.");
  });

  it("Undo after Reset restores the tile; Undo and Reset are unavailable with nothing to do, and focus moves to the blank when the focused one becomes unavailable", async () => {
    const user = userEvent.setup();
    render(<Harness challenge={SQL} start="blocks" />);
    const undo = screen.getByRole("button", { name: "[ UNDO ]" });
    const reset = screen.getByRole("button", { name: "[ RESET ]" });
    expect(undo).toBeDisabled();
    expect(reset).toBeDisabled();
    await user.click(tile("WHERE"));
    expect(undo).toBeEnabled();
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(slot()).toHaveTextContent("___");
    expect(reset).toBeDisabled();
    expect(slot()).toHaveFocus();
    await user.click(undo);
    expect(slot()).toHaveTextContent("WHERE");
    await user.click(undo);
    expect(slot()).toHaveTextContent("___");
    expect(undo).toBeDisabled();
    expect(slot()).toHaveFocus();
  });

  it("Ctrl+Z outside the text box runs Undo", async () => {
    const user = userEvent.setup();
    render(<Harness challenge={SQL} start="blocks" />);
    await user.click(tile("WHERE"));
    tile("INTO").focus();
    await user.keyboard("{Control>}z{/Control}");
    expect(slot()).toHaveTextContent("___");
  });
});
