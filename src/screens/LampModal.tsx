import { useState } from "react";
import { LAMP_HINT, PUZZLE_HINT_LOCKED } from "../game/constants";
import { bits8ToBinary, bits8ToDecimal, type Bits8 } from "../game/lamp";
import type { Bit } from "../game/logic";
import { Button } from "../ui/Button";
import { TerminalDialog } from "../ui/TerminalDialog";

const SWITCHES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const OFF: Bits8 = [0, 0, 0, 0, 0, 0, 0, 0];

export function LampModal({
  error,
  hintRevealed,
  onSubmit,
  onClose,
  onRevealHint,
  onReset,
}: {
  error: string | null;
  hintRevealed: boolean;
  onSubmit: (bits: Bits8) => void;
  onClose: () => void;
  onRevealHint: () => void;
  /** Clears the lock's error; the switches and the last run reset here. */
  onReset: () => void;
}) {
  const [bits, setBits] = useState<Bits8>(OFF);
  // Outputs are shown for the last run only while the switches still match it.
  const [lastRun, setLastRun] = useState<Bits8 | null>(null);
  const staleRun = lastRun !== null && bits8ToBinary(lastRun) !== bits8ToBinary(bits);

  const toggle = (i: number) =>
    setBits((current) => current.map((b, j) => (j === i ? ((b ^ 1) as Bit) : b)) as Bits8);

  const run = () => {
    setLastRun(bits);
    onSubmit(bits);
  };

  const reset = () => {
    setBits(OFF);
    setLastRun(null);
    onReset();
  };

  return (
    <TerminalDialog title="< LIGHTHOUSE: LAMP LOCK >" onClose={onClose}>
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-bold">LOCK INSTRUCTIONS:</span>
        <p className="text-[var(--text-muted)]">Make the lamp send the letter H</p>
        <p className="text-[var(--text-muted)]">Flip the switches, then run the lamp. Each switch is one bit of a number, 128 on the left down to 1 on the right.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div role="group" aria-label="Lamp switches" className="flex flex-wrap gap-2">
          {SWITCHES.map((n, i) => (
            <button
              key={n}
              type="button"
              role="switch"
              aria-checked={bits[i] === 1}
              aria-label={`Switch ${n}`}
              data-autofocus={i === 0 ? true : undefined}
              onClick={() => toggle(i)}
              className={`min-h-11 min-w-16 cursor-pointer rounded border-2 px-2 font-mono text-sm font-bold tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${
                bits[i] === 1
                  ? "border-[var(--accent-border)] bg-[var(--accent)] text-[var(--bg)]"
                  : "border-[var(--panel-border)] bg-[var(--editor-bg)] text-[var(--text)]"
              }`}
            >
              {`[${n}: ${bits[i]}]`}
            </button>
          ))}
        </div>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          {`${bits8ToBinary(bits)} (binary) = ${bits8ToDecimal(bits)} (decimal)`}
        </p>
      </div>

      {error && !staleRun && (
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
          <p className="mt-2 text-xs">{hintRevealed ? LAMP_HINT : PUZZLE_HINT_LOCKED}</p>
        </section>
        <div className="flex flex-col gap-2 md:w-80">
          <Button variant="success" className="w-full py-3" onClick={run}>
            [ RUN LAMP ]
          </Button>
          <Button variant="neutral" className="w-full py-3" onClick={reset}>
            [ RESET ]
          </Button>
          <Button variant="neutral" className="w-full py-3" onClick={onRevealHint}>
            [ USE HINT ITEM ]
          </Button>
        </div>
      </div>
    </TerminalDialog>
  );
}
