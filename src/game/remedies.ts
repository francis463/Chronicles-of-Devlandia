import type { Poi, PoiId, RemedyId } from "./types";
import type { ZoneId } from "./zones";

/** One food find in each of the forest, the desert, the beach and the village garden. */
export const REMEDIES: Array<Poi & { id: RemedyId; zone: ZoneId; short: string; far: string; picked: string }> = [
  {
    id: "remedy-herb",
    zone: "forest",
    label: "Healing Herb",
    short: "Herb",
    x: 66,
    y: 62,
    far: "A little herb with a white flower. The ranger says it soothes cuts and aches. Walk up to it and press [E] to pick it.",
    picked: "You already picked the healing herb.",
  },
  {
    id: "remedy-fruit",
    zone: "desert",
    label: "Cactus Fruit",
    short: "Fruit",
    x: 34,
    y: 20,
    far: "A prickly pear with a ripe red fruit, full of water. Walk up to it and press [E] to pick it.",
    picked: "You already ate the cactus fruit.",
  },
  {
    id: "remedy-drink",
    zone: "beach",
    label: "Cold Drink",
    short: "Drink",
    x: 64,
    y: 62,
    far: "A glass of cold lemonade left on the sand. Walk up to it and press [E] to take it.",
    picked: "You already drank the cold lemonade.",
  },
  {
    id: "remedy-carrot",
    zone: "village",
    label: "Garden Carrot",
    short: "Carrot",
    x: 90,
    y: 36,
    far: "A fat carrot with its green top poking out of the garden soil. Walk up to it and press [E] to pull it.",
    picked: "You already pulled the carrot.",
  },
];

export const isRemedy = (id: PoiId): id is RemedyId => id.startsWith("remedy-");
export const remediesIn = (zone: ZoneId) => REMEDIES.filter((r) => r.zone === zone);
export const remedyPacked = (label: string) => `You pack the ${label.toLowerCase()} as food. Eat it from your inventory when you are hurt.`;
