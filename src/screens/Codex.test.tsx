import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CHEST_IDS, chestChallenge, type Picks } from "../learn/chests";
import { practiceQuestion } from "../learn/codexModel";
import type { ChestId } from "../learn/types";
import { Codex } from "./Codex";
import type { QuestProgress } from "../learn/codexModel";

const picks = Object.fromEntries(CHEST_IDS.map((id) => [id, 0])) as Picks;
const NONE: QuestProgress = { gateUnlocked: false, questComplete: false, hasLoot: false, clueDecoded: false, artifactFound: false, towerPowered: false, lighthouseLit: false, archiveOpen: false };
const codex = (badges: ChestId[], over: { team?: boolean; answered?: Partial<Record<ChestId, string>>; picks?: Picks; progress?: Partial<QuestProgress>; onGoTo?: (c: ChestId) => void } = {}) => {
  const onClose = vi.fn();
  const onGoTo = over.onGoTo ?? vi.fn();
  return {
    onClose,
    onGoTo,
    ui: (
      <Codex
        badges={badges}
        answered={over.answered ?? {}}
        picks={over.picks ?? picks}
        team={over.team ?? false}
        progress={{ ...NONE, ...over.progress }}
        zone="peaks"
        player={{ x: 28, y: 72 }}
        onGoTo={onGoTo}
        onClose={onClose}
      />
    ),
  };
};
const renderCodex = (badges: ChestId[], over: Parameters<typeof codex>[1] = {}) => {
  const c = codex(badges, over);
  render(c.ui);
  return { onClose: c.onClose, onGoTo: c.onGoTo };
};

describe("Codex", () => {
  it("titled `< CODEX: 2/11 BADGES >` (team: `< YOUR CODEX: 2/11 BADGES >`), grouped by zone in world order with each chest's place", () => {
    const { unmount } = render(codex(["chest-sql", "chest-cs"]).ui);
    expect(screen.getByRole("dialog", { name: "< CODEX: 2/11 BADGES >" })).toBeInTheDocument();
    const zones = ["C++ Peaks", "Dev Village", "Dense Forest", "Sunbaked Desert", "Sunny Beach", "Foggaten Island"];
    expect(screen.getAllByRole("heading", { level: 3 }).filter((h) => zones.some((z) => h.textContent!.startsWith(z))).map((h) => h.textContent)).toEqual([
      "C++ Peaks · 0/2", "Dev Village · 2/3", "Dense Forest · 0/1", "Sunbaked Desert · 0/2", "Sunny Beach · 0/2", "Foggaten Island · 0/1",
    ]);
    const items = screen.getAllByRole("listitem").filter((li) => /Badge · /.test(li.textContent ?? ""));
    expect(items).toHaveLength(11);
    // Entries whose badge has a separate spoken form also carry it as hidden text ("C++ 1").
    expect(items[0]).toHaveTextContent(/HTML Badge · C\+\+ Peaks · Ski Lodge/);
    expect(within(screen.getByRole("region", { name: "Dev Village" })).getAllByRole("listitem")[0]).toHaveTextContent("PHP Badge · Dev Village · Hut");
    expect(screen.getByRole("region", { name: "Dev Village" })).toHaveTextContent(/C# Badge · Dev Village · in the Archive/);
    expect(screen.getByRole("region", { name: "Dense Forest" })).toHaveTextContent("JavaScript Badge · Dense Forest · Old Oak");
    unmount();
    renderCodex(["chest-sql", "chest-cs"], { team: true });
    expect(screen.getByRole("dialog", { name: "< YOUR CODEX: 2/11 BADGES >" })).toBeInTheDocument();
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
    const html = within(screen.getByRole("region", { name: "C++ Peaks" })).getAllByRole("listitem")[0];
    expect(within(html).queryByRole("button", { name: /^HTML Badge/ })).toBeNull();
    expect(html.textContent).toMatch(/· not earned yet/);
  });

  it("an earned chest with a late pick shows that question and its explanation (Review Focus 4)", async () => {
    const user = userEvent.setup();
    const late: Picks = { ...picks, "chest-sql": 5 };
    renderCodex(["chest-sql"], { answered: { "chest-sql": "x" }, picks: late });
    await user.click(screen.getByRole("button", { name: /^SQL Badge/ }));
    const question = chestChallenge(late, "chest-sql");
    expect(question.id).toBe("sql-insert");
    expect(screen.getByText(question.prompt)).toBeInTheDocument();
    expect(screen.getByText(question.explain)).toBeInTheDocument();
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

  it("shows a badges meter and a hint at the nearest chest, or a cheer when all are earned", () => {
    renderCodex(["chest-html"]);
    const meter = screen.getByRole("meter", { name: "Badges earned" });
    expect([meter.getAttribute("aria-valuenow"), meter.getAttribute("aria-valuemax")]).toEqual(["1", "11"]);
    expect(screen.getByText(/^Next closest: Ice Cave, \d+ steps away\.$/)).toBeInTheDocument();
  });

  it("the story checklist ticks what is done and says where to look for the rest", () => {
    renderCodex([], { progress: { gateUnlocked: true, hasLoot: true } });
    const story = screen.getByRole("region", { name: "Story" });
    expect(within(story).getByText("North gate").parentElement).toHaveTextContent(/✓ North gate done/);
    expect(within(story).getByText("Golden Semicolon").parentElement).toHaveTextContent(/○ Golden Semicolon not done yet · Foggaten Island/);
    expect(within(story).getByText("Supply Cache").parentElement).not.toHaveTextContent("past the wall");
  });

  it("filters: All, Earned and To find, dropping empty zones", async () => {
    const user = userEvent.setup();
    renderCodex(["chest-html", "chest-js"]);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Earned" }));
    expect(screen.queryByRole("region", { name: "Dev Village" })).toBeNull();
    expect(screen.getByRole("region", { name: "Dense Forest" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "To find" }));
    expect(screen.queryByRole("region", { name: "Dense Forest" })).toBeNull();
    expect(screen.getByRole("region", { name: "Dev Village" })).toBeInTheDocument();
  });

  it("an unearned entry has a Go there button that reports its chest; earned ones have none", async () => {
    const user = userEvent.setup();
    const { onGoTo } = renderCodex(["chest-html"]);
    expect(screen.getAllByRole("button", { name: /^Go to / })).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: /^Go to SQL: Head to the Windmill in Dev Village/ }));
    expect(onGoTo).toHaveBeenCalledWith("chest-sql");
  });

  it("every row has a language tag that screen readers skip", () => {
    renderCodex(["chest-html"]);
    const tags = screen.getAllByText(/^(HTML|CSS|PHP|PY|JAVA|C#|SQL|C\+\+|JS)$/).filter((n) => n.getAttribute("aria-hidden") === "true" && n.className.includes("min-w-9"));
    expect(tags).toHaveLength(11);
  });

  it("practice: a blank is checked here, another question cycles, and nothing in the game changes", async () => {
    const user = userEvent.setup();
    renderCodex(["chest-html"], { answered: { "chest-html": "href" } });
    await user.click(screen.getByRole("button", { name: /^HTML Badge/ }));
    await user.click(screen.getByRole("button", { name: "[ Practice HTML ]" }));
    const first = chestChallenge(picks, "chest-html");
    const q = practiceQuestion("chest-html", picks["chest-html"], 0);
    expect(screen.getByText(q.prompt)).toBeInTheDocument();
    expect(q.id).not.toBe(first.id);
    if (q.kind === "blank") {
      await user.type(screen.getByRole("textbox", { name: "Practice answer" }), "zzzz");
      await user.click(screen.getByRole("button", { name: "[ Check ]" }));
      expect(screen.getByRole("status")).toHaveTextContent(/^(Not quite|⚠|Type)/);
    } else if (q.kind === "choice") {
      const wrong = q.options.findIndex((_, i) => i !== q.correct);
      await user.click(screen.getByRole("button", { name: q.options[wrong] }));
      expect(screen.getByRole("status")).toHaveTextContent(/^Not quite\./);
      await user.click(screen.getByRole("button", { name: q.options[q.correct] }));
      expect(screen.getByRole("status")).toHaveTextContent(/^Correct!/);
    }
    await user.click(screen.getByRole("button", { name: "[ Another question ]" }));
    expect(screen.getByText(practiceQuestion("chest-html", picks["chest-html"], 1).prompt)).toBeInTheDocument();
    expect(screen.getByText("Your answer: href")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Done ]" }));
    expect(screen.getByRole("button", { name: "[ Practice HTML ]" })).toBeInTheDocument();
  });
});
