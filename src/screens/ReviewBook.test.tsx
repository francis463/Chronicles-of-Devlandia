import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CHEST_IDS, CHESTS, chestChallenge, type Picks } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { ReviewBook } from "./ReviewBook";

const picks = Object.fromEntries(CHEST_IDS.map((id) => [id, 0])) as Picks;
const book = (badges: ChestId[], over: { answered?: Partial<Record<ChestId, string>>; onClose?: () => void } = {}) =>
  render(<ReviewBook badges={badges} answered={over.answered ?? {}} picks={picks} onClose={over.onClose ?? vi.fn()} />);
const LANGUAGES = [...new Set(CHESTS.map((c) => c.language))];

describe("ReviewBook", () => {
  it("is a dialog titled REVIEW BOOK with a filter of All and one button per language, All chosen first", () => {
    book([]);
    expect(screen.getByRole("dialog", { name: "< REVIEW BOOK >" })).toBeInTheDocument();
    const filter = screen.getByRole("group", { name: "Language" });
    expect(within(filter).getAllByRole("button").map((b) => b.textContent)).toEqual(["All", ...LANGUAGES]);
    expect(within(filter).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(LANGUAGES).toContain("C++");
    expect(LANGUAGES).toContain("HTML");
  });

  it("an earned language shows its question, your answer and the explanation", () => {
    book(["chest-html"], { answered: { "chest-html": "href" } });
    const q = chestChallenge(picks, "chest-html");
    expect(screen.getByText(q.prompt)).toBeInTheDocument();
    expect(screen.getByText("Your answer: href")).toBeInTheDocument();
    expect(screen.getByText(q.explain)).toBeInTheDocument();
  });

  it("an unearned language is locked, and its question is nowhere on the page", () => {
    book(["chest-html"]);
    const locked = chestChallenge(picks, "chest-css");
    expect(screen.getByText("Earn the CSS badge to read this.")).toBeInTheDocument();
    expect(screen.queryByText(locked.prompt)).toBeNull();
    expect(screen.queryByText(locked.explain)).toBeNull();
  });

  it("filtering to a language shows only its chests, each earned or locked on its own", async () => {
    const user = userEvent.setup();
    book(["chest-cpp-2"], { answered: { "chest-cpp-2": "x" } });
    await user.click(screen.getByRole("button", { name: "C++" }));
    expect(screen.getByRole("button", { name: "C++" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(chestChallenge(picks, "chest-cpp-2").prompt)).toBeInTheDocument();
    expect(screen.getByText("Earn the C++ I badge to read this.")).toBeInTheDocument();
    expect(screen.queryByText("Earn the HTML badge to read this.")).toBeNull();
    expect(screen.queryByText(chestChallenge(picks, "chest-html").prompt)).toBeNull();
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("Earn the HTML badge to read this.")).toBeInTheDocument();
  });

  it("with nothing earned every chest is locked; with all earned none is", () => {
    const none = book([]);
    expect(screen.getAllByText(/^Earn the .* badge to read this\.$/)).toHaveLength(CHESTS.length);
    none.unmount();
    book([...CHEST_IDS]);
    expect(screen.queryAllByText(/^Earn the .* badge to read this\.$/)).toHaveLength(0);
  });

  it("closes with its close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    book([], { onClose });
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
