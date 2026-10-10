import { chestPoints } from "../learnPoints";
import { spriteBox } from "../sprites";
import type { ArtPoint, Rect } from "../world";
import { inRect, type Area, type TerrainKind } from "./area";

/** Exactly the river's cold-damage zone (RIVER_ZONE x 24–76 %, y 28–39 %). */
export const ICE_RECT: Rect = { x: 77, y: 50, w: 167, h: 21 };
export const BRIDGE_RECT: Rect = { x: 147, y: 47, w: 26, h: 27 };

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
/** The path from the start west, out through the hedge's gap and on to the village. */
const WEST_PATH: Rect = { x: -1003, y: 127, w: 1096, h: 6 };

/** Art points of the landmarks, the dig spot and the start. */
export const LANDMARK_POINTS = {
  tower: { x: 45, y: 32 },
  chest: { x: 262, y: 32 },
  gate: { x: 160, y: 90 },
  dig: { x: 230, y: 151 },
  start: { x: 90, y: 130 },
} as const;

function terrainAt(x: number, y: number): TerrainKind {
  if (inRect(x, y, ICE_RECT)) return "ice";
  if (y < 16) return "mountains";
  if (y < 83) return "snow";
  if (x >= 186 && y >= 112) return "forest";
  return "meadow";
}

const MOUTH: Rect = { x: 0, y: 112, w: 32, h: 32 };
const p = LANDMARK_POINTS;

export const PEAKS: Area = {
  id: "peaks",
  terrainAt,
  paths: [...PATH_RECTS, WEST_PATH],
  mouth: MOUTH,
  corridor: { x: -1000, y: 112, w: 1000, h: 32 },
  gateBox: spriteBox("gate", p.gate),
  ice: ICE_RECT,
  props: [],
  protected: [
    ICE_RECT,
    BRIDGE_RECT,
    ...PATH_RECTS,
    spriteBox("tower", p.tower),
    spriteBox("chest-closed", p.chest),
    spriteBox("gate", p.gate),
    spriteBox("semicolon", p.dig),
    spriteBox("x-mark", p.dig),
    ...[p.start, p.dig, p.tower, p.chest, p.gate].map((at) => spriteBox("explorer-down", at)),
    MOUTH,
    WEST_PATH,
    ...chestPoints("peaks").map(({ at }) => spriteBox("code-chest", at)),
  ],
};
