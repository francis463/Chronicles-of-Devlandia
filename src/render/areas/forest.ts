import { FOREST_LORE, FOREST_MUSHROOMS } from "../../game/forestLore";
import { remedySpotsIn } from "./remedies";
import { secretSpotsIn } from "./secrets";
import { spriteBox } from "../sprites";
import { worldScale, zoneToArt, zoneWorld, type Rect } from "../world";
import { inRect, type Area, type Prop, type TerrainKind } from "./area";
import { animalPose, type AnimalPose, type Wild } from "./peaks";
import type { ArtPoint } from "../world";

const WORLD_SIZE = zoneWorld("forest");
/** How many screens wide and tall the forest is: everything authored on one screen below is spread by this. */
const K = worldScale(WORLD_SIZE);
const up = (p: ArtPoint): ArtPoint => ({ x: p.x * K, y: p.y * K });
const upRect = (r: Rect): Rect => ({ x: r.x * K, y: r.y * K, w: r.w * K, h: r.h * K });

/** The forest's places in art px (the game's RANGER, CAMPFIRE, OLD_OAK and FOREST_SIGNPOST). */
export const FOREST_POINTS = {
  ranger: zoneToArt({ x: 60, y: 62 }, "forest"),
  campfire: zoneToArt({ x: 46, y: 66 }, "forest"),
  oak: zoneToArt({ x: 24, y: 50 }, "forest"),
  signpost: zoneToArt({ x: 72, y: 89 }, "forest"),
  cabin: zoneToArt(FOREST_LORE.find((l) => l.id === "hunter-cabin")!, "forest"),
  well: zoneToArt(FOREST_LORE.find((l) => l.id === "forest-well")!, "forest"),
  brook: zoneToArt(FOREST_LORE.find((l) => l.id === "forest-brook")!, "forest"),
  ring: zoneToArt(FOREST_LORE.find((l) => l.id === "fairy-ring")!, "forest"),
  hollow: zoneToArt(FOREST_LORE.find((l) => l.id === "hollow-tree")!, "forest"),
} as const;

/** Where the ranger's three glow mushrooms grow, in art px. Drawn by the scene until picked, never as props. */
export const MUSHROOM_POINTS = FOREST_MUSHROOMS.map((m) => ({ id: m.id, at: zoneToArt(m, "forest") }));

/** Props a bigger forest gets (percent of the zone) along its trails: stumps, logs and ferns. */
const EXTRAS: Prop[] = K === 1 ? [] : [
  { sprite: "stump", at: zoneToArt({ x: 14, y: 24 }, "forest") },
  { sprite: "log", at: zoneToArt({ x: 38, y: 16 }, "forest") },
  { sprite: "fern", at: zoneToArt({ x: 74, y: 74 }, "forest") },
  { sprite: "fern", at: zoneToArt({ x: 30, y: 88 }, "forest") },
  { sprite: "stump", at: zoneToArt({ x: 90, y: 20 }, "forest") },
  { sprite: "log", at: zoneToArt({ x: 34, y: 58 }, "forest") },
];

const PROPS: Prop[] = [
  { sprite: "old-oak", at: FOREST_POINTS.oak },
  { sprite: "campfire", at: FOREST_POINTS.campfire },
  { sprite: "signpost", at: FOREST_POINTS.signpost },
  { sprite: "cabin", at: FOREST_POINTS.cabin },
  { sprite: "well", at: FOREST_POINTS.well },
  { sprite: "brook", at: FOREST_POINTS.brook },
  { sprite: "fairy-ring", at: FOREST_POINTS.ring },
  { sprite: "hollow-tree", at: FOREST_POINTS.hollow },
  { sprite: "explorer-down", at: FOREST_POINTS.ranger, variant: "#be123c" },
  ...EXTRAS,
];

/** An animal authored on one screen, spread over the forest with everything else. */
const wild = (home: ArtPoint, zone: Rect): Wild => ({ home: up(home), zone: upRect(zone) });

/**
 * The forest's wildlife: a deer grazing at the clearing's south edge, a rabbit among the western trees and a squirrel by the old oak.
 * Each paces about its home and, like the Peaks' fox, drifts away from a player closer than 40 px, never leaving its zone.
 */
export const FOREST_WILDLIFE = {
  deer: wild({ x: 188, y: 148 }, { x: 172, y: 144, w: 32, h: 8 }),
  rabbit: wild({ x: 95, y: 134 }, { x: 85, y: 128, w: 20, h: 12 }),
  squirrel: wild({ x: 110, y: 92 }, { x: 106, y: 86, w: 12, h: 8 }),
} as const satisfies Record<string, Wild>;

export const deerPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(FOREST_WILDLIFE.deer, t, reduced, player, 12);
export const rabbitPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(FOREST_WILDLIFE.rabbit, t, reduced, player, 8);
export const squirrelPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(FOREST_WILDLIFE.squirrel, t, reduced, player, 4);

/** The meadow clearing in the middle of the forest, where the ranger, the campfire and the chest stand. */
const CLEARING: Rect = upRect({ x: 120, y: 90, w: 110, h: 70 });

function terrainAt(x: number, y: number): TerrainKind {
  return inRect(x, y, CLEARING) ? "meadow" : "forest";
}

/** The north exit: a gap in the top edge (game columns 62–78) and the open ground beyond it. */
const MOUTH: Rect = { x: 192 * K, y: 0, w: 64 * K, h: 32 };
const CORRIDOR: Rect = { x: 192 * K, y: -1000, w: 64 * K, h: 1000 };

/** The west exit onto the desert road: a gap in the left edge (game rows 62–78) and the open ground beyond it. */
const WEST_MOUTH: Rect = { x: 0, y: 112 * K, w: 32, h: 32 * K };
const WEST_CORRIDOR: Rect = { x: -1000, y: 112 * K, w: 1000, h: 32 * K };

/** The east exit onto the beach road: a gap in the right edge (game rows 62–78) and the open ground beyond it. */
const EAST_MOUTH: Rect = { x: WORLD_SIZE.width - 32, y: 112 * K, w: 32, h: 32 * K };
const EAST_CORRIDOR: Rect = { x: WORLD_SIZE.width, y: 112 * K, w: 1000, h: 32 * K };

/** The trail from the north mouth: it bends east and back to the fork, then west into the clearing. */
const PATHS: Rect[] = [
  { x: 204 * K, y: -1000, w: 6, h: 1000 + 40 * K },
  { x: 204 * K, y: 34 * K, w: 22 * K, h: 6 },
  { x: 220 * K, y: 34 * K, w: 6, h: 30 * K },
  { x: 198 * K, y: 58 * K, w: 28 * K, h: 6 },
  { x: 198 * K, y: 58 * K, w: 6, h: 44 * K },
  { x: 198 * K, y: 96 * K, w: 12 * K, h: 6 },
  { x: 180 * K, y: 97 * K, w: 30 * K, h: 6 },
  { x: 180 * K, y: 97 * K, w: 6, h: 14 * K },
  { x: 160 * K, y: 105 * K, w: 26 * K, h: 6 },
  { x: 160 * K, y: 105 * K, w: 6, h: 22 * K },
  { x: 204 * K, y: 100 * K, w: 6, h: 23 * K },
  { x: 204 * K, y: 117 * K, w: 24 * K, h: 6 },
  { x: 222 * K, y: 117 * K, w: 6, h: 13 * K },
  { x: -1000, y: 116 * K, w: 1000 + 166 * K, h: 6 },
  { x: 222 * K, y: 124 * K, w: 1000 + 98 * K, h: 6 },
];

export const FOREST: Area = {
  id: "forest",
  world: WORLD_SIZE,
  wall: false,
  terrainAt,
  paths: PATHS,
  mouths: [MOUTH, WEST_MOUTH, EAST_MOUTH],
  corridors: [CORRIDOR, WEST_CORRIDOR, EAST_CORRIDOR],
  gateBox: null,
  ice: null,
  props: PROPS,
  protected: [
    ...PATHS,
    MOUTH,
    WEST_MOUTH,
    EAST_MOUTH,
    ...PROPS.map((prop) => spriteBox(prop.sprite, prop.at)),
    ...MUSHROOM_POINTS.map((m) => spriteBox("glow-mushroom", m.at)),
    ...remedySpotsIn("forest").map((r) => spriteBox(r.sprite, r.at)),
    ...secretSpotsIn("forest").map((r) => spriteBox(r.sprite, r.at)),
    // Room for each animal's whole range, so no tree stands where it walks.
    ...Object.values(FOREST_WILDLIFE).map((a) => ({ x: a.zone.x - 16, y: a.zone.y - 20, w: a.zone.w + 32, h: a.zone.h + 22 })),
  ],
};
