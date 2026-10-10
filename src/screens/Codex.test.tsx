import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CHEST_IDS, chestChallenge } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { Codex } from "./Codex";

const picks = Object.fromEntries(CHEST_IDS.map((id) => [id, 0])) as Record<ChestId, 0 | 1 | 2>;
const renderCodex = (badges: ChestId[], over: { team?: boolean; answered?: Partial<Record<ChestId, string>> } = {}) => {
  const onClose = vi.fn();
  render(<Codex badges={badges} answered={over.answered ?? {}} picks={picks} team={over.team ?? false} onClose={onClose} />);
  return { onClose };
};

describe("Codex", () => {
  it("titled `< CODEX: 2/10 BADGES >` (team: `< YOUR CODEX: 2/10 BADGES >`), one list in table order with each chest's place", () => {
    const { unmount } = render(
      <Codex badges={["chest-sql", "chest-cs"]} answered={{}} picks={picks} team={false} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog", { name: "< CODEX: 2/10 BADGES >" })).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    // Entries whose badge has a separate spoken form also carry it as hidden text ("C++ 1").
    expect(items[0]).toHaveTextContent(/^C\+\+ I.*Badge · C\+\+ Peaks · north of the wall/);
    expect(items[3]).toHaveTextContent("HTML Badge · C++ Peaks");
    expect(items[6]).toHaveTextContent("PHP Badge · Dev Village");
    expect(items[9]).toHaveTextContent(/C# Badge · Dev Village · in the Archive/);
    unmount();
    renderCodex(["chest-sql", "chest-cs"], { team: true });
    expect(screen.getByRole("dialog", { name: "< YOUR CODEX: 2/10 BADGES >" })).toBeInTheDocument();
  });

  it("an earned entry is a button with aria-expanded that shows the question, your answer and the explanation; several can be open; an unearned entry ends `· not earned yet`", async () => {
    const user = userEvent.setup();
    renderCodex(["chest-sql", "chest-php"], { answered: { "chest-sql": "FROM", "chest-php": "echo" } });
    const sql = screen.getByRole("button", { name: /^SQL Badge/ });
    expect(sql).toHaveAttribute("aria-expanded", "false");
    await user.click(sql);
    expect(sql).toHaveAttribute("aria-expanded", "true");
    const question = chestChallenge(picks, "chest-sql");
    expect(screen.getByText(question.prompt)).toBeInTheDocument();
    expect(screen.getByText("Your answer: FROM")).toBeInTheDocument();
    expect(screen.getByText(question.explain)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^PHP Badge/ }));
    expect(sql).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Your answer: echo")).toBeInTheDocument();
    const html = within(screen.getByRole("list")).getAllByRole("listitem")[3];
    expect(within(html).queryByRole("button")).toBeNull();
    expect(html.textContent).toMatch(/· not earned yet$/);
  });

  it("focus starts on the first earned entry, else `[X] CLOSE`; `[X] CLOSE` closes it", async () => {
    const user = userEvent.setup();
    const { onClose } = renderCodex(["chest-sql", "chest-java"]);
    expect(screen.getByRole("button", { name: /^Java Badge/ })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("with nothing earned, focus starts on [X] CLOSE", () => {
    renderCodex([]);
    expect(screen.getByRole("button", { name: "[X] CLOSE" })).toHaveFocus();
  });

  it("accessible names use the spoken forms (`C sharp`, `C++ 1`)", () => {
    renderCodex(["chest-cs", "chest-cpp-1"]);
    expect(screen.getByRole("button", { name: /^C sharp Badge/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^C\+\+ 1 Badge/ })).toBeInTheDocument();
  });
});
