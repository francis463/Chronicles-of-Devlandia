import { phaseOf } from "../game/clock";
import type { Phase, Point } from "../game/types";
import type { ZoneId } from "../game/zones";
import { AREAS } from "./areas";
import type { Pose } from "./motion";
import { circlePixels, diamondPixels } from "./pixels";
import { LIGHTS, SPRITES, spriteBox, type SpriteId } from "./sprites";
import { BRIDGE_RECT, LANDMARK_POINTS, WALL_RECT, decorations, wallTiles } from "./terrain";
import { REACHABLE_RECT, WORLD, intersects, type ArtPoint } from "./world";
import type { ChestId } from "../learn/types";
import { ARCHIVE_POINT, CS_CHEST_POINT, TERMINAL_POINT, chestPoints } from "./learnPoints";

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
  teammates: { id: string; name: string; color: string; x: number; y: number }[];
  playerColor: string;
  downed: boolean;
  hasLoot: boolean;
  gateUnlocked: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  towerPowered: boolean;
  minutes: number;
  archiveOpen: boolean;
  matcherSolved: boolean;
  /** Your badges: their chests draw open. */
  earned: ChestId[];
  /** Your own view's lighting: "day" or "night" draws as that phase whatever the clock says. */
  lightMode?: "auto" | "day" | "night";
  /** Your own view's weather: snowfall over the whole world. */
  snow?: boolean;
};
export type Poses = { player: Pose; drone: Pose; teammates: Record<string, Pose> };
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

const placed = (sprite: SpriteId, at: ArtPoint, extra: Partial<Drawable> = {}): Drawable => {
  const box = spriteBox(sprite, at);
  return { sprite, frame: 0, x: box.x, y: box.y, flip: false, rotate: false, variant: "base", ...extra };
};

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

/** A zone's code chests (open once earned), and in the village the Syntax Terminal, the Archive and the C# chest. */
function learning(input: SceneInput): Drawable[] {
  const chest = (id: ChestId, at: ArtPoint) => placed("code-chest", at, { frame: input.earned.includes(id) ? 1 : 0 });
  const chests = chestPoints(input.zone).map((c) => chest(c.id, c.at));
  if (input.zone !== "village") return chests;
  return [
    ...chests,
    placed("syntax-terminal", TERMINAL_POINT, { frame: input.matcherSolved ? 1 : 0 }),
    placed("archive", ARCHIVE_POINT, { frame: input.archiveOpen ? 1 : 0 }),
    ...(input.archiveOpen ? [chest("chest-cs", CS_CHEST_POINT)] : []),
  ];
}

const byFeet = (a: Drawable, b: Drawable) => feetRow(a) - feetRow(b) || Number(isExplorer(a)) - Number(isExplorer(b));

export function buildScene(input: SceneInput, poses: Poses, t: number, reduced: boolean): Scene {
  const P = LANDMARK_POINTS;
  const phase: Phase = input.lightMode === "day" ? "Day" : input.lightMode === "night" ? "Night" : phaseOf(input.minutes);
  const snow = input.snow ? snowfall(t, reduced) : [];
  const strength = GLOW_STRENGTH[phase];

  const player = input.downed
    ? placed("explorer-down", poses.player, { rotate: true, variant: "grey" })
    : explorer(poses.player, input.playerColor);
  const mates = input.teammates.flatMap((m) => (poses.teammates[m.id] ? [explorer(poses.teammates[m.id], m.color)] : []));
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
      ...learning(input),
      ...mates,
      player,
    ].sort(byFeet);
    if (input.zone === "forest") {
      const flame = reduced ? 0 : Math.floor(t / 400) % 2;
      const fire = upright.find((d) => d.sprite === "campfire");
      if (fire) fire.frame = flame;
      const light = glow(LIGHTS.campfire, CAMPFIRE_GLOW, strength * (flame === 0 ? 1 : 0.8));
      return { zone: input.zone, glints: [], flat: [], upright, drone, tint: forestTint(PHASE_TINT[phase]), light, snow };
    }
    return { zone: input.zone, glints: [], flat: [], upright, drone, tint: PHASE_TINT[phase], light: [], snow };
  }

  const glints: Pixel[] = reduced
    ? []
    : ICE_GLINTS.flatMap((g, i) =>
        (t + i * 1000) % 3000 < 250 ? [-1, 0, 1].map((dx) => ({ x: g.x + dx, y: g.y, color: WHITE, alpha: 1 })) : [],
      );

  const flat: Drawable[] = [];
  if (input.towerPowered)
    for (let i = 0; i < PLANK_ROWS; i++) flat.push(placed("plank", { x: BRIDGE_RECT.x + 13, y: BRIDGE_RECT.y + (i + 1) * 3 - 1 }));
  const digging = input.clueDecoded && !input.artifactFound;
  if (digging) flat.push(placed("x-mark", P.dig));

  const upright = [
    ...interiorDecorations(input.zone),
    ...wallTilesInWorld(input.zone),
    placed("tower", P.tower),
    placed(input.hasLoot ? "chest-open" : "chest-closed", P.chest),
    placed("gate", P.gate, { frame: input.gateUnlocked ? 0 : 1 }),
    ...(input.artifactFound ? [placed("semicolon", P.dig)] : []),
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
  if (input.artifactFound) {
    const box = spriteBox("semicolon", P.dig);
    const centre = { x: box.x + box.w / 2, y: box.y + Math.floor(box.h / 2) - 1 };
    light.push(...glow(centre, GOLD, reduced ? 1 : SEMICOLON_STEPS[Math.floor(t / 267) % SEMICOLON_STEPS.length]));
  }
  if (digging && !reduced && t % 1500 < 250) light.push({ x: P.dig.x + 2, y: P.dig.y - 2, color: WHITE, alpha: 1 });

  return { zone: input.zone, glints, flat, upright, drone, tint: PHASE_TINT[phase], light, snow };
}

