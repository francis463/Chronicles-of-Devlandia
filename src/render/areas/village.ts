import { ARCHIVE_POINT, CS_CHEST_POINT, TERMINAL_POINT, chestPoints } from "../learnPoints";
import { spriteBox } from "../sprites";
import type { Rect } from "../world";
import type { Area, Prop, TerrainKind } from "./area";

/** Art points of Ada and the signpost (the game's ADA and SIGNPOST). */
export const VILLAGE_POINTS = {
  villager: { x: 109, y: 126 },
  signpost: { x: 275, y: 112 },
} as const;

function terrainAt(_x: number, y: number): TerrainKind {
  if (y < 16) return "mountains";
  if (y < 83) return "snow";
  return "meadow";
}

const PATHS: Rect[] = [
  { x: 97, y: 127, w: 1226, h: 6 },
  { x: 96, y: 116, w: 80, h: 44 },
];
const MOUTH: Rect = { x: 288, y: 112, w: 32, h: 32 };
const PROPS: Prop[] = [
  { sprite: "hut", at: { x: 56, y: 116 } },
  { sprite: "hut", at: { x: 88, y: 162 } },
  { sprite: "well", at: { x: 150, y: 156 } },
  { sprite: "fence", at: { x: 184, y: 150 } },
  { sprite: "fence", at: { x: 200, y: 150 } },
  { sprite: "fence", at: { x: 216, y: 150 } },
  { sprite: "signpost", at: VILLAGE_POINTS.signpost },
  { sprite: "explorer-down", at: VILLAGE_POINTS.villager, variant: "#b45309" },
];

export const VILLAGE: Area = {
  id: "village",
  wall: true,
  terrainAt,
  paths: PATHS,
  mouths: [MOUTH],
  corridors: [{ x: 320, y: 112, w: 1000, h: 32 }],
  gateBox: null,
  ice: null,
  props: PROPS,
  protected: [
    ...PATHS,
    MOUTH,
    ...PROPS.map((prop) => spriteBox(prop.sprite, prop.at)),
    // The Archive (the old middle hut), the C# chest in its doorway, the Syntax Terminal and the chests.
    spriteBox("archive", ARCHIVE_POINT),
    spriteBox("code-chest", CS_CHEST_POINT),
    spriteBox("syntax-terminal", TERMINAL_POINT),
    ...chestPoints("village").map(({ at }) => spriteBox("code-chest", at)),
  ],
};
