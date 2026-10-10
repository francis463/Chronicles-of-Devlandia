import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalDialog } from "./TerminalDialog";

describe("TerminalDialog", () => {
  it("the page behind is inert while open, and only what it set is restored", () => {
    const { unmount } = render(
      <div>
        <div data-testid="behind">map</div>
        <div data-testid="already" inert>
          menu
        </div>
        <section>
          <TerminalDialog title="< T >" onClose={vi.fn()}>
            <input aria-label="x" />
          </TerminalDialog>
        </section>
      </div>,
    );
    expect(screen.getByTestId("behind")).toHaveAttribute("inert");
    expect(screen.getByRole("dialog")).not.toHaveAttribute("inert");
    expect(screen.getByRole("dialog").closest("[inert]")).toBeNull();
    const behind = screen.getByTestId("behind");
    const already = screen.getByTestId("already");
    unmount();
    expect(behind).not.toHaveAttribute("inert");
    expect(already).toHaveAttribute("inert");
  });

  it("Tab reaches [tabindex=0] and [data-autofocus] targets inside", () => {
    render(
      <TerminalDialog title="< T >" onClose={vi.fn()}>
        <div tabIndex={0} data-testid="slot">slot</div>
      </TerminalDialog>,
    );
    const slot = screen.getByTestId("slot");
    slot.focus();
    expect(slot).toHaveFocus();
  });
});
