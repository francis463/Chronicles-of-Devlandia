import type { GameState } from "./types";

/** The few fields a pop-up reacts to. */
export type ToastSnap = Pick<GameState, "hasLoot" | "food" | "hp" | "rangerFed" | "nomadServed" | "soupTaken">;
export type Toast = { title: string; sub: string };

/** What you say after eating or drinking, in turn. */
export const EAT_LINES = ["Yummy!", "Delicious!", "Tasty!", "Mmm, so good!", "Refreshing!"] as const;

/**
 * The pop-up for what just changed, or null: the scroll found in the hollow tree; thanks for the food an NPC hands you
 * (the ranger's stew, the nomad's waterskin, the keeper's soup); a happy word when you eat (food down, a heart back).
 * `eaten` is how many times you have eaten so far, so the words come round in order.
 */
export function toastFor(prev: ToastSnap, next: ToastSnap, eaten: number): Toast | null {
  if (next.hasLoot && !prev.hasLoot) return { title: "Ohh, a scroll!", sub: "Decode it from your inventory." };
  if (next.rangerFed && !prev.rangerFed) return { title: "Thank you!", sub: "The ranger gave you a bowl of stew." };
  if (next.nomadServed && !prev.nomadServed) return { title: "Thank you!", sub: "The nomad gave you a waterskin." };
  if (next.soupTaken && !prev.soupTaken) return { title: "Thank you!", sub: "The keeper gave you a bowl of soup." };
  if (next.food < prev.food && next.hp > prev.hp) return { title: EAT_LINES[eaten % EAT_LINES.length], sub: "+1 heart." };
  return null;
}
