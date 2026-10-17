import { waterLine } from "./desertLore";
import type { GameState } from "./types";

/** The Sunbaked Desert's words. The nomad's hint never changes: nothing in the desert depends on your progress. */
export const NOMAD_LINE =
  "Water first, explorer. The oasis lies west of here, the old pyramid beyond it. If you lose your way, the signpost by the forest road knows every dune.";

/** Everything the nomad says: her directions, then her water line. */
export const nomadSays = (s: Pick<GameState, "jars" | "nomadServed">): string => `${NOMAD_LINE} ${waterLine(s)}`;

export const DESERT_COPY = {
  "desert-signpost":
    "Dense Forest → East, through the gap in the dunes. NOMAD → Ahead, on the sand road. OASIS → West, past the nomad. PYRAMID → Far west, beyond the oasis.",
} as const;
