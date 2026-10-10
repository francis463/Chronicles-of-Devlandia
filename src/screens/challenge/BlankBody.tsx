import { useState, type ReactNode } from "react";
import type { ChallengeView } from "../../game/challenges";
import { checkBlank } from "../../learn/check";
import type { BlankChallenge, BlankMode, CheckResult } from "../../learn/types";
import { SubmitRow } from "./SubmitRow";
import { useLiveCheck } from "./useLiveCheck";

const GAP = "___";
export const CODE_CLASSES =
  "overflow-x-auto rounded-md border-2 border-[var(--panel-border)] bg-[var(--editor-bg)] p-4 font-mono text-[13px] leading-7 whitespace-pre text-[var(--code)]";

/** Code lines with their line numbers; the gap's line shows `gap` (an input, a slot or a filled answer) in place of `___`. */
export function CodeLines({ code, gap }: { code: readonly string[]; gap?: ReactNode }) {
  return code.map((line, i) => {
    const at = line.indexOf(GAP);
    if (at < 0 || gap === undefined) return <div key={i}>{`${i + 1} | ${line}`}</div>;
    const after = line.slice(at + GAP.length);
    return (
      <div key={i} className="flex flex-wrap items-center">
        <span>{`${i + 1} | ${line.slice(0, at)}`}</span>
        {gap}
        {after && <span>{after}</span>}
      </div>
    );
  });
}

const PRISTINE = "Fill the blank, then submit.";
const VALID = "Syntax OK. Submit to check your answer.";
export const CHANGE_ANSWER = "Change your answer to try again.";

function liveText(c: BlankChallenge, result: CheckResult | "pristine"): string {
  if (result === "pristine") return c.pristine ?? PRISTINE;
  return result.ok ? VALID : `⚠ ${result.reason}`;
}

/**
 * A blank in Type mode: the code with an input in the gap, the live check, the error line and an honest SUBMIT.
 * `hint` is the drone panel, laid out beside SUBMIT.
 */
export function BlankBody({
  challenge: c,
  view,
  mode,
  onSubmit,
  hint,
}: {
  challenge: BlankChallenge;
  view: ChallengeView;
  mode: BlankMode;
  onSubmit: (value: string) => void;
  hint: ReactNode;
}) {
  const [value, setValue] = useState(c.start ?? "");
  const [edited, setEdited] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [announce, setAnnounce] = useState({ text: "", n: 0 });
  const { result, flush } = useLiveCheck(c, value, mode, edited);

  const notReady = (check: CheckResult) =>
    !check.ok ? check.reason : view.error !== null && value === lastSubmitted ? CHANGE_ANSWER : null;
  const reason = notReady(checkBlank(c, value, mode));
  const invalid = result !== "pristine" && !result.ok;

  const press = () => {
    const why = notReady(flush());
    if (why) return setAnnounce((a) => ({ text: why, n: a.n + 1 }));
    setLastSubmitted(value);
    onSubmit(value);
  };

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          press();
        }}
        className={CODE_CLASSES}
      >
        <CodeLines
          code={c.code}
          gap={
            <input
              aria-label={c.inputLabel ?? "answer"}
              aria-invalid={invalid ? true : undefined}
              value={value}
              placeholder={c.placeholder}
              onChange={(event) => {
                setValue(event.target.value);
                setEdited(true);
              }}
              onBlur={() => edited && flush()}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize={c.upperCase ? "characters" : "off"}
              style={{ width: `${Math.max(8, value.length + 2, (c.placeholder?.length ?? 0) + 2)}ch` }}
              className={`max-w-full rounded border border-dashed border-[var(--accent)] bg-transparent px-2 font-mono text-[var(--accent)] outline-none placeholder:text-[var(--text-muted)] placeholder:normal-case focus:border-solid ${
                c.upperCase ? "uppercase" : ""
              } ${invalid ? "underline decoration-wavy decoration-[var(--accent)]" : ""}`}
            />
          }
        />
      </form>
      <p
        data-testid="live-check"
        aria-live="polite"
        className={`-mt-3 text-xs ${invalid ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
      >
        {liveText(c, result)}
      </p>
      {view.error && (
        <p role="alert" className="text-xs text-[var(--danger-border)]">
          {view.error}
        </p>
      )}
      <div className="flex flex-col gap-4 md:flex-row-reverse md:items-stretch">
        <SubmitRow label={c.submitLabel ?? "[ SUBMIT CODE ]"} reason={reason} announce={announce} onPress={press} />
        {hint}
      </div>
    </>
  );
}
