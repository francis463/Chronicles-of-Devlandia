import type { GameState, JarId, Poi, PoiId } from "./types";

/** The Sunbaked Desert's lore landmarks: each has a card that links something in the dunes to an idea from the code chests. */
export const DESERT_LORE: Array<Poi & { text: string }> = [
  {
    id: "caravan-camp",
    label: "Caravan Camp",
    x: 76,
    y: 28,
    text: "Two tents from the same caravan, pitched from the same pattern. A class is a pattern like that: write it once, then build as many tents (objects) from it as you like, each with its own owner and its own stripes.",
  },
  {
    id: "desert-well",
    label: "Old Well",
    x: 50,
    y: 28,
    text: "An old well with a rope that goes down a long way. Fetching water is an async job: you send the bucket (a promise), keep walking, and await the water when it is finally ready. Never stand and stare at the rope.",
  },
  {
    id: "temple-door",
    label: "Buried Door",
    x: 42,
    y: 90,
    text: "A stone door sinking into the sand, carved with a lock sign. It is a password check: if (password === secret) { open(); } else { stay shut; }. Real doors never store the secret in plain sight, and never let a guess through twice as easily.",
  },
  {
    id: "dry-riverbed",
    label: "Dry Riverbed",
    x: 22,
    y: 78,
    text: "A cracked riverbed with a small stone bridge over nothing at all. A variable that holds null is like it: the bridge (the name) still stands, but no value flows under it. Check for null before you cross.",
  },
  {
    id: "obelisk",
    label: "Obelisk",
    x: 60,
    y: 44,
    text: "A tall obelisk with a column of golden glyphs. Every glyph stands for a letter shifted along the alphabet: a cipher. The same rule that scrambles a message can unscramble it, so long as you keep the shift (the key) secret.",
  },
];

/** The nomad's three lost water jars, scattered through the dunes. */
export const DESERT_JARS: Array<Poi & { id: JarId }> = [
  { id: "jar-1", label: "Water Jar", x: 8, y: 40 },
  { id: "jar-2", label: "Water Jar", x: 74, y: 84 },
  { id: "jar-3", label: "Water Jar", x: 92, y: 16 },
];

export const isJar = (id: PoiId): id is JarId => id.startsWith("jar-");

/** What picking each jar teaches: three string methods. */
export const JAR_TIPS = [
  'Water jar 1 of 3. "sand".toUpperCase() gives "SAND": a string method makes a new string and leaves the old one alone.',
  'Water jar 2 of 3. "  sand ".trim() gives "sand": trim removes the spaces from both ends of a string.',
  'Water jar 3 of 3. "a-b-c".split("-") gives ["a", "b", "c"]: split breaks a string into an array at each separator.',
] as const;

export const JAR_CARD = {
  far: "A clay water jar, still full. Walk up to it and press [E] to pick it up.",
  picked: "You already took this water jar for the nomad.",
} as const;

/** The nomad's water line. It never replaces her usual directions: it is added after them. */
export function waterLine(s: Pick<GameState, "jars" | "nomadServed">): string {
  if (s.nomadServed) return "Thank you again for the water! Remember: split breaks a string apart, trim cleans its ends and toUpperCase shouts it.";
  if (s.jars.length >= DESERT_JARS.length) return "You carry all three jars! Drink up: the water will put your strength right back. Tip: split, trim and toUpperCase are all string methods.";
  return `And if you find any of my lost water jars out in the dunes, bring me all three (${s.jars.length} of ${DESERT_JARS.length}).`;
}

export const DESERT_LOG = {
  water: "The nomad shares the water. It restores your strength.",
} as const;
