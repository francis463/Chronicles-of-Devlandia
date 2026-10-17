import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LAMP_HINT, PUZZLE_HINT_LOCKED } from "../game/constants";
import { LampModal } from "./LampModal";

function renderModal(props: Partial<Parameters<typeof LampModal>[0]> = {}) {
  const handlers = { onSubmit: vi.fn(), onClose: vi.fn(), onRevealHint: vi.fn(), onReset: vi.fn() };
  const view = render(<LampModal error={null} hintRevealed={false} {...handlers} {...props} />);
  return { ...view, ...handlers };
}
const sw = (n: number) => screen.getByRole("switch", { name: `Switch ${n}` });

describe("LampModal", () => {
  it("is a labelled modal that names the target letter", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "< LIGHTHOUSE: LAMP LOCK >" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Make the lamp send the letter H")).toBeInTheDocument();
  });

  it("starts with eight switches off, the first focused, and a zero readout", () => {
    renderModal();
    for (let n = 1; n <= 8; n++) expect(sw(n)).toHaveAttribute("aria-checked", "false");
    expect(sw(1)).toHaveFocus();
    expect(screen.getByText("00000000 (binary) = 0 (decimal)")).toBeInTheDocument();
  });

  it("toggles by click and keyboard, switch 1 being the 128 bit", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(sw(2));
    sw(5).focus();
    await user.keyboard(" ");
    expect(sw(2)).toHaveTextContent("2: 1");
    expect(screen.getByText("01001000 (binary) = 72 (decimal)")).toBeInTheDocument();
    await user.click(sw(1));
    expect(screen.getByText("11001000 (binary) = 200 (decimal)")).toBeInTheDocument();
  });

  it("[ RUN LAMP ] submits the switches", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();
    await user.click(sw(2));
    await user.click(sw(5));
    await user.click(screen.getByRole("button", { name: "[ RUN LAMP ]" }));
    expect(onSubmit).toHaveBeenCalledWith([0, 1, 0, 0, 1, 0, 0, 0]);
  });

  it("shows the error until a switch changes", async () => {
    const user = userEvent.setup();
    renderModal({ error: 'The lamp sent "K". It should send "H".' });
    await user.click(screen.getByRole("button", { name: "[ RUN LAMP ]" }));
    expect(screen.getByRole("alert")).toHaveTextContent('The lamp sent "K". It should send "H".');
    await user.click(sw(8));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("[ RESET ] zeroes the switches and calls onReset; the hint item calls onRevealHint", async () => {
    const user = userEvent.setup();
    const { onReset, onRevealHint } = renderModal();
    await user.click(sw(3));
    await user.click(screen.getByRole("button", { name: "[ RESET ]" }));
    expect(sw(3)).toHaveAttribute("aria-checked", "false");
    expect(onReset).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "[ USE HINT ITEM ]" }));
    expect(onRevealHint).toHaveBeenCalledOnce();
  });

  it("shows the drone's tip once revealed, the locked line before", () => {
    const { unmount } = renderModal();
    expect(screen.getByText(PUZZLE_HINT_LOCKED)).toBeInTheDocument();
    unmount();
    renderModal({ hintRevealed: true });
    expect(screen.getByText(LAMP_HINT)).toBeInTheDocument();
  });
});
