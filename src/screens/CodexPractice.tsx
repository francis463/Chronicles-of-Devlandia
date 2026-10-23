import { useState } from "react";
import { checkBlank, isCorrectBlank } from "../learn/check";
import { practiceQuestion } from "../learn/codexModel";
import type { ChestId } from "../learn/types";
import { CODE_CLASSES, CodeLines } from "./challenge/BlankBody";

type Outcome = { ok: boolean; text: string } | null;

const BUTTON =
  "min-h-11 cursor-pointer rounded border-[1.5px] border-[var(--panel-border)] px-3 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] disabled:cursor-default disabled:opacity-60";

/**
 * Practice for an earned chest: the language's questions one after another (starting after the one you were asked),
 * checked here and nowhere else. It changes no badge, answer or game state.
 */
export function CodexPractice({ chest, pickedIndex, onDone }: { chest: ChestId; pickedIndex: number; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const q = practiceQuestion(chest, pickedIndex, step);
  const next = () => {
    setStep((n) => n + 1);
    setValue("");
    setOutcome(null);
  };
  const explain = (ok: boolean) => ({ ok, text: ok ? `Correct! ${q.explain}` : `Not quite. ${q.hint}` });

  return (
    <div className="flex flex-col gap-2 rounded border-[1.5px] border-dashed border-[var(--primary-border)] p-3" aria-label="Practice">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-border)]">Practice · changes nothing in your game</p>
      <p>{q.prompt}</p>
      {q.kind === "blank" && (
        <>
          <div className={CODE_CLASSES}>
            <CodeLines
              code={q.code}
              gap={
                <input
                  aria-label="Practice answer"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setOutcome(null);
                  }}
                  className="mx-1 w-32 rounded border border-[var(--panel-border)] bg-[var(--bg)] px-1 font-mono text-[13px]"
                />
              }
            />
          </div>
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              const live = checkBlank(q, value);
              setOutcome(live.ok ? explain(isCorrectBlank(q, value)) : { ok: false, text: live.reason });
            }}
          >
            [ Check ]
          </button>
        </>
      )}
      {q.kind === "choice" && (
        <>
          {q.code && (
            <div className={CODE_CLASSES}>
              <CodeLines code={q.code} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {q.options.map((option, i) => (
              <button key={i} type="button" className={BUTTON} disabled={outcome?.ok === true} onClick={() => setOutcome(explain(i === q.correct))}>
                {option}
              </button>
            ))}
          </div>
        </>
      )}
      {outcome && (
        <p role="status" className={outcome.ok ? "font-bold text-[var(--success-border)]" : "text-[var(--accent)]"}>
          {outcome.text}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className={BUTTON} onClick={next}>
          [ Another question ]
        </button>
        <button type="button" className={BUTTON} onClick={onDone}>
          [ Done ]
        </button>
      </div>
    </div>
  );
}
