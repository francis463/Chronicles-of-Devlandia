import { useId, useMemo, useState, type ReactNode } from "react";
import type { ChallengeView } from "../../game/challenges";
import { order } from "../../learn/shuffle";
import type { ChoiceChallenge } from "../../learn/types";
import { CHANGE_ANSWER, CODE_CLASSES, CodeLines } from "./BlankBody";
import { SubmitRow } from "./SubmitRow";

const LETTERS = "ABCD";

/** A choice: four options in the game's shuffled order as native radios; SUBMIT sends the picked option's data index. */
export function ChoiceBody({
  challenge: c,
  view,
  onSubmit,
  hint,
}: {
  challenge: ChoiceChallenge;
  view: ChallengeView;
  onSubmit: (index: number) => void;
  hint: ReactNode;
}) {
  const shown = useMemo(() => order(4, view.seed, c.id), [view.seed, c.id]);
  const [picked, setPicked] = useState<number | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null);
  const [announce, setAnnounce] = useState({ text: "", n: 0 });
  const group = useId();
  const wrong = view.error !== null && picked !== null && picked === lastSubmitted;
  const reason = picked === null ? "Pick an answer first." : wrong ? CHANGE_ANSWER : null;

  const press = () => {
    if (reason || picked === null) return setAnnounce((a) => ({ text: reason ?? "", n: a.n + 1 }));
    setLastSubmitted(picked);
    onSubmit(picked);
  };

  return (
    <>
      {c.code && (
        <div className={CODE_CLASSES}>
          <CodeLines code={c.code} />
        </div>
      )}
      <div role="radiogroup" aria-label={c.prompt} className="flex flex-col gap-2">
        {shown.map((index, i) => {
          const isWrong = wrong && picked === index;
          return (
            <label
              key={index}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded border-[1.5px] px-3 py-2 text-xs ${
                picked === index ? "border-[var(--accent-border)] bg-[var(--editor-bg)]" : "border-[var(--panel-border)]"
              }`}
            >
              <input
                type="radio"
                name={group}
                checked={picked === index}
                onChange={() => setPicked(index)}
                aria-label={`${LETTERS[i]}. ${c.options[index]}${isWrong ? ", wrong" : ""}`}
                className="accent-[var(--accent)]"
              />
              <span aria-hidden="true" className="font-bold">{`${LETTERS[i]}.`}</span>
              <span aria-hidden="true" className={c.codeOptions ? "font-mono text-[var(--code)]" : ""}>
                {c.options[index]}
              </span>
              {isWrong && (
                <span aria-hidden="true" className="ml-auto text-[var(--danger-border)]">
                  ✗
                </span>
              )}
            </label>
          );
        })}
      </div>
      {view.error && (
        // A fresh node per wrong try, so the same words are announced again.
        <p key={view.wrongTries} role="alert" className="text-xs text-[var(--danger-border)]">
          {view.error}
        </p>
      )}
      <div className="flex flex-col gap-4 md:flex-row-reverse md:items-stretch">
        <SubmitRow label="[ SUBMIT ANSWER ]" reason={reason} announce={announce} onPress={press} />
        {hint}
      </div>
    </>
  );
}
