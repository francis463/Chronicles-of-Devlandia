import { stewLine } from "./forestLore";
import type { GameState } from "./types";

type Progress = Pick<GameState, "gateUnlocked" | "hasLoot" | "clueDecoded" | "artifactFound">;

/** The ranger's hints, in quest order: she speaks to the first stage you haven't done. */
const STAGES: Array<[keyof Progress, string]> = [
  ["gateUnlocked", "Welcome to the Dense Forest! Back north, the Peaks' wall stands locked. Its gate opens with one CSS fix."],
  ["hasLoot", "The gate's open! Empty the Supply Cache, hidden in the Hollow Tree in the north-east of this forest: explorers say it holds an old scroll."],
  ["clueDecoded", "That scroll is scrambled. Decode it from your inventory: every letter is shifted 13 places."],
  ["artifactFound", "The scroll points across the sea, to Foggaten Island. Take the boat from the Peaks' east dock and dig where the X is, in the island's south-east corner."],
];
const DONE = "You found the Golden Semicolon! The forest has not been this quiet since it went missing. Open any chests you've left, explorer.";

export function rangerLine(s: Progress): string {
  return STAGES.find(([flag]) => !s[flag])?.[1] ?? DONE;
}

/** Everything the ranger says: her hint for the first stage you have not done, then her stew line. */
export const rangerSays = (s: Progress & Pick<GameState, "mushrooms" | "rangerFed">): string => `${rangerLine(s)} ${stewLine(s)}`;
