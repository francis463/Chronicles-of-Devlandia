import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventLog } from "./EventLog";

const rows = () => screen.getAllByRole("listitem");

describe("EventLog", () => {
  it("is an ARIA log region", () => {
    render(<EventLog logs={["a"]} logCount={1} />);
    expect(screen.getByRole("log", { name: "Event log" })).toBeInTheDocument();
  });

  it("keeps existing rows when a new entry pushes out the oldest", () => {
    const { rerender } = render(<EventLog logs={["a", "b", "c", "d", "e", "f"]} logCount={6} />);
    const before = rows();
    rerender(<EventLog logs={["b", "c", "d", "e", "f", "g"]} logCount={7} />);
    const after = rows();
    expect(after[0]).toBe(before[1]);
    expect(after[4]).toBe(before[5]);
    expect(after[5]).not.toBe(before[5]);
  });

  it("adds a new row even when the same text repeats", () => {
    const cold = Array(6).fill("Cold exposure: -8 HP.");
    const { rerender } = render(<EventLog logs={cold} logCount={10} />);
    const before = rows();
    rerender(<EventLog logs={cold} logCount={11} />);
    const after = rows();
    expect(after[0]).toBe(before[1]);
    expect(after[5]).not.toBe(before[5]);
  });
});
