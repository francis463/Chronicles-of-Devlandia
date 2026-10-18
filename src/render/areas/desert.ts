import { spriteBox } from "../sprites";
import { DESERT_PYRAMID, DESERT_SIGNPOST, NOMAD, OASIS } from "../../game/constants";
import { DESERT_JARS, DESERT_LORE } from "../../game/desertLore";
import { toArt, type Rect } from "../world";
import { remedySpotsIn } from "./remedies";
import type { Area, Prop, TerrainKind } from "./area";
import { animalPose, type AnimalPose, type Wild } from "./peaks";
import type { ArtPoint } from "../world";

/** The desert's places in art px (the game's NOMAD, OASIS, DESERT_PYRAMID and DESERT_SIGNPOST), and the rock the lizard suns on. */
export const DESERT_POINTS = {
  nomad: toArt(NOMAD),
  oasis: toArt(OASIS),
  pyramid: toArt(DESERT_PYRAMID),
  signpost: toArt(DESERT_SIGNPOST),
  lizardRock: { x: 110, y: 160 },
  camp: toArt(DESERT_LORE.find((l) => l.id === "caravan-camp")!),
  well: toArt(DESERT_LORE.find((l) => l.id === "desert-well")!),
  door: toArt(DESERT_LORE.find((l) => l.id === "temple-door")!),
  riverbed: toArt(DESERT_LORE.find((l) => l.id === "dry-riverbed")!),
  obelisk: toArt(DESERT_LORE.find((l) => l.id === "obelisk")!),
} as const;

/** Where the nomad's three water jars stand, in art px. Drawn by the scene until picked up, never as props. */
export const JAR_POINTS = DESERT_JARS.map((j) => ({ id: j.id, at: toArt(j) }));

/**
 * The desert's wildlife: a scorpion by the sand road, the nomad's camel, a snake in the south-west and a fennec fox that comes out at dusk.
 * Each paces about its home and, like the Peaks' fox, drifts away from a player closer than 40 px, never leaving its zone.
 */
export const DESERT_WILDLIFE = {
  scorpion: { home: { x: 180, y: 152 }, zone: { x: 172, y: 148, w: 18, h: 6 } },
  camel: { home: { x: 244, y: 146 }, zone: { x: 238, y: 142, w: 12, h: 6 } },
  snake: { home: { x: 62, y: 155 }, zone: { x: 54, y: 153, w: 18, h: 6 } },
  fennec: { home: { x: 240, y: 100 }, zone: { x: 236, y: 96, w: 8, h: 6 } },
} as const satisfies Record<string, Wild>;

export const scorpionPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(DESERT_WILDLIFE.scorpion, t, reduced, player, 5);
export const camelPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => ({ ...animalPose(DESERT_WILDLIFE.camel, t, reduced, player, 3), frame: reduced ? 0 : (Math.floor(t / 900) % 2) as 0 | 1 });
export const snakePose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(DESERT_WILDLIFE.snake, t, reduced, player, 8);
export const fennecPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(DESERT_WILDLIFE.fennec, t, reduced, player, 4);

const PROPS: Prop[] = [
  { sprite: "pyramid", at: DESERT_POINTS.pyramid },
  { sprite: "oasis", at: DESERT_POINTS.oasis },
  { sprite: "palm", at: { x: 98, y: 92 } },
  { sprite: "palm", at: { x: 170, y: 86 } },
  { sprite: "signpost", at: DESERT_POINTS.signpost },
  { sprite: "explorer-down", at: DESERT_POINTS.nomad, variant: "#c2410c" },
  { sprite: "rock", at: DESERT_POINTS.lizardRock },
  { sprite: "tent", at: DESERT_POINTS.camp },
  { sprite: "well", at: DESERT_POINTS.well },
  { sprite: "temple-door", at: DESERT_POINTS.door },
  { sprite: "riverbed", at: DESERT_POINTS.riverbed },
  { sprite: "obelisk", at: DESERT_POINTS.obelisk },
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
  protected: [
    ...PATHS,
    MOUTH,
    ...PROPS.map((prop) => spriteBox(prop.sprite, prop.at)),
    ...JAR_POINTS.map((j) => spriteBox("jar", j.at)),
    ...remedySpotsIn("desert").map((r) => spriteBox(r.sprite, r.at)),
    // Room for each animal's whole range, so nothing stands where it walks.
    ...Object.values(DESERT_WILDLIFE).map((a) => ({ x: a.zone.x - 16, y: a.zone.y - 20, w: a.zone.w + 32, h: a.zone.h + 22 })),
  ],
};
