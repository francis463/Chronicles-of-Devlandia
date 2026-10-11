import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatLine } from "../../hooks/useChat";
import { Announcer } from "./Announcer";

beforeEach(() => vi.useFakeTimers({ now: 5_000_000 }));
afterEach(() => vi.useRealTimers());

let seq = 0;
const line = (kind: ChatLine["kind"], text: string, over: Partial<ChatLine> = {}): ChatLine => ({
  seq: ++seq,
  kind,
  senderId: kind === "note" ? null : "x",
  key: null,
  name: kind === "note" ? "" : "Kai",
  color: "#fff",
  text,
  ...over,
});
const said = () => screen.getByRole("status", { name: "Chat announcements" }).textContent;

describe("Announcer", () => {
  it("is a visually hidden polite status", () => {
    render(<Announcer lines={[]} />);
    const status = screen.getByRole("status", { name: "Chat announcements" });
    expect(status).toHaveClass("sr-only");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("speaks a teammate line, a ping line and a note", () => {
    const first = line("note", "Welcome", { silent: true });
    const { rerender } = render(<Announcer lines={[first]} />);
    const a = line("teammate", "meet at the gate");
    const b = line("ping", "Kai pinged the C# Chest.");
    const c = line("note", "Dusk, 19:34.");
    rerender(<Announcer lines={[first, a, b, c]} />);
    expect(said()).toBe("Kai says: meet at the gateKai pinged the C sharp Chest.Dusk, 19:34.");
  });

  it("speaks all eight lines of a batch in one commit", () => {
    const { rerender } = render(<Announcer lines={[]} />);
    const batch = Array.from({ length: 8 }, (_, i) => line("note", `help ${i}`));
    rerender(<Announcer lines={batch} />);
    expect(screen.getByRole("status", { name: "Chat announcements" }).children).toHaveLength(8);
  });

  it("never speaks your own line, a silent line or the lines present at mount", () => {
    const old = line("teammate", "old");
    const { rerender } = render(<Announcer lines={[old]} />);
    expect(said()).toBe("");
    const mine = line("mine", "mine");
    const silent = line("note", "quiet", { silent: true });
    rerender(<Announcer lines={[old, mine, silent]} />);
    expect(said()).toBe("");
  });

  it("does not speak lines brought back by an unmute", () => {
    const early = line("teammate", "early");
    const late = line("teammate", "late");
    const { rerender } = render(<Announcer lines={[]} />);
    rerender(<Announcer lines={[late]} />);
    expect(said()).toBe("Kai says: late");
    rerender(<Announcer lines={[early, late]} />);
    expect(said()).toBe("Kai says: late");
  });

  it("speaks the same refusal at most once every 3 seconds", () => {
    const slow = "Slow down: one message a second.";
    const { rerender } = render(<Announcer lines={[]} />);
    const a = line("note", slow);
    rerender(<Announcer lines={[a]} />);
    expect(said()).toBe(slow);
    vi.advanceTimersByTime(1000);
    const b = line("note", slow);
    rerender(<Announcer lines={[b]} />);
    expect(said()).toBe(slow);
    expect(screen.getByRole("status", { name: "Chat announcements" }).children).toHaveLength(1);
    const before = screen.getByRole("status", { name: "Chat announcements" }).firstElementChild;
    vi.advanceTimersByTime(2000);
    const c = line("note", slow);
    rerender(<Announcer lines={[c]} />);
    expect(screen.getByRole("status", { name: "Chat announcements" }).firstElementChild).not.toBe(before);
  });

  it("speaks a repeated command result every time", () => {
    const { rerender } = render(<Announcer lines={[]} />);
    const a = line("note", "Dusk, 19:34.");
    rerender(<Announcer lines={[a]} />);
    const first = screen.getByRole("status", { name: "Chat announcements" }).firstElementChild;
    const b = line("note", "Dusk, 19:34.");
    rerender(<Announcer lines={[a, b]} />);
    expect(screen.getByRole("status", { name: "Chat announcements" }).firstElementChild).not.toBe(first);
  });
});

describe("Announcer log", () => {
  it("speaks each new log entry with badge names spoken", () => {
    const { rerender } = render(<Announcer lines={[]} log={{ entries: ["a", "b"], count: 2 }} />);
    expect(said()).toBe("");
    rerender(<Announcer lines={[]} log={{ entries: ["a", "b", "Kai earned the C# Badge."], count: 3 }} />);
    expect(said()).toBe("Kai earned the C sharp Badge.");
    rerender(<Announcer lines={[]} log={{ entries: ["b", "Kai earned the C# Badge.", "c", "d"], count: 5 }} />);
    expect(said()).toBe("cd");
  });

  it("replays nothing old when the log goes away and comes back", () => {
    const { rerender } = render(<Announcer lines={[]} log={{ entries: ["a"], count: 1 }} />);
    rerender(<Announcer lines={[]} log={null} />);
    rerender(<Announcer lines={[]} log={{ entries: ["a", "b", "c"], count: 3 }} />);
    expect(said()).toBe("");
    rerender(<Announcer lines={[]} log={{ entries: ["a", "b", "c", "d"], count: 4 }} />);
    expect(said()).toBe("d");
  });

  it("keeps speaking chat lines while the log is null", () => {
    const { rerender } = render(<Announcer lines={[]} log={null} />);
    rerender(<Announcer lines={[line("teammate", "hi")]} log={null} />);
    expect(said()).toBe("Kai says: hi");
  });
});
