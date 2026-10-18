import type { GameState, MushroomId, Poi, PoiId } from "./types";

/** The Dense Forest's lore landmarks: each has a card that links something in the woods to an idea from the code chests. */
export const FOREST_LORE: Array<Poi & { text: string }> = [
  {
    id: "hunter-cabin",
    label: "Hunter's Cabin",
    x: 45,
    y: 28,
    text: "A snug log cabin with its window lit. Its door is latched with an if statement: if (cold) { addLog(); }. The hunter stacks wood only when the condition is true.",
  },
  {
    id: "forest-well",
    label: "Stone Well",
    x: 80,
    y: 56,
    text: "An old stone well. Dropping a bucket is like calling a function that calls a function: each one waits for the one below. Call yourself forever (infinite recursion) and the bucket never comes up.",
  },
  {
    id: "forest-brook",
    label: "Log Bridge",
    x: 82,
    y: 82,
    text: "A brook with a log laid over it. A bridge joins two banks the way an API joins a client and a server: each side stays itself, and messages cross between them.",
  },
  {
    id: "fairy-ring",
    label: "Fairy Ring",
    x: 18,
    y: 78,
    text: "Eight toadstools in a circle. It reads like a loop: for (let i = 0; i < 8; i++) walks the ring once and stops when the condition fails. Forget to stop it and you dance forever.",
  },
  {
    id: "hollow-tree",
    label: "Hollow Tree",
    x: 84,
    y: 29,
    text: "A hollow tree stuffed with acorns. It is a variable: let acorns = 3; names a hollow and stores a value in it. The squirrel changes the value; the tree keeps the name.",
  },
];

/** The ranger's lost glow mushrooms: three to find and bring back for her stew. */
export const FOREST_MUSHROOMS: Array<Poi & { id: MushroomId }> = [
  { id: "mushroom-1", label: "Glow Mushroom", x: 10, y: 44 },
  { id: "mushroom-2", label: "Glow Mushroom", x: 44, y: 36 },
  { id: "mushroom-3", label: "Glow Mushroom", x: 92, y: 52 },
];

export const isMushroom = (id: PoiId): id is MushroomId => id.startsWith("mushroom-");

/** What picking each mushroom teaches: the first three facts about arrays, counted from zero. */
export const MUSHROOM_TIPS = [
  "Glow mushroom 1 of 3. Arrays count from 0: pot[0] is the first item.",
  "Glow mushroom 2 of 3. pot[1] is the second item: the index is always one less than its place in line.",
  "Glow mushroom 3 of 3. pot[2] is the last of three, and pot.length is 3: the last index is length - 1.",
] as const;

export const MUSHROOM_CARD = {
  far: "A mushroom with a violet cap that glows faintly. Walk up to it and press [E] to pick it.",
  picked: "You already picked this glow mushroom for the ranger.",
} as const;

/** The ranger's stew line. It never gates her main hints: it is added after them. */
export function stewLine(s: Pick<GameState, "mushrooms" | "rangerFed">): string {
  if (s.rangerFed) return "Thanks again for the mushrooms! Remember: const pot = ['cap', 'cap', 'cap']; pot[2] is the last one.";
  if (s.mushrooms.length >= FOREST_MUSHROOMS.length)
    return "You found all three glow mushrooms! The stew is on, and you can take a bowl for the road. Tip: const pot = ['cap', 'cap', 'cap']; pot[2] is the last one.";
  return `Oh, and if you pass any glow mushrooms, bring me three for my stew (${s.mushrooms.length} of ${FOREST_MUSHROOMS.length}).`;
}

export const FOREST_LOG = {
  stew: "The ranger packs you a bowl of stew. Eat it from your inventory when you are hurt.",
} as const;
