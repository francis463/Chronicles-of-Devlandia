import type { Poi, PoiId, RemedyId } from "./types";
import type { ZoneId } from "./zones";

/** One healing find in each of the forest, the desert and the beach. */
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
];

export const isRemedy = (id: PoiId): id is RemedyId => id.startsWith("remedy-");
export const remediesIn = (zone: ZoneId) => REMEDIES.filter((r) => r.zone === zone);
export const remedyPacked = (label: string) => `You pack the ${label.toLowerCase()} as food. Eat it from your inventory when you are hurt.`;
