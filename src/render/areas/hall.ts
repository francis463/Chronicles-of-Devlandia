import { HALL_SIGNPOST, HALL_SLOTS } from "../../game/hall";
import { spriteBox } from "../sprites";
import { zoneToArt, zoneWorld, type ArtPoint, type Rect } from "../world";
import type { Area, Prop, TerrainKind } from "./area";

const WORLD_SIZE = zoneWorld("hall");

/** The ten spots (the heroes' feet) and the signpost, in art px. */
export const HALL_POINTS = {
  slots: HALL_SLOTS.map((s) => zoneToArt(s, "hall")),
  signpost: zoneToArt(HALL_SIGNPOST, "hall"),
} as const;

/** The floor the podium blocks stand on, 66 px down the screen; the stage's wooden front is the 6 rows below it. */
const STAGE_FLOOR = 66;

/** What the scene draws flat, under everyone: the stage and the three podium blocks, whose tops are the heroes' feet. */
export const HALL_FLAT: ReadonlyArray<{ sprite: "stage" | "podium-1" | "podium-2" | "podium-3"; at: ArtPoint }> = [
  { sprite: "stage", at: { x: 160, y: STAGE_FLOOR + 5 } },
  { sprite: "podium-1", at: { x: HALL_POINTS.slots[0].x, y: STAGE_FLOOR } },
  { sprite: "podium-2", at: { x: HALL_POINTS.slots[1].x, y: STAGE_FLOOR } },
  { sprite: "podium-3", at: { x: HALL_POINTS.slots[2].x, y: STAGE_FLOOR } },
];

/** Paved floor everywhere inside the Hall; meadow outside it. */
function terrainAt(x: number, y: number): TerrainKind {
  return x >= 0 && x < WORLD_SIZE.width && y >= 0 && y < WORLD_SIZE.height ? "floor" : "meadow";
}

/** The south door: a gap in the bottom edge (game columns 40–56) and the open ground beyond it. */
const MOUTH: Rect = { x: 128, y: 148, w: 52, h: 32 };
const CORRIDOR: Rect = { x: 128, y: WORLD_SIZE.height, w: 52, h: 1000 };

/** The aisle from the south door up to the stage. */
const PATHS: Rect[] = [{ x: 148, y: STAGE_FLOOR + 6, w: 12, h: WORLD_SIZE.height - STAGE_FLOOR - 6 }];

/** Banners beside the stage, lanterns round the plaza and the signpost by the door. */
const PROPS: Prop[] = [
  { sprite: "banner", at: { x: 82, y: 76 } },
  { sprite: "banner", at: { x: 238, y: 76 } },
  { sprite: "lantern", at: { x: 56, y: 118 } },
  { sprite: "lantern", at: { x: 264, y: 118 } },
  { sprite: "lantern", at: { x: 56, y: 156 } },
  { sprite: "lantern", at: { x: 264, y: 156 } },
  { sprite: "signpost", at: HALL_POINTS.signpost },
];

export const HALL: Area = {
  id: "hall",
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
    ...PROPS.map((p) => spriteBox(p.sprite, p.at)),
    ...HALL_FLAT.map((f) => spriteBox(f.sprite, f.at)),
    ...HALL_POINTS.slots.map((at) => spriteBox("explorer-down", at)),
  ],
};
