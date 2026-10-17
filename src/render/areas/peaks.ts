import { chestPoints } from "../learnPoints";
import { spriteBox, type SpriteId } from "../sprites";
import { DOCK, PEAKS_SIGNPOST, SNOW_CAVE, WEATHER_STATION } from "../../game/constants";
import { toArt, type ArtPoint, type Rect } from "../world";
import { inRect, type Area, type Prop, type TerrainKind } from "./area";

/** Exactly the river's cold-damage zone (RIVER_ZONE x 24–76 %, y 28–39 %). */
export const ICE_RECT: Rect = { x: 77, y: 50, w: 167, h: 21 };
export const BRIDGE_RECT: Rect = { x: 147, y: 47, w: 26, h: 27 };

/** The dirt path from the start up to just under the gate. */
export const PATH: ArtPoint[] = [
  { x: 90, y: 130 },
  { x: 90, y: 100 },
  { x: 160, y: 100 },
  { x: 160, y: 92 },
];
export const PATH_WIDTH = 6;
const PATH_RECTS: Rect[] = PATH.slice(1).map((b, i) => {
  const a = PATH[i];
  const half = PATH_WIDTH / 2;
  return { x: Math.min(a.x, b.x) - half, y: Math.min(a.y, b.y) - half, w: Math.abs(b.x - a.x) + PATH_WIDTH, h: Math.abs(b.y - a.y) + PATH_WIDTH };
});
/** The path from the start west, out through the hedge's gap and on to the village. */
const WEST_PATH: Rect = { x: -1003, y: 127, w: 1096, h: 6 };
/** The south exit: a gap in the bottom hedge (game columns 62–78), the open ground beyond it, and the path that runs out through it. */
const SOUTH_MOUTH: Rect = { x: 192, y: 148, w: 64, h: 32 };
const SOUTH_CORRIDOR: Rect = { x: 192, y: 180, w: 64, h: 1000 };
const SOUTH_PATH: Rect = { x: 204, y: 97, w: 6, h: 1083 };
/** The branch of the camp path east to the south road, at the camp path's bend. */
const SOUTH_BRANCH: Rect = { x: 157, y: 97, w: 53, h: 6 };

/** Art points of the landmarks and the start. */
export const LANDMARK_POINTS = {
  tower: { x: 45, y: 32 },
  chest: { x: 262, y: 32 },
  gate: { x: 160, y: 90 },
  start: { x: 90, y: 130 },
} as const;

/** The east shore by the dock: sand up to the walkable edge, then sea. */
const SHORE = { y: 118, h: 30, sandX: 290, seaX: 303 };
/** Where the Peaks' dock stands, and its landing the pier reaches out over the water from. */
export const DOCK_POINT: ArtPoint = toArt(DOCK);

function terrainAt(x: number, y: number): TerrainKind {
  if (y >= SHORE.y && y < SHORE.y + SHORE.h) {
    if (x >= SHORE.seaX) return "sea";
    if (x >= SHORE.sandX) return "sand";
  }
  if (inRect(x, y, ICE_RECT)) return "ice";
  if (y < 16) return "mountains";
  // Snow everywhere south of the mountains: the whole Peaks is the snowy top.
  return "snow";
}

const MOUTH: Rect = { x: 0, y: 112, w: 32, h: 32 };
const p = LANDMARK_POINTS;

/** Where the camp signpost, the weather station and the hidden snow cave stand (the cave is only drawn once the tower is powered, but its room is kept clear from the start). */
export const SIGNPOST_POINT: ArtPoint = toArt(PEAKS_SIGNPOST);
export const STATION_POINT: ArtPoint = toArt(WEATHER_STATION);
export const CAVE_POINT: ArtPoint = toArt(SNOW_CAVE);

/**
 * The animals' zones: the art-px range each one's feet can ever reach, wherever you stand. The fox lives in the
 * north-east, the goat on the snow north of the river; birds fly across the sky and need no zone.
 */
export const WILDLIFE = {
  fox: { home: { x: 281, y: 52 }, zone: { x: 270, y: 44, w: 23, h: 18 } },
  goat: { home: { x: 112, y: 42 }, zone: { x: 84, y: 38, w: 56, h: 8 } },
  birds: 3,
} as const;

type Wild = { home: { x: number; y: number }; zone: Rect };
export type AnimalPose = { x: number; y: number; frame: 0 | 1; flip: boolean };

/**
 * Where an animal is: pacing about its home, and drifting away (up to 28 art px, never out of its zone) from a
 * player closer than 40 px. Resting at home when motion is reduced.
 */
function animalPose(a: Wild, t: number, reduced: boolean, player: ArtPoint, pace: number): AnimalPose {
  if (reduced) return { ...a.home, frame: 0, flip: false };
  const wave = Math.sin(t / 2200);
  const base = { x: a.home.x + pace * wave, y: a.home.y };
  const d = Math.hypot(base.x - player.x, base.y - player.y);
  const push = d < 40 ? (1 - d / 40) * 28 : 0;
  const away = d === 0 ? { x: 1, y: 0 } : { x: (base.x - player.x) / d, y: (base.y - player.y) / d };
  const z = a.zone;
  const x = Math.round(Math.min(z.x + z.w, Math.max(z.x, base.x + away.x * push)));
  const y = Math.round(Math.min(z.y + z.h, Math.max(z.y, base.y + away.y * push)));
  return { x, y, frame: (Math.floor(t / 250) % 2) as 0 | 1, flip: Math.cos(t / 2200) < 0 };
}

export const foxPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => animalPose(WILDLIFE.fox, t, reduced, player, 6);
export const goatPose = (t: number, reduced: boolean, player: ArtPoint): AnimalPose => {
  const pose = animalPose(WILDLIFE.goat, t, reduced, player, 14);
  return { ...pose, frame: 0 };
};

/** The static props of the camp and the mountain strip. */
const CAMP_PROPS: Prop[] = [
  { sprite: "lodge", at: { x: 62, y: 160 } },
  { sprite: "campfire", at: { x: 108, y: 150 } },
  { sprite: "bench", at: { x: 122, y: 152 } },
  { sprite: "bench", at: { x: 96, y: 152 } },
  { sprite: "signpost", at: SIGNPOST_POINT },
  { sprite: "station", at: STATION_POINT },
  { sprite: "waterfall", at: { x: 110, y: 17 } },
  { sprite: "cave-mouth", at: { x: 150, y: 16 } },
  { sprite: "cave-mouth", at: { x: 235, y: 16 } },
];

/** What a trail marker must stay clear of: the landmarks, chests, paths, the river and bridge, the exits, the camp and the animals. */
const keepClear: Rect[] = [
  ICE_RECT,
  BRIDGE_RECT,
  ...PATH_RECTS,
  WEST_PATH,
  SOUTH_BRANCH,
  SOUTH_PATH,
  MOUTH,
  SOUTH_MOUTH,
  ...[spriteBox("tower", p.tower), spriteBox("chest-closed", p.chest), spriteBox("gate", p.gate), spriteBox("explorer-down", p.start), spriteBox("dock", DOCK_POINT)],
  ...chestPoints("peaks").map(({ at }) => spriteBox("code-chest", at)),
  ...CAMP_PROPS.map((prop) => spriteBox(prop.sprite, prop.at)),
  spriteBox("signpost", SIGNPOST_POINT),
  spriteBox("station", STATION_POINT),
  spriteBox("snow-cave", CAVE_POINT),
  ...[WILDLIFE.fox, WILDLIFE.goat].map((a) => ({ x: a.zone.x - 14, y: a.zone.y - 12, w: a.zone.w + 28, h: a.zone.h + 14 })),
  // The start-here arrow over the HTML chest.
  { x: 24, y: 80, w: 16, h: 14 },
];

/** Points every `gap` px along a polyline, nudged `side` px sideways (to its right). */
function along(line: ArtPoint[], gap: number, side: number): ArtPoint[] {
  return line.slice(1).flatMap((b, i) => {
    const a = line[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    return Array.from({ length: Math.floor(len / gap) + 1 }, (_, k) => ({ x: Math.round(a.x + ((b.x - a.x) * k * gap) / len - nx * side), y: Math.round(a.y + ((b.y - a.y) * k * gap) / len - ny * side) }));
  });
}

/**
 * Wooden trail markers: from the camp up the path to the gate, from the gate's far side toward the tower, and from
 * the camp east toward the dock. A marker that would land on anything it must stay clear of is simply left out.
 */
export const TRAIL_POSTS: ArtPoint[] = [
  ...along(PATH, 20, 8),
  ...along([{ x: 150, y: 46 }, { x: 52, y: 38 }], 20, 6),
  ...along([{ x: 100, y: 140 }, { x: 280, y: 140 }], 22, 0),
].filter((pt) => {
  const box = spriteBox("post", pt);
  const r = { x: 19, y: 18, w: 283, h: 145 };
  const inside = box.x >= r.x && box.y >= r.y && box.x + box.w <= r.x + r.w && box.y + box.h <= r.y + r.h;
  return inside && !keepClear.some((k) => k.x < box.x + box.w + 2 && box.x - 2 < k.x + k.w && k.y < box.y + box.h + 2 && box.y - 2 < k.y + k.h);
});

const PEAKS_PROPS: Prop[] = [...CAMP_PROPS, ...TRAIL_POSTS.map((at): Prop => ({ sprite: "post" as SpriteId, at }))];

export const PEAKS: Area = {
  id: "peaks",
  wall: true,
  terrainAt,
  paths: [...PATH_RECTS, WEST_PATH, SOUTH_BRANCH, SOUTH_PATH],
  mouths: [MOUTH, SOUTH_MOUTH],
  corridors: [{ x: -1000, y: 112, w: 1000, h: 32 }, SOUTH_CORRIDOR],
  gateBox: spriteBox("gate", p.gate),
  ice: ICE_RECT,
  props: PEAKS_PROPS,
  protected: [
    ICE_RECT,
    BRIDGE_RECT,
    ...PATH_RECTS,
    spriteBox("tower", p.tower),
    spriteBox("chest-closed", p.chest),
    spriteBox("gate", p.gate),
    ...[p.start, p.tower, p.chest, p.gate].map((at) => spriteBox("explorer-down", at)),
    MOUTH,
    WEST_PATH,
    SOUTH_MOUTH,
    SOUTH_BRANCH,
    SOUTH_PATH,
    ...chestPoints("peaks").map(({ at }) => spriteBox("code-chest", at)),
    spriteBox("dock", DOCK_POINT),
    ...PEAKS_PROPS.map((prop) => spriteBox(prop.sprite, prop.at)),
  ],
};
