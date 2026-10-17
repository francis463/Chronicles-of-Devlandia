import { spriteBox } from "../sprites";
import { HERMIT, HIDDEN_ARTIFACT, ISLAND_DOCK, ISLAND_FIRE, LIGHTHOUSE, RUINS } from "../../game/constants";
import { REACHABLE_RECT, toArt, type Rect } from "../world";
import { inRect, type Area, type Prop, type TerrainKind } from "./area";

/** Foggaten Island's places in art px (the game's ISLAND_DOCK, LIGHTHOUSE, HERMIT, ISLAND_FIRE and RUINS). */
export const FOGGATEN_POINTS = {
  dock: toArt(ISLAND_DOCK),
  lighthouse: toArt(LIGHTHOUSE),
  hermit: toArt(HERMIT),
  fire: toArt(ISLAND_FIRE),
  ruins: toArt(RUINS),
  /** The Golden Semicolon's dig spot, in the south-east. */
  dig: toArt(HIDDEN_ARTIFACT),
} as const;

/** The lamp room's centre: the lit lighthouse's glow and beam start here. */
export const LAMP_POINT = { x: spriteBox("lighthouse", FOGGATEN_POINTS.lighthouse).x + 11, y: spriteBox("lighthouse", FOGGATEN_POINTS.lighthouse).y + 9 } as const;

const PROPS: Prop[] = [
  { sprite: "dock", at: FOGGATEN_POINTS.dock },
  { sprite: "lighthouse", at: FOGGATEN_POINTS.lighthouse },
  { sprite: "ruins", at: FOGGATEN_POINTS.ruins },
  { sprite: "campfire", at: FOGGATEN_POINTS.fire },
  { sprite: "explorer-down", at: FOGGATEN_POINTS.hermit, variant: "#6b7f6a" },
];

/** The sand path from the dock east along the shore road, then north to the lighthouse door. */
const PATHS: Rect[] = [
  { x: 26, y: 122, w: 140, h: 6 },
  { x: 157, y: FOGGATEN_POINTS.lighthouse.y + 1, w: 6, h: 122 - FOGGATEN_POINTS.lighthouse.y },
  // East along the shore road, then south to the dig corner.
  { x: 160, y: 122, w: 122, h: 6 },
  { x: 273, y: 122, w: 6, h: 26 },
];

/** Two wooded patches inland, so there is something to walk around. */
const WOODS: Rect[] = [
  { x: 60, y: 30, w: 50, h: 40 },
  { x: 200, y: 120, w: 70, h: 35 },
];
const SHORE_WIDTH = 7;

/** Land everywhere you can stand: sand at the water's edge, meadow and wood inland, sea only beyond the walkable rect. */
function terrainAt(x: number, y: number): TerrainKind {
  const r = REACHABLE_RECT;
  if (!inRect(x, y, r)) return "sea";
  if (x < r.x + SHORE_WIDTH || x >= r.x + r.w - SHORE_WIDTH || y < r.y + SHORE_WIDTH || y >= r.y + r.h - SHORE_WIDTH) return "sand";
  return WOODS.some((w) => inRect(x, y, w)) ? "forest" : "meadow";
}

export const FOGGATEN: Area = {
  id: "foggaten",
  wall: false,
  terrainAt,
  paths: PATHS,
  mouths: [],
  corridors: [],
  gateBox: null,
  ice: null,
  props: PROPS,
  protected: [...PATHS, ...PROPS.map((prop) => spriteBox(prop.sprite, prop.at)), spriteBox("x-mark", FOGGATEN_POINTS.dig), spriteBox("semicolon", FOGGATEN_POINTS.dig)],
};
