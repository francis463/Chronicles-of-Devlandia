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

const VERBS: Partial<Record<Poi["id"], string>> = { artifact: "Dig here", villager: "Talk to Ada", signpost: "Read Signpost" };

/** What pressing [E] does at a point of interest, as shown on prompts and the touch button. */
export const interactLabel = (poi: Poi) => VERBS[poi.id] ?? poi.label;

/** The map's [E] prompt: the action for places with a verb, "Inspect <label>" for the landmarks. */
export const promptText = (poi: Poi): string => `[E] ${VERBS[poi.id] ?? `Inspect ${poi.label}`}`;

/** The nearest point of interest within reach; `extra` adds revealed hidden points (the dig spot). */
export function poiInRange(p: Point, extra: Poi[] = []): Poi | null {
  const nearest = nearestPoi(p, extra);
  return nearest.distance <= INTERACT_RADIUS ? nearest.poi : null;
}

/** The nearest of `places` within reach (earlier entries win ties), or null; also null for no places. */
export function placeInReach(p: Point, places: Poi[]): Poi | null {
  let best: { poi: Poi; distance: number } | null = null;
  for (const poi of places) {
    const d = distance(p, poi);
    if (!best || d < best.distance) best = { poi, distance: d };
  }
  return best && best.distance <= INTERACT_RADIUS ? best.poi : null;
}

export function isInRiver(p: Point): boolean {
  return (
    p.x >= RIVER_ZONE.minX && p.x <= RIVER_ZONE.maxX && p.y >= RIVER_ZONE.minY && p.y <= RIVER_ZONE.maxY
  );
}
