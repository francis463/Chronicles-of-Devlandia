import { useLayoutEffect, useRef, useState } from "react";
import { phaseOf } from "../../game/clock";
import { INSPECT_COPY, POIS } from "../../game/constants";
import { poiInRange } from "../../game/geometry";
import type { PoiId, Point } from "../../game/types";
import { Button } from "../../ui/Button";
import { Panel } from "../../ui/Panel";
import { labelLayout, type LabelPlacement, type LabelSide, type MapSize } from "./labelLayout";

const PHASE_TINT = {
  Night: "rgba(20,20,28,0.25)",
  Dusk: "rgba(40,40,32,0.12)",
  Day: "transparent",
};

const at = (p: Point) => ({ left: `${p.x}%`, top: `${p.y}%` });

// Map labels near the right edge slide inward instead of being clipped: centred on
// their point while there is room, never closer to the edge than half their width.
const CACHE_POSITION = { left: "min(82%, calc(100% - 92px))", top: "18%" };
const PROMPT_HALF_WIDTH = 104;

const LABEL_SIDE_CLASS: Record<LabelSide, string> = {
  right: "top-1/2 left-full ml-2 -translate-y-1/2",
  left: "top-1/2 right-full mr-2 -translate-y-1/2",
  above: "bottom-full left-1/2 mb-2",
  below: "top-full left-1/2 mt-2",
};

// A zero-size anchor at the game coordinate: the dot is centred on it and the
// label hangs beside the dot on the side labelLayout picked, so the dot is drawn
// exactly where the game thinks it is and the two labels never cover each other.
// Markers are decoration, so they let clicks through to the map buttons beneath.
function Marker({
  testId,
  at: point,
  label,
  placement,
  dotClass,
  labelClass,
  layerClass,
}: {
  testId: string;
  at: Point;
  label: string;
  placement: LabelPlacement;
  dotClass: string;
  labelClass: string;
  layerClass: string;
}) {
  const vertical = placement.side === "above" || placement.side === "below";
  return (
    <div data-testid={testId} className={`pointer-events-none absolute transition-all ${layerClass}`} style={at(point)}>
      <span className={`absolute top-0 left-0 block -translate-x-1/2 -translate-y-1/2 rounded-full ${dotClass}`}>
        <span
          className={`absolute ${LABEL_SIDE_CLASS[placement.side]} text-[10px] uppercase tracking-widest whitespace-nowrap ${labelClass}`}
          style={vertical ? { transform: `translateX(calc(-50% + ${placement.shift}px))` } : undefined}
        >
          {label}
        </span>
      </span>
    </div>
  );
}

/** Tracks the map's rendered size; falls back to a typical size where ResizeObserver is missing. */
function useMapSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<MapSize>({ width: 600, height: 360 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

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
  const [mapRef, mapSize] = useMapSize();
  const labels = labelLayout(player, drone, mapSize);
  const inRange = downed ? null : poiInRange(player);
  const inspectedPoi = POIS.find((poi) => poi.id === inspected);
  const copy = inspected ? INSPECT_COPY[inspected] : null;
  const inspectCopy = !copy
    ? null
    : (hasLoot && copy.looted) || (gateUnlocked && copy.bridged) || copy.default;

  return (
    <div ref={mapRef} className="relative min-h-[360px] flex-1 overflow-hidden bg-[var(--panel)]">
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
        <Button
          variant="accent"
          disabled={downed}
          className="px-3 py-1.5 whitespace-nowrap"
          onClick={() => onInteract("gate")}
        >
          [G] Gate
        </Button>
      </div>

      <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={CACHE_POSITION}>
        <Button
          variant="ghost"
          disabled={downed}
          className="px-2 py-1 whitespace-nowrap text-[var(--accent)]"
          onClick={() => onInteract("chest")}
        >
          {hasLoot ? "[X] Empty Cache" : "[X] Supply Cache"}
        </Button>
      </div>

      <span className="absolute right-6 bottom-6 rounded border border-dashed border-[var(--panel-border)] px-2 py-1 text-[10px] uppercase tracking-widest whitespace-nowrap text-[var(--text-muted)]">
        (Dense Forests Biome)
      </span>

      <Marker
        testId="drone"
        at={drone}
        label="[AI Drone]"
        placement={labels.drone}
        dotClass="h-3 w-3 bg-[var(--primary-border)]"
        labelClass="text-[var(--primary-border)]"
        layerClass="z-20 duration-300"
      />
      <Marker
        testId="player"
        at={player}
        label="[Player]"
        placement={labels.player}
        dotClass="h-5 w-5 bg-[var(--success)] ring-2 ring-[var(--success-border)]"
        labelClass="text-[var(--text)]"
        layerClass="z-30 duration-150"
      />

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

      {inRange && (
        <div
          className="pointer-events-none absolute z-40 -translate-x-1/2 rounded border border-[var(--accent)] bg-[var(--bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-[var(--accent)]"
          style={{
            left: `clamp(${PROMPT_HALF_WIDTH}px, ${player.x}%, calc(100% - ${PROMPT_HALF_WIDTH}px))`,
            top: `${Math.max(3, player.y - 12)}%`,
          }}
        >
          {`[E] Inspect ${inRange.label}`}
        </div>
      )}

      {inspectedPoi && inspectCopy && (
        <section aria-label="POI Inspection" className="absolute bottom-3 left-3 z-40 w-60 max-w-[calc(100%-1.5rem)]">
          <Panel label="POI Inspection" className="p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">{inspectedPoi.label}</span>
              <p className="text-xs text-[var(--text-muted)]">{inspectCopy}</p>
              <Button variant="ghost" disabled={downed} className="py-1" onClick={onCloseInspection}>
                [X] Close
              </Button>
            </div>
          </Panel>
        </section>
      )}

      {downed && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[rgba(15,23,42,0.85)]">
          <span className="text-lg font-bold tracking-widest text-[var(--danger-border)]">DOWNED</span>
          <Button variant="danger" autoFocus onClick={onRespawn}>
            [ Respawn ]
          </Button>
        </div>
      )}
    </div>
  );
}
