import type { Pose } from "../motion";
import { ARCHIVE_POINT, TERMINAL_POINT } from "../learnPoints";
import { spriteBox } from "../sprites";
import type { Rect } from "../world";
import type { Area, Prop, TerrainKind } from "./area";

/** Art points of Ada and the signpost (the game's ADA and SIGNPOST). */
export const VILLAGE_POINTS = {
  villager: { x: 109, y: 126 },
  signpost: { x: 275, y: 112 },
} as const;

/** The whole village is meadow: no snow, no mountains and no wall. */
function terrainAt(): TerrainKind {
  return "meadow";
}

const PATHS: Rect[] = [
  { x: 97, y: 127, w: 1226, h: 6 },
  { x: 96, y: 116, w: 80, h: 44 },
  // The north road, from the main road up through the gap between Ada and the PHP chest to the town square.
  { x: 120, y: 44, w: 6, h: 84 },
  { x: 120, y: 44, w: 86, h: 40 },
];
/** The village's decorations: a lantern by the well, two garden plots and a market stall. */
const LANTERN_POINT = { x: 164, y: 157 };

/** The village's life: wanderers pacing between two points on the road and square, and a pecking chicken by the fence. */
export const VILLAGE_LIFE = {
  wanderers: [
    { variant: "#78716c", a: { x: 125, y: 130 }, b: { x: 205, y: 130 }, speed: 8, offset: 0 },
    { variant: "#a16207", a: { x: 108, y: 136 }, b: { x: 172, y: 136 }, speed: 6, offset: 3 },
    { variant: "#0f766e", a: { x: 210, y: 129 }, b: { x: 222, y: 129 }, speed: 5, offset: 1 },
  ],
  chicken: { x: 190, y: 158 },
} as const;
export type Wanderer = (typeof VILLAGE_LIFE.wanderers)[number];

/** Where a wanderer stands at time `t` (ms): pacing a to b and back at its speed, facing the way it goes; still at its start when motion is reduced. */
export function wandererPose(t: number, reduced: boolean, w: Wanderer): Pose {
  if (reduced) return { x: w.a.x, y: w.a.y, facing: w.b.x >= w.a.x ? "right" : "left", frame: 0 };
  const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
  const s = (((t / 1000 + w.offset) * w.speed) % (2 * len) + 2 * len) % (2 * len);
  const out = s < len;
  const d = out ? s : 2 * len - s;
  const goingRight = (w.b.x >= w.a.x) === out;
  return {
    x: Math.round(w.a.x + ((w.b.x - w.a.x) * d) / len),
    y: Math.round(w.a.y + ((w.b.y - w.a.y) * d) / len),
    facing: goingRight ? "right" : "left",
    frame: (1 + (Math.floor(t / 250) % 2)) as 1 | 2,
  };
}

const MOUTH: Rect = { x: 288, y: 112, w: 32, h: 32 };
const PROPS: Prop[] = [
  { sprite: "hut", at: { x: 56, y: 116 } },
  { sprite: "hut", at: { x: 88, y: 162 } },
  { sprite: "well", at: { x: 150, y: 156 } },
  { sprite: "fence", at: { x: 184, y: 150 } },
  { sprite: "fence", at: { x: 200, y: 150 } },
  { sprite: "fence", at: { x: 216, y: 150 } },
  { sprite: "signpost", at: VILLAGE_POINTS.signpost },
  { sprite: "lantern", at: LANTERN_POINT },
  { sprite: "garden", at: { x: 60, y: 143 } },
  { sprite: "garden", at: { x: 60, y: 132 } },
  { sprite: "stall", at: { x: 119, y: 161 } },
  // The north half: a windmill and a pond in the west, the town square with its fountain and benches, an orchard,
  // a hut north of the pond, two more in the north-east and a fenced crop field beside them.
  { sprite: "windmill", at: { x: 44, y: 76 } },
  { sprite: "pond", at: { x: 92, y: 66 } },
  { sprite: "bench", at: { x: 190, y: 52 } },
  { sprite: "bench", at: { x: 156, y: 52 } },
  { sprite: "fountain", at: { x: 138, y: 66 } },
  ...[140, 156, 172, 188, 204].map((x) => ({ sprite: "fruit-tree" as const, at: { x, y: 42 } })),
  { sprite: "hut", at: { x: 92, y: 41 } },
  { sprite: "hut", at: { x: 228, y: 56 } },
  { sprite: "hut", at: { x: 262, y: 56 } },
  { sprite: "garden", at: { x: 290, y: 34 } },
  { sprite: "garden", at: { x: 290, y: 44 } },
  { sprite: "fence", at: { x: 290, y: 53 } },
  { sprite: "explorer-down", at: VILLAGE_POINTS.villager, variant: "#b45309" },
];

export const VILLAGE: Area = {
  id: "village",
  wall: false,
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
    spriteBox("chicken", VILLAGE_LIFE.chicken),
    // The Archive (the old middle hut) and the Syntax Terminal.
    spriteBox("archive", ARCHIVE_POINT),
    spriteBox("syntax-terminal", TERMINAL_POINT),
  ],
};
