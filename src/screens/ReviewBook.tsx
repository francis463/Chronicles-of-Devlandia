import { useState } from "react";
import { CHESTS, chestChallenge, type Chest, type Picks } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { TerminalDialog } from "../ui/TerminalDialog";
import { CODE_CLASSES, CodeLines } from "./challenge/BlankBody";
import { LangTag } from "./Codex";

const LANGUAGES = [...new Set(CHESTS.map((c) => c.language))];

/**
 * The lodge's review book: every language's question, filtered by language. An earned chest shows its question, your answer and
 * the explanation; one you have not earned is locked, and its question is not on the page at all.
 */
export function ReviewBook({ badges, answered, picks, onClose }: { badges: ChestId[]; answered: Partial<Record<ChestId, string>>; picks: Picks; onClose: () => void }) {
  const [language, setLanguage] = useState<string | null>(null);
  const shown = CHESTS.filter((c) => language === null || c.language === language);

  const entry = (chest: Chest) => {
    if (!badges.includes(chest.id)) {
      return (
        <li key={chest.id} className="flex min-h-11 flex-wrap items-center gap-2 rounded border-[1.5px] border-dashed border-[var(--panel-border)] px-3 py-3 text-[var(--text-muted)]">
          <LangTag language={chest.language} />
          <span>{`Earn the ${chest.badge} badge to read this.`}</span>
        </li>
      );
    }
    const question = chestChallenge(picks, chest.id);
    return (
      <li key={chest.id} className="flex flex-col gap-2 rounded border-[1.5px] border-[var(--success-border)] px-3 py-3">
        <span className="flex items-center gap-2 font-bold text-[var(--success-border)]">
          <LangTag language={chest.language} />
          <span>{`${chest.badge} ✓`}</span>
        </span>
        <p>{question.prompt}</p>
        {question.kind !== "match" && question.code && (
          <div className={CODE_CLASSES}>
            <CodeLines code={question.code} />
          </div>
        )}
        <p className="font-bold text-[var(--accent)]">{`Your answer: ${answered[chest.id] ?? ""}`}</p>
        <p className="text-[var(--text-muted)]">{question.explain}</p>
      </li>
    );
  };

  const button = (label: string, value: string | null) => (
    <button
      key={label}
      type="button"
      aria-pressed={language === value}
      onClick={() => setLanguage(value)}
      className={`min-h-11 cursor-pointer rounded border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${language === value ? "border-[var(--primary-border)] font-bold text-[var(--primary-border)]" : "border-[var(--panel-border)] text-[var(--text-muted)]"}`}
    >
      {label}
    </button>
  );

  return (
    <TerminalDialog title="< REVIEW BOOK >" onClose={onClose}>
      <div className="flex flex-col gap-3 text-xs">
        <p className="text-[var(--text-muted)]">Every language's questions. The ones you have earned open here to read again.</p>
        <div role="group" aria-label="Language" className="flex flex-wrap gap-2">
          {button("All", null)}
          {LANGUAGES.map((l) => button(l, l))}
        </div>
        <ul className="flex flex-col gap-2">{shown.map(entry)}</ul>
      </div>
    </TerminalDialog>
  );
}
