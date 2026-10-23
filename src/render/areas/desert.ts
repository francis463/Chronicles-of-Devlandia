import { spriteBox } from "../sprites";
import { DESERT_PYRAMID, DESERT_SIGNPOST, NOMAD, OASIS } from "../../game/constants";
import { DESERT_JARS, DESERT_LORE } from "../../game/desertLore";
import { worldScale, zoneToArt, zoneWorld, type Rect } from "../world";
import { remedySpotsIn } from "./remedies";
import { secretSpotsIn } from "./secrets";
import type { Area, Prop, TerrainKind } from "./area";
import { animalPose, type AnimalPose, type Wild } from "./peaks";
import type { ArtPoint } from "../world";

const WORLD_SIZE = zoneWorld("desert");
/** How many screens wide and tall the desert is: everything authored on one screen below is spread by this. */
const K = worldScale(WORLD_SIZE);
const up = (p: ArtPoint): ArtPoint => ({ x: p.x * K, y: p.y * K });
const upRect = (r: Rect): Rect => ({ x: r.x * K, y: r.y * K, w: r.w * K, h: r.h * K });

/** The desert's places in art px (the game's NOMAD, OASIS, DESERT_PYRAMID and DESERT_SIGNPOST), and the rock the lizard suns on. */
export const DESERT_POINTS = {
  nomad: zoneToArt(NOMAD, "desert"),
  oasis: zoneToArt(OASIS, "desert"),
  pyramid: zoneToArt(DESERT_PYRAMID, "desert"),
  signpost: zoneToArt(DESERT_SIGNPOST, "desert"),
  lizardRock: up({ x: 110, y: 160 }),
  camp: zoneToArt(DESERT_LORE.find((l) => l.id === "caravan-camp")!, "desert"),
  well: zoneToArt(DESERT_LORE.find((l) => l.id === "desert-well")!, "desert"),
  door: zoneToArt(DESERT_LORE.find((l) => l.id === "temple-door")!, "desert"),
  riverbed: zoneToArt(DESERT_LORE.find((l) => l.id === "dry-riverbed")!, "desert"),
  obelisk: zoneToArt(DESERT_LORE.find((l) => l.id === "obelisk")!, "desert"),
} as const;

/** Where the nomad's three water jars stand, in art px. Drawn by the scene until picked up, never as props. */
export const JAR_POINTS = DESERT_JARS.map((j) => ({ id: j.id, at: zoneToArt(j, "desert") }));

/** An animal authored on one screen, spread over the desert with everything else. */
const wild = (home: ArtPoint, zone: Rect): Wild => ({ home: up(home), zone: upRect(zone) });

/**
 * The desert's wildlife: a scorpion by the sand road, the nomad's camel, a snake in the south-west and a fennec fox that comes out at dusk.
 * Each paces about its home and, like the Peaks' fox, drifts away from a player closer than 40 px, never leaving its zone.
 */
export const DESERT_WILDLIFE = {
  scorpion: wild({ x: 180, y: 152 }, { x: 172, y: 148, w: 18, h: 6 }),
  camel: wild({ x: 244, y: 146 }, { x: 238, y: 142, w: 12, h: 6 }),
  snake: wild({ x: 62, y: 155 }, { x: 54, y: 153, w: 18, h: 6 }),
  fennec: wild({ x: 240, y: 100 }, { x: 236, y: 96, w: 8, h: 6 }),
} as const satisfies Record<string, Wild>;

export const scorpionPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(DESERT_WILDLIFE.scorpion, t, reduced, player, 5);
export const camelPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => ({ ...animalPose(DESERT_WILDLIFE.camel, t, reduced, player, 3), frame: reduced ? 0 : (Math.floor(t / 900) % 2) as 0 | 1 });
export const snakePose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(DESERT_WILDLIFE.snake, t, reduced, player, 8);
export const fennecPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(DESERT_WILDLIFE.fennec, t, reduced, player, 4);

/** Props every screen of a bigger desert gets (percent of the zone), along the road and out in the dunes. */
const EXTRAS: Prop[] = K === 1 ? [] : [
  { sprite: "arch", at: zoneToArt({ x: 30, y: 16 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 16, y: 62 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 72, y: 14 }, "desert") },
  { sprite: "bloom-cactus", at: zoneToArt({ x: 84, y: 34 }, "desert") },
  { sprite: "skull", at: zoneToArt({ x: 26, y: 88 }, "desert") },
  { sprite: "palm", at: zoneToArt({ x: 52, y: 90 }, "desert") },
  // A palm grove round the oasis, a ruin, bones by the east road and cactus and rock patches, so the sand between the landmarks has something to look at.
  { sprite: "palm", at: zoneToArt({ x: 34, y: 64 }, "desert") },
  { sprite: "palm", at: zoneToArt({ x: 51, y: 58 }, "desert") },
  { sprite: "palm", at: zoneToArt({ x: 40, y: 44 }, "desert") },
  { sprite: "arch", at: zoneToArt({ x: 12, y: 48 }, "desert") },
  { sprite: "skull", at: zoneToArt({ x: 15, y: 53 }, "desert") },
  { sprite: "dry-bush", at: zoneToArt({ x: 9, y: 54 }, "desert") },
  { sprite: "rock", at: zoneToArt({ x: 88, y: 44 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 90, y: 39 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 82, y: 76 }, "desert") },
  { sprite: "bloom-cactus", at: zoneToArt({ x: 86, y: 74 }, "desert") },
  { sprite: "dry-bush", at: zoneToArt({ x: 78, y: 87 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 10, y: 68 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 13, y: 72 }, "desert") },
  { sprite: "bloom-cactus", at: zoneToArt({ x: 16, y: 78 }, "desert") },
  { sprite: "rock", at: zoneToArt({ x: 45, y: 31 }, "desert") },
  { sprite: "rock", at: zoneToArt({ x: 56, y: 33 }, "desert") },
  { sprite: "dry-bush", at: zoneToArt({ x: 34, y: 36 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 60, y: 17 }, "desert") },
  { sprite: "cactus", at: zoneToArt({ x: 64, y: 21 }, "desert") },
  { sprite: "bloom-cactus", at: zoneToArt({ x: 67, y: 15 }, "desert") },
  { sprite: "dry-bush", at: zoneToArt({ x: 48, y: 83 }, "desert") },
  { sprite: "rock", at: zoneToArt({ x: 68, y: 56 }, "desert") },
  { sprite: "dry-bush", at: zoneToArt({ x: 72, y: 62 }, "desert") },
];

const PROPS: Prop[] = [
  { sprite: "pyramid", at: DESERT_POINTS.pyramid },
  { sprite: "oasis", at: DESERT_POINTS.oasis },
  { sprite: "palm", at: up({ x: 98, y: 92 }) },
  { sprite: "palm", at: up({ x: 170, y: 86 }) },
  { sprite: "signpost", at: DESERT_POINTS.signpost },
  { sprite: "explorer-down", at: DESERT_POINTS.nomad, variant: "#c2410c" },
  { sprite: "rock", at: DESERT_POINTS.lizardRock },
  { sprite: "tent", at: DESERT_POINTS.camp },
  { sprite: "well", at: DESERT_POINTS.well },
  { sprite: "temple-door", at: DESERT_POINTS.door },
  { sprite: "riverbed", at: DESERT_POINTS.riverbed },
  { sprite: "obelisk", at: DESERT_POINTS.obelisk },
  ...EXTRAS,
];

function terrainAt(): TerrainKind {
  return "dune";
}

/** The east exit: a gap in the right edge (game rows 62–78) and the open ground beyond it. */
const MOUTH: Rect = { x: WORLD_SIZE.width - 32, y: 112 * K, w: 32, h: 32 * K };
const CORRIDOR: Rect = { x: WORLD_SIZE.width, y: 112 * K, w: 1000, h: 32 * K };

/** The sand road: in from the east mouth past the nomad, then north to the oasis and west and north to the pyramid, with a spur to the signpost. */
const PATHS: Rect[] = [
  { x: 130 * K, y: 122 * K, w: 190 * K + 1000, h: 6 },
  { x: 266 * K, y: 108 * K, w: 6, h: 19 * K },
  { x: 130 * K, y: 94 * K, w: 6, h: 34 * K },
  { x: 64 * K, y: 96 * K, w: 72 * K, h: 6 },
  { x: 64 * K, y: 61 * K, w: 6, h: 41 * K },
];

export const DESERT: Area = {
  id: "desert",
  world: WORLD_SIZE,
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
    ...secretSpotsIn("desert").map((r) => spriteBox(r.sprite, r.at)),
    // Room for each animal's whole range, so nothing stands where it walks.
    ...Object.values(DESERT_WILDLIFE).map((a) => ({ x: a.zone.x - 16, y: a.zone.y - 20, w: a.zone.w + 32, h: a.zone.h + 22 })),
  ],
};
