import type { GameState } from "./types";

type Progress = Pick<GameState, "gateUnlocked" | "hasLoot" | "clueDecoded" | "artifactFound">;

/** The ranger's hints, in quest order: she speaks to the first stage you haven't done. */
const STAGES: Array<[keyof Progress, string]> = [
  ["gateUnlocked", "Welcome to the Dense Forest! Back north, the Supply Cache waits behind the wall. Its gate opens with one CSS fix."],
  ["hasLoot", "The gate's open! Empty the Supply Cache in the north-east snow: explorers say it holds an old scroll."],
  ["clueDecoded", "That scroll is scrambled. Decode it from your inventory: every letter is shifted 13 places."],
  ["artifactFound", "The scroll points here. Look for the X in the south-east corner of the clearing, and dig there."],
];
const DONE = "You found the Golden Semicolon! The forest has not been this quiet since it went missing. Open any chests you've left, explorer.";

export function rangerLine(s: Progress): string {
  return STAGES.find(([flag]) => !s[flag])?.[1] ?? DONE;
}
