import { useLayoutEffect, useRef } from "react";
import type { BlankMode } from "../../learn/types";

const SHAPE =
  "min-h-11 cursor-pointer rounded border-[1.5px] px-3 py-2 text-xs font-bold uppercase tracking-widest hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";
// One colour set per button: Tailwind orders same-property utilities itself, so layering accent over neutral never shows.
const NEUTRAL = "border-[var(--neutral-border)] bg-[var(--neutral)] text-[var(--text)]";
const PRESSED = "border-[var(--accent-border)] bg-[var(--accent)] text-[var(--bg)]";
const TOOL = `${SHAPE} ${NEUTRAL}`;

/** Undo, Reset and (on code blanks) the Type | Blocks toggle. A focused button that becomes unavailable hands focus to the blank. */
export function Toolbar({
  canUndo,
  canReset,
  onUndo,
  onReset,
  focusBlank,
  mode,
  onMode,
}: {
  canUndo: boolean;
  canReset: boolean;
  onUndo: () => void;
  onReset: () => void;
  focusBlank: () => void;
  mode?: BlankMode;
  onMode?: (mode: BlankMode) => void;
}) {
  const undoRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const focused = document.activeElement;
    if ((!canUndo && focused === undoRef.current) || (!canReset && focused === resetRef.current)) focusBlank();
  }, [canUndo, canReset, focusBlank]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button ref={undoRef} type="button" disabled={!canUndo} onClick={onUndo} className={TOOL}>
        [ UNDO ]
      </button>
      <button ref={resetRef} type="button" disabled={!canReset} onClick={onReset} className={TOOL}>
        [ RESET ]
      </button>
      {mode && onMode && (
        <div role="group" aria-label="Answer mode" className="ml-auto flex">
          {(["type", "blocks"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => onMode(m)}
              className={`${SHAPE} ${mode === m ? PRESSED : NEUTRAL}`}
            >
              {m === "type" ? "Type" : "Blocks"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
