import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BottomHud } from "./BottomHud";

const hud = (food: number, onEat = vi.fn()) => {
  render(<BottomHud food={food} hasLoot={false} clueDecoded={false} artifactFound={false} onDecodeScroll={() => {}} onEat={onEat} />);
  return onEat;
};

describe("BottomHud food", () => {
  it("shows the count and eats one when clicked", async () => {
    const onEat = hud(2);
    await userEvent.click(screen.getByRole("button", { name: "Eat food (2 left)" }));
    expect(screen.getByText("Food ×2")).toBeInTheDocument();
    expect(onEat).toHaveBeenCalledTimes(1);
  });

  it("is an empty, disabled slot without food", () => {
    hud(0);
    expect(screen.getByRole("button", { name: "No food" })).toBeDisabled();
  });
});
