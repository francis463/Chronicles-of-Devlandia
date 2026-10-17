import { START_MINUTES } from "../game/constants";
import { CHESTS } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { TerminalDialog } from "../ui/TerminalDialog";

const BUTTON =
  "min-h-11 cursor-pointer rounded border-[1.5px] px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)]";
const CONFETTI = ["#fbbf24", "#f87171", "#60a5fa", "#4ade80", "#c084fc"];

/** "3 h 20 min" of game time played, from the clock's start. */
export function playedFor(minutes: number): string {
  const played = Math.max(0, Math.round(minutes - START_MINUTES));
  return played < 60 ? `${played} min` : `${Math.floor(played / 60)} h ${played % 60} min`;
}

/**
 * The Master of Devlandia finale, when every badge is earned: confetti, your badges, how long it took and how many hints you used.
 * New Game+ starts a harder run (hidden in team games, and in a run that is already hard it just says so).
 */
export function Finale({
  badges,
  minutes,
  hints,
  hard,
  onClose,
  onNewGamePlus,
}: {
  badges: readonly ChestId[];
  minutes: number;
  hints: number;
  hard: boolean;
  onClose: () => void;
  /** Absent in team games, where a run is shared. */
  onNewGamePlus?: () => void;
}) {
  return (
    <TerminalDialog title="< MASTER OF DEVLANDIA >" onClose={onClose}>
      <div className="relative flex flex-col gap-3 text-xs">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-2 h-0 motion-reduce:hidden">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="absolute block h-2 w-1"
              style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animation: `confetti-fall ${1.6 + (i % 5) * 0.3}s ease-in ${(i % 7) * 0.12}s both` }}
            />
          ))}
        </div>
        <h3 className="text-center text-sm font-bold text-[var(--accent)]">{hard ? "★ You mastered the hard run! ★" : "★ You are a Master of Devlandia! ★"}</h3>
        <p>{`All ${CHESTS.length} badges are yours${hard ? ", on hard mode" : ""}. Ada has lit fireworks over the village, and your explorer wears a golden crown.`}</p>
        <ul aria-label="Your badges" className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {CHESTS.map((c) => (
            <li key={c.id} className={badges.includes(c.id) ? "text-[var(--success-border)]" : "text-[var(--text-muted)]"}>
              {`${badges.includes(c.id) ? "✓" : "·"} ${c.badge}`}
            </li>
          ))}
        </ul>
        <p>{`Game time: ${playedFor(minutes)} · Hints used: ${hints}`}</p>
        {onNewGamePlus && !hard && (
          <p className="rounded border-[1.5px] border-dashed border-[var(--primary-border)] px-3 py-2">
            <span className="font-bold text-[var(--primary-border)]">New Game+: </span>
            a fresh run where each chest asks one of its harder questions and every wrong answer costs 10 HP. Your saved badges stay safe.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-autofocus onClick={onClose} className={`${BUTTON} border-[var(--primary-border)] text-[var(--primary-border)]`}>
            [ Keep exploring ]
          </button>
          {onNewGamePlus && !hard && (
            <button type="button" onClick={onNewGamePlus} className={`${BUTTON} border-[var(--accent-border)] text-[var(--accent)]`}>
              [ NEW GAME+ ]
            </button>
          )}
        </div>
      </div>
    </TerminalDialog>
  );
}
