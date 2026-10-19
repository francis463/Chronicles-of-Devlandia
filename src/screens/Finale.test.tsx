import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CHEST_IDS } from "../learn/chests";
import { Finale, playedFor } from "./Finale";

const base = { badges: [...CHEST_IDS], playedMs: 200 * 60_000, hints: 3, hard: false, onClose: () => {} };

describe("Finale", () => {
  it("is a dialog that lists all 11 badges, the time played and the hints used", () => {
    render(<Finale {...base} />);
    expect(screen.getByRole("dialog", { name: /master of devlandia/i })).toBeInTheDocument();
    expect(screen.getByText(/you are a master of devlandia/i)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(11);
    expect(screen.getByText("Time played: 3 h 20 min · Hints used: 3 (+2 min each)")).toBeInTheDocument();
  });

  it("with no hints used it does not mention a penalty", () => {
    render(<Finale {...base} hints={0} />);
    expect(screen.getByText("Time played: 3 h 20 min · Hints used: 0")).toBeInTheDocument();
  });

  it("Keep exploring closes it", async () => {
    const onClose = vi.fn();
    render(<Finale {...base} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "[ Keep exploring ]" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("offers New Game+ only in a solo game that is not already hard", async () => {
    const onNewGamePlus = vi.fn();
    const { rerender } = render(<Finale {...base} onNewGamePlus={onNewGamePlus} />);
    await userEvent.click(screen.getByRole("button", { name: "[ NEW GAME+ ]" }));
    expect(onNewGamePlus).toHaveBeenCalledTimes(1);
    rerender(<Finale {...base} />);
    expect(screen.queryByRole("button", { name: "[ NEW GAME+ ]" })).toBeNull();
    rerender(<Finale {...base} hard onNewGamePlus={onNewGamePlus} />);
    expect(screen.queryByRole("button", { name: "[ NEW GAME+ ]" })).toBeNull();
    expect(screen.getByText(/mastered the hard run/i)).toBeInTheDocument();
  });

  it("offers [ Get certificate ] when given a handler", async () => {
    const onCertificate = vi.fn();
    const { rerender } = render(<Finale {...base} />);
    expect(screen.queryByRole("button", { name: "[ Get certificate ]" })).toBeNull();
    rerender(<Finale {...base} onCertificate={onCertificate} />);
    await userEvent.click(screen.getByRole("button", { name: "[ Get certificate ]" }));
    expect(onCertificate).toHaveBeenCalledTimes(1);
  });

  it("playedFor reads minutes and hours of real time played", () => {
    expect(playedFor(45 * 60_000)).toBe("45 min");
    expect(playedFor(125 * 60_000 + 30_000)).toBe("2 h 5 min");
    expect(playedFor(20_000)).toBe("0 min");
    expect(playedFor(-5)).toBe("0 min");
  });
});
