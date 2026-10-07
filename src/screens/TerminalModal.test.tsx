import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TerminalModal } from "./TerminalModal";

function renderModal(props: Partial<Parameters<typeof TerminalModal>[0]> = {}) {
  const handlers = { onSubmit: vi.fn(), onClose: vi.fn(), onRevealHint: vi.fn() };
  const view = render(<TerminalModal error={null} hintRevealed={false} {...handlers} {...props} />);
  return { ...view, ...handlers };
}

describe("TerminalModal", () => {
  it("renders a labelled modal dialog with the code puzzle", () => {
    renderModal();
    const dialog = screen.getByRole("dialog", { name: "< TERMINAL GATE LOCK: C++ PEAKS >" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("PUZZLE INSTRUCTIONS:")).toBeInTheDocument();
    expect(
      screen.getByText("Fix the CSS styling property below to reveal the missing bridge path."),
    ).toBeInTheDocument();
    expect(screen.getByText("1 | .frozen-bridge {")).toBeInTheDocument();
    expect(screen.getByText("2 |     width: 100%;", { normalizer: (s) => s })).toBeInTheDocument();
    expect(screen.getByText("4 | }")).toBeInTheDocument();
    expect(screen.getByText("SMART AI DRONE DIAGNOSTIC HINT:")).toBeInTheDocument();
  });

  it("autofocuses the input, prefilled with none", () => {
    renderModal();
    const input = screen.getByRole("textbox", { name: "display value" });
    expect(input).toHaveValue("none");
    expect(input).toHaveFocus();
  });

  it("selects the prefilled value so typing replaces it", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.keyboard("block");
    expect(screen.getByRole("textbox", { name: "display value" })).toHaveValue("block");
  });

  it("locks the hint until the hint item is used", async () => {
    const user = userEvent.setup();
    const { onRevealHint } = renderModal();
    expect(screen.getByText("Hint locked. Use a hint item to decode.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ USE HINT ITEM ]" }));
    expect(onRevealHint).toHaveBeenCalledOnce();
  });

  it("submits the typed value with Enter or the Submit button", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();
    const input = screen.getByRole("textbox", { name: "display value" });
    await user.clear(input);
    await user.type(input, "block{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("block");
    await user.click(screen.getByRole("button", { name: "[ SUBMIT CODE ]" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("[X] CLOSE closes", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows the compile error and the revealed hint", () => {
    renderModal({ error: "Compile error: display: flex keeps the bridge hidden.", hintRevealed: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Compile error: display: flex keeps the bridge hidden.");
    expect(
      screen.getByText(`"Setting display to 'none' hides the object. Try 'block' instead!"`),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hint locked. Use a hint item to decode.")).toBeNull();
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    renderModal();
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
    renderModal();
    const input = screen.getByRole("textbox", { name: "display value" });
    const backdrop = screen.getByRole("dialog").parentElement!;
    await user.click(backdrop);
    expect(input).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });
});
