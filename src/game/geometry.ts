import { BOUNDS, INTERACT_RADIUS, POIS, RIVER_ZONE } from "./constants";
import type { Poi, Point } from "./types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clampPlayer(p: Point): Point {
  return {
    x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, p.x)),
    y: Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, p.y)),
  };
}

export function nearestPoi(p: Point, extra: Poi[] = []): { poi: Poi; distance: number } {
  return [...POIS, ...extra].map((poi) => ({ poi, distance: distance(p, poi) })).reduce((best, next) =>
    next.distance < best.distance ? next : best,
  );
}

/** What pressing [E] does at a point of interest, as shown on prompts and the touch button. */
export const interactLabel = (poi: Poi) => (poi.id === "artifact" ? "Dig here" : poi.label);

/** The nearest point of interest within reach; `extra` adds revealed hidden points (the dig spot). */
export function poiInRange(p: Point, extra: Poi[] = []): Poi | null {
  const nearest = nearestPoi(p, extra);
  return nearest.distance <= INTERACT_RADIUS ? nearest.poi : null;
}

export function isInRiver(p: Point): boolean {
  return (
    p.x >= RIVER_ZONE.minX && p.x <= RIVER_ZONE.maxX && p.y >= RIVER_ZONE.minY && p.y <= RIVER_ZONE.maxY
  );
}
