import { formatTime, phaseOf } from "../../game/clock";
import { MAX_HP, MAX_STAMINA } from "../../game/constants";
import { Button } from "../../ui/Button";
import { Meter } from "../../ui/Meter";

export function TopHud({
  hp,
  stamina,
  minutes,
  onMenu,
  teamLabel,
  reconnecting,
  region,
}: {
  hp: number;
  stamina: number;
  minutes: number;
  onMenu: () => void;
  /** Team mode: "ROOM KQZM · 3 online". */
  teamLabel?: string;
  reconnecting?: boolean;
  /** The zone you are in: "C++ Peaks". */
  region: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-[var(--panel-border)] bg-[var(--bg)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-4">
        <Meter label="HP" value={hp} max={MAX_HP} tone="accent" />
        <Meter label="STA" value={stamina} max={MAX_STAMINA} tone="primary" />
      </div>
      <h2 className="order-first w-full text-center text-sm font-bold tracking-widest sm:order-none sm:w-auto">
        {`REGION: ${region.toUpperCase()}`}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        {teamLabel && <span className="text-[10px] font-bold tracking-widest text-[var(--accent)]">{teamLabel}</span>}
        {reconnecting && (
          <span role="status" className="text-[10px] tracking-widest text-[var(--danger-border)]">
            Reconnecting…
          </span>
        )}
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          {`${phaseOf(minutes)} / ${formatTime(minutes)}`}
        </span>
        <Button variant="ghost" className="px-2 py-1 text-[10px]" onClick={onMenu}>
          [=] Menu
        </Button>
      </div>
    </header>
  );
}
