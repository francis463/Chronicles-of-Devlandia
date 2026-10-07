import { phaseOf } from "../../game/clock";
import { INSPECT_COPY, INTERACT_RADIUS, POIS } from "../../game/constants";
import { nearestPoi } from "../../game/geometry";
import type { PoiId, Point } from "../../game/types";
import { Button } from "../../ui/Button";
import { Panel } from "../../ui/Panel";

const PHASE_TINT = {
  Night: "rgba(20,20,28,0.25)",
  Dusk: "rgba(40,40,32,0.12)",
  Day: "transparent",
};

const at = (p: Point) => ({ left: `${p.x}%`, top: `${p.y}%` });

export function MapViewport({
  player,
  drone,
  minutes,
  inspected,
  hasLoot,
  gateUnlocked,
  downed,
  onInteract,
  onCloseInspection,
  onRespawn,
}: {
  player: Point;
  drone: Point;
  minutes: number;
  inspected: PoiId | null;
  hasLoot: boolean;
  gateUnlocked: boolean;
  downed: boolean;
  onInteract: (poi: PoiId) => void;
  onCloseInspection: () => void;
  onRespawn: () => void;
}) {
  const nearest = nearestPoi(player);
  const canInteract = !downed && nearest.distance <= INTERACT_RADIUS;
  const inspectedPoi = POIS.find((poi) => poi.id === inspected);
  const inspectCopy = inspected
    ? inspected === "chest" && hasLoot
      ? INSPECT_COPY.chest.looted
      : INSPECT_COPY[inspected].default
    : null;

  return (
    <div className="relative min-h-[360px] flex-1 overflow-hidden bg-[var(--panel)]">
      <span className="absolute top-4 left-1/3 -translate-x-1/2 rounded border border-dashed border-[var(--panel-border)] px-2 py-1 text-[10px] uppercase tracking-widest whitespace-nowrap text-[var(--text-muted)]">
        (Snowy Peaks Biome)
      </span>

      <div
        className={`absolute top-1/3 right-1/4 left-1/4 flex justify-center border-t-8 ${gateUnlocked ? "border-solid border-[var(--primary-border)]" : "border-dashed border-[var(--primary)]"}`}
      >
        <span className="-mt-6 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          {gateUnlocked ? "Bridge" : "Frozen River"}
        </span>
      </div>

      <div className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <Button variant="accent" className="px-3 py-1.5 whitespace-nowrap" onClick={() => onInteract("gate")}>
          [G] Gate
        </Button>
      </div>

      <div className="absolute top-[18%] left-[82%] z-20 -translate-x-1/2 -translate-y-1/2">
        <Button variant="ghost" className="px-2 py-1 whitespace-nowrap text-[var(--accent)]" onClick={() => onInteract("chest")}>
          {hasLoot ? "[X] Empty Cache" : "[X] Supply Cache"}
        </Button>
      </div>

      <span className="absolute right-6 bottom-6 rounded border border-dashed border-[var(--panel-border)] px-2 py-1 text-[10px] uppercase tracking-widest whitespace-nowrap text-[var(--text-muted)]">
        (Dense Forests Biome)
      </span>

      <div
        data-testid="drone"
        className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 transition-all duration-300"
        style={at(drone)}
      >
        <span className="h-3 w-3 rounded-full bg-[var(--primary-border)]" />
        <span className="text-[10px] uppercase tracking-widest whitespace-nowrap text-[var(--primary-border)]">
          [AI Drone]
        </span>
      </div>

      <div
        data-testid="player"
        className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 transition-all duration-150"
        style={at(player)}
      >
        <span className="h-5 w-5 rounded-full bg-[var(--success)] ring-2 ring-[var(--success-border)]" />
        <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">[Player]</span>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10 transition-colors duration-700"
        style={{ background: PHASE_TINT[phaseOf(minutes)] }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `radial-gradient(circle at ${player.x}% ${player.y}%, transparent 0%, transparent 15%, rgba(15,23,42,0.35) 32%, rgba(15,23,42,0.7) 62%)`,
        }}
      />

      {canInteract && (
        <div
          className="absolute z-40 -translate-x-1/2 rounded border border-[var(--accent)] bg-[var(--bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-[var(--accent)]"
          style={{ left: `${player.x}%`, top: `${Math.max(3, player.y - 12)}%` }}
        >
          {`[E] Inspect ${nearest.poi.label}`}
        </div>
      )}

      {inspectedPoi && inspectCopy && (
        <section aria-label="POI Inspection" className="absolute bottom-3 left-3 z-40 w-60 max-w-[calc(100%-1.5rem)]">
          <Panel label="POI Inspection" className="p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">{inspectedPoi.label}</span>
              <p className="text-xs text-[var(--text-muted)]">{inspectCopy}</p>
              <Button variant="ghost" className="py-1" onClick={onCloseInspection}>
                [X] Close
              </Button>
            </div>
          </Panel>
        </section>
      )}

      {downed && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[rgba(15,23,42,0.85)]">
          <span className="text-lg font-bold tracking-widest text-[var(--danger-border)]">DOWNED</span>
          <Button variant="danger" onClick={onRespawn}>
            [ Respawn ]
          </Button>
        </div>
      )}
    </div>
  );
}
