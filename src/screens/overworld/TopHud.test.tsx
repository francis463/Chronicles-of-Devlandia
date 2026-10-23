import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopHud } from "./TopHud";

const base = { hp: 5, minutes: 19 * 60 + 29, onMenu: vi.fn(), onCodex: vi.fn(), onHelp: vi.fn(), region: "Dev Village", playerClass: "mage" as const };
const header = () => screen.getByRole("banner");

describe("TopHud, normal", () => {
  it("keeps its two-row layout, the long button names and no food or chat button", () => {
    render(<TopHud {...base} food={2} onEat={vi.fn()} onChat={vi.fn()} />);
    for (const name of ["[?] Help", "[C] Codex", "[=] Menu"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eat food|no food|chat/i })).toBeNull();
    expect(header().className).toContain("flex-wrap");
    expect(screen.getByText("Class: Mage")).toBeInTheDocument();
  });
});

describe("TopHud, compact (a phone held sideways)", () => {
  it("is one slim row that never wraps, and keeps clear of a notch with the safe-area insets", () => {
    render(<TopHud {...base} compact />);
    expect(header().className).not.toContain("flex-wrap");
    expect(header().className).toContain("flex-nowrap");
    expect(header().className).toContain("safe-x"); // .safe-x pads both sides by max(0.75rem, the notch inset); see index.css
    expect(screen.queryByText("Class: Mage")).toBeNull(); // the class is not worth the room
    expect(screen.getByText("REGION: DEV VILLAGE")).toBeInTheDocument();
  });

  it("shows Help, Codex and Menu as small keys that still have their full names", () => {
    const onHelp = vi.fn();
    const onCodex = vi.fn();
    const onMenu = vi.fn();
    render(<TopHud {...base} onHelp={onHelp} onCodex={onCodex} onMenu={onMenu} compact />);
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    fireEvent.click(screen.getByRole("button", { name: "Codex" }));
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect([onHelp, onCodex, onMenu].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
    expect(screen.getByRole("button", { name: "Help" })).toHaveTextContent("[?]");
  });

  it("has a Food button that eats, says how many are left, and is off with none", () => {
    const onEat = vi.fn();
    const { rerender } = render(<TopHud {...base} compact food={2} onEat={onEat} />);
    const eat = screen.getByRole("button", { name: "Eat food (2 left)" });
    expect(eat).toHaveTextContent("Food ×2");
    fireEvent.click(eat);
    expect(onEat).toHaveBeenCalledTimes(1);
    rerender(<TopHud {...base} compact food={0} onEat={onEat} />);
    expect(screen.getByRole("button", { name: "No food" })).toBeDisabled();
  });

  it("has a Chat button that opens chat, with the unread count when there is one", () => {
    const onChat = vi.fn();
    const { rerender } = render(<TopHud {...base} compact onChat={onChat} />);
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(onChat).toHaveBeenCalledTimes(1);
    rerender(<TopHud {...base} compact onChat={onChat} chatUnread={3} />);
    expect(screen.getByRole("button", { name: "Chat, 3 unread" })).toBeInTheDocument();
  });

  it("without food or chat handlers it shows neither button", () => {
    render(<TopHud {...base} compact />);
    expect(screen.queryByRole("button", { name: /eat food|no food|chat/i })).toBeNull();
  });
});
