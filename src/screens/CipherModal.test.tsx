import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CipherModal } from "./CipherModal";

function renderModal(props: Partial<Parameters<typeof CipherModal>[0]> = {}) {
  const handlers = { onSubmit: vi.fn(), onClose: vi.fn(), onRevealHint: vi.fn() };
  const view = render(<CipherModal error={null} hintRevealed={false} {...handlers} {...props} />);
  return { ...view, ...handlers };
}

describe("CipherModal", () => {
  it("renders a labelled modal dialog with the ROT13 scroll", () => {
    renderModal();
    const dialog = screen.getByRole("dialog", { name: "< SCROLL CIPHER: ROT13 >" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Decode the scroll to learn where the artifact is hidden.")).toBeInTheDocument();
    expect(screen.getByText("1 | // ROT13: every letter is shifted 13 places")).toBeInTheDocument();
    expect(screen.getByText('2 | rot13("QRAFR SBERFG")  →', { normalizer: (s) => s })).toBeInTheDocument();
  });

  it("focuses an empty answer box", () => {
    renderModal();
    const input = screen.getByRole("textbox", { name: "decoded text" });
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("submits the typed answer with Enter or the Submit button", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();
    await user.keyboard("dense forest{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("dense forest");
    await user.click(screen.getByRole("button", { name: "[ SUBMIT DECODE ]" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("locks the hint until the hint item is used, then shows the letter shifts", async () => {
    const user = userEvent.setup();
    const { onRevealHint, rerender, onSubmit, onClose } = renderModal();
    expect(screen.getByText("Hint locked. Use a hint item to decode.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ USE HINT ITEM ]" }));
    expect(onRevealHint).toHaveBeenCalledOnce();
    rerender(<CipherModal error={null} hintRevealed onSubmit={onSubmit} onClose={onClose} onRevealHint={onRevealHint} />);
    expect(screen.getByText("Shift each letter 13 places: Q→D, R→E, A→N, F→S, S→F, B→O, E→R, G→T.")).toBeInTheDocument();
  });

  it("shows the decode error and closes with [X] CLOSE", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ error: 'Not quite: "frozen river" is not what the scroll says.' });
    expect(screen.getByRole("alert")).toHaveTextContent('Not quite: "frozen river" is not what the scroll says.');
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
