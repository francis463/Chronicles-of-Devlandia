import { useId } from "react";

/**
 * SUBMIT with its reason line. While a reason stands, SUBMIT is aria-disabled (still focusable and
 * readable); a press re-announces the reason through a fresh status node, so the same words are spoken again.
 */
export function SubmitRow({
  label,
  reason,
  announce,
  onPress,
}: {
  label: string;
  reason: string | null;
  announce: { text: string; n: number };
  onPress: () => void;
}) {
  const reasonId = useId();
  return (
    <div className="flex flex-col gap-2 md:w-80">
      {reason && (
        <p id={reasonId} data-testid="submit-reason" className="text-xs text-[var(--text-muted)]">
          {reason}
        </p>
      )}
      <button
        type="button"
        aria-disabled={reason ? "true" : undefined}
        aria-describedby={reason ? reasonId : undefined}
        onClick={onPress}
        className={`min-h-11 w-full cursor-pointer rounded border-[1.5px] bg-[var(--success)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${
          reason ? "border-dashed border-[var(--bg)]" : "border-[var(--success-border)] hover:brightness-110"
        }`}
      >
        {label}
      </button>
      <span key={announce.n} data-testid="submit-announce" role="status" className="sr-only">
        {announce.text}
      </span>
    </div>
  );
}
