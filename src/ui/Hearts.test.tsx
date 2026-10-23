import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hearts } from "./Hearts";

const fills = (container: HTMLElement) =>
  [...container.querySelectorAll("svg")].map((svg) => {
    const colors = new Set([...svg.querySelectorAll("rect")].map((r) => r.getAttribute("fill")));
    return colors.has("#ef4444") ? (colors.has("#334155") ? "half" : "full") : "empty";
  });

describe("Hearts", () => {
  it("draws five hearts for 5 HP, one per HP", () => {
    const full = render(<Hearts value={5} max={5} />);
    expect(fills(full.container)).toEqual(Array(5).fill("full"));
    const three = render(<Hearts value={3} max={5} />);
    expect(fills(three.container)).toEqual(["full", "full", "full", "empty", "empty"]);
  });

  it("keeps the number and a meter for screen readers", () => {
    render(<Hearts value={4} max={5} />);
    expect(screen.getByText("HP 4")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "HP" })).toHaveAttribute("aria-valuenow", "4");
  });

  it("pulses at 2 hearts or less, but not at 0 or above 2", () => {
    const low = () => screen.getByRole("meter", { name: "HP" }).hasAttribute("data-low");
    const { rerender } = render(<Hearts value={2} max={5} />);
    expect(low()).toBe(true);
    rerender(<Hearts value={3} max={5} />);
    expect(low()).toBe(false);
    rerender(<Hearts value={0} max={5} />);
    expect(low()).toBe(false);
  });
});
