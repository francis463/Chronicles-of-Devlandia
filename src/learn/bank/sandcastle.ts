import type { MatchChallenge } from "../types";

/** The Sunny Beach's sandcastle: five building steps, listed out of order, to pair with their step numbers. */
export const SANDCASTLE: MatchChallenge = {
  kind: "match",
  id: "sandcastle",
  lang: "logic",
  title: "< SANDCASTLE: SUNNY BEACH >",
  prompt: "Build the castle in the right order: pair each line with the step it runs in, first to fifth.",
  hint: "A line can only use what an earlier line made: the sand comes before the mould, and the flag goes on last.",
  pairs: [
    { snippet: "const tower = build(mould);", label: "3rd" },
    { snippet: "const sand = gather();", label: "1st" },
    { snippet: "castle.add(tower);", label: "4th" },
    { snippet: "castle.addFlag();", label: "5th" },
    { snippet: "const mould = pack(sand);", label: "2nd" },
  ],
  explain:
    "Code runs top to bottom, and a line can only use what an earlier line made: sand is gathered, packed into a mould, built into a tower, added to the castle, and only then does the flag go on top.",
};
