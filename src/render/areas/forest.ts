import { chestPoints } from "../learnPoints";
import { spriteBox } from "../sprites";
import { HIDDEN_ARTIFACT } from "../../game/constants";
import { toArt, type Rect } from "../world";
import { inRect, type Area, type Prop, type TerrainKind } from "./area";

/** The forest's places in art px (the game's RANGER, CAMPFIRE, OLD_OAK and FOREST_SIGNPOST). */
export const FOREST_POINTS = {
  ranger: toArt({ x: 60, y: 62 }),
  campfire: toArt({ x: 46, y: 66 }),
  oak: toArt({ x: 24, y: 50 }),
  signpost: toArt({ x: 84, y: 26 }),
  /** The Golden Semicolon's dig spot, in the south-east corner. */
  dig: toArt(HIDDEN_ARTIFACT),
} as const;

const PROPS: Prop[] = [
  { sprite: "old-oak", at: FOREST_POINTS.oak },
  { sprite: "campfire", at: FOREST_POINTS.campfire },
  { sprite: "signpost", at: FOREST_POINTS.signpost },
  { sprite: "explorer-down", at: FOREST_POINTS.ranger, variant: "#be123c" },
];

/** The meadow clearing in the middle of the forest, where the ranger, the campfire and the chest stand. */
const CLEARING: Rect = { x: 120, y: 90, w: 110, h: 70 };

function terrainAt(x: number, y: number): TerrainKind {
  return inRect(x, y, CLEARING) ? "meadow" : "forest";
}

/** The north exit: a gap in the top edge (game columns 62–78) and the open ground beyond it. */
const MOUTH: Rect = { x: 192, y: 0, w: 64, h: 32 };
const CORRIDOR: Rect = { x: 192, y: -1000, w: 64, h: 1000 };

/** The path from the north mouth down to a fork: west into the clearing, east and south to the dig corner. */
const PATHS: Rect[] = [
  { x: 204, y: -1000, w: 6, h: 1100 },
  { x: 150, y: 97, w: 60, h: 6 },
  { x: 150, y: 97, w: 6, h: 30 },
  { x: 204, y: 100, w: 6, h: 47 },
  { x: 204, y: 141, w: 78, h: 6 },
];

export const FOREST: Area = {
  id: "forest",
  wall: false,
  terrainAt,
  paths: PATHS,
  mouths: [MOUTH],
  corridors: [CORRIDOR],
  gateBox: null,
  ice: null,
  props: PROPS,
  protected: [...PATHS, MOUTH, ...PROPS.map((prop) => spriteBox(prop.sprite, prop.at)), ...chestPoints("forest").map(({ at }) => spriteBox("code-chest", at)),
    spriteBox("x-mark", FOREST_POINTS.dig),
    spriteBox("semicolon", FOREST_POINTS.dig),
  ],
};
