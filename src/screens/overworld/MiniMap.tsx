import { useEffect, useRef, type ReactNode } from "react";
import { ADA, HIDDEN_ARTIFACT, POIS, SIGNPOST } from "../../game/constants";
import { WALL_Y } from "../../game/wall";
import type { Poi, Point } from "../../game/types";
import type { ZoneId } from "../../game/zones";
import type { Teammate } from "../../hooks/useTeamSession";
import { AREAS } from "../../render/areas";
import type { Ctx2D } from "../../render/paint";
import { terrainAt, type TerrainKind } from "../../render/terrain";
import { WORLD } from "../../render/world";

export const MINI_COLORS: Record<TerrainKind, string> = {
  ice: "#7cc4e8",
  mountains: "#64748b",
  snow: "#e2e8f0",
  forest: "#24452a",
  meadow: "#3f7d3a",
};

const WALL_COLOR = "#1e293b";

/**
 * A zone's terrain as flat colours, stretched to the box the way the dots are placed. The north wall
 * is a dark line about 1 CSS px thick on its game line, painted in place of the terrain, with a gap at
 * the gate where the zone has one.
 */
export function paintMiniTerrain(ctx: Ctx2D, width: number, height: number, zone: ZoneId = "peaks"): void {
  const area = AREAS[zone];
  const wallTop = Math.round((WALL_Y / 100) * height);
  const wallRows = Math.max(1, Math.round(height / 96));
  const gate = area.gateBox;
  for (let y = 0; y < height; y++) {
    const ay = Math.round((y / height) * WORLD.height);
    const onWall = y >= wallTop && y < wallTop + wallRows;
    let start = 0;
    let color = "";
    for (let x = 0; x <= width; x++) {
      const ax = Math.round((x / width) * WORLD.width);
      const atGate = !!gate && ax >= gate.x && ax < gate.x + gate.w;
      const next = x < width ? (onWall && !atGate ? WALL_COLOR : MINI_COLORS[terrainAt(ax, ay, area)]) : "";
      if (next !== color) {
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(start, y, x - start, 1);
        }
        start = x;
        color = next;
      }
    }
  }
}

const CELL_W = 96; // w-24
const CELL_H = 54;
/** The world map, west to east. */
const CELLS: Array<{ zone: ZoneId; left: number; places: Poi[] }> = [
  { zone: "village", left: 0, places: [ADA, SIGNPOST] },
  { zone: "peaks", left: CELL_W, places: POIS },
];

const at = (p: Point) => ({ left: `${p.x}%`, top: `${p.y}%` });

function MiniCell({ zone, left, current, children }: { zone: ZoneId; left: number; current: boolean; children: ReactNode }) {
  const terrain = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = terrain.current;
    const ctx = canvas?.getContext("2d") as Ctx2D | null | undefined;
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CELL_W * dpr);
    canvas.height = Math.round(CELL_H * dpr);
    paintMiniTerrain(ctx, canvas.width, canvas.height, zone);
  }, [zone]);
  return (
    <div data-testid={`minimap-cell-${zone}`} data-current={current ? "true" : undefined} className="absolute top-0 h-[54px] w-24" style={{ left }}>
      <canvas ref={terrain} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {/* An overlay, not the cell's own shadow: the opaque canvas would paint over that. */}
      {current && <div aria-hidden="true" data-testid="minimap-current" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_var(--accent)]" />}
      {children}
    </div>
  );
}

export function MiniMap({
  zone,
  player,
  artifactFound,
  teammates = [],
  playerColor,
  className = "",
}: {
  zone: ZoneId;
  player: Point;
  artifactFound: boolean;
  teammates?: Teammate[];
  playerColor?: string;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 border-b-2 border-dashed border-[var(--panel-border)] p-3 md:flex-shrink-0 md:flex-col md:border-r-2 md:border-b-0 ${className}`}>
      <div
        aria-label="Mini-map"
        role="img"
        className="relative h-14 w-[194px] flex-shrink-0 overflow-hidden rounded border border-[var(--panel-border)] bg-[var(--bg)]"
      >
        {CELLS.map((cell) => (
          <MiniCell key={cell.zone} zone={cell.zone} left={cell.left} current={cell.zone === zone}>
            {cell.places.map((poi) => (
              <div key={poi.id} className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 border border-[var(--accent)]" style={at(poi)} />
            ))}
            {cell.zone === "peaks" && artifactFound && (
              <div className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[var(--accent)]" style={at(HIDDEN_ARTIFACT)} />
            )}
            {teammates
              .filter((t) => t.zone === cell.zone)
              .map((t) => (
                <div
                  key={t.id}
                  data-testid={`minimap-teammate-${t.name}`}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[250ms] ease-linear"
                  style={{ ...at(t), background: t.color }}
                />
              ))}
            {cell.zone === zone && (
              <div
                data-testid="minimap-player"
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--success)] transition-all duration-150"
                style={{ ...at(player), ...(playerColor ? { background: playerColor } : {}) }}
              />
            )}
          </MiniCell>
        ))}
      </div>
      <div className="flex flex-col justify-center gap-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        <span className="font-bold text-[var(--text)]">Controls</span>
        <span className="pointer-coarse:hidden">Move: WASD / Arrows</span>
        <span className="pointer-coarse:hidden">Interact: [E]</span>
        <span className="hidden pointer-coarse:inline">Move: D-pad</span>
        <span className="hidden pointer-coarse:inline">Interact: [E] button</span>
      </div>
    </div>
  );
}
