import { useState } from "react";
import { PUZZLE_HINT, PUZZLE_HINT_LOCKED } from "../game/constants";
import { Button } from "../ui/Button";
import { TerminalDialog } from "../ui/TerminalDialog";

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

  return (
    <TerminalDialog title="< TERMINAL GATE LOCK: C++ PEAKS >" onClose={onClose}>
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-bold">PUZZLE INSTRUCTIONS:</span>
        <p className="text-[var(--text-muted)]">
          Fix the CSS styling property below to open the north gate.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(value);
        }}
        className="overflow-x-auto rounded-md border-2 border-[var(--panel-border)] bg-[var(--editor-bg)] p-4 font-mono text-[13px] leading-7 whitespace-pre text-[var(--code)]"
      >
        <div>1 | .north-gate {"{"}</div>
        <div>{"2 |     width: 100%;"}</div>
        <div className="flex items-center">
          <span>{"3 |     display: "}</span>
          <input
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
    </TerminalDialog>
  );
}
