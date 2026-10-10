import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventLog } from "./EventLog";

const rows = () => screen.getAllByRole("listitem");

// jsdom has scrollHeight on Element.prototype (always 0); the stub shadows it on HTMLElement.prototype.
afterEach(() => void delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight);

describe("EventLog", () => {
  it("keeps the newest entry in view", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 500 });
    const { rerender } = render(<EventLog logs={["a"]} logCount={1} />);
    const scroller = screen.getByTestId("event-log-scroller");
    scroller.scrollTop = 0;
    rerender(<EventLog logs={["a", "b"]} logCount={2} />);
    expect(scroller.scrollTop).toBe(500);
    scroller.scrollTop = 123;
    rerender(<EventLog logs={["a", "b"]} logCount={2} />);
    expect(scroller.scrollTop).toBe(123);
  });

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

  it("badge names in log entries carry their spoken form as hidden text", () => {
    render(<EventLog logs={["Earned the C++ II Badge.", "Kai earned the C# Badge.", "Earned the SQL Badge."]} logCount={3} />);
    const [cpp, cs, sql] = rows();
    for (const [row, written, spoken] of [[cpp, "C++ II", "C++ 2"], [cs, "C#", "C sharp"]] as const) {
      const hidden = row.querySelectorAll(".sr-only");
      expect(hidden).toHaveLength(1);
      expect(hidden[0]).toHaveTextContent(spoken);
      expect(within(row).getByText(written)).toHaveAttribute("aria-hidden", "true");
    }
    expect(sql.querySelectorAll(".sr-only")).toHaveLength(0);
    expect(screen.getByText("Earned the SQL Badge.")).toBeInTheDocument();
  });
});
