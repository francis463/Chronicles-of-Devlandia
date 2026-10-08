import { useEffect, useRef } from "react";
import { HIDDEN_ARTIFACT, POIS } from "../../game/constants";
import { WALL_Y } from "../../game/wall";
import type { Point } from "../../game/types";
import type { Teammate } from "../../hooks/useTeamSession";
import type { Ctx2D } from "../../render/paint";
import { spriteBox } from "../../render/sprites";
import { LANDMARK_POINTS, terrainAt, type TerrainKind } from "../../render/terrain";
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
 * The terrain as flat colours, stretched to the box the way the dots are placed. The north wall is a
 * dark line about 1 CSS px thick on its game line, painted in place of the terrain, with a gap at the gate.
 */
export function paintMiniTerrain(ctx: Ctx2D, width: number, height: number): void {
  const wallTop = Math.round((WALL_Y / 100) * height);
  const wallRows = Math.max(1, Math.round(height / 96));
  const gate = spriteBox("gate", LANDMARK_POINTS.gate);
  for (let y = 0; y < height; y++) {
    const ay = Math.round((y / height) * WORLD.height);
    const onWall = y >= wallTop && y < wallTop + wallRows;
    let start = 0;
    let color = "";
    for (let x = 0; x <= width; x++) {
      const ax = Math.round((x / width) * WORLD.width);
      const atGate = ax >= gate.x && ax < gate.x + gate.w;
      const next = x < width ? (onWall && !atGate ? WALL_COLOR : MINI_COLORS[terrainAt(ax, ay)]) : "";
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

const MINI_W = 112; // w-28
const MINI_H = 96; // h-24

export function MiniMap({
  player,
  artifactFound,
  teammates = [],
  playerColor,
}: {
  player: Point;
  artifactFound: boolean;
  teammates?: Teammate[];
  playerColor?: string;
}) {
  const terrain = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = terrain.current;
    const ctx = canvas?.getContext("2d") as Ctx2D | null | undefined;
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(MINI_W * dpr);
    canvas.height = Math.round(MINI_H * dpr);
    paintMiniTerrain(ctx, canvas.width, canvas.height);
  }, []);
  return (
    <div className="flex gap-3 border-b-2 border-dashed border-[var(--panel-border)] p-3 md:w-36 md:flex-shrink-0 md:flex-col md:border-r-2 md:border-b-0">
      <div
        aria-label="Mini-map"
        role="img"
        className="relative h-24 w-28 flex-shrink-0 overflow-hidden rounded border border-[var(--panel-border)] bg-[var(--bg)]"
      >
        <canvas ref={terrain} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        {POIS.map((poi) => (
          <div
            key={poi.id}
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 border border-[var(--accent)]"
            style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
          />
        ))}
        {artifactFound && (
          <div
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[var(--accent)]"
            style={{ left: `${HIDDEN_ARTIFACT.x}%`, top: `${HIDDEN_ARTIFACT.y}%` }}
          />
        )}
        {teammates.map((t) => (
          <div
            key={t.id}
            data-testid={`minimap-teammate-${t.name}`}
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[250ms] ease-linear"
            style={{ left: `${t.x}%`, top: `${t.y}%`, background: t.color }}
          />
        ))}
        <div
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--success)] transition-all duration-150"
          style={{ left: `${player.x}%`, top: `${player.y}%`, ...(playerColor ? { background: playerColor } : {}) }}
        />
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
