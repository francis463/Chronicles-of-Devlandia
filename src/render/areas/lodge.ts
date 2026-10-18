import { LODGE_FIREPLACE } from "../../game/lodge";
import { spriteBox } from "../sprites";
import { zoneToArt, zoneWorld, type ArtPoint } from "../world";
import type { Area, Prop, TerrainKind } from "./area";

const WORLD_SIZE = zoneWorld("lodge");

/** The room's fixtures in art px; the shelf is where the HTML chest stands (its game place). */
export const LODGE_POINTS = {
  fireplace: zoneToArt(LODGE_FIREPLACE, "lodge"),
  shelf: zoneToArt({ x: 66, y: 46 }, "lodge"),
  table: zoneToArt({ x: 62, y: 62 }, "lodge"),
  bunkHigh: zoneToArt({ x: 80, y: 30 }, "lodge"),
  bunkLow: zoneToArt({ x: 82, y: 52 }, "lodge"),
  keeper: zoneToArt({ x: 38, y: 52 }, "lodge"),
  rug: zoneToArt({ x: 46, y: 74 }, "lodge"),
  mat: zoneToArt({ x: 50, y: 88 }, "lodge"),
} as const;

/** Log walls round the room: a row along the top and the bottom and a column down each side, one 16 px tile each. */
const wall = (x: number, feetY: number): Prop => ({ sprite: "lodge-wall", at: { x, y: feetY } });
const WALLS: Prop[] = [
  ...Array.from({ length: 20 }, (_, i) => wall(8 + i * 16, 16)),
  ...Array.from({ length: 18 }, (_, i) => wall(24 + i * 16, 179)),
  ...Array.from({ length: 10 }, (_, i) => wall(8, 32 + i * 16)),
  ...Array.from({ length: 10 }, (_, i) => wall(312, 32 + i * 16)),
];

const FURNITURE: Prop[] = [
  { sprite: "fireplace", at: LODGE_POINTS.fireplace },
  { sprite: "shelf", at: LODGE_POINTS.shelf },
  { sprite: "table", at: LODGE_POINTS.table },
  { sprite: "bunk", at: LODGE_POINTS.bunkHigh },
  { sprite: "bunk", at: LODGE_POINTS.bunkLow },
  { sprite: "explorer-down", at: LODGE_POINTS.keeper, variant: "#b45309" },
];

/** Flat floor things the scene draws under everyone: the rug and the door mat you walk onto to leave. */
export const LODGE_FLAT: ReadonlyArray<{ sprite: "rug" | "door-mat"; at: ArtPoint }> = [
  { sprite: "rug", at: LODGE_POINTS.rug },
  { sprite: "door-mat", at: LODGE_POINTS.mat },
];

const PROPS: Prop[] = [...FURNITURE, ...WALLS];

/** Wooden floor everywhere inside the walls. */
const terrainAt = (): TerrainKind => "floor";

export const LODGE: Area = {
  id: "lodge",
  world: WORLD_SIZE,
  wall: false,
  terrainAt,
  paths: [],
  mouths: [],
  corridors: [],
  gateBox: null,
  ice: null,
  props: PROPS,
  protected: PROPS.map((p) => spriteBox(p.sprite, p.at)),
};
