import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ChallengeView } from "../../game/challenges";
import { checkBlank } from "../../learn/check";
import { order } from "../../learn/shuffle";
import type { BlankChallenge, BlankMode, CheckResult } from "../../learn/types";
import { BlockTray, SLOT_ATTR } from "./BlockTray";
import { SubmitRow } from "./SubmitRow";
import { Toolbar } from "./Toolbar";
import { useLiveCheck } from "./useLiveCheck";
import { useUndo } from "./useUndo";

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
 * A blank: the code with an input in the gap (Type) or a slot and tiles (Blocks), the live check, the toolbar,
 * the error line and an honest SUBMIT. `hint` is the drone panel, laid out beside SUBMIT.
 */
export function BlankBody({
  challenge: c,
  view,
  mode,
  onModeChange,
  onSubmit,
  hint,
}: {
  challenge: BlankChallenge;
  view: ChallengeView;
  mode: BlankMode;
  onModeChange: (mode: BlankMode) => void;
  onSubmit: (value: string) => void;
  hint: ReactNode;
}) {
  // The cipher and the keypad have no tiles: they stay in Type mode whatever the toggle says.
  const blocks = c.blocks ? mode === "blocks" : false;
  const kind: BlankMode = blocks ? "blocks" : "type";
  const history = useUndo(c.start ?? "");
  const value = history.value;
  const [edited, setEdited] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [announce, setAnnounce] = useState({ text: "", n: 0 });
  const { result, flush } = useLiveCheck(c, value, kind, edited);
  const input = useRef<HTMLInputElement>(null);
  const slot = useRef<HTMLButtonElement>(null);
  const tiles = useMemo(() => (c.blocks ? order(c.blocks.length, view.seed, c.id).map((i) => c.blocks![i]) : []), [c, view.seed]);

  // A mode switch ends a run of typing, so the next keystrokes are their own Undo step.
  const { breakRun } = history;
  useEffect(() => breakRun(), [kind, breakRun]);

  const change = (next: string, typing = false) => {
    history.set(next, { typing });
    setEdited(true);
  };
  const step = (action: () => void) => {
    action();
    setEdited(true);
  };
  const focusBlank = useCallback(() => (slot.current ?? input.current)?.focus(), []);

  const notReady = (check: CheckResult) =>
    !check.ok ? check.reason : view.error !== null && value === lastSubmitted ? CHANGE_ANSWER : null;
  const reason = notReady(checkBlank(c, value, kind));
  const invalid = result !== "pristine" && !result.ok;

  const press = () => {
    const why = notReady(flush());
    if (why) return setAnnounce((a) => ({ text: why, n: a.n + 1 }));
    setLastSubmitted(value);
    onSubmit(value);
  };

  const gap = blocks ? (
    <button
      ref={slot}
      type="button"
      data-testid="block-slot"
      {...{ [SLOT_ATTR]: "" }}
      aria-label={`${c.inputLabel ?? "answer"}: ${value || "empty"}`}
      aria-invalid={invalid ? true : undefined}
      onClick={() => value && change("")}
      className="min-h-11 min-w-16 cursor-pointer rounded border border-dashed border-[var(--accent)] bg-transparent px-2 font-mono text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--primary-border)]"
    >
      {value || "___"}
    </button>
  ) : (
    <input
      ref={input}
      aria-label={c.inputLabel ?? "answer"}
      aria-invalid={invalid ? true : undefined}
      value={value}
      placeholder={c.placeholder}
      onChange={(event) => change(event.target.value, true)}
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
  );

  return (
    <div
      className="flex flex-col gap-5"
      onKeyDown={(event) => {
        // Ctrl/Cmd+Z is Undo anywhere in the terminal except the text box, which keeps the browser's own undo.
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && event.target !== input.current) {
          event.preventDefault();
          step(history.undo);
        }
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          press();
        }}
        className={CODE_CLASSES}
      >
        <CodeLines code={c.code} gap={gap} />
      </form>
      {blocks && <BlockTray tiles={tiles} onPlace={(tile) => change(tile)} />}
      <p
        data-testid="live-check"
        aria-live="polite"
        className={`-mt-3 text-xs ${invalid ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
      >
        {liveText(c, result)}
      </p>
      <Toolbar
        canUndo={history.canUndo}
        canReset={history.canReset}
        onUndo={() => step(history.undo)}
        onReset={() => step(history.reset)}
        focusBlank={focusBlank}
        mode={c.blocks ? kind : undefined}
        onMode={c.blocks ? onModeChange : undefined}
      />
      {view.error && (
        // A fresh node per wrong try, so the same words are announced again.
        <p key={view.wrongTries} role="alert" className="text-xs text-[var(--danger-border)]">
          {view.error}
        </p>
      )}
      <div className="flex flex-col gap-4 md:flex-row-reverse md:items-stretch">
        <SubmitRow label={c.submitLabel ?? "[ SUBMIT CODE ]"} reason={reason} announce={announce} onPress={press} />
        {hint}
      </div>
    </div>
  );
}
