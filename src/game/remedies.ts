import type { Poi, PoiId, RemedyId } from "./types";
import type { ZoneId } from "./zones";

/** HP a remedy restores when you pick it up (once, and only when you are hurt). */
export const REMEDY_HEAL = 2;

/** One healing find in each of the forest, the desert and the beach. */
export const REMEDIES: Array<Poi & { id: RemedyId; zone: ZoneId; short: string; far: string; picked: string; healed: string }> = [
  {
    id: "remedy-herb",
    zone: "forest",
    label: "Healing Herb",
    short: "Herb",
    x: 66,
    y: 62,
    far: "A little herb with a white flower. The ranger says it soothes cuts and aches. Walk up to it and press [E] to pick it.",
    picked: "You already picked the healing herb.",
    healed: "You chew the healing herb: +2 HP.",
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
    healed: "The cactus fruit is sweet and cool: +2 HP.",
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
    healed: "The cold lemonade hits the spot: +2 HP.",
  },
];

export const isRemedy = (id: PoiId): id is RemedyId => id.startsWith("remedy-");
export const remediesIn = (zone: ZoneId) => REMEDIES.filter((r) => r.zone === zone);
export const remedyFine = (label: string) => `You feel fine. Come back to the ${label.toLowerCase()} when you are hurt.`;
