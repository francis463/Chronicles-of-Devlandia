import { spriteBox, type SpriteId } from "./sprites";
import { REACHABLE_RECT, WORLD, grow, intersects, type ArtPoint, type Rect } from "./world";

export type TerrainKind = "ice" | "mountains" | "snow" | "forest" | "meadow";

/** Exactly the river's cold-damage zone (RIVER_ZONE x 24–76 %, y 28–39 %). */
export const ICE_RECT: Rect = { x: 77, y: 50, w: 167, h: 21 };
export const BRIDGE_RECT: Rect = { x: 147, y: 47, w: 26, h: 27 };

const inRect = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** The ground under any art pixel, inside the world or in the scenery around it. */
export function terrainAt(x: number, y: number): TerrainKind {
  if (inRect(x, y, ICE_RECT)) return "ice";
  if (y < 16) return "mountains";
  if (y < 83) return "snow";
  if (x >= 186 && y >= 112) return "forest";
  return "meadow";
}

/** The dirt path from the start up to just under the gate. */
export const PATH: ArtPoint[] = [
  { x: 90, y: 130 },
  { x: 90, y: 100 },
  { x: 160, y: 100 },
  { x: 160, y: 92 },
];
export const PATH_WIDTH = 6;
const PATH_RECTS: Rect[] = PATH.slice(1).map((b, i) => {
  const a = PATH[i];
  const half = PATH_WIDTH / 2;
  return { x: Math.min(a.x, b.x) - half, y: Math.min(a.y, b.y) - half, w: Math.abs(b.x - a.x) + PATH_WIDTH, h: Math.abs(b.y - a.y) + PATH_WIDTH };
});
export const onPath = (x: number, y: number): boolean => PATH_RECTS.some((r) => inRect(x, y, r));

/** Art points of the landmarks, the dig spot and the start. */
export const LANDMARK_POINTS = {
  tower: { x: 45, y: 32 },
  chest: { x: 262, y: 32 },
  gate: { x: 160, y: 90 },
  dig: { x: 230, y: 151 },
  start: { x: 90, y: 130 },
} as const;

// ── The north wall ─────────────────────────────────────────────────────────

/** The north wall inside the world: art rows 80–89 (its game line is y 49 %, between rows players stand on). */
export const WALL_RECT: Rect = { x: 0, y: 80, w: WORLD.width, h: 10 };
const WALL_TILE = 16;
const WALL_FEET = WALL_RECT.y + WALL_RECT.h - 1;

/** Whether a box reaches into the wall's rows, at any x (the wall runs on past the world's edges). */
const touchesWall = (r: Rect) => r.y <= WALL_FEET && r.y + r.h - 1 >= WALL_RECT.y;

/** Art points of the wall tiles whose 16 × 10 boxes intersect `range`: one every 16 px, none over the gate. */
export function wallTiles(range: Rect): ArtPoint[] {
  if (!touchesWall(range)) return [];
  const gate = spriteBox("gate", LANDMARK_POINTS.gate);
  const tiles: ArtPoint[] = [];
  for (let k = Math.floor(range.x / WALL_TILE); k * WALL_TILE <= range.x + range.w - 1; k++) {
    const at = { x: k * WALL_TILE + WALL_TILE / 2, y: WALL_FEET };
    if (!intersects(spriteBox("wall", at), gate)) tiles.push(at);
  }
  return tiles;
}

/** What decorations inside the reachable area must stay clear of. */
export function protectedBoxes(): Rect[] {
  const p = LANDMARK_POINTS;
  return [
    ICE_RECT,
    BRIDGE_RECT,
    ...PATH_RECTS,
    spriteBox("tower", p.tower),
    spriteBox("chest-closed", p.chest),
    spriteBox("gate", p.gate),
    spriteBox("semicolon", p.dig),
    spriteBox("x-mark", p.dig),
    ...[p.start, p.dig, p.tower, p.chest, p.gate].map((at) => spriteBox("explorer-down", at)),
  ];
}

// ── Decorations ─────────────────────────────────────────────────────────────

export type DecorationSprite = Extract<SpriteId, "pine" | "tree" | "rock" | "bush" | "snow-rock">;
export type Decoration = { sprite: DecorationSprite; at: ArtPoint };

const CELL = 16;
const SPACING = 24;
const WORLD_RECT: Rect = { x: 0, y: 0, w: WORLD.width, h: WORLD.height };
const LAST_ROW = Math.floor((WORLD.height - 1) / CELL); // the cell row holding the bottom hedge
const LAST_COL = Math.floor((WORLD.width - 1) / CELL);

/** mulberry32: four deterministic numbers in [0, 1) for a cell. */
function rolls(cx: number, cy: number): number[] {
  let a = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0;
  return Array.from({ length: 5 }, () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}

type Candidate = Decoration & { priority: number; interior: boolean };

/** The edge of the walkable area: a hedge of bushes (or rocks in the snow) just outside it. */
function barrier(cx: number, cy: number, r: number[]): Candidate | null {
  const bushOrRock = (at: ArtPoint): Candidate => ({
    sprite: terrainAt(at.x, at.y) === "snow" ? "snow-rock" : r[3] < 0.75 ? "bush" : "rock",
    at,
    priority: 0,
    interior: false,
  });
  if (cy === LAST_ROW && cx >= 0 && cx <= LAST_COL) return bushOrRock({ x: cx * CELL + 8, y: WORLD.height - 1 });
  if (cy >= 1 && cy < LAST_ROW && cx === 0) return bushOrRock({ x: 10, y: cy * CELL + 15 });
  if (cy >= 1 && cy < LAST_ROW && cx === LAST_COL) return bushOrRock({ x: WORLD.width - 9, y: cy * CELL + 15 });
  return null;
}

/** One possible decoration per cell, before the spacing rule. */
function candidate(cx: number, cy: number): Candidate | null {
  const r = rolls(cx, cy);
  const edge = barrier(cx, cy, r);
  if (edge) return edge;
  const at = { x: cx * CELL + 2 + Math.floor(r[0] * 12), y: cy * CELL + 2 + Math.floor(r[1] * 12) };
  const ground = terrainAt(at.x, at.y);
  const inWorld = inRect(at.x, at.y, WORLD_RECT);
  const pick = (options: Array<[DecorationSprite, number]>): DecorationSprite | null => {
    let acc = 0;
    for (const [sprite, p] of options) if (r[2] < (acc += p)) return sprite;
    return null;
  };

  if (!inWorld) {
    // Scenery around the world: dense trees to the sides and below, scattered rocks above.
    const sprite = ground === "mountains" ? pick([["snow-rock", 0.3]]) : pick([[ground === "snow" ? "pine" : "tree", 0.8]]);
    if (!sprite || intersects(spriteBox(sprite, at), WORLD_RECT)) return null;
    return { sprite, at, priority: r[4], interior: false };
  }
  if (ground === "mountains") {
    const sprite = pick([["snow-rock", 0.4]]);
    if (!sprite || intersects(spriteBox(sprite, at), grow(REACHABLE_RECT, 1))) return null;
    return { sprite, at, priority: r[4], interior: false };
  }
  const options: Record<Exclude<TerrainKind, "mountains">, Array<[DecorationSprite, number]>> = {
    snow: [["pine", 0.35], ["snow-rock", 0.15]],
    meadow: [["bush", 0.15], ["tree", 0.12]],
    forest: [["tree", 0.6], ["bush", 0.1]],
    ice: [],
  };
  const sprite = pick(options[ground]);
  if (!sprite) return null;
  const box = spriteBox(sprite, at);
  const r0 = REACHABLE_RECT;
  const insideWalls = box.x >= r0.x && box.x + box.w <= r0.x + r0.w && at.y < r0.y + r0.h;
  guarded ??= protectedBoxes();
  if (!insideWalls || touchesWall(grow(box, 4)) || guarded.some((p) => intersects(grow(box, 4), p))) return null;
  return { sprite, at, priority: r[4], interior: true };
}

const memo = new Map<string, Decoration | null>();
let guarded: Rect[] | null = null;

/** The decoration of a cell: interior ones give way to a higher-priority neighbour closer than SPACING. */
function decorationAt(cx: number, cy: number): Decoration | null {
  const key = `${cx},${cy}`;
  if (memo.has(key)) return memo.get(key)!;
  const mine = candidate(cx, cy);
  let result: Decoration | null = mine && { sprite: mine.sprite, at: mine.at };
  if (mine?.interior) {
    for (let dy = -2; dy <= 2 && result; dy++)
      for (let dx = -2; dx <= 2 && result; dx++) {
        if (!dx && !dy) continue;
        const other = candidate(cx + dx, cy + dy);
        if (!other?.interior) continue;
        const close = Math.hypot(other.at.x - mine.at.x, other.at.y - mine.at.y) < SPACING;
        if (close && (other.priority < mine.priority || (other.priority === mine.priority && (dy < 0 || (!dy && dx < 0))))) result = null;
      }
  }
  memo.set(key, result);
  return result;
}

/** Decorations of every 16 × 16 cell the range touches; the same cell always gives the same result. */
export function decorations(range: Rect): Decoration[] {
  const out: Decoration[] = [];
  for (let cy = Math.floor(range.y / CELL); cy <= Math.floor((range.y + range.h - 1) / CELL); cy++)
    for (let cx = Math.floor(range.x / CELL); cx <= Math.floor((range.x + range.w - 1) / CELL); cx++) {
      const d = decorationAt(cx, cy);
      if (d) out.push(d);
    }
  return out;
}
