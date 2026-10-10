import { useEffect, useRef } from "react";
import type { ChallengeView } from "../game/challenges";
import type { BlankMode, Challenge, SubmitValue } from "../learn/types";
import { TerminalDialog } from "../ui/TerminalDialog";
import { BlankBody, CODE_CLASSES, CodeLines } from "./challenge/BlankBody";
import { HintPanel } from "./challenge/HintPanel";

export type { ChallengeView };

function SuccessView({
  challenge,
  success,
  continueRef,
  onClose,
}: {
  challenge: Challenge;
  success: NonNullable<ChallengeView["success"]>;
  continueRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const code = challenge.kind === "match" ? undefined : challenge.code;
  return (
    <>
      {code && (
        <div className={CODE_CLASSES}>
          <CodeLines code={code} gap={"answer" in success ? <span className="text-[var(--accent)]">{success.answer}</span> : undefined} />
        </div>
      )}
      {"code" in success ? (
        <div role="status" aria-label={`ACCESS CODE: ${success.code.split("").join(" ")}`} className="text-2xl font-bold tracking-widest text-[var(--accent)]">
          {`ACCESS CODE: ${success.code}`}
        </div>
      ) : (
        <div role="status" aria-label={success.spoken} className="text-sm font-bold tracking-widest text-[var(--success-border)]">
          {success.line}
        </div>
      )}
      <p className="text-xs text-[var(--text-muted)]">{success.explain}</p>
      <button
        ref={continueRef}
        type="button"
        data-autofocus
        onClick={onClose}
        className="min-h-11 cursor-pointer rounded border-[1.5px] border-[var(--success-border)] bg-[var(--success)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--bg)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] md:self-end md:w-80"
      >
        [ CONTINUE ]
      </button>
    </>
  );
}

/** Every challenge's terminal: the gate, the cipher, the keypad, the Matcher and the chests. */
export function ChallengeTerminal({
  challenge,
  view,
  mode,
  onSubmit,
  onRevealHint,
  onClose,
}: {
  challenge: Challenge;
  view: ChallengeView;
  mode: BlankMode;
  onModeChange: (mode: BlankMode) => void;
  onSubmit: (value: SubmitValue) => void;
  onRevealHint: () => void;
  onClose: () => void;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const shown = useRef(view.success !== null);
  // Solving in place swaps the input for the success view: move focus to [ CONTINUE ] (opening solved is the dialog's job).
  useEffect(() => {
    if (view.success && !shown.current) continueRef.current?.focus();
    shown.current = view.success !== null;
  }, [view.success]);

  const hint = <HintPanel hint={challenge.hint} revealed={view.hintRevealed} wrongTries={view.wrongTries} onReveal={onRevealHint} />;
  const label = challenge.kind === "blank" ? (challenge.instructionsLabel ?? "PUZZLE INSTRUCTIONS:") : "PUZZLE INSTRUCTIONS:";

  return (
    <TerminalDialog title={challenge.title} onClose={onClose}>
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-bold">{label}</span>
        <p className="text-[var(--text-muted)]">{challenge.prompt}</p>
        {view.yourCode && <p className="font-bold text-[var(--accent)]">{`Your code: ${view.yourCode}`}</p>}
      </div>
      {view.success ? (
        <SuccessView challenge={challenge} success={view.success} continueRef={continueRef} onClose={onClose} />
      ) : challenge.kind === "blank" ? (
        <BlankBody challenge={challenge} view={view} mode={mode} onSubmit={onSubmit} hint={hint} />
      ) : (
        hint
      )}
    </TerminalDialog>
  );
}
