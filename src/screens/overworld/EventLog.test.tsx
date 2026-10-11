import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatLine } from "../../hooks/useChat";
import { EventLog, type SideChat, type SideTab } from "./EventLog";

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

function Tabs({ unread = 0, label = "CHAT", initial = "log", logs = ["a"], logCount = 1, lines = [] }: { unread?: number; label?: "CHAT" | "COMMANDS"; initial?: SideTab; logs?: string[]; logCount?: number; lines?: ChatLine[] }) {
  const [tab, setTab] = useState<SideTab>(initial);
  const chat: SideChat = { tab, onTab: setTab, label, unread, lines, panel: <input aria-label="Draft" /> };
  return <EventLog logs={logs} logCount={logCount} chat={chat} />;
}
const tabs = () => screen.getAllByRole("tab");

describe("EventLog tabs", () => {
  it("has no tabs without chat and keeps its heading", () => {
    render(<EventLog logs={["a"]} logCount={1} />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("heading", { name: "Event Log / Live" })).toBeInTheDocument();
  });

  it("replaces the heading with a tablist named Side panel", () => {
    render(<Tabs />);
    expect(screen.queryByRole("heading", { name: "Event Log / Live" })).toBeNull();
    expect(screen.getByRole("tablist", { name: "Side panel" })).toBeInTheDocument();
    expect(tabs().map((t) => t.textContent)).toEqual(["LOG", "CHAT"]);
  });

  it("selects one tab, puts only it in the Tab order and wires each to its panel", () => {
    render(<Tabs />);
    const [log, chat] = tabs();
    expect(log).toHaveAttribute("aria-selected", "true");
    expect(log).toHaveAttribute("tabindex", "0");
    expect(chat).toHaveAttribute("aria-selected", "false");
    expect(chat).toHaveAttribute("tabindex", "-1");
    for (const tab of [log, chat]) {
      const panel = document.getElementById(tab.getAttribute("aria-controls")!)!;
      expect(panel).toHaveAttribute("role", "tabpanel");
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    }
  });

  it("keeps both panels mounted and hides the unselected one", async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    const [log, chat] = tabs();
    const logPanel = document.getElementById(log.getAttribute("aria-controls")!)!;
    const chatPanel = document.getElementById(chat.getAttribute("aria-controls")!)!;
    expect(chatPanel).toHaveAttribute("hidden");
    expect(logPanel).not.toHaveAttribute("hidden");
    await user.click(chat);
    expect(logPanel).toHaveAttribute("hidden");
    await user.type(screen.getByRole("textbox", { name: "Draft" }), "half");
    await user.click(log);
    await user.click(chat);
    expect(screen.getByRole("textbox", { name: "Draft" })).toHaveValue("half");
  });

  it("moves with the arrow keys, wrapping, and Home and End, without letting the key escape", async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    window.addEventListener("keydown", seen);
    render(<Tabs />);
    const [log, chat] = tabs();
    log.focus();
    await user.keyboard("{ArrowRight}");
    expect(chat).toHaveAttribute("aria-selected", "true");
    expect(chat).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(log).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(chat).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Home}");
    expect(log).toHaveFocus();
    await user.keyboard("{End}");
    expect(chat).toHaveFocus();
    expect(seen).not.toHaveBeenCalled();
    window.removeEventListener("keydown", seen);
  });

  it("shows an unread count on the chat tab only", () => {
    const { rerender } = render(<Tabs unread={2} />);
    expect(screen.getByRole("tab", { name: "CHAT, 2 new" })).toHaveTextContent("CHAT (2)");
    expect(screen.getByRole("tab", { name: "LOG" })).toHaveTextContent(/^LOG$/);
    rerender(<Tabs unread={0} />);
    expect(screen.getByRole("tab", { name: "CHAT" })).toHaveTextContent(/^CHAT$/);
    rerender(<Tabs label="COMMANDS" />);
    expect(screen.getByRole("tab", { name: "COMMANDS" })).toBeInTheDocument();
  });

  it("blurs a tab after a pointer click but not after the keyboard", async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    const [, chat] = tabs();
    await user.click(chat);
    expect(chat).not.toHaveFocus();
    chat.focus();
    await user.keyboard("{Enter}");
    expect(chat).toHaveFocus();
  });

  it("speaks the log through its own list while LOG is selected and through the announcer while CHAT is", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Tabs logs={["a"]} logCount={1} />);
    expect(screen.getByRole("log", { name: "Event log" })).toBeInTheDocument();
    const announcer = () => screen.getByRole("status", { name: "Chat announcements" });
    rerender(<Tabs logs={["a", "b"]} logCount={2} />);
    expect(announcer()).toHaveTextContent("");
    await user.click(tabs()[1]);
    expect(screen.queryByRole("log")).toBeNull();
    rerender(<Tabs logs={["a", "b", "Kai earned the C# Badge."]} logCount={3} />);
    expect(announcer()).toHaveTextContent("Kai earned the C sharp Badge.");
  });

  it("scrolls the log to the newest entry when LOG is selected again", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 500 });
    const user = userEvent.setup();
    render(<Tabs />);
    const scroller = screen.getByTestId("event-log-scroller");
    await user.click(tabs()[1]);
    scroller.scrollTop = 0;
    await user.click(tabs()[0]);
    expect(scroller.scrollTop).toBe(500);
  });

  it("lays out the tabs and both panels for md and for coarse pointers", () => {
    render(<Tabs />);
    for (const tab of tabs()) expect(tab.className).toContain("pointer-coarse:min-h-11");
    for (const tab of tabs()) {
      const panel = document.getElementById(tab.getAttribute("aria-controls")!)!;
      for (const c of ["md:absolute", "md:inset-x-3", "md:top-10", "md:bottom-3", "pointer-coarse:md:top-16"]) expect(panel.className).toContain(c);
    }
  });
});
