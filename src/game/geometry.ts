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

export function nearestPoi(p: Point): { poi: Poi; distance: number } {
  return POIS.map((poi) => ({ poi, distance: distance(p, poi) })).reduce((best, next) =>
    next.distance < best.distance ? next : best,
  );
}

export function poiInRange(p: Point): Poi | null {
  const nearest = nearestPoi(p);
  return nearest.distance <= INTERACT_RADIUS ? nearest.poi : null;
}

export function isInRiver(p: Point): boolean {
  return (
    p.x >= RIVER_ZONE.minX && p.x <= RIVER_ZONE.maxX && p.y >= RIVER_ZONE.minY && p.y <= RIVER_ZONE.maxY
  );
}
