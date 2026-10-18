import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hearts } from "./Hearts";

const fills = (container: HTMLElement) =>
  [...container.querySelectorAll("svg")].map((svg) => {
    const colors = new Set([...svg.querySelectorAll("rect")].map((r) => r.getAttribute("fill")));
    return colors.has("#ef4444") ? (colors.has("#334155") ? "half" : "full") : "empty";
  });

describe("Hearts", () => {
  it("draws ten hearts for 100 HP, with half hearts", () => {
    const { container } = render(<Hearts value={75} max={100} />);
    expect(fills(container)).toEqual([...Array(7).fill("full"), "half", "empty", "empty"]);
  });

  it("keeps the number and a meter for screen readers", () => {
    render(<Hearts value={42} max={100} />);
    expect(screen.getByText("HP 42")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "HP" })).toHaveAttribute("aria-valuenow", "42");
  });

  it("pulses at 30 HP or less, but not at 0 or above 30", () => {
    const low = () => screen.getByRole("meter", { name: "HP" }).hasAttribute("data-low");
    const { rerender } = render(<Hearts value={30} />);
    expect(low()).toBe(true);
    rerender(<Hearts value={31} />);
    expect(low()).toBe(false);
    rerender(<Hearts value={0} />);
    expect(low()).toBe(false);
  });
});
