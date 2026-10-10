import { TerminalDialog } from "../../ui/TerminalDialog";
import { Button } from "../../ui/Button";

/** Asked before [=] Menu throws away a game with progress. Play pauses while it is open; Esc means STAY. */
export function LeaveConfirm({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <TerminalDialog title="< LEAVE GAME? >" onClose={onStay}>
      <div
        className="flex flex-col gap-4"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onStay();
          }
        }}
      >
        <p className="text-xs">Leave this game? Badges and unlocks aren't saved yet.</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-autofocus
            onClick={onStay}
            className="min-h-11 cursor-pointer rounded border-[1.5px] border-[var(--success-border)] bg-[var(--success)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--bg)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)]"
          >
            [ STAY ]
          </button>
          <Button variant="danger" className="min-h-11" onClick={onLeave}>
            [ LEAVE ]
          </Button>
        </div>
      </div>
    </TerminalDialog>
  );
}
