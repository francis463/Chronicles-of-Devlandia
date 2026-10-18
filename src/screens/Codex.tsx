import { useState } from "react";
import { SECRETS } from "../game/secrets";
import type { Point } from "../game/types";
import type { ZoneId } from "../game/zones";
import { CHESTS, chestChallenge, type Chest, type Picks } from "../learn/chests";
import { LANG_TAGS, QUESTS, filterGroups, goToNote, groupChests, nextHint, type CodexFilter, type QuestProgress } from "../learn/codexModel";
import type { ChestId } from "../learn/types";
import { TerminalDialog } from "../ui/TerminalDialog";
import { CODE_CLASSES, CodeLines } from "./challenge/BlankBody";
import { CodexPractice } from "./CodexPractice";

const FILTERS: ReadonlyArray<[CodexFilter, string]> = [
  ["all", "All"],
  ["earned", "Earned"],
  ["todo", "To find"],
];

function LangTag({ language }: { language: string }) {
  const t = LANG_TAGS[language];
  return (
    <span aria-hidden="true" className="inline-block min-w-9 rounded px-1 text-center text-[10px] font-bold" style={{ background: t.bg, color: t.fg }}>
      {t.tag}
    </span>
  );
}

/**
 * Your badges grouped by zone, with a progress bar and a hint at what to do next, the story steps, and filters.
 * An earned entry opens to show the question, your answer and the explanation (any number can be open) and can be
 * practised; an unearned one has a "Go there" button. The Codex has no key handlers: Esc and C belong to the game's key hook.
 */
export function Codex({
  badges,
  answered,
  picks,
  team,
  progress,
  zone,
  player,
  secrets = 0,
  onGoTo,
  onFinale,
  onClose,
}: {
  badges: ChestId[];
  answered: Partial<Record<ChestId, string>>;
  picks: Picks;
  team: boolean;
  /** The story steps' flags, for the checklist. */
  progress: QuestProgress;
  /** Where you stand, for the "next closest" hint. */
  zone: ZoneId;
  player: Point;
  /** How many of the six hidden spots you have found (your own count, in a team game too). */
  secrets?: number;
  /** "Go there": the game closes the Codex and writes where the chest is. */
  onGoTo: (chest: ChestId) => void;
  /** With every badge earned: reopen the Master of Devlandia finale. */
  onFinale?: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<ReadonlySet<ChestId>>(new Set());
  const [practising, setPractising] = useState<ChestId | null>(null);
  const [filter, setFilter] = useState<CodexFilter>("all");
  const firstEarned = CHESTS.find((c) => badges.includes(c.id))?.id;
  const toggle = (id: ChestId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const groups = filterGroups(groupChests(badges), filter, badges);
  const total = CHESTS.length;

  const row = (chest: Chest) => {
    const earned = badges.includes(chest.id);
    const where = ` Badge · ${chest.where}`;
    if (!earned) {
      return (
        <li key={chest.id} className="flex min-h-11 flex-wrap items-center gap-2 rounded border-[1.5px] border-dashed border-[var(--panel-border)] px-3 py-3 text-[var(--text-muted)]">
          <LangTag language={chest.language} />
          <span>
            <span aria-hidden="true">{chest.badge}</span>
            <span className="sr-only">{chest.spoken}</span>
            {`${where} · not earned yet`}
          </span>
          <button
            type="button"
            aria-label={`Go to ${chest.spoken}: ${goToNote(chest.id)}`}
            onClick={() => onGoTo(chest.id)}
            className="ml-auto min-h-11 cursor-pointer rounded border-[1.5px] border-[var(--primary-border)] px-3 text-[var(--primary-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)]"
          >
            [ Go there ]
          </button>
        </li>
      );
    }
    const question = chestChallenge(picks, chest.id);
    const expanded = open.has(chest.id);
    return (
      <li key={chest.id} className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${chest.spoken}${where}`}
          data-autofocus={chest.id === firstEarned ? true : undefined}
          onClick={() => toggle(chest.id)}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded border-[1.5px] border-[var(--success-border)] px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)]"
        >
          <LangTag language={chest.language} />
          <span aria-hidden="true">{`${expanded ? "▾" : "▸"} ${chest.badge}${where}`}</span>
          <span aria-hidden="true" className="ml-auto text-[var(--success-border)]">
            ✓
          </span>
        </button>
        {expanded && (
          <div className="flex flex-col gap-2 border-l-2 border-[var(--panel-border)] pl-3">
            <p>{question.prompt}</p>
            {question.kind !== "match" && question.code && (
              <div className={CODE_CLASSES}>
                <CodeLines code={question.code} />
              </div>
            )}
            <p className="font-bold text-[var(--accent)]">{`Your answer: ${answered[chest.id] ?? ""}`}</p>
            <p className="text-[var(--text-muted)]">{question.explain}</p>
            {practising === chest.id ? (
              <CodexPractice chest={chest.id} pickedIndex={picks[chest.id]} onDone={() => setPractising(null)} />
            ) : (
              <button
                type="button"
                onClick={() => setPractising(chest.id)}
                className="min-h-11 w-fit cursor-pointer rounded border-[1.5px] border-[var(--primary-border)] px-3 text-[var(--primary-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)]"
              >
                [ Practice {chest.language} ]
              </button>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <TerminalDialog title={`< ${team ? "YOUR " : ""}CODEX: ${badges.length}/${total} BADGES >`} onClose={onClose}>
      <div className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <div
            role="meter"
            aria-label="Badges earned"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={badges.length}
            className="h-2 w-full rounded-sm border border-[var(--panel-border)]"
          >
            <div className="h-full bg-[var(--success-border)] transition-all" style={{ width: `${(badges.length / total) * 100}%` }} />
          </div>
          <p className="text-[var(--text-muted)]">{nextHint({ badges, zone, player })}</p>
          <p className="text-[var(--text-muted)]">{`Secrets found: ${secrets}/${SECRETS.length}`}</p>
          {onFinale && badges.length === total && (
            <button
              type="button"
              onClick={onFinale}
              className="min-h-11 w-fit cursor-pointer rounded border-[1.5px] border-[var(--accent-border)] px-3 text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)]"
            >
              [ ★ View the finale ]
            </button>
          )}
        </div>

        <section aria-label="Story" className="flex flex-col gap-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Story</h3>
          <ul className="flex flex-col gap-1">
            {QUESTS.map((q) => {
              const done = q.done(progress);
              return (
                <li key={q.id} className={done ? "text-[var(--success-border)]" : "text-[var(--text-muted)]"}>
                  <span aria-hidden="true">{done ? "✓ " : "○ "}</span>
                  <span className="font-bold">{q.label}</span>
                  <span className="sr-only">{done ? " done" : " not done yet"}</span>
                  {!done && ` · ${q.hint}`}
                </li>
              );
            })}
          </ul>
        </section>

        <div role="group" aria-label="Show" className="flex gap-2">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`min-h-11 cursor-pointer rounded border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${filter === id ? "border-[var(--primary-border)] font-bold text-[var(--primary-border)]" : "border-[var(--panel-border)] text-[var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {groups.length === 0 && <p className="text-[var(--text-muted)]">{filter === "earned" ? "No badges earned yet." : "Every badge is earned."}</p>}
        {groups.map((g) => (
          <section key={g.zone} aria-label={g.name} className="flex flex-col gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{`${g.name} · ${g.earned}/${CHESTS.filter((c) => c.zone === g.zone).length}`}</h3>
            <ul className="flex flex-col gap-2">{g.chests.map(row)}</ul>
          </section>
        ))}
      </div>
    </TerminalDialog>
  );
}
