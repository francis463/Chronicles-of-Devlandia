import { spriteBox } from "../sprites";
import { BEACH_PIER, BEACH_SIGNPOST, FISHER, SANDCASTLE_POI, SHIPWRECK } from "../../game/constants";
import { screenOffsets, worldScale, zoneToArt, zoneWorld, type ArtPoint, type Rect } from "../world";
import { remedySpotsIn } from "./remedies";
import type { Area, Prop, TerrainKind } from "./area";

const WORLD_SIZE = zoneWorld("beach");
/** How many screens wide and tall the beach is: everything authored on one screen below is spread by this. */
const K = worldScale(WORLD_SIZE);
const up = (p: ArtPoint): ArtPoint => ({ x: p.x * K, y: p.y * K });

/** The sea starts at this x (303 on one screen): the walkable sand ends just before it. */
export const SEA_X = 303 * K;
/** The sea along the top of the sand: the first rows of the world. */
const SEA_TOP = 10 * K;

/** The beach's places in art px (the game's FISHER, BEACH_PIER, SHIPWRECK and BEACH_SIGNPOST), and the crab's lane along the sand. */
export const BEACH_POINTS = {
  fisher: zoneToArt(FISHER, "beach"),
  sandcastle: zoneToArt(SANDCASTLE_POI, "beach"),
  pier: zoneToArt(BEACH_PIER, "beach"),
  shipwreck: zoneToArt(SHIPWRECK, "beach"),
  signpost: zoneToArt(BEACH_SIGNPOST, "beach"),
  crabLane: { x: 0, y: 160 * K },
} as const;

/** Shells scattered on the sand: decoration only, nothing keeps clear of them. One set on every screen. */
export const BEACH_SHELLS: ReadonlyArray<ArtPoint> = screenOffsets(WORLD_SIZE).flatMap((o) =>
  [{ x: 100, y: 150 }, { x: 205, y: 166 }, { x: 60, y: 134 }, { x: 270, y: 140 }].map((p) => ({ x: p.x + o.x, y: p.y + o.y })),
);

/** Shells that only the low tide uncovers, on the strip the water leaves bare: three on every screen down the shore. */
export const TIDE_SHELLS: ReadonlyArray<ArtPoint> = Array.from({ length: K }, (_, row) => row * 180).flatMap((dy) => [58, 96, 134].map((y) => ({ x: SEA_X - 6, y: y + dy })));

/** Props every screen of the beach gets (percent of the zone), beside the umbrellas, boat and palms authored for the first. */
const EXTRAS: Prop[] = K === 1 ? [] : [
  { sprite: "palm", at: zoneToArt({ x: 20, y: 28 }, "beach") },
  { sprite: "palm", at: zoneToArt({ x: 74, y: 22 }, "beach") },
  { sprite: "palm", at: zoneToArt({ x: 22, y: 86 }, "beach") },
  { sprite: "umbrella", at: zoneToArt({ x: 62, y: 76 }, "beach") },
  { sprite: "umbrella", at: zoneToArt({ x: 67, y: 78 }, "beach") },
  { sprite: "boat", at: zoneToArt({ x: 44, y: 90 }, "beach") },
];

const PROPS: Prop[] = [
  { sprite: "shipwreck", at: BEACH_POINTS.shipwreck },
  { sprite: "pier", at: BEACH_POINTS.pier },
  { sprite: "signpost", at: BEACH_POINTS.signpost },
  { sprite: "explorer-down", at: BEACH_POINTS.fisher, variant: "#0e7490" },
  { sprite: "umbrella", at: up({ x: 150, y: 100 }) },
  { sprite: "umbrella", at: up({ x: 170, y: 104 }) },
  { sprite: "sandcastle", at: BEACH_POINTS.sandcastle },
  { sprite: "boat", at: up({ x: 230, y: 150 }) },
  { sprite: "palm", at: up({ x: 110, y: 72 }) },
  { sprite: "palm", at: up({ x: 250, y: 80 }) },
  ...EXTRAS,
];

/** Sand everywhere except the sea past the walkable area's east and north edges. */
function terrainAt(x: number, y: number): TerrainKind {
  return x >= SEA_X || y < SEA_TOP ? "sea" : "beach";
}

/** The west exit: a gap in the left edge (game rows 62–78) and the open ground beyond it. */
const MOUTH: Rect = { x: 0, y: 112 * K, w: 32, h: 32 * K };
const CORRIDOR: Rect = { x: -1000, y: 112 * K, w: 1000, h: 32 * K };

/** The boardwalk road: in from the west mouth past the fisher to the pier, with spurs to the signpost and the shipwreck. */
const PATHS: Rect[] = [
  { x: -1000, y: 122 * K, w: 1000 + 290 * K, h: 6 },
  { x: 42 * K, y: 104 * K, w: 6, h: 23 * K },
  { x: 189 * K, y: 54 * K, w: 6, h: 73 * K },
];

export const BEACH: Area = {
  id: "beach",
  world: WORLD_SIZE,
  wall: false,
  terrainAt,
  paths: PATHS,
  mouths: [MOUTH],
  corridors: [CORRIDOR],
  gateBox: null,
  ice: null,
  props: PROPS,
  protected: [...PATHS, MOUTH, ...PROPS.map((prop) => spriteBox(prop.sprite, prop.at)), ...remedySpotsIn("beach").map((r) => spriteBox(r.sprite, r.at))],
};
