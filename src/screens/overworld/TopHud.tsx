import { CLASSES, type ClassId } from "../../game/classes";
import { formatTime, phaseOf } from "../../game/clock";
import { MAX_HP } from "../../game/constants";
import { Button } from "../../ui/Button";
import { Hearts } from "../../ui/Hearts";
import { PhaseIcon } from "./PhaseIcon";

export function TopHud({
  hp,
  minutes,
  onMenu,
  onCodex,
  onHelp,
  teamLabel,
  chatUnread = 0,
  reconnecting,
  region,
  playerClass,
  hard = false,
  tide,
  compact = false,
  food,
  onEat,
  onChat,
  className = "",
}: {
  hp: number;
  minutes: number;
  onMenu: () => void;
  onCodex: () => void;
  onHelp: () => void;
  /** Team mode: "ROOM KQZM · 3 online". */
  teamLabel?: string;
  /** Unread team chat; on phones the chat panel can be out of view, so the top bar says so. */
  chatUnread?: number;
  reconnecting?: boolean;
  /** The zone you are in: "C++ Peaks". */
  region: string;
  /** Your hero's class, shown beside the meters. */
  playerClass?: ClassId;
  /** A New Game+ run: the top bar says so. */
  hard?: boolean;
  /** On the Sunny Beach: the tide's name (Low, Rising, High or Falling). */
  tide?: string;
  /** Full-screen map: one slim row (small keys, no class, a Food and a Chat button when given). */
  compact?: boolean;
  /** Compact only: how much food is in the bag, and eating one (the inventory bar is hidden over the full-screen map). */
  food?: number;
  onEat?: () => void;
  /** Compact only: opens the chat over the map. */
  onChat?: () => void;
  className?: string;
}) {
  const key = "px-2 py-1 text-[10px] pointer-coarse:min-h-11";
  return (
    <header
      className={`flex items-center justify-between border-b-2 border-[var(--panel-border)] bg-[var(--bg)] ${compact ? "safe-x flex-nowrap gap-x-2 py-0.5" : "flex-wrap gap-x-4 gap-y-2 px-3 py-2"} ${className}`}
    >
      <div className={`flex items-center ${compact ? "gap-2" : "flex-wrap gap-4"}`}>
        <Hearts value={hp} max={MAX_HP} />
        {playerClass && !compact && <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{`Class: ${CLASSES[playerClass].name}`}</span>}
        {hard && <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--danger-border)]">Hard mode</span>}
      </div>
      <h2 className={`text-center font-bold tracking-widest ${compact ? "truncate text-xs" : "order-first w-full text-sm sm:order-none sm:w-auto"}`}>
        {`REGION: ${region.toUpperCase()}`}
      </h2>
      <div className={`flex items-center ${compact ? "flex-nowrap gap-1.5" : "flex-wrap gap-3"}`}>
        {teamLabel && (
          <span className="text-[10px] font-bold tracking-widest text-[var(--accent)]">
            {teamLabel}
            {chatUnread > 0 && <span className="md:hidden">{` · CHAT ${chatUnread}`}</span>}
          </span>
        )}
        {reconnecting && (
          <span role="status" className="text-[10px] tracking-widest text-[var(--danger-border)]">
            Reconnecting…
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          <PhaseIcon phase={phaseOf(minutes)} />
          <span>{compact ? formatTime(minutes) : `${phaseOf(minutes)} / ${formatTime(minutes)}`}</span>
          {tide && !compact && <span className="text-[var(--primary-border)]">{`· Tide: ${tide}`}</span>}
        </span>
        {compact && onEat && food !== undefined && (
          <Button variant="ghost" disabled={food <= 0} className={key} onClick={onEat}>
            <span aria-hidden="true">{food > 0 ? `Food ×${food}` : "Food —"}</span>
            <span className="sr-only">{food > 0 ? `Eat food (${food} left)` : "No food"}</span>
          </Button>
        )}
        {compact && onChat && (
          <Button variant="ghost" className={key} onClick={onChat}>
            <span aria-hidden="true">{chatUnread > 0 ? `Chat ${chatUnread}` : "Chat"}</span>
            <span className="sr-only">{chatUnread > 0 ? `Chat, ${chatUnread} unread` : "Chat"}</span>
          </Button>
        )}
        {compact ? (
          <>
            <Button variant="ghost" className={key} onClick={onHelp}>
              <span aria-hidden="true">[?]</span>
              <span className="sr-only">Help</span>
            </Button>
            <Button variant="ghost" className={key} onClick={onCodex}>
              <span aria-hidden="true">[C]</span>
              <span className="sr-only">Codex</span>
            </Button>
            <Button variant="ghost" className={key} onClick={onMenu}>
              <span aria-hidden="true">[=]</span>
              <span className="sr-only">Menu</span>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className={key} onClick={onHelp}>
              [?] Help
            </Button>
            <Button variant="ghost" className={`mr-4 ${key}`} onClick={onCodex}>
              [C] Codex
            </Button>
            <Button variant="ghost" className={key} onClick={onMenu}>
              [=] Menu
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
