import { LOG } from "./constants";
import type { GameState } from "./types";

type Progress = Pick<GameState, "hasLoot" | "clueDecoded" | "artifactFound" | "lighthouseLit">;

/**
 * The hermit's hints, in quest order: he speaks to the first stage you haven't done. The island can only be
 * reached once the gate is open, so he never talks about it.
 */
const STAGES: Array<[keyof Progress, string]> = [
  ["hasLoot", "You sailed through the fog, good. Back on the mainland, a Supply Cache hides in the Hollow Tree in the Dense Forest. Empty it."],
  ["clueDecoded", "That cache holds a scrambled scroll. Open it from your inventory: every letter is shifted 13 places."],
  ["artifactFound", "The scroll points here, to my island. Look for the X in its south-east corner, past the trees, and dig."],
  ["lighthouseLit", "The lighthouse lamp wants a letter, spelled in eight switches of binary. Look for the terminal by its door."],
];
const DONE = "You have the Golden Semicolon. The fog has little left to hide from you, explorer. Stay a while by the fire.";

export function hermitLine(s: Progress): string {
  return STAGES.find(([flag]) => !s[flag])?.[1] ?? DONE;
}

/** The inspection cards of the island's quiet places. */
export const ISLAND_COPY = {
  dock: { default: "A wooden pier on the east shore. Walk up to it and press [E] to sail.", locked: "A wooden pier on the east shore. The boatman waits for the gate to open." },
  "island-dock": "The pier you landed at. Press [E] beside it to sail back to the Peaks.",
  lighthouse: "An old lighthouse. Its lamp is dark and its door is shut. Something inside needs power.",
  lighthouseLit: LOG.lighthouseOnline,
  "island-fire": "A fire burns low in the fog. Someone keeps it going for whoever lands here next.",
} as const;
