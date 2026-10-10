import { useState } from "react";
import { LOGIC_HINT, PUZZLE_HINT_LOCKED } from "../game/constants";
import { bitsToBinary, bitsToDecimal, CIRCUIT, type Bit, type Bits } from "../game/logic";
import { Button } from "../ui/Button";
import { TerminalDialog } from "../ui/TerminalDialog";

const NAMES = ["A", "B", "C", "D"] as const;

export function LogicModal({
  error,
  hintRevealed,
  onSubmit,
  onClose,
  onRevealHint,
  onReset,
}: {
  error: string | null;
  hintRevealed: boolean;
  onSubmit: (bits: Bits) => void;
  onClose: () => void;
  onRevealHint: () => void;
  /** Clears the lock's error; the switches and the last run reset here. */
  onReset: () => void;
}) {
  const [bits, setBits] = useState<Bits>([0, 0, 0, 0]);
  // Outputs are shown for the last run only while the switches still match it.
  const [lastRun, setLastRun] = useState<Bits | null>(null);
  const showOutputs = lastRun !== null && bitsToBinary(lastRun) === bitsToBinary(bits);
  const staleRun = lastRun !== null && !showOutputs;

  const toggle = (i: number) =>
    setBits((current) => current.map((b, j) => (j === i ? ((b ^ 1) as Bit) : b)) as Bits);

  const run = () => {
    setLastRun(bits);
    onSubmit(bits);
  };

  const reset = () => {
    setBits([0, 0, 0, 0]);
    setLastRun(null);
    onReset();
  };

  return (
    <TerminalDialog title="< SIGNAL TOWER: LOGIC LOCK >" onClose={onClose}>
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-bold">LOCK INSTRUCTIONS:</span>
        <p className="text-[var(--text-muted)]">
          Flip the switches, then run the circuit. The tower powers on when every line outputs 1.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border-2 border-[var(--panel-border)] bg-[var(--editor-bg)] p-4 font-mono text-[13px] leading-7 whitespace-pre text-[var(--code)]">
        <div>1 | // Power the tower: every line must output 1</div>
        {CIRCUIT.map((line) => (
          <div key={line.expr}>
            {`${line.line} | ${line.expr.padEnd(8)} →  `}
            <span data-testid={`output-${line.expr}`} className="text-[var(--accent)]">
              {showOutputs ? line.output(lastRun!) : "?"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div role="group" aria-label="Circuit switches" className="flex flex-wrap gap-2">
          {NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              role="switch"
              aria-checked={bits[i] === 1}
              aria-label={`Switch ${name}`}
              data-autofocus={i === 0 ? true : undefined}
              onClick={() => toggle(i)}
              className={`min-h-11 min-w-20 cursor-pointer rounded border-2 px-3 font-mono text-sm font-bold tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${
                bits[i] === 1
                  ? "border-[var(--accent-border)] bg-[var(--accent)] text-[var(--bg)]"
                  : "border-[var(--panel-border)] bg-[var(--editor-bg)] text-[var(--text)]"
              }`}
            >
              {`[${name}: ${bits[i]}]`}
            </button>
          ))}
        </div>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          {`ABCD = ${bitsToBinary(bits)} (binary) = ${bitsToDecimal(bits)} (decimal)`}
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
          <p className="mt-2 text-xs">{hintRevealed ? LOGIC_HINT : PUZZLE_HINT_LOCKED}</p>
        </section>
        <div className="flex flex-col gap-2 md:w-80">
          <Button variant="success" className="w-full py-3" onClick={run}>
            [ RUN CIRCUIT ]
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
