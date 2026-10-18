import { FOREST_LORE, FOREST_MUSHROOMS } from "../../game/forestLore";
import { remedySpotsIn } from "./remedies";
import { spriteBox } from "../sprites";
import { toArt, type Rect } from "../world";
import { inRect, type Area, type Prop, type TerrainKind } from "./area";
import { animalPose, type AnimalPose, type Wild } from "./peaks";
import type { ArtPoint } from "../world";

/** The forest's places in art px (the game's RANGER, CAMPFIRE, OLD_OAK and FOREST_SIGNPOST). */
export const FOREST_POINTS = {
  ranger: toArt({ x: 60, y: 62 }),
  campfire: toArt({ x: 46, y: 66 }),
  oak: toArt({ x: 24, y: 50 }),
  signpost: toArt({ x: 72, y: 89 }),
  cabin: toArt(FOREST_LORE.find((l) => l.id === "hunter-cabin")!),
  well: toArt(FOREST_LORE.find((l) => l.id === "forest-well")!),
  brook: toArt(FOREST_LORE.find((l) => l.id === "forest-brook")!),
  ring: toArt(FOREST_LORE.find((l) => l.id === "fairy-ring")!),
  hollow: toArt(FOREST_LORE.find((l) => l.id === "hollow-tree")!),
} as const;

/** Where the ranger's three glow mushrooms grow, in art px. Drawn by the scene until picked, never as props. */
export const MUSHROOM_POINTS = FOREST_MUSHROOMS.map((m) => ({ id: m.id, at: toArt(m) }));

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
];

/**
 * The forest's wildlife: a deer grazing at the clearing's south edge, a rabbit among the western trees and a squirrel by the old oak.
 * Each paces about its home and, like the Peaks' fox, drifts away from a player closer than 40 px, never leaving its zone.
 */
export const FOREST_WILDLIFE = {
  deer: { home: { x: 188, y: 148 }, zone: { x: 172, y: 144, w: 32, h: 8 } },
  rabbit: { home: { x: 95, y: 134 }, zone: { x: 85, y: 128, w: 20, h: 12 } },
  squirrel: { home: { x: 110, y: 92 }, zone: { x: 106, y: 86, w: 12, h: 8 } },
} as const satisfies Record<string, Wild>;

export const deerPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(FOREST_WILDLIFE.deer, t, reduced, player, 12);
export const rabbitPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(FOREST_WILDLIFE.rabbit, t, reduced, player, 8);
export const squirrelPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(FOREST_WILDLIFE.squirrel, t, reduced, player, 4);

/** The meadow clearing in the middle of the forest, where the ranger, the campfire and the chest stand. */
const CLEARING: Rect = { x: 120, y: 90, w: 110, h: 70 };

function terrainAt(x: number, y: number): TerrainKind {
  return inRect(x, y, CLEARING) ? "meadow" : "forest";
}

/** The north exit: a gap in the top edge (game columns 62–78) and the open ground beyond it. */
const MOUTH: Rect = { x: 192, y: 0, w: 64, h: 32 };
const CORRIDOR: Rect = { x: 192, y: -1000, w: 64, h: 1000 };

/** The west exit onto the desert road: a gap in the left edge (game rows 62–78) and the open ground beyond it. */
const WEST_MOUTH: Rect = { x: 0, y: 112, w: 32, h: 32 };
const WEST_CORRIDOR: Rect = { x: -1000, y: 112, w: 1000, h: 32 };

/** The east exit onto the beach road: a gap in the right edge (game rows 62–78) and the open ground beyond it. */
const EAST_MOUTH: Rect = { x: 288, y: 112, w: 32, h: 32 };
const EAST_CORRIDOR: Rect = { x: 320, y: 112, w: 1000, h: 32 };

/** The trail from the north mouth: it bends east and back to the fork, then west into the clearing. */
const PATHS: Rect[] = [
  { x: 204, y: -1000, w: 6, h: 1040 },
  { x: 204, y: 34, w: 22, h: 6 },
  { x: 220, y: 34, w: 6, h: 30 },
  { x: 198, y: 58, w: 28, h: 6 },
  { x: 198, y: 58, w: 6, h: 44 },
  { x: 198, y: 96, w: 12, h: 6 },
  { x: 180, y: 97, w: 30, h: 6 },
  { x: 180, y: 97, w: 6, h: 14 },
  { x: 160, y: 105, w: 26, h: 6 },
  { x: 160, y: 105, w: 6, h: 22 },
  { x: 204, y: 100, w: 6, h: 23 },
  { x: 204, y: 117, w: 24, h: 6 },
  { x: 222, y: 117, w: 6, h: 13 },
  { x: -1000, y: 116, w: 1166, h: 6 },
  { x: 222, y: 124, w: 1098, h: 6 },
];

export const FOREST: Area = {
  id: "forest",
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
    // Room for each animal's whole range, so no tree stands where it walks.
    ...Object.values(FOREST_WILDLIFE).map((a) => ({ x: a.zone.x - 16, y: a.zone.y - 20, w: a.zone.w + 32, h: a.zone.h + 22 })),
  ],
};
