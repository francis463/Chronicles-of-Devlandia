import { CHESTS } from "../learn/chests";
import { BOUNDS, INTERACT_RADIUS, POIS, RIVER_ZONE } from "./constants";
import type { GameState, Poi, Point } from "./types";

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

const VERBS: Partial<Record<Poi["id"], string>> = {
  artifact: "Dig here",
  villager: "Talk to Ada",
  signpost: "Read Signpost",
  ranger: "Talk to Ranger",
  "forest-signpost": "Read Signpost",
  terminal: "Use Syntax Terminal",
};

const chestVerb = (s: GameState, id: string, badge: string) =>
  `${s.badges.some((b) => b === id) ? "Review" : "Open"} ${badge} Chest`;

/** The action [E] takes at a place in this state, or null for a landmark you inspect. */
function verbFor(s: GameState, poi: Poi): string | null {
  const chest = CHESTS.find((c) => c.id === poi.id);
  if (chest) return chestVerb(s, chest.id, chest.badge);
  if (poi.id === "archive") return s.archiveOpen ? chestVerb(s, "chest-cs", "C#") : "Unseal Archive";
  return VERBS[poi.id] ?? null;
}

/** What pressing [E] does at a place, as the touch button shows it. */
export const interactLabel = (s: GameState, poi: Poi): string => verbFor(s, poi) ?? poi.label;

/** The map's [E] prompt: the place's action, or "Inspect <label>" for the landmarks. */
export const promptText = (s: GameState, poi: Poi): string => `[E] ${verbFor(s, poi) ?? `Inspect ${poi.label}`}`;

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
