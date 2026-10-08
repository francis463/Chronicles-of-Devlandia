import { phaseOf } from "../game/clock";
import type { Phase, Point } from "../game/types";
import type { Pose } from "./motion";
import { circlePixels, diamondPixels } from "./pixels";
import { LIGHTS, SPRITES, spriteBox, type SpriteId } from "./sprites";
import { BRIDGE_RECT, LANDMARK_POINTS, decorations } from "./terrain";
import { REACHABLE_RECT, intersects, type ArtPoint } from "./world";

export const PHASE_TINT: Record<Phase, string> = {
  Night: "rgba(20,20,28,0.25)",
  Dusk: "rgba(40,40,32,0.12)",
  Day: "transparent",
};

export type SceneInput = {
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
};
export type Poses = { player: Pose; drone: Pose; teammates: Record<string, Pose> };
/** x/y is the sprite's top-left in art px; variant picks the palette ("base", a hood colour, or "grey"). */
export type Drawable = { sprite: SpriteId; frame: number; x: number; y: number; flip: boolean; rotate: boolean; variant: string };
export type Pixel = { x: number; y: number; color: string; alpha: number };
/** Painted in this order: glints, flat, upright, drone, tint, light. */
export type Scene = { glints: Pixel[]; flat: Drawable[]; upright: Drawable[]; drone: Drawable; tint: string; light: Pixel[] };

const GREEN = "#4ade80";
const RED = "#ef4444";
const GOLD = "#fbbf24";
const WHITE = "#ffffff";
const ICE_GLINTS: ArtPoint[] = [
  { x: 100, y: 56 },
  { x: 160, y: 62 },
  { x: 220, y: 58 },
];
const GLOW_STRENGTH: Record<Phase, number> = { Day: 0, Dusk: 0.5, Night: 1 };
const SEMICOLON_STEPS = [0.25, 0.5, 0.75, 1, 0.75, 0.5];
const PLANK_ROWS = BRIDGE_RECT.h / SPRITES.plank.h;

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

let interior: Drawable[] | null = null;
/** Decorations whose drawings reach into the walkable area are y-sorted with the explorers. */
const interiorDecorations = () =>
  (interior ??= decorations(REACHABLE_RECT)
    .filter((d) => intersects(spriteBox(d.sprite, d.at), REACHABLE_RECT))
    .map((d) => placed(d.sprite, d.at)));

export function buildScene(input: SceneInput, poses: Poses, t: number, reduced: boolean): Scene {
  const P = LANDMARK_POINTS;
  const phase = phaseOf(input.minutes);
  const strength = GLOW_STRENGTH[phase];

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

  const player = input.downed
    ? placed("explorer-down", poses.player, { rotate: true, variant: "grey" })
    : explorer(poses.player, input.playerColor);
  const mates = input.teammates.flatMap((m) => (poses.teammates[m.id] ? [explorer(poses.teammates[m.id], m.color)] : []));
  const upright = [
    ...interiorDecorations(),
    placed("tower", P.tower),
    placed(input.hasLoot ? "chest-open" : "chest-closed", P.chest),
    placed("gate", P.gate),
    ...(input.artifactFound ? [placed("semicolon", P.dig)] : []),
    ...mates,
    player,
  ].sort((a, b) => feetRow(a) - feetRow(b) || Number(isExplorer(a)) - Number(isExplorer(b)));

  const bob = !reduced && Math.floor(t / 400) % 2 === 1 ? -1 : 0;
  const droneBox = spriteBox("drone", poses.drone);
  const drone: Drawable = {
    ...placed("drone", poses.drone),
    y: droneBox.y + bob,
    frame: reduced ? 0 : Math.floor(t / 125) % 2,
  };

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

  return { glints, flat, upright, drone, tint: PHASE_TINT[phase], light };
}

