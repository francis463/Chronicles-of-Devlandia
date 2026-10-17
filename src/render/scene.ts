import type { ClassId } from "../game/classes";
import { phaseOf } from "../game/clock";
import type { Phase, Point } from "../game/types";
import { campfireLit, isActive } from "./activity";
import type { ZoneId } from "../game/zones";
import { AREAS } from "./areas";
import { FOGGATEN_POINTS, LAMP_POINT } from "./areas/foggaten";
import { BEACH_POINTS, BEACH_SHELLS, TIDE_SHELLS } from "./areas/beach";
import { tideStrips } from "../game/tide";
import { DESERT_POINTS, JAR_POINTS, camelPose, fennecPose, scorpionPose, snakePose } from "./areas/desert";
import { FOREST_POINTS, MUSHROOM_POINTS, deerPose, rabbitPose, squirrelPose } from "./areas/forest";
import { CAVE_POINT, WILDLIFE, foxPose, goatPose } from "./areas/peaks";
import { VILLAGE_LIFE, wandererPose } from "./areas/village";
import { DOCK_POINT } from "./areas/peaks";
import type { Pose } from "./motion";
import { circlePixels, diamondPixels } from "./pixels";
import { LIGHTS, SPRITES, spriteBox, type SpriteId } from "./sprites";
import { BRIDGE_RECT, LANDMARK_POINTS, WALL_RECT, decorations, wallTiles } from "./terrain";
import { REACHABLE_RECT, WORLD, intersects, type ArtPoint, type Rect } from "./world";
import type { ChestId } from "../learn/types";
import { ARCHIVE_POINT, TERMINAL_POINT } from "./learnPoints";

export const PHASE_TINT: Record<Phase, string> = {
  Night: "rgba(20,20,28,0.25)",
  Dusk: "rgba(40,40,32,0.12)",
  Day: "transparent",
};

/** The forest's own shade, laid over whatever the hour does. */
const FOREST_TINT = { r: 10, g: 30, b: 40, a: 0.18 };

/** The forest tint over a phase tint, as one rgba string. */
function forestTint(phaseTint: string): string {
  const m = phaseTint.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (!m) return `rgba(${FOREST_TINT.r},${FOREST_TINT.g},${FOREST_TINT.b},${FOREST_TINT.a})`;
  const [br, bg, bb, ba] = m.slice(1).map(Number);
  const a = FOREST_TINT.a + ba * (1 - FOREST_TINT.a);
  const mix = (top: number, bottom: number) => Math.round((top * FOREST_TINT.a + bottom * ba * (1 - FOREST_TINT.a)) / a);
  return `rgba(${mix(FOREST_TINT.r, br)},${mix(FOREST_TINT.g, bg)},${mix(FOREST_TINT.b, bb)},${Math.round(a * 1000) / 1000})`;
}

export type SceneInput = {
  zone: ZoneId;
  player: Point;
  drone: Point;
  teammates: { id: string; name: string; color: string; cls?: ClassId; x: number; y: number }[];
  playerColor: string;
  /** Your class; with none the explorer keeps its plain look. */
  playerClass?: ClassId;
  downed: boolean;
  hasLoot: boolean;
  gateUnlocked: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  towerPowered: boolean;
  minutes: number;
  archiveOpen: boolean;
  lighthouseLit: boolean;
  matcherSolved: boolean;
  /** Your badges: their chests draw open. */
  earned: ChestId[];
  /** The ranger's glow mushrooms you have picked: they leave the forest floor. */
  mushrooms?: readonly string[];
  /** The nomad's water jars you have picked up: they leave the dunes. */
  jars?: readonly string[];
  /** Every badge earned: your explorer wears a crown and the village lights fireworks. */
  master?: boolean;
  /** The Sunny Beach's sandcastle puzzle is solved: the castle stands finished. */
  sandcastleBuilt?: boolean;
  /** Your own view's lighting: "day" or "night" draws as that phase whatever the clock says. */
  lightMode?: "auto" | "day" | "night";
  /** Your own view's weather: snowfall over the whole world. */
  snow?: boolean;
};
/** `prints`: the player's recent steps (art px and the frame clock `t` they were made at), for the Peaks' footprints. */
export type Poses = { player: Pose; drone: Pose; teammates: Record<string, Pose>; prints?: Array<{ x: number; y: number; t: number }> };
/** x/y is the sprite's top-left in art px; variant picks the palette ("base", a hood colour, or "grey"). */
export type Drawable = { sprite: SpriteId; frame: number; x: number; y: number; flip: boolean; rotate: boolean; variant: string };
export type Pixel = { x: number; y: number; color: string; alpha: number };
/** Painted in this order: glints, flat, upright, drone, tint, light, snow. */
export type Scene = {
  zone: ZoneId;
  glints: Pixel[];
  flat: Drawable[];
  upright: Drawable[];
  drone: Drawable;
  tint: string;
  light: Pixel[];
  snow: Pixel[];
};

const GREEN = "#4ade80";
const RED = "#ef4444";
const GOLD = "#fbbf24";
const WHITE = "#ffffff";
const CAMPFIRE_GLOW = "#fb923c";
const ICE_GLINTS: ArtPoint[] = [
  { x: 100, y: 56 },
  { x: 160, y: 62 },
  { x: 220, y: 58 },
];
const GLOW_STRENGTH: Record<Phase, number> = { Day: 0, Dusk: 0.5, Night: 1 };
const SEMICOLON_STEPS = [0.25, 0.5, 0.75, 1, 0.75, 0.5];
const PLANK_ROWS = BRIDGE_RECT.h / SPRITES.plank.h;

const SNOW_COUNT = 60;
const SNOW_FALL = 12;
const SNOW_DRIFT = 2;

/**
 * The snowfall at time `t` (ms): 60 flakes from fixed start points, each falling 12 art px and drifting 2 right a second,
 * wrapping at the world's edges. Still when motion is reduced.
 */
function snowfall(t: number, reduced: boolean): Pixel[] {
  const seconds = reduced ? 0 : t / 1000;
  return Array.from({ length: SNOW_COUNT }, (_, i) => ({
    x: ((i * 53 + 11) % WORLD.width + Math.floor(SNOW_DRIFT * seconds)) % WORLD.width,
    y: ((i * 89 + 7) % WORLD.height + Math.floor(SNOW_FALL * seconds)) % WORLD.height,
    color: WHITE,
    alpha: 1,
  }));
}

const LEAF_COUNT = 24;
const LEAF_FALL = 8;
const LEAF_DRIFT = 5;
const LEAF_COLORS = ["#a3e635", "#d97706"];
const DAPPLE = "#fde68a";
/** Sunlight through the canopy: five 5 × 4 patches on the forest floor. */
const DAPPLE_SPOTS: ArtPoint[] = [{ x: 40, y: 40 }, { x: 110, y: 70 }, { x: 250, y: 55 }, { x: 70, y: 130 }, { x: 160, y: 150 }];

/**
 * The forest's falling leaves at time `t` (ms): 24 from fixed start points, each falling 8 art px and drifting 5 right a second,
 * wrapping at the world's edges, with soft sunlight patches that breathe and fade out at night. Both stand still when motion is reduced.
 */
function forestLeaves(t: number, reduced: boolean, strength: number): Pixel[] {
  const seconds = reduced ? 0 : t / 1000;
  const leaves = Array.from({ length: LEAF_COUNT }, (_, i): Pixel => ({
    x: ((i * 47 + 13) % WORLD.width + Math.floor(LEAF_DRIFT * seconds)) % WORLD.width,
    y: ((i * 71 + 5) % WORLD.height + Math.floor(LEAF_FALL * seconds)) % WORLD.height,
    color: LEAF_COLORS[i % LEAF_COLORS.length],
    alpha: 1,
  }));
  if (strength >= 1) return leaves;
  const breath = reduced ? 1 : 0.75 + 0.25 * Math.sin(t / 1200);
  const alpha = 0.16 * (1 - strength) * breath;
  const dapples = DAPPLE_SPOTS.flatMap((at) =>
    Array.from({ length: 20 }, (_, k): Pixel => ({ x: at.x + (k % 5), y: at.y + Math.floor(k / 5), color: DAPPLE, alpha })),
  );
  return [...dapples, ...leaves];
}

const FIREFLY = "#fde047";
const FIREFLY_COUNT = 14;
const MIST = "#e8f3ef";

/**
 * The forest's living air at time `t` (ms): fourteen fireflies that wander and pulse once dusk falls (brighter at night),
 * and three low banks of mist that drift right through the daylight hours. Both hold still when motion is reduced.
 */
function forestAir(t: number, reduced: boolean, strength: number): Pixel[] {
  const seconds = reduced ? 0 : t / 1000;
  if (strength > 0) {
    return Array.from({ length: FIREFLY_COUNT }, (_, i): Pixel => ({
      x: Math.round(((i * 83 + 29) % (WORLD.width - 20)) + 10 + 5 * Math.sin(seconds * 0.7 + i * 2)),
      y: Math.round(((i * 61 + 41) % (WORLD.height - 40)) + 20 + 4 * Math.cos(seconds * 0.5 + i * 3)),
      color: FIREFLY,
      alpha: Math.round(strength * (0.35 + 0.65 * Math.max(0, Math.sin(seconds * 1.6 + i * 1.7))) * 100) / 100,
    }));
  }
  return [0, 1, 2].flatMap((bank) =>
    Array.from({ length: 24 * 3 }, (_, k): Pixel => ({
      x: (((k % 24) + bank * 97 + Math.floor(3 * seconds)) % WORLD.width),
      y: 118 + bank * 22 + Math.floor(k / 24),
      color: MIST,
      alpha: 0.1,
    })),
  );
}

const GRAIN = "#f5d78e";
const HAZE = "#fff7d6";
const GRAIN_COUNT = 36;
const GRAIN_DRIFT = 14;

/**
 * The desert's air at time `t` (ms): 36 grains of sand blowing slowly right (14 art px a second, wrapping), and eight wavering
 * strips of heat haze. Both hang still when motion is reduced.
 */
function desertAir(t: number, reduced: boolean): Pixel[] {
  const seconds = reduced ? 0 : t / 1000;
  const grains = Array.from({ length: GRAIN_COUNT }, (_, i): Pixel => ({
    x: ((i * 59 + 17) % WORLD.width + Math.floor(GRAIN_DRIFT * seconds)) % WORLD.width,
    y: (((i * 37 + 9) % WORLD.height) + Math.round(1.5 * Math.sin(seconds * 2 + i)) + WORLD.height) % WORLD.height,
    color: GRAIN,
    alpha: 0.75,
  }));
  const haze = Array.from({ length: 8 }, (_, k) => k).flatMap((k) =>
    Array.from({ length: 14 }, (_, j): Pixel => ({
      x: ((k * 83) % 300) + 4 + j + Math.round(3 * Math.sin(seconds * 1.5 + k)),
      y: 28 + k * 14 + Math.round(Math.sin(seconds * 2.5 + k * 1.7)),
      color: HAZE,
      alpha: 0.16,
    })),
  );
  return [...haze, ...grains];
}

const MIRAGE = "#bfe9f5";
const DUST = "#d9b46c";
const MOONLIT = "#e0f2fe";
const STORM = "#cda55a";
const STORM_PERIOD = 120;
const STORM_START = 90;
const STORM_LENGTH = 14;

/** How hard the sandstorm blows at time `t` (ms), 0 to 1: a swell that crests in the middle of a 14 s spell every two minutes, never when motion is reduced. */
export function stormStrength(t: number, reduced: boolean): number {
  if (reduced) return 0;
  const phase = (t / 1000) % STORM_PERIOD;
  return phase >= STORM_START && phase < STORM_START + STORM_LENGTH ? Math.round(Math.sin(((phase - STORM_START) / STORM_LENGTH) * Math.PI) * 100) / 100 : 0;
}

/**
 * More of the desert's air at time `t` (ms): by day a mirage shivers in the far dunes; two sand devils spin across the sand at any hour;
 * under the moon the sand sparkles; and every two minutes a sandstorm streaks across. All still when motion is reduced.
 */
function desertSky(t: number, reduced: boolean, strength: number): Pixel[] {
  const seconds = reduced ? 0 : t / 1000;
  const mirage = strength > 0 ? [] : Array.from({ length: 5 }, (_, k) => k).flatMap((k) =>
    Array.from({ length: 22 }, (_, j): Pixel => ({
      x: ((k * 67 + j * 3 + 20 + Math.round(4 * Math.sin(seconds * 1.2 + k))) % 300) + 8,
      y: 22 + k * 3 + Math.round(Math.sin(seconds * 3 + j * 0.5 + k)),
      color: MIRAGE,
      alpha: 0.14,
    })),
  );
  const devils = [0, 1].flatMap((i) => {
    const cx = ((i * 170 + 60 + Math.floor(seconds * 9)) % 360) - 20;
    const base = 70 + i * 58;
    return Array.from({ length: 15 }, (_, h): Pixel[] => [-1, 1].map((side) => ({
      x: cx + Math.round(side * (1 + h * 0.35) * (0.6 + 0.4 * Math.sin(seconds * 4 + h * 0.6))),
      y: base - h,
      color: DUST,
      alpha: 0.55,
    }))).flat();
  });
  const sparkle = strength === 0 ? [] : Array.from({ length: 28 }, (_, i): Pixel => ({
    x: (i * 97 + 31) % WORLD.width,
    y: 20 + ((i * 53 + 7) % (WORLD.height - 30)),
    color: MOONLIT,
    alpha: Math.round(strength * (0.25 + 0.6 * Math.max(0, Math.sin(seconds * 1.4 + i * 2.3))) * 100) / 100,
  }));
  const storm = stormStrength(t, reduced);
  const streaks = storm === 0 ? [] : Array.from({ length: 150 }, (_, i) => i).flatMap((i) =>
    Array.from({ length: 4 }, (_, j): Pixel => ({
      x: (((i * 53 + Math.floor(seconds * 230)) % (WORLD.width + 40)) - 20 + j) % WORLD.width,
      y: (i * 29 + 11) % WORLD.height,
      color: STORM,
      alpha: Math.round(storm * 0.7 * 100) / 100,
    })),
  );
  return [...mirage, ...devils, ...sparkle, ...streaks];
}

/** Two vultures circling high over the dunes (wings beating), or hanging still when motion is reduced. */
function vultures(t: number, reduced: boolean): Drawable[] {
  return [0, 1].map((i) => {
    const a = reduced ? i * Math.PI : (t / 1000) * 0.4 + i * Math.PI;
    return placed("vulture", { x: Math.round(190 + (i ? 30 : 70) * Math.cos(a)), y: Math.round(26 + 12 * Math.sin(a)) }, { frame: reduced ? 0 : Math.floor(t / 260) % 2, flip: Math.sin(a) > 0 });
  });
}

/** The tumbleweed: it rolls right at 16 art px a second across the south of the map, bouncing; it rests in a fixed spot when motion is reduced. */
function tumbleweed(t: number, reduced: boolean): Drawable {
  if (reduced) return placed("tumbleweed", { x: 200, y: 160 });
  const x = Math.floor(((t / 1000) * 16) % 380) - 30;
  return placed("tumbleweed", { x, y: 160 - Math.round(3 * Math.abs(Math.sin(t / 300))) }, { frame: Math.floor(t / 250) % 2 });
}

const FOAM = "#ffffff";
const SEA_GLINT = "#e0f2fe";

/**
 * The beach's water at time `t` (ms): foam washing in and out along the shoreline (a wavering white line every third row) and
 * twelve glints twinkling on the sea. Both hold still when motion is reduced (the glints show every third one).
 */
function beachWater(t: number, reduced: boolean, strips = 0): Pixel[] {
  const seconds = reduced ? 0 : t / 1000;
  const foam = Array.from({ length: 56 }, (_, k): Pixel[] => {
    const y = 12 + k * 3;
    // The foam rides the tide: each strip of shallow water pushes the waterline 8 px up the sand.
    const x = 298 - 8 * strips + Math.round(3 * Math.sin(seconds * 1.1 + y / 9));
    return [0, 1, 2].map((j) => ({ x: x + j, y, color: FOAM, alpha: 0.55 }));
  }).flat();
  const glints = Array.from({ length: 12 }, (_, i): Pixel[] =>
    (reduced ? i % 3 === 0 : (t + i * 170) % 1800 < 300) ? [{ x: 306 + ((i * 5) % 12), y: 14 + ((i * 29) % 160), color: SEA_GLINT, alpha: 0.9 }] : [],
  ).flat();
  return [...foam, ...glints];
}

const STRIP_ROWS = Array.from({ length: 21 }, (_, i) => 18 + i * 8);

/** The tide's shallow water: `strips` columns of 8 px tiles up the shore from the sea, the outermost with a foam edge. Nothing blocks you: it only looks wet. */
function tideTiles(strips: number): Drawable[] {
  return Array.from({ length: strips }, (_, k) => k + 1).flatMap((k) =>
    STRIP_ROWS.map((y) => placed("shallow", { x: 303 - 8 * k + 4, y: y + 8 }, { frame: k === strips ? 1 : 0 })),
  );
}

const ROPE = "#a16207";
const LINE = "#e2e8f0";

/**
 * The pier's life at time `t` (ms): two lanterns that glow from dusk, an angler's line dropping into the sea with a bobber that bobs,
 * a mooring rope down to a rowboat that rocks on the water. Everything holds still when motion is reduced.
 */
function pierLife(t: number, reduced: boolean, strength: number): { lanterns: Drawable[]; rowboat: Drawable; light: Pixel[] } {
  const box = spriteBox("pier", BEACH_POINTS.pier);
  const bob = reduced ? 0 : Math.round(Math.sin(t / 650));
  const lanterns = [box.x + 5, box.x + 35].map((x) => placed("lantern", { x, y: box.y + 3 }));
  const lineX = box.x + 37;
  const line = Array.from({ length: 14 }, (_, i): Pixel => ({ x: lineX, y: box.y + 4 + i, color: LINE, alpha: 0.85 }));
  const bobber: Pixel[] = [{ x: lineX, y: box.y + 18 + bob, color: "#dc2626", alpha: 1 }, { x: lineX, y: box.y + 19 + bob, color: "#f8fafc", alpha: 1 }];
  const from = { x: box.x + 38, y: box.y + 13 };
  const to = { x: 311, y: 134 + bob - 4 };
  const rope = Array.from({ length: 12 }, (_, i): Pixel => ({
    x: Math.round(from.x + ((to.x - from.x) * i) / 11),
    y: Math.round(from.y + ((to.y - from.y) * i) / 11),
    color: ROPE,
    alpha: 0.9,
  }));
  const lamps = strength > 0 ? lanterns.flatMap((l) => glow({ x: l.x + 3, y: l.y + 2 }, LANTERN_LIGHT, strength)) : [];
  return { lanterns, rowboat: placed("rowboat", { x: 312, y: 134 + bob }), light: [...line, ...bobber, ...rope, ...lamps] };
}

/** The crab: it shuffles back and forth along the sand at 10 art px a second; it rests in a fixed spot when motion is reduced. */
function crab(t: number, reduced: boolean): Drawable {
  if (reduced) return placed("crab", { x: 150, y: 160 });
  const p = ((t / 1000) * 10) % 560;
  return placed("crab", { x: 20 + Math.round(p < 280 ? p : 560 - p), y: 160 }, { frame: Math.floor(t / 200) % 2 });
}

const LAMPLIGHT = "#fde047";
const BEAM_LENGTH = 60;
const BEAM_SWEEP_MS = 2000;

/**
 * The lit lighthouse's light: a glow around the lamp (full by night, half by day) and a beam of 60 pixels, widening into a cone, that fades
 * with distance. It points right for 2 s, then left for 2 s; with reduced motion it stays pointing right.
 */
function lighthouseLight(t: number, reduced: boolean, strength: number): Pixel[] {
  const dir = reduced || Math.floor(t / BEAM_SWEEP_MS) % 2 === 0 ? 1 : -1;
  // A cone: one row at the lamp, widening by a row each side every 15 pixels.
  const beam = Array.from({ length: BEAM_LENGTH }, (_, i) => {
    const alpha = Math.round((0.5 - (0.45 * i) / (BEAM_LENGTH - 1)) * 1000) / 1000;
    const spread = Math.floor(i / 15);
    return Array.from({ length: 2 * spread + 1 }, (_, k): Pixel => ({ x: LAMP_POINT.x + dir * (i + 8), y: LAMP_POINT.y + k - spread, color: LAMPLIGHT, alpha }));
  })
    .flat()
    .filter((p) => p.x >= 0 && p.x < WORLD.width);
  return [...glow(LAMP_POINT, LAMPLIGHT, Math.max(0.5, strength)), ...beam];
}

const PRINT = "#94a3b8";
const PRINT_LIFE_MS = 6000;
const AURORA_GREEN = "#34d399";
const AURORA_PURPLE = "#a78bfa";
const BREATH = "#e2e8f0";
const GUST = "#f1f5f9";

/** Footprints in the snow, a left and a right foot in turn, fading over 6 s. None when motion is reduced. */
function footprints(prints: Array<{ x: number; y: number; t: number }>, t: number, reduced: boolean): Pixel[] {
  if (reduced) return [];
  return prints.flatMap((p, i) => {
    const age = t - p.t;
    if (age < 0 || age >= PRINT_LIFE_MS) return [];
    const alpha = Math.round(0.55 * (1 - age / PRINT_LIFE_MS) * 100) / 100;
    const x = p.x + (i % 2 === 0 ? -1 : 1);
    return [{ x, y: p.y, color: PRINT, alpha }, { x, y: p.y - 1, color: PRINT, alpha }];
  });
}

/** The aurora: two wavy ribbons (green, then purple) across the top strip, full at night and half at dusk; still when motion is reduced. */
function aurora(t: number, reduced: boolean, strength: number): Pixel[] {
  if (strength <= 0) return [];
  const w = reduced ? 0 : t / 1500;
  const ribbon = (color: string, base: number, wave: (x: number) => number, rows: number): Pixel[] =>
    Array.from({ length: WORLD.width / 2 }, (_, k) => k * 2).flatMap((x) =>
      Array.from({ length: rows }, (_, r): Pixel => ({ x, y: base + Math.round(wave(x)) + r, color, alpha: Math.round(0.45 * strength * (1 - r * 0.12) * 100) / 100 })),
    );
  return [
    ...ribbon(AURORA_GREEN, 4, (x) => 3 * Math.sin(x / 21 + w), 6),
    ...ribbon(AURORA_PURPLE, 8, (x) => 3 * Math.sin(x / 17 - 1.3 * w + 1), 5),
  ];
}

/** Your breath puffs for 0.7 s every 2.6 s, and a gust of snow streaks across the whole map for 1.5 s every 12 s. None when motion is reduced. */
function coldFeel(t: number, reduced: boolean, player: Pose): Pixel[] {
  if (reduced) return [];
  const out: Pixel[] = [];
  const breathAge = (t % 2600) / 700;
  if (breathAge < 1) {
    const dx = player.facing === "right" ? 5 : player.facing === "left" ? -5 : 0;
    for (let k = 0; k < 3; k++) out.push({ x: Math.round(player.x) + dx + k, y: Math.round(player.y) - 13 - Math.round(breathAge * 6) - k, color: BREATH, alpha: Math.round(0.7 * (1 - breathAge) * 100) / 100 });
  }
  const gustAge = (t % 12_000) / 1500;
  if (gustAge < 1) {
    for (let i = 0; i < 30; i++) {
      const y = (i * 37 + 11) % WORLD.height;
      const x = Math.round(((i * 53) % WORLD.width) - 60 + gustAge * 420);
      for (let k = 0; k < 3; k++) if (x + k >= 0 && x + k < WORLD.width) out.push({ x: x + k, y, color: GUST, alpha: 0.8 });
    }
  }
  return out;
}

const SPARKLE = "#f8fafc";
const SPARKLE_COUNT = 24;
/** Twinkles on the Peaks' snow: 24 fixed spots, each lit for 300 ms in every 2.4 s; all steady when motion is reduced. */
function snowSparkles(t: number, reduced: boolean): Pixel[] {
  return Array.from({ length: SPARKLE_COUNT }, (_, i) => ({ x: (i * 97 + 31) % 260 + 30, y: (i * 61 + 23) % 110 + 25 })).flatMap((at, i) =>
    reduced ? (i % 3 === 0 ? [{ ...at, color: SPARKLE, alpha: 0.9 }] : []) : (t + i * 100) % 2400 < 300 ? [{ ...at, color: SPARKLE, alpha: 0.9 }] : [],
  );
}

const SHIMMER = "#e0f2fe";
const SMOKE = "#cbd5e1";
const SMOKE_PUFFS = 4;
const SMOKE_CYCLE_MS = 3200;
const WINDOW_LIGHT = "#fde68a";
const LANTERN_LIGHT = "#fbbf24";

/** Four 2 × 2 puffs of chimney smoke rising and drifting right from a point, fading as they climb; hanging still when motion is reduced. */
function smokeFrom(x0: number, y0: number, t: number, reduced: boolean): Pixel[] {
  return Array.from({ length: SMOKE_PUFFS }, (_, j) => {
    const age = reduced ? (j + 0.5) / SMOKE_PUFFS : (((t / SMOKE_CYCLE_MS + j / SMOKE_PUFFS) % 1) + 1) % 1;
    const at = { x: x0 + Math.round(age * 7) + (j % 2), y: y0 - Math.round(age * 16) };
    const alpha = Math.round(0.6 * (1 - age) * 100) / 100;
    // Each wisp is a 2 × 2 puff, so it reads at 1× scale.
    return [0, 1, 2, 3].map((k): Pixel => ({ x: at.x + (k % 2), y: at.y + Math.floor(k / 2), color: SMOKE, alpha }));
  }).flat();
}

/** A soft glow around every lit-able window ("g" cell) of a drawn sprite, scaled by how dark it is. */
function windowGlow(sprite: SpriteId, box: Rect, strength: number): Pixel[] {
  return SPRITES[sprite].frames[0].flatMap((row, y) => [...row].flatMap((ch, x) => (ch === "g" ? diamondPixels(3).map((o) => ({ x: box.x + x + o.x, y: box.y + y + o.y, color: WINDOW_LIGHT, alpha: 0.22 * strength })) : [])));
}

const FIREWORK_COLORS = ["#fbbf24", "#f87171", "#60a5fa", "#4ade80", "#c084fc"];
const FIREWORK_RAYS = 16;
const FIREWORK_SPOTS: ArtPoint[] = [{ x: 70, y: 34 }, { x: 160, y: 26 }, { x: 250, y: 38 }];

/**
 * A Master of Devlandia's fireworks over the village: three bursts, each a ring of sixteen sparks that grows to 20 px over
 * 1.6 s and fades, then waits, so the sky is never empty. One small burst hangs still when motion is reduced.
 */
function fireworks(t: number, reduced: boolean): Pixel[] {
  if (reduced) return ringOf(FIREWORK_SPOTS[1], 9, FIREWORK_COLORS[0], 0.85);
  return FIREWORK_SPOTS.flatMap((at, i) => {
    const phase = ((t / 1000 + i * 1.1) % 3.3) / 1.6;
    return phase >= 1 ? [] : ringOf(at, Math.round(2 + 18 * phase), FIREWORK_COLORS[(Math.floor((t / 1000 + i * 1.1) / 3.3) + i) % FIREWORK_COLORS.length], Math.round((1 - phase) * 90) / 100);
  });
}

function ringOf(at: ArtPoint, radius: number, color: string, alpha: number): Pixel[] {
  return Array.from({ length: FIREWORK_RAYS }, (_, k): Pixel => ({
    x: Math.round(at.x + radius * Math.cos((k / FIREWORK_RAYS) * Math.PI * 2)),
    y: Math.round(at.y + radius * Math.sin((k / FIREWORK_RAYS) * Math.PI * 2)),
    color,
    alpha,
  }));
}

/** The huts' chimney smoke (four 2 × 2 puffs a hut) and, from dusk, their glowing windows and the well's lantern. Smoke hangs still when motion is reduced. */
function villageLight(t: number, reduced: boolean, strength: number, master = false): Pixel[] {
  const huts = AREAS.village.props.filter((p) => p.sprite === "hut").map((p) => spriteBox("hut", p.at));
  const smoke = huts.flatMap((box) => smokeFrom(box.x + 21, box.y + 3, t, reduced));
  // The pond glints: six spots that twinkle in turn, all lit and still when motion is reduced.
  const pond = spriteBox("pond", AREAS.village.props.find((p) => p.sprite === "pond")!.at);
  const glints = [[10, 8], [20, 14], [30, 7], [36, 16], [15, 17], [26, 5]].flatMap(([dx, dy], k): Pixel[] =>
    reduced || Math.floor(t / 700 + k) % 3 === 0 ? [{ x: pond.x + dx, y: pond.y + dy, color: SHIMMER, alpha: 0.7 }] : [],
  );
  const lit = master ? [...smoke, ...glints, ...fireworks(t, reduced)] : [...smoke, ...glints];
  if (strength <= 0) return lit;
  const windows = huts.flatMap((box) => windowGlow("hut", box, strength));
  const lantern = AREAS.village.props.find((p) => p.sprite === "lantern")!;
  const lampBox = spriteBox("lantern", lantern.at);
  return [...lit, ...windows, ...glow({ x: lampBox.x + 3, y: lampBox.y + 3 }, LANTERN_LIGHT, strength)];
}

/** The Peaks' camp light: the lodge's smoke and (from dusk) its glowing windows, and the campfire's glow, which flickers with its flame. */
function campLight(t: number, reduced: boolean, strength: number): Pixel[] {
  const lodge = spriteBox("lodge", AREAS.peaks.props.find((p) => p.sprite === "lodge")!.at);
  const fire = spriteBox("campfire", AREAS.peaks.props.find((p) => p.sprite === "campfire")!.at);
  const smoke = smokeFrom(lodge.x + 28, lodge.y, t, reduced);
  if (strength <= 0) return smoke;
  const flicker = reduced || Math.floor(t / 400) % 2 === 0 ? 1 : 0.8;
  return [...smoke, ...windowGlow("lodge", lodge, strength), ...glow({ x: fire.x + 6, y: fire.y + 5 }, CAMPFIRE_GLOW, strength * flicker)];
}

/** Three birds crossing the sky (wings beating), or perched in fixed places when motion is reduced. */
function birds(t: number, reduced: boolean): Drawable[] {
  return Array.from({ length: WILDLIFE.birds }, (_, i) =>
    reduced
      ? placed("bird", { x: 70 + i * 100, y: 12 + i * 3 })
      : placed("bird", { x: Math.floor(((t / 1000) * 14 + i * 110) % 360) - 20, y: 14 + i * 4 + Math.round(2 * Math.sin(t / 500 + i)) }, { frame: Math.floor(t / 180) % 2 }),
  );
}

/** The village's wanderers (pacing the road and square) and its pecking chicken. */
function villageLife(t: number, reduced: boolean): Drawable[] {
  const hen = placed("chicken", VILLAGE_LIFE.chicken, { frame: reduced ? 0 : Math.floor(t / 600) % 2 });
  return [...VILLAGE_LIFE.wanderers.map((w) => explorer(wandererPose(t, reduced, w), w.variant)), hen];
}

const placed = (sprite: SpriteId, at: ArtPoint, extra: Partial<Drawable> = {}): Drawable => {
  const box = spriteBox(sprite, at);
  return { sprite, frame: 0, x: box.x, y: box.y, flip: false, rotate: false, variant: "base", ...extra };
};

/** The hood colour, plus ":<class>" when there is a class (see createSpriteCache). */
const withClass = (color: string, cls?: ClassId) => (cls ? `${color}:${cls}` : color);

function explorer(pose: Pose, variant: string): Drawable {
  const sprite: SpriteId = pose.facing === "left" ? "explorer-right" : `explorer-${pose.facing}`;
  return placed(sprite, pose, { frame: pose.frame, flip: pose.facing === "left", variant });
}

const feetRow = (d: Drawable) => d.y + SPRITES[d.sprite].h - 1;
const isExplorer = (d: Drawable) => d.sprite.startsWith("explorer");

/** Pixel diamonds of radius 6, 4 and 2 (alpha 0.15, 0.3, 0.5 × strength), painted outside-in. */
function glow(at: ArtPoint, color: string, strength: number): Pixel[] {
  if (strength <= 0) return [];
  return ([
    [6, 0.15],
    [4, 0.3],
    [2, 0.5],
  ] as const).flatMap(([r, a]) => diamondPixels(r).map((o) => ({ x: at.x + o.x, y: at.y + o.y, color, alpha: a * strength })));
}

/** Computes a zone's static drawables once. */
function perZone(build: (zone: ZoneId) => Drawable[]): (zone: ZoneId) => Drawable[] {
  const cache = new Map<ZoneId, Drawable[]>();
  return (zone) => {
    let found = cache.get(zone);
    if (!found) cache.set(zone, (found = build(zone)));
    return found;
  };
}

/** Decorations whose drawings reach into the walkable area are y-sorted with the explorers. */
const interiorDecorations = perZone((zone) =>
  decorations(REACHABLE_RECT, AREAS[zone])
    .filter((d) => intersects(spriteBox(d.sprite, d.at), REACHABLE_RECT))
    .map((d) => placed(d.sprite, d.at)),
);

/** Every wall tile inside the world is y-sorted with the explorers, the edge ones included. */
const wallTilesInWorld = perZone((zone) => wallTiles(WALL_RECT, AREAS[zone]).map((at) => placed("wall", at)));

/** An area's static uprights (the village's huts, well, fences, signpost and Ada). */
const props = perZone((zone) => AREAS[zone].props.map((p) => placed(p.sprite, p.at, { variant: p.variant ?? "base" })));

/** The village's Syntax Terminal and Archive (the chests are inside their landmarks, so nothing is drawn for them). */
function learning(input: SceneInput): Drawable[] {
  if (input.zone !== "village") return [];
  return [
    placed("syntax-terminal", TERMINAL_POINT, { frame: input.matcherSolved ? 1 : 0 }),
    placed("archive", ARCHIVE_POINT, { frame: input.archiveOpen ? 1 : 0 }),
  ];
}

const byFeet = (a: Drawable, b: Drawable) => feetRow(a) - feetRow(b) || Number(isExplorer(a)) - Number(isExplorer(b));

/** The scene at time `t`; a Master of Devlandia (every badge) also wears a crown, drawn over everything else on their head. */
export function buildScene(input: SceneInput, poses: Poses, t: number, reduced: boolean): Scene {
  const base = buildBaseScene(input, poses, t, reduced);
  // Day and night: some animals are only out at certain hours, and the campfire is cold (its out frame) by day. Copies, so cached drawables never change.
  const phase = scenePhase(input);
  const upright = base.upright
    .filter((d) => isActive(d.sprite, phase))
    .map((d) => (d.sprite === "campfire" && !campfireLit(phase) ? { ...d, frame: CAMPFIRE_OUT } : d));
  const scene = { ...base, upright };
  if (!input.master || input.downed) return scene;
  return { ...scene, upright: [...scene.upright, placed("crown", { x: poses.player.x, y: poses.player.y - 11 })] };
}

/** The campfire sprite's third frame: cold logs. */
const CAMPFIRE_OUT = 2;

const scenePhase = (input: SceneInput): Phase => (input.lightMode === "day" ? "Day" : input.lightMode === "night" ? "Night" : phaseOf(input.minutes));

function buildBaseScene(input: SceneInput, poses: Poses, t: number, reduced: boolean): Scene {
  const P = LANDMARK_POINTS;
  const phase = scenePhase(input);
  // The Peaks snow by default; elsewhere only when asked (/weather snow). /weather clear turns it off everywhere.
  const snow = (input.snow ?? input.zone === "peaks") ? snowfall(t, reduced) : [];
  const strength = GLOW_STRENGTH[phase];

  const player = input.downed
    ? placed("explorer-down", poses.player, { rotate: true, variant: "grey" })
    : explorer(poses.player, withClass(input.playerColor, input.playerClass));
  const mates = input.teammates.flatMap((m) => (poses.teammates[m.id] ? [explorer(poses.teammates[m.id], withClass(m.color, m.cls))] : []));
  const bob = !reduced && Math.floor(t / 400) % 2 === 1 ? -1 : 0;
  const droneBox = spriteBox("drone", poses.drone);
  const drone: Drawable = {
    ...placed("drone", poses.drone),
    y: droneBox.y + bob,
    frame: reduced ? 0 : Math.floor(t / 125) % 2,
  };

  if (input.zone !== "peaks") {
    const upright = [
      ...interiorDecorations(input.zone),
      ...wallTilesInWorld(input.zone),
      ...props(input.zone),
      ...(input.zone === "village" ? villageLife(t, reduced) : []),
      ...learning(input),
      ...mates,
      player,
    ].sort(byFeet);
    if (input.zone === "forest") {
      const you = poses.player;
      const deer = deerPose(t, reduced, you);
      const rabbit = rabbitPose(t, reduced, you);
      const squirrel = squirrelPose(t, reduced, you);
      const pulse = Math.floor(t / 500) % 2;
      upright.push(
        ...MUSHROOM_POINTS.filter((m) => !input.mushrooms?.includes(m.id)).map((m) => placed("glow-mushroom", m.at, { frame: reduced ? 0 : pulse })),
        placed("deer", deer, { frame: deer.frame, flip: deer.flip }),
        placed("rabbit", rabbit, { frame: rabbit.frame, flip: rabbit.flip }),
        placed("squirrel", squirrel, { frame: squirrel.frame, flip: squirrel.flip }),
      );
      upright.sort(byFeet);
      const flame = reduced ? 0 : Math.floor(t / 400) % 2;
      const fire = upright.find((d) => d.sprite === "campfire");
      if (fire) fire.frame = flame;
      // At dusk and night an owl blinks from the old oak's branches (drawn right after it, so it sits in the crown).
      if (strength > 0) {
        const oak = upright.findIndex((d) => d.sprite === "old-oak");
        const owl = placed("owl", { x: FOREST_POINTS.oak.x + 8, y: FOREST_POINTS.oak.y - 30 }, { frame: !reduced && Math.floor(t / 1000) % 5 === 0 ? 1 : 0 });
        if (oak >= 0) upright.splice(oak + 1, 0, owl);
      }
      const light = [...glow(LIGHTS.campfire, CAMPFIRE_GLOW, strength * (flame === 0 ? 1 : 0.8)), ...forestLeaves(t, reduced, strength), ...forestAir(t, reduced, strength)];
      return { zone: input.zone, glints: [], flat: [], upright, drone, tint: forestTint(PHASE_TINT[phase]), light, snow };
    }
    if (input.zone === "village") {
      // The windmill's sails turn and the fountain's spray dances; copies, so cached drawables are never changed.
      const frames: Partial<Record<SpriteId, number>> = reduced ? {} : { windmill: Math.floor(t / 600) % 2, fountain: Math.floor(t / 300) % 2 };
      const animated = upright.map((d) => (frames[d.sprite] === undefined ? d : { ...d, frame: frames[d.sprite]! }));
      return { zone: input.zone, glints: [], flat: [], upright: animated, drone, tint: PHASE_TINT[phase], light: villageLight(t, reduced, strength, input.master), snow };
    }
    if (input.zone === "desert") {
      // The lizard sits on its rock (drawn right after it) and flicks its tail; the tumbleweed rolls through.
      const lizard = placed("lizard", { x: DESERT_POINTS.lizardRock.x, y: DESERT_POINTS.lizardRock.y - 12 }, { frame: reduced ? 0 : Math.floor(t / 700) % 2 });
      const you = poses.player;
      const scorpion = scorpionPose(t, reduced, you);
      const camel = camelPose(t, reduced, you);
      const snake = snakePose(t, reduced, you);
      const fennec = fennecPose(t, reduced, you);
      const wild = [
        ...JAR_POINTS.filter((j) => !input.jars?.includes(j.id)).map((j) => placed("jar", j.at, { frame: reduced ? 0 : Math.floor(t / 600) % 2 })),
        placed("scorpion", scorpion, { frame: scorpion.frame, flip: scorpion.flip }),
        placed("camel", camel, { frame: camel.frame, flip: camel.flip }),
        placed("snake", snake, { frame: snake.frame, flip: snake.flip }),
        // The fennec only comes out once the sun is going down.
        ...(strength > 0 ? [placed("fennec", fennec, { frame: fennec.frame, flip: fennec.flip })] : []),
      ];
      const withWeed = [...upright, ...wild, tumbleweed(t, reduced)].sort(byFeet);
      withWeed.splice(withWeed.findIndex((d) => d.sprite === "rock" && d.x === spriteBox("rock", DESERT_POINTS.lizardRock).x) + 1, 0, lizard);
      const storm = stormStrength(t, reduced);
      // The storm browns the whole screen, over the hour's own tint.
      const tint = storm === 0 ? PHASE_TINT[phase] : `rgba(190,150,80,${Math.round(storm * 22) / 100})`;
      return { zone: input.zone, glints: [], flat: [], upright: [...withWeed, ...vultures(t, reduced)], drone, tint, light: [...desertAir(t, reduced), ...desertSky(t, reduced, strength)], snow };
    }
    if (input.zone === "beach") {
      const strips = tideStrips(input.minutes);
      const pier = pierLife(t, reduced, strength);
      const castle = input.sandcastleBuilt ? 1 : 0;
      const props = upright.map((d) => (d.sprite === "sandcastle" ? { ...d, frame: castle } : d));
      const bare = strips === 0 ? TIDE_SHELLS.map((at) => placed("shell", at)) : [];
      const withLife = [...props, ...BEACH_SHELLS.map((at) => placed("shell", at)), ...bare, ...birds(t, reduced), crab(t, reduced), pier.rowboat].sort(byFeet);
      // The lanterns stand on the planks: drawn right after the pier, so the planks do not hide them.
      withLife.splice(withLife.findIndex((d) => d.sprite === "pier") + 1, 0, ...pier.lanterns);
      return { zone: input.zone, glints: [], flat: tideTiles(strips), upright: withLife, drone, tint: PHASE_TINT[phase], light: [...beachWater(t, reduced, strips), ...pier.light], snow };
    }
    if (input.zone === "foggaten") {
      const lighthouse = upright.find((d) => d.sprite === "lighthouse");
      if (lighthouse) lighthouse.frame = input.lighthouseLit ? 1 : 0;
      const light = input.lighthouseLit ? lighthouseLight(t, reduced, strength) : [];
      // The Golden Semicolon: the X once the scroll is decoded, then the semicolon glowing where it was dug up.
      const dig = FOGGATEN_POINTS.dig;
      const digging = input.clueDecoded && !input.artifactFound;
      const flat: Drawable[] = digging ? [placed("x-mark", dig)] : [];
      if (input.artifactFound) {
        upright.push(placed("semicolon", dig));
        upright.sort(byFeet);
        const box = spriteBox("semicolon", dig);
        const centre = { x: box.x + box.w / 2, y: box.y + Math.floor(box.h / 2) - 1 };
        light.push(...glow(centre, GOLD, reduced ? 1 : SEMICOLON_STEPS[Math.floor(t / 267) % SEMICOLON_STEPS.length]));
      }
      if (digging && !reduced && t % 1500 < 250) light.push({ x: dig.x + 2, y: dig.y - 2, color: WHITE, alpha: 1 });
      return { zone: input.zone, glints: [], flat, upright, drone, tint: PHASE_TINT[phase], light, snow };
    }
    return { zone: input.zone, glints: [], flat: [], upright, drone, tint: PHASE_TINT[phase], light: [], snow };
  }

  const iceGlints: Pixel[] = reduced
    ? []
    : ICE_GLINTS.flatMap((g, i) =>
        (t + i * 1000) % 3000 < 250 ? [-1, 0, 1].map((dx) => ({ x: g.x + dx, y: g.y, color: WHITE, alpha: 1 })) : [],
      );
  const glints: Pixel[] = [...iceGlints, ...snowSparkles(t, reduced), ...footprints(poses.prints ?? [], t, reduced)];

  const flat: Drawable[] = [];
  if (input.towerPowered)
    for (let i = 0; i < PLANK_ROWS; i++) flat.push(placed("plank", { x: BRIDGE_RECT.x + 13, y: BRIDGE_RECT.y + (i + 1) * 3 - 1 }));

  // The fox and goat drift away from you; the arrow over the ski lodge (the first chest) bounces until you earn a badge.
  const you = { x: poses.player.x, y: poses.player.y };
  const fox = foxPose(t, reduced, you);
  const goat = goatPose(t, reduced, you);
  const wildlife = [placed("fox", fox, { frame: fox.frame, flip: fox.flip }), placed("goat", goat, { flip: goat.flip }), ...birds(t, reduced)];
  const startArrow = placed("arrow", { x: 62, y: 132 - (!reduced && Math.floor(t / 400) % 2 === 1 ? 1 : 0) });

  const upright = [
    ...interiorDecorations(input.zone),
    ...wallTilesInWorld(input.zone),
    placed("tower", P.tower),
    placed(input.hasLoot ? "chest-open" : "chest-closed", P.chest),
    placed("gate", P.gate, { frame: input.gateUnlocked ? 0 : 1 }),
    placed("dock", DOCK_POINT),
    ...props(input.zone),
    ...wildlife,
    ...(input.earned.length === 0 ? [startArrow] : []),
    // The snow cave appears once the signal tower is powered (shared with the team).
    ...(input.towerPowered ? [placed("snow-cave", CAVE_POINT)] : []),
    ...learning(input),
    ...mates,
    player,
  ].sort(byFeet);

  const light: Pixel[] = [];
  const lampOn = input.towerPowered || reduced || Math.floor(t / 500) % 2 === 0;
  const lampColor = input.towerPowered ? GREEN : RED;
  if (lampOn) light.push(...glow(LIGHTS.towerLamp, lampColor, strength), { ...LIGHTS.towerLamp, color: lampColor, alpha: 1 });
  light.push(...glow(LIGHTS.gateTerminal, GREEN, strength));
  if (reduced || Math.floor(t / 530) % 2 === 0) light.push({ ...LIGHTS.gateTerminal, color: GREEN, alpha: 1 });
  if (input.towerPowered && !reduced) {
    const p = (t % 2000) / 1000;
    if (p < 1) {
      const alpha = 1 - Math.floor(4 * p) / 4;
      light.push(...circlePixels(4 + Math.floor(24 * p)).map((o) => ({ x: P.tower.x + o.x, y: P.tower.y + o.y, color: GREEN, alpha })));
    }
  }

  light.push(...campLight(t, reduced, strength), ...aurora(t, reduced, strength), ...coldFeel(t, reduced, poses.player));

  // The campfire's flame flickers (copies, so the cached drawables are never changed).
  const flame = reduced ? 0 : Math.floor(t / 400) % 2;
  const spin = reduced ? 0 : Math.floor(t / 300) % 2;
  const animated = upright.map((d) => (d.sprite === "campfire" ? { ...d, frame: flame } : d.sprite === "station" ? { ...d, frame: spin } : d));

  return { zone: input.zone, glints, flat, upright: animated, drone, tint: PHASE_TINT[phase], light, snow };
}

