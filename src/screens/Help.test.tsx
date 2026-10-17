import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Help } from "./Help";
import { CONTROLS, TUTORIAL } from "./helpContent";

const open = (initial?: "controls" | "play" | "tutorial" | "tips") => {
  const onClose = vi.fn();
  render(<Help onClose={onClose} initial={initial} />);
  return { onClose };
};

describe("Help", () => {
  it("is a dialog with four tabs, Controls first, and Controls lists every key with its touch equivalent", () => {
    open();
    expect(screen.getByRole("dialog", { name: "< HELP & TUTORIAL >" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Controls", "How to play", "Tutorial", "Tips"]);
    expect(screen.getByRole("tab", { name: "Controls" })).toHaveAttribute("aria-selected", "true");
    const rows = within(screen.getByRole("tabpanel")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(CONTROLS.length);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("W A S D or the arrow keys");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("the D-pad");
  });

  it("each tab shows its own content", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("tab", { name: "How to play" }));
    expect(screen.getByRole("region", { name: "Your goal" })).toHaveTextContent("all 11 language badges");
    expect(screen.getByRole("region", { name: "Where the chests are" })).toHaveTextContent("the landmark is the chest");
    await user.click(screen.getByRole("tab", { name: "Tips" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("reduce motion");
    await user.click(screen.getByRole("tab", { name: "Controls" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Move your explorer");
  });

  it("the arrow keys move between tabs and wrap", async () => {
    const user = userEvent.setup();
    open();
    screen.getByRole("tab", { name: "Controls" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "How to play" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Tips" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tips" })).toHaveAttribute("aria-selected", "true");
  });

  it("the tutorial steps through six cards with Back and Next, a progress meter and a Try it line", async () => {
    const user = userEvent.setup();
    open("tutorial");
    expect(screen.getByRole("tab", { name: "Tutorial" })).toHaveAttribute("aria-selected", "true");
    expect(TUTORIAL).toHaveLength(6);
    const back = screen.getByRole("button", { name: "[ Back ]" });
    const next = screen.getByRole("button", { name: "[ Next ]" });
    expect(back).toBeDisabled();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(`Step 1 of 6: ${TUTORIAL[0].title}`);
    expect(screen.getByRole("meter", { name: "Tutorial progress" })).toHaveAttribute("aria-valuenow", "1");
    await user.click(next);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(`Step 2 of 6: ${TUTORIAL[1].title}`);
    expect(screen.getByText(/^Try it:/)).toBeInTheDocument();
    for (let i = 0; i < 4; i++) await user.click(next);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Step 6 of 6");
    expect(next).toBeDisabled();
    await user.click(back);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Step 5 of 6");
  });

  it("[X] CLOSE, Esc and ? all close it", async () => {
    const user = userEvent.setup();
    const { onClose } = open();
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    await user.keyboard("{Escape}");
    await user.keyboard("?");
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
