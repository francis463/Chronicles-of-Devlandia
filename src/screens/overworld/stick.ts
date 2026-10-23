import type { Direction } from "../../game/types";

/** The joystick: the ring's radius, how far the knob may travel, and how far from the middle a lean starts to count (CSS px). */
export const STICK_RING = 48;
export const STICK_TRAVEL = 28;
export const STICK_DEAD = 14;

/**
 * Which of the four ways a thumb leans, from the middle of the ring: the bigger of the sideways and up/down lean wins,
 * a tie goes up or down, and inside the dead zone it is nothing (so resting a thumb is not a step).
 */
export function stickDirection(dx: number, dy: number, dead = STICK_DEAD): Direction | null {
  if (Math.hypot(dx, dy) < dead) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

/** Where the knob is drawn: the thumb's lean, held to `max` px from the middle with the angle kept. */
export function knobOffset(dx: number, dy: number, max = STICK_TRAVEL): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  return len <= max ? { x: dx, y: dy } : { x: (dx / len) * max, y: (dy / len) * max };
}
