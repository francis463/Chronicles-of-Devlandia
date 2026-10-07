import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LogicModal } from "./LogicModal";

function renderModal(props: Partial<Parameters<typeof LogicModal>[0]> = {}) {
  const handlers = { onSubmit: vi.fn(), onClose: vi.fn(), onRevealHint: vi.fn() };
  const view = render(<LogicModal error={null} hintRevealed={false} {...handlers} {...props} />);
  return { ...view, ...handlers };
}
const sw = (name: string) => screen.getByRole("switch", { name: `Switch ${name}` });
const output = (expr: string) => screen.getByTestId(`output-${expr}`);

describe("LogicModal", () => {
  it("renders a labelled modal dialog with the circuit", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "< SIGNAL TOWER: LOGIC LOCK >" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("1 | // Power the tower: every line must output 1")).toBeInTheDocument();
    for (const expr of ["A AND B", "B XOR C", "NOT D"]) expect(output(expr)).toHaveTextContent("?");
  });

  it("starts with all switches off and focuses switch A", () => {
    renderModal();
    for (const name of ["A", "B", "C", "D"]) expect(sw(name)).toHaveAttribute("aria-checked", "false");
    expect(sw("A")).toHaveFocus();
    expect(screen.getByText("ABCD = 0000 (binary) = 0 (decimal)")).toBeInTheDocument();
  });

  it("toggles switches by click and by keyboard, updating the readout", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(sw("A"));
    expect(sw("A")).toHaveAttribute("aria-checked", "true");
    expect(sw("A")).toHaveTextContent("A: 1");
    sw("B").focus();
    await user.keyboard(" ");
    expect(sw("B")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("ABCD = 1100 (binary) = 12 (decimal)")).toBeInTheDocument();
  });

  it("Run Circuit submits the switches and shows each line's output until a switch changes", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();
    await user.click(sw("A"));
    await user.click(sw("C"));
    await user.click(screen.getByRole("button", { name: "[ RUN CIRCUIT ]" }));
    expect(onSubmit).toHaveBeenCalledWith([1, 0, 1, 0]);
    expect(output("A AND B")).toHaveTextContent("0");
    expect(output("B XOR C")).toHaveTextContent("1");
    expect(output("NOT D")).toHaveTextContent("1");
    await user.click(sw("D"));
    expect(output("NOT D")).toHaveTextContent("?");
  });

  it("locks the hint until the hint item is used", async () => {
    const user = userEvent.setup();
    const { onRevealHint, rerender, onSubmit, onClose } = renderModal();
    expect(screen.getByText("Hint locked. Use a hint item to decode.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ USE HINT ITEM ]" }));
    expect(onRevealHint).toHaveBeenCalledOnce();
    rerender(<LogicModal error={null} hintRevealed onSubmit={onSubmit} onClose={onClose} onRevealHint={onRevealHint} />);
    expect(screen.getByText("AND needs both inputs at 1. XOR needs exactly one. NOT flips the bit.")).toBeInTheDocument();
  });

  it("shows the circuit error and closes with [X] CLOSE", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ error: "Circuit failed: line 2 (A AND B) outputs 0." });
    expect(screen.getByRole("alert")).toHaveTextContent("Circuit failed: line 2 (A AND B) outputs 0.");
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("hides a stale error once a switch changes after the failed run", async () => {
    const user = userEvent.setup();
    const handlers = { onSubmit: vi.fn(), onClose: vi.fn(), onRevealHint: vi.fn() };
    const { rerender } = render(<LogicModal error={null} hintRevealed={false} {...handlers} />);
    await user.click(screen.getByRole("button", { name: "[ RUN CIRCUIT ]" }));
    rerender(<LogicModal error="Circuit failed: line 2 (A AND B) outputs 0." hintRevealed={false} {...handlers} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(sw("A"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
