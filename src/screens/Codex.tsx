import { useState } from "react";
import { CHESTS, chestChallenge, type Picks } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { TerminalDialog } from "../ui/TerminalDialog";
import { CODE_CLASSES, CodeLines } from "./challenge/BlankBody";

/**
 * Your badges, in the chest table's order. An earned entry opens to show the question, your answer and the
 * explanation (any number can be open). The Codex has no key handlers: Esc and C belong to the game's key hook.
 */
export function Codex({
  badges,
  answered,
  picks,
  team,
  onClose,
}: {
  badges: ChestId[];
  answered: Partial<Record<ChestId, string>>;
  picks: Picks;
  team: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<ReadonlySet<ChestId>>(new Set());
  const firstEarned = CHESTS.find((c) => badges.includes(c.id))?.id;
  const toggle = (id: ChestId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <TerminalDialog title={`< ${team ? "YOUR " : ""}CODEX: ${badges.length}/10 BADGES >`} onClose={onClose}>
      <ul className="flex flex-col gap-2 text-xs">
        {CHESTS.map((chest) => {
          const earned = badges.includes(chest.id);
          const where = ` Badge · ${chest.where}`;
          if (!earned) {
            return (
              <li key={chest.id} className="min-h-11 rounded border-[1.5px] border-dashed border-[var(--panel-border)] px-3 py-3 text-[var(--text-muted)]">
                <span aria-hidden="true">{chest.badge}</span>
                <span className="sr-only">{chest.spoken}</span>
                {`${where} · not earned yet`}
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
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </TerminalDialog>
  );
}
