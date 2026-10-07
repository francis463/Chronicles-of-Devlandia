import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { PUZZLE_HINT, PUZZLE_HINT_LOCKED } from "../game/constants";
import { Button } from "../ui/Button";

const FOCUSABLE = "button:not([disabled]), input:not([disabled])";

export function TerminalModal({
  error,
  hintRevealed,
  onSubmit,
  onClose,
  onRevealHint,
}: {
  error: string | null;
  hintRevealed: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
  onRevealHint: () => void;
}) {
  const [value, setValue] = useState("none");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,23,42,0.7)] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
        className="max-h-full w-full max-w-4xl overflow-auto rounded-md border-2 border-[var(--accent)] bg-[var(--panel)]"
      >
        <header className="flex items-center justify-between gap-2 bg-[var(--accent)] px-3 py-2 text-[var(--bg)]">
          <h2 id={titleId} className="text-sm font-bold tracking-widest">
            {"< TERMINAL GATE LOCK: C++ PEAKS >"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-2 py-1 text-sm font-bold tracking-widest whitespace-nowrap hover:bg-[var(--accent-border)] focus-visible:outline-2 focus-visible:outline-[var(--bg)]"
          >
            [X] CLOSE
          </button>
        </header>

        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold">PUZZLE INSTRUCTIONS:</span>
            <p className="text-[var(--text-muted)]">
              Fix the CSS styling property below to reveal the missing bridge path.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(value);
            }}
            className="overflow-x-auto rounded-md border-2 border-[var(--panel-border)] bg-[var(--editor-bg)] p-4 font-mono text-[13px] leading-7 whitespace-pre text-[var(--code)]"
          >
            <div>1 | .frozen-bridge {"{"}</div>
            <div>{"2 |     width: 100%;"}</div>
            <div className="flex items-center">
              <span>{"3 |     display: "}</span>
              <input
                ref={inputRef}
                aria-label="display value"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                className="w-24 rounded border border-dashed border-[var(--accent)] bg-transparent px-2 text-center font-mono text-[var(--accent)] outline-none focus:border-solid"
              />
              <span>{";  <-- TYPE CORRECT VALUE HERE"}</span>
            </div>
            <div>4 | {"}"}</div>
          </form>

          {error && (
            <p role="alert" className="text-xs text-[var(--danger-border)]">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
            <section
              aria-label="AI drone hint"
              className="flex-1 rounded-md border-2 border-[var(--primary-border)] bg-[var(--panel)] p-4"
            >
              <h3 className="text-sm text-[var(--primary-border)]">SMART AI DRONE DIAGNOSTIC HINT:</h3>
              <p className="mt-2 text-xs">{hintRevealed ? PUZZLE_HINT : PUZZLE_HINT_LOCKED}</p>
            </section>
            <div className="flex flex-col gap-2 md:w-80">
              <Button variant="success" className="w-full py-3" onClick={() => onSubmit(value)}>
                [ SUBMIT CODE ]
              </Button>
              <Button variant="neutral" className="w-full py-3" onClick={onRevealHint}>
                [ USE HINT ITEM ]
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
