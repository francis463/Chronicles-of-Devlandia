import { spriteBox, type SpriteId } from "../sprites";
import { DOCK, PEAKS_SIGNPOST, SNOW_CAVE, WEATHER_STATION } from "../../game/constants";
import { secretSpotsIn } from "./secrets";
import { reachableRect, worldScale, zoneToArt, type ArtPoint, type Rect, zoneWorld } from "../world";
import { inRect, type Area, type Prop, type TerrainKind } from "./area";

const WORLD_SIZE = zoneWorld("peaks");
/** How many screens wide and tall the Peaks are: everything authored on one screen below is spread by this. */
const K = worldScale(WORLD_SIZE);
const up = (p: ArtPoint): ArtPoint => ({ x: p.x * K, y: p.y * K });
const upRect = (r: Rect): Rect => ({ x: r.x * K, y: r.y * K, w: r.w * K, h: r.h * K });

/** Exactly the river's cold-damage zone (RIVER_ZONE x 24–76 %, y 28–39 %). */
export const ICE_RECT: Rect = upRect({ x: 77, y: 50, w: 167, h: 21 });
/** The bridge is as wide as ever and spans the river (a little past each bank), centred on the gate's column. */
export const BRIDGE_RECT: Rect = { x: 160 * K - 13, y: 47 * K, w: 26, h: 27 * K };

/** The dirt path from the start up to just under the gate. */
export const PATH: ArtPoint[] = [
  { x: 90, y: 130 },
  { x: 90, y: 100 },
  { x: 160, y: 100 },
  { x: 160, y: 92 },
].map(up);
export const PATH_WIDTH = 6;
const PATH_RECTS: Rect[] = PATH.slice(1).map((b, i) => {
  const a = PATH[i];
  const half = PATH_WIDTH / 2;
  return { x: Math.min(a.x, b.x) - half, y: Math.min(a.y, b.y) - half, w: Math.abs(b.x - a.x) + PATH_WIDTH, h: Math.abs(b.y - a.y) + PATH_WIDTH };
});
/** The path from the start west, out through the hedge's gap and on to the village. */
const WEST_PATH: Rect = { x: -1003, y: 127 * K, w: 1003 + 93 * K, h: 6 };
/** The south exit: a gap in the bottom hedge (game columns 62–78), the open ground beyond it, and the path that runs out through it. */
const SOUTH_MOUTH: Rect = { x: 192 * K, y: WORLD_SIZE.height - 32, w: 64 * K, h: 32 };
const SOUTH_CORRIDOR: Rect = { x: 192 * K, y: WORLD_SIZE.height, w: 64 * K, h: 1000 };
const SOUTH_PATH: Rect = { x: 204 * K, y: 97 * K, w: 6, h: WORLD_SIZE.height + 1000 - 97 * K };
/** The branch of the camp path east to the south road, at the camp path's bend. */
const SOUTH_BRANCH: Rect = { x: 157 * K, y: 97 * K, w: 53 * K, h: 6 };

/** Art points of the landmarks and the start. */
export const LANDMARK_POINTS = {
  tower: up({ x: 45, y: 32 }),
  gate: up({ x: 160, y: 90 }),
  start: up({ x: 90, y: 130 }),
} as const;

/** The east shore by the dock: sand up to the walkable edge, then sea. */
/** Sand and then sea start just beyond the walkable edge (the east edge of `reachableRect`). */
const EAST_EDGE = reachableRect(WORLD_SIZE).x + reachableRect(WORLD_SIZE).w;
const SHORE = { y: 118 * K, h: 30 * K, sandX: EAST_EDGE - 12, seaX: EAST_EDGE + 1 };
/** The mountains' band along the top: sixteen rows of a one-screen world, thicker in a bigger one so the caves and waterfall sit at its foot. */
const MOUNTAIN_ROWS = 16 * K;
/** Where the Peaks' dock stands, and its landing the pier reaches out over the water from. */
export const DOCK_POINT: ArtPoint = ((at) => ({ x: at.x + 8 * (K - 1), y: at.y }))(zoneToArt(DOCK, "peaks"));

function terrainAt(x: number, y: number): TerrainKind {
  if (y >= SHORE.y && y < SHORE.y + SHORE.h) {
    if (x >= SHORE.seaX) return "sea";
    if (x >= SHORE.sandX) return "sand";
  }
  if (inRect(x, y, ICE_RECT)) return "ice";
  if (y < MOUNTAIN_ROWS) return "mountains";
  // Snow everywhere south of the mountains: the whole Peaks is the snowy top.
  return "snow";
}

const MOUTH: Rect = { x: 0, y: 112 * K, w: 32, h: 32 * K };
const p = LANDMARK_POINTS;

/** Where the camp signpost, the weather station and the hidden snow cave stand (the cave is only drawn once the tower is powered, but its room is kept clear from the start). */
export const SIGNPOST_POINT: ArtPoint = zoneToArt(PEAKS_SIGNPOST, "peaks");
export const STATION_POINT: ArtPoint = zoneToArt(WEATHER_STATION, "peaks");
export const CAVE_POINT: ArtPoint = zoneToArt(SNOW_CAVE, "peaks");

/**
 * The animals' zones: the art-px range each one's feet can ever reach, wherever you stand. The fox lives in the
 * north-east, the goat on the snow north of the river; birds fly across the sky and need no zone.
 */
export type Wild = { home: { x: number; y: number }; zone: Rect };

/** An animal authored on one screen, spread over the Peaks with everything else. */
const wild = (home: ArtPoint, zone: Rect): Wild => ({ home: up(home), zone: upRect(zone) });

export const WILDLIFE = {
  fox: wild({ x: 286, y: 52 }, { x: 281, y: 44, w: 10, h: 18 }),
  goat: wild({ x: 112, y: 42 }, { x: 84, y: 38, w: 56, h: 8 }),
  birds: 3,
} as const;
export type AnimalPose = { x: number; y: number; frame: 0 | 1; flip: boolean };

/**
 * Where an animal is: pacing about its home, and drifting away (up to 28 art px, never out of its zone) from a
 * player closer than 40 px. Resting at home when motion is reduced.
 */
export function animalPose(a: Wild, t: number, reduced: boolean, player: ArtPoint, pace: number): AnimalPose {
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
/** The camp's fire and its two benches stay a close cluster whatever the scale: the benches sit a fixed offset from the fire. */
const FIRE = up({ x: 108, y: 150 });
const CAMP_PROPS: Prop[] = [
  { sprite: "lodge", at: up({ x: 62, y: 161 }) },
  { sprite: "campfire", at: FIRE },
  { sprite: "bench", at: { x: FIRE.x + 14, y: FIRE.y + 2 } },
  { sprite: "bench", at: { x: FIRE.x - 12, y: FIRE.y + 2 } },
  { sprite: "signpost", at: SIGNPOST_POINT },
  { sprite: "station", at: STATION_POINT },
  { sprite: "waterfall", at: { x: 110 * K, y: 17 * K } },
  { sprite: "cave-mouth", at: { x: 150 * K, y: 16 * K } },
  { sprite: "cave-mouth", at: { x: 235 * K, y: 16 * K } },
];

/** Where the ski lodge stands (its foot). */
export const LODGE_POINT: ArtPoint = CAMP_PROPS[0].at;

/** The start-here arrow hangs 29 px above the lodge's foot, and its room is kept clear. */
export const START_ARROW_AT: ArtPoint = { x: CAMP_PROPS[0].at.x, y: CAMP_PROPS[0].at.y - 29 };
const START_ARROW_BOX: Rect = { x: START_ARROW_AT.x - 8, y: START_ARROW_AT.y - 12, w: 16, h: 14 };

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
  ...[spriteBox("tower", p.tower), spriteBox("gate", p.gate), spriteBox("explorer-down", p.start), spriteBox("dock", DOCK_POINT)],
  ...CAMP_PROPS.map((prop) => spriteBox(prop.sprite, prop.at)),
  spriteBox("signpost", SIGNPOST_POINT),
  spriteBox("station", STATION_POINT),
  spriteBox("snow-cave", CAVE_POINT),
  ...[WILDLIFE.fox, WILDLIFE.goat].map((a) => ({ x: a.zone.x - 14, y: a.zone.y - 12, w: a.zone.w + 28, h: a.zone.h + 14 })),
  // The hidden spots.
  ...secretSpotsIn("peaks").map((r) => spriteBox(r.sprite, r.at)),
  // The start-here arrow over the ski lodge, where the HTML chest is.
  START_ARROW_BOX,
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
  ...along([{ x: 150, y: 46 }, { x: 52, y: 38 }].map(up), 20, 6),
  ...along([{ x: 100, y: 140 }, { x: 280, y: 140 }].map(up), 22, 0),
].filter((pt) => {
  const box = spriteBox("post", pt);
  const r = reachableRect(WORLD_SIZE);
  const inside = box.x >= r.x && box.y >= r.y && box.x + box.w <= r.x + r.w && box.y + box.h <= r.y + r.h;
  return inside && !keepClear.some((k) => k.x < box.x + box.w + 2 && box.x - 2 < k.x + k.w && k.y < box.y + box.h + 2 && box.y - 2 < k.y + k.h);
});

const PEAKS_PROPS: Prop[] = [...CAMP_PROPS, ...TRAIL_POSTS.map((at): Prop => ({ sprite: "post" as SpriteId, at }))];

export const PEAKS: Area = {
  id: "peaks",
  world: WORLD_SIZE,
  wall: true,
  terrainAt,
  paths: [...PATH_RECTS, WEST_PATH, SOUTH_BRANCH, SOUTH_PATH],
  mouths: [MOUTH, SOUTH_MOUTH],
  corridors: [{ x: -1000, y: 112 * K, w: 1000, h: 32 * K }, SOUTH_CORRIDOR],
  gateBox: spriteBox("gate", p.gate),
  ice: ICE_RECT,
  props: PEAKS_PROPS,
  protected: [
    ICE_RECT,
    BRIDGE_RECT,
    ...PATH_RECTS,
    spriteBox("tower", p.tower),
    spriteBox("gate", p.gate),
    ...[p.start, p.tower, p.gate].map((at) => spriteBox("explorer-down", at)),
    MOUTH,
    WEST_PATH,
    SOUTH_MOUTH,
    SOUTH_BRANCH,
    SOUTH_PATH,
      spriteBox("dock", DOCK_POINT),
    ...PEAKS_PROPS.map((prop) => spriteBox(prop.sprite, prop.at)),
    ...secretSpotsIn("peaks").map((r) => spriteBox(r.sprite, r.at)),
  ],
};
