import { spriteBox } from "../sprites";
import { BEACH_PIER, BEACH_SIGNPOST, FISHER, SANDCASTLE_POI, SHIPWRECK } from "../../game/constants";
import { toArt, type Rect } from "../world";
import type { Area, Prop, TerrainKind } from "./area";

/** The beach's places in art px (the game's FISHER, BEACH_PIER, SHIPWRECK and BEACH_SIGNPOST), and the crab's lane along the sand. */
export const BEACH_POINTS = {
  fisher: toArt(FISHER),
  sandcastle: toArt(SANDCASTLE_POI),
  pier: toArt(BEACH_PIER),
  shipwreck: toArt(SHIPWRECK),
  signpost: toArt(BEACH_SIGNPOST),
  crabLane: { x: 0, y: 160 },
} as const;

/** Shells scattered on the sand: decoration only, nothing keeps clear of them. */
export const BEACH_SHELLS: ReadonlyArray<{ x: number; y: number }> = [{ x: 100, y: 150 }, { x: 205, y: 166 }, { x: 60, y: 134 }, { x: 270, y: 140 }];

/** Shells that only the low tide uncovers, on the strip the water leaves bare. */
export const TIDE_SHELLS: ReadonlyArray<{ x: number; y: number }> = [{ x: 297, y: 58 }, { x: 296, y: 96 }, { x: 298, y: 134 }];

const PROPS: Prop[] = [
  { sprite: "shipwreck", at: BEACH_POINTS.shipwreck },
  { sprite: "pier", at: BEACH_POINTS.pier },
  { sprite: "signpost", at: BEACH_POINTS.signpost },
  { sprite: "explorer-down", at: BEACH_POINTS.fisher, variant: "#0e7490" },
  { sprite: "umbrella", at: { x: 150, y: 100 } },
  { sprite: "umbrella", at: { x: 170, y: 104 } },
  { sprite: "sandcastle", at: BEACH_POINTS.sandcastle },
  { sprite: "boat", at: { x: 230, y: 150 } },
  { sprite: "palm", at: { x: 110, y: 72 } },
  { sprite: "palm", at: { x: 250, y: 80 } },
];

/** Sand everywhere except the sea past the walkable area's east and north edges. */
function terrainAt(x: number, y: number): TerrainKind {
  return x >= 303 || y < 10 ? "sea" : "beach";
}

/** The west exit: a gap in the left edge (game rows 62–78) and the open ground beyond it. */
const MOUTH: Rect = { x: 0, y: 112, w: 32, h: 32 };
const CORRIDOR: Rect = { x: -1000, y: 112, w: 1000, h: 32 };

/** The boardwalk road: in from the west mouth past the fisher to the pier, with spurs to the signpost and the shipwreck. */
const PATHS: Rect[] = [
  { x: -1000, y: 122, w: 1290, h: 6 },
  { x: 42, y: 104, w: 6, h: 23 },
  { x: 189, y: 54, w: 6, h: 73 },
];

export const BEACH: Area = {
  id: "beach",
  wall: false,
  terrainAt,
  paths: PATHS,
  mouths: [MOUTH],
  corridors: [CORRIDOR],
  gateBox: null,
  ice: null,
  props: PROPS,
  protected: [...PATHS, MOUTH, ...PROPS.map((prop) => spriteBox(prop.sprite, prop.at))],
};
