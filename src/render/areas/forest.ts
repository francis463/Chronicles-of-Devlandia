import type { Rect } from "../world";
import { inRect, type Area, type TerrainKind } from "./area";

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
  props: [],
  protected: [...PATHS, MOUTH],
};
