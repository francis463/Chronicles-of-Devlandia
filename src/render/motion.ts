import type { Facing } from "./sprites";
import type { ArtPoint } from "./world";

export type EntityKind = "player" | "teammate" | "drone";

/** Each glide lasts about as long as the gap between that entity's position updates. */
export const GLIDE_MS: Record<EntityKind, number> = { player: 150, teammate: 250, drone: 300 };
export const WALK_EXTRA_MS = 150;
export const WALK_FRAME_MS = 125;

export type Motion = {
  kind: EntityKind;
  from: ArtPoint;
  to: ArtPoint;
  start: number;
  facing: Facing;
  lastMove: number;
  walkStart: number;
  steps: number;
};
/** frame 0 is standing, 1 and 2 are the walking frames. */
export type Pose = { x: number; y: number; facing: Facing; frame: 0 | 1 | 2 };

const NEVER = Number.NEGATIVE_INFINITY;

const progress = (m: Motion, t: number, reduced: boolean) =>
  reduced ? 1 : Math.min(1, Math.max(0, (t - m.start) / GLIDE_MS[m.kind]));

const drawnAt = (m: Motion, t: number, reduced: boolean): ArtPoint => {
  const p = progress(m, t, reduced);
  return { x: m.from.x + (m.to.x - m.from.x) * p, y: m.from.y + (m.to.y - m.from.y) * p };
};

function facingOf(dx: number, dy: number, current: Facing): Facing {
  if (dx === 0 && dy === 0) return current;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export const createMotion = (kind: EntityKind, at: ArtPoint, t: number): Motion => ({
  kind,
  from: at,
  to: at,
  start: t,
  facing: "down",
  lastMove: NEVER,
  walkStart: NEVER,
  steps: 0,
});

/** Starts a glide from where the sprite is drawn now; unchanged targets return the same motion. */
export function retarget(m: Motion, to: ArtPoint, t: number, reduced: boolean): Motion {
  if (to.x === m.to.x && to.y === m.to.y) return m;
  const stillWalking = t - m.lastMove < GLIDE_MS[m.kind] + WALK_EXTRA_MS;
  return {
    kind: m.kind,
    from: drawnAt(m, t, reduced),
    to,
    start: t,
    facing: facingOf(to.x - m.to.x, to.y - m.to.y, m.facing),
    lastMove: t,
    walkStart: stillWalking ? m.walkStart : t,
    steps: m.steps + 1,
  };
}

/** Jumps straight to a point (first appearance, respawn): no glide, no facing change, not walking. */
export const snap = (m: Motion, to: ArtPoint, t: number): Motion => ({
  ...m,
  from: to,
  to,
  start: t,
  lastMove: NEVER,
  walkStart: NEVER,
});

export function poseAt(m: Motion, t: number, reduced: boolean): Pose {
  const at = drawnAt(m, t, reduced);
  const walking = t - m.lastMove < GLIDE_MS[m.kind] + WALK_EXTRA_MS;
  const frame = !walking ? 0 : reduced ? 1 + (m.steps % 2) : 1 + (Math.floor((t - m.walkStart) / WALK_FRAME_MS) % 2);
  return { x: Math.round(at.x), y: Math.round(at.y), facing: m.facing, frame: frame as Pose["frame"] };
}
