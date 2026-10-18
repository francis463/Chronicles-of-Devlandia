import { inRect, type Area, type TerrainKind } from "./areas/area";
import { PEAKS } from "./areas/peaks";
import { spriteBox, type SpriteId } from "./sprites";
import { SCREEN, grow, intersects, reachableRect, type ArtPoint, type Rect } from "./world";

export type { TerrainKind } from "./areas/area";
export { BRIDGE_RECT, ICE_RECT, LANDMARK_POINTS, PATH, PATH_WIDTH } from "./areas/peaks";

/** The ground under any art pixel of an area, inside the world or in the scenery around it. */
export const terrainAt = (x: number, y: number, area: Area = PEAKS): TerrainKind => area.terrainAt(x, y);

/** Whether an art pixel is on one of an area's dirt paths. */
export const onPath = (x: number, y: number, area: Area = PEAKS): boolean => area.paths.some((r) => inRect(x, y, r));

// ── The north wall ─────────────────────────────────────────────────────────

/** The north wall inside the world: art rows 80–89 (its game line is y 49 %, between rows players stand on). */
export const WALL_RECT: Rect = { x: 0, y: 80, w: SCREEN.width, h: 10 };
const WALL_TILE = 16;
const WALL_FEET = WALL_RECT.y + WALL_RECT.h - 1;

/** Whether a box reaches into the wall's rows, at any x (the wall runs on past the world's edges). */
const touchesWall = (r: Rect) => r.y <= WALL_FEET && r.y + r.h - 1 >= WALL_RECT.y;

/** Art points of the wall tiles whose 16 × 10 boxes intersect `range`: one every 16 px, none over the area's gate. */
export function wallTiles(range: Rect, area: Area = PEAKS): ArtPoint[] {
  if (!area.wall || !touchesWall(range)) return [];
  const tiles: ArtPoint[] = [];
  for (let k = Math.floor(range.x / WALL_TILE); k * WALL_TILE <= range.x + range.w - 1; k++) {
    const at = { x: k * WALL_TILE + WALL_TILE / 2, y: WALL_FEET };
    if (!area.gateBox || !intersects(spriteBox("wall", at), area.gateBox)) tiles.push(at);
  }
  return tiles;
}

/** What decorations inside an area's reachable part must stay clear of. */
export const protectedBoxes = (area: Area = PEAKS): Rect[] => area.protected;

// ── Decorations ─────────────────────────────────────────────────────────────

export type DecorationSprite = Extract<SpriteId, "pine" | "tree" | "rock" | "bush" | "snow-rock" | "cactus" | "palm" | "dry-bush" | "birch" | "stump" | "log" | "mushroom" | "fern" | "flowers" | "skull" | "bloom-cactus" | "arch">;
export type Decoration = { sprite: DecorationSprite; at: ArtPoint };

const CELL = 16;
const SPACING = 24;
/** What the decoration rules need to know about an area's world size, worked out once per area. */
type Geometry = { world: Rect; reach: Rect; lastRow: number; lastCol: number };
const geometries = new WeakMap<Area, Geometry>();
function geometry(area: Area): Geometry {
  let g = geometries.get(area);
  if (!g) {
    const { width, height } = area.world;
    g = { world: { x: 0, y: 0, w: width, h: height }, reach: reachableRect(area.world), lastRow: Math.floor((height - 1) / CELL), lastCol: Math.floor((width - 1) / CELL) };
    geometries.set(area, g);
  }
  return g;
}

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

/** The edge of the walkable area: a hedge of bushes (or rocks in the snow) just outside it, open at the exit. */
function barrier(cx: number, cy: number, r: number[], area: Area): Candidate | "gap" | null {
  const bushOrRock = (at: ArtPoint): Candidate | "gap" => {
    const ground = area.terrainAt(at.x, at.y);
    const sprite = ground === "snow" ? "snow-rock" : ground === "sea" || ground === "beach" || r[3] >= 0.75 ? "rock" : ground === "dune" ? "dry-bush" : "bush";
    return area.mouths.some((m) => intersects(spriteBox(sprite, at), m)) ? "gap" : { sprite, at, priority: 0, interior: false };
  };
  const { lastRow, lastCol } = geometry(area);
  if (cy === lastRow && cx >= 0 && cx <= lastCol) return bushOrRock({ x: cx * CELL + 8, y: area.world.height - 1 });
  if (cy >= 1 && cy < lastRow && cx === 0) return bushOrRock({ x: 10, y: cy * CELL + 15 });
  if (cy >= 1 && cy < lastRow && cx === lastCol) return bushOrRock({ x: area.world.width - 9, y: cy * CELL + 15 });
  return null;
}

/** One possible decoration per cell, before the spacing rule. */
function candidate(cx: number, cy: number, area: Area): Candidate | null {
  const r = rolls(cx, cy);
  const edge = barrier(cx, cy, r, area);
  if (edge === "gap") return null;
  if (edge) return edge;
  const at = { x: cx * CELL + 2 + Math.floor(r[0] * 12), y: cy * CELL + 2 + Math.floor(r[1] * 12) };
  const ground = area.terrainAt(at.x, at.y);
  const { world: worldRect, reach } = geometry(area);
  const inWorld = inRect(at.x, at.y, worldRect);
  const pick = (options: Array<[DecorationSprite, number]>): DecorationSprite | null => {
    let acc = 0;
    for (const [sprite, p] of options) if (r[2] < (acc += p)) return sprite;
    return null;
  };

  if (!inWorld) {
    // Scenery around the world: dense trees to the sides and below, scattered rocks above.
    // Out at sea there is only the odd reef rock, never a tree.
    // The dunes, woods and sand thin out away from the world, so the scenery fades into open sand instead of walling the view in.
    const away = Math.max(worldRect.x - at.x, 0, at.x - (worldRect.x + worldRect.w), worldRect.y - at.y, 0, at.y - (worldRect.y + worldRect.h));
    const density = area.world.width > 320 && (ground === "dune" || ground === "forest" || ground === "beach") ? Math.max(0.25, 0.8 - Math.max(0, away - 48) * 0.006) : 0.8;
    const sprite = ground === "sea" ? pick([["rock", 0.2]]) : ground === "mountains" ? pick([["snow-rock", 0.3]]) : pick([[ground === "snow" ? "pine" : ground === "dune" ? (r[3] < 0.5 ? "cactus" : "dry-bush") : ground === "beach" ? (r[3] < 0.2 ? "palm" : "rock") : ground === "forest" && r[3] < 0.3 ? "birch" : "tree", density]]);
    if (!sprite) return null;
    const box = spriteBox(sprite, at);
    if (intersects(box, worldRect) || area.corridors.some((c) => intersects(box, c))) return null;
    return { sprite, at, priority: r[4], interior: false };
  }
  if (ground === "mountains") {
    const sprite = pick([["snow-rock", 0.4]]);
    if (!sprite || intersects(spriteBox(sprite, at), grow(reach, 1))) return null;
    return { sprite, at, priority: r[4], interior: false };
  }
  const options: Record<Exclude<TerrainKind, "mountains">, Array<[DecorationSprite, number]>> = {
    snow: [["pine", 0.55], ["snow-rock", 0.15]],
    meadow: [["flowers", 0.1], ["bush", 0.08], ["tree", 0.07], ["mushroom", 0.03], ["stump", 0.02]],
    forest: [["tree", 0.5], ["birch", 0.18], ["bush", 0.07], ["fern", 0.1], ["mushroom", 0.04], ["stump", 0.04], ["log", 0.04]],
    ice: [],
    sand: [],
    sea: [],
    floor: [],
    beach: [["palm", 0.05], ["rock", 0.03]],
    dune: [["cactus", 0.12], ["bloom-cactus", 0.05], ["dry-bush", 0.14], ["rock", 0.07], ["skull", 0.03], ["arch", 0.02], ["palm", 0.03]],
  };
  const sprite = pick(options[ground]);
  if (!sprite) return null;
  const box = spriteBox(sprite, at);
  const r0 = reach;
  const insideWalls = box.x >= r0.x && box.x + box.w <= r0.x + r0.w && at.y < r0.y + r0.h;
  if (!insideWalls || (area.wall && touchesWall(grow(box, 4))) || area.protected.some((p) => intersects(grow(box, 4), p))) return null;
  return { sprite, at, priority: r[4], interior: true };
}

const memos = new WeakMap<Area, Map<string, Decoration | null>>();

/** The decoration of a cell: interior ones give way to a higher-priority neighbour closer than SPACING. */
function decorationAt(cx: number, cy: number, area: Area): Decoration | null {
  let memo = memos.get(area);
  if (!memo) memos.set(area, (memo = new Map()));
  const key = `${cx},${cy}`;
  if (memo.has(key)) return memo.get(key)!;
  const mine = candidate(cx, cy, area);
  let result: Decoration | null = mine && { sprite: mine.sprite, at: mine.at };
  if (mine?.interior) {
    for (let dy = -2; dy <= 2 && result; dy++)
      for (let dx = -2; dx <= 2 && result; dx++) {
        if (!dx && !dy) continue;
        const other = candidate(cx + dx, cy + dy, area);
        if (!other?.interior) continue;
        const close = Math.hypot(other.at.x - mine.at.x, other.at.y - mine.at.y) < SPACING;
        if (close && (other.priority < mine.priority || (other.priority === mine.priority && (dy < 0 || (!dy && dx < 0))))) result = null;
      }
  }
  memo.set(key, result);
  return result;
}

/** Decorations of every 16 × 16 cell the range touches in an area; the same cell always gives the same result. */
export function decorations(range: Rect, area: Area = PEAKS): Decoration[] {
  // Indoors there is no scenery, no hedge and nothing beyond the walls (the room draws its own walls as props).
  if (area.id === "lodge") return [];
  const out: Decoration[] = [];
  for (let cy = Math.floor(range.y / CELL); cy <= Math.floor((range.y + range.h - 1) / CELL); cy++)
    for (let cx = Math.floor(range.x / CELL); cx <= Math.floor((range.x + range.w - 1) / CELL); cx++) {
      const d = decorationAt(cx, cy, area);
      if (d) out.push(d);
    }
  return out;
}
