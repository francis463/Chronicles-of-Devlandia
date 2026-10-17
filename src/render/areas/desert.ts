import { spriteBox } from "../sprites";
import { DESERT_PYRAMID, DESERT_SIGNPOST, NOMAD, OASIS } from "../../game/constants";
import { toArt, type Rect } from "../world";
import type { Area, Prop, TerrainKind } from "./area";

/** The desert's places in art px (the game's NOMAD, OASIS, DESERT_PYRAMID and DESERT_SIGNPOST), and the rock the lizard suns on. */
export const DESERT_POINTS = {
  nomad: toArt(NOMAD),
  oasis: toArt(OASIS),
  pyramid: toArt(DESERT_PYRAMID),
  signpost: toArt(DESERT_SIGNPOST),
  lizardRock: { x: 240, y: 70 },
} as const;

const PROPS: Prop[] = [
  { sprite: "pyramid", at: DESERT_POINTS.pyramid },
  { sprite: "oasis", at: DESERT_POINTS.oasis },
  { sprite: "palm", at: { x: 98, y: 92 } },
  { sprite: "palm", at: { x: 170, y: 86 } },
  { sprite: "signpost", at: DESERT_POINTS.signpost },
  { sprite: "explorer-down", at: DESERT_POINTS.nomad, variant: "#c2410c" },
  { sprite: "rock", at: DESERT_POINTS.lizardRock },
];

function terrainAt(): TerrainKind {
  return "dune";
}

/** The east exit: a gap in the right edge (game rows 62–78) and the open ground beyond it. */
const MOUTH: Rect = { x: 288, y: 112, w: 32, h: 32 };
const CORRIDOR: Rect = { x: 320, y: 112, w: 1000, h: 32 };

/** The sand road: in from the east mouth past the nomad, then north to the oasis and west and north to the pyramid, with a spur to the signpost. */
const PATHS: Rect[] = [
  { x: 130, y: 122, w: 1190, h: 6 },
  { x: 266, y: 108, w: 6, h: 19 },
  { x: 130, y: 94, w: 6, h: 34 },
  { x: 64, y: 96, w: 72, h: 6 },
  { x: 64, y: 61, w: 6, h: 41 },
];

export const DESERT: Area = {
  id: "desert",
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
