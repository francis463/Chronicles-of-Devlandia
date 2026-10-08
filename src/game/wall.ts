import type { Point } from "./types";

/**
 * The north wall runs across the whole map at this y (game %). Players stand on even coordinates
 * only, so no one ever stands on the line itself: north is y < 49, south is y > 49.
 */
export const WALL_Y = 49;

/** The archway between the gate's posts (art x 149–168): players pass at x 48, 50 or 52. */
export const GATE_OPENING = { minX: 47, maxX: 53 } as const;

/** Why a step into the wall is refused: the gate is still locked, or the wall is solid there. */
export type WallBlock = "locked" | "solid";

export const isNorthOfWall = (p: Point): boolean => p.y < WALL_Y;

/** A step crosses the wall when it changes side. Steps are axis-aligned, so a crossing keeps its x. */
export const crossesWall = (from: Point, to: Point): boolean => isNorthOfWall(from) !== isNorthOfWall(to);

/** Whether the wall stops this step: only crossings are ever blocked, and an open gate lets them through its opening. */
export function wallBlock(from: Point, to: Point, gateOpen: boolean): WallBlock | null {
  if (!crossesWall(from, to)) return null;
  if (!gateOpen) return "locked";
  return from.x >= GATE_OPENING.minX && from.x <= GATE_OPENING.maxX ? null : "solid";
}
