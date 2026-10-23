/** Sunny Beach's words. The fisher's hint never changes: nothing on the beach depends on your progress. */
export const FISHER_LINE =
  "The fish are biting off the pier, explorer. The old shipwreck lies north along the shore. If you lose your way, the signpost by the forest road knows the whole coast.";

/** The sandcastle's card: the puzzle's invitation, then the finished castle. */
export const CASTLE_COPY = {
  unbuilt: "A half-built sandcastle: sand, a mould and a tower still to go. Press [E] to put the building steps in order and finish it.",
  built: "The sandcastle stands finished, a little flag on its tallest tower. Code runs top to bottom, so it only works when each line comes after the one it needs.",
} as const;

export const BEACH_COPY = {
  "beach-signpost": "Dense Forest → West, back through the gap in the trees. FISHER → On the sand ahead. PIER → East, at the water's edge. SHIPWRECK → North along the shore.",
} as const;
