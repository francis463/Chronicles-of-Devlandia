import type { GameState, Poi } from "./types";

/** The Peaks' ski lodge as a place: the building you walk into by its door (the HTML chest has moved inside). */
export const LODGE_DOOR: Poi = { id: "lodge-door", label: "Ski Lodge", x: 19.4, y: 89.4 };

/** The lodge's fireplace: a landmark with a card. */
export const LODGE_FIREPLACE: Poi = { id: "lodge-fireplace", label: "Fireplace", x: 20, y: 31 };

/** The review book on the table: press E beside it to read every language's questions you have earned. */
export const LODGE_BOOK: Poi = { id: "lodge-book", label: "Review Book", x: 61.9, y: 62 };

export const LODGE_CARDS = {
  book: "An open book of every language's questions. Walk up to it and press E to read the ones you have earned.",
  door: "The Ski Lodge. Walk into its door to go inside.",
  fireplace: "A crackling fire. The logs burn in order, one after another, like the lines of a program.",
} as const;

/** The lodge keeper: she stands by the fire and hands out hints and, once, soup. */
export const KEEPER: Poi = { id: "lodge-keeper", label: "Keeper", x: 38, y: 52 };

type Progress = Pick<GameState, "gateUnlocked" | "hasLoot" | "clueDecoded" | "artifactFound" | "badges">;

/** The keeper's hints, in quest order: she speaks to the first stage you haven't done. */
const STAGES: Array<[keyof Omit<Progress, "badges">, string]> = [
  ["gateUnlocked", "Welcome to the Ski Lodge! Outside, the Peaks' north wall stands locked. Its gate opens with one CSS fix."],
  ["hasLoot", "The gate's open! Empty the Supply Cache, hidden in the Hollow Tree in the Dense Forest south of the Peaks: they say it holds an old scroll."],
  ["clueDecoded", "That scroll is scrambled. Decode it from your inventory: every letter is shifted 13 places."],
  ["artifactFound", "The scroll points across the sea, to Foggaten Island. Take the boat from the Peaks' east dock and dig where the X is."],
];
const DONE = "You found the Golden Semicolon! Warm yourself by the fire any time, explorer.";
const SHELF = " The shelf by the fire holds a sealed HTML chest.";

export function keeperLine(s: Progress): string {
  const hint = STAGES.find(([flag]) => !s[flag])?.[1] ?? DONE;
  return s.badges.includes("chest-html") ? hint : hint + SHELF;
}

/** Her soup: served once when you are hurt, never in hard mode. */
export const SOUP = {
  served: "The keeper packs you a bowl of soup. Eat it from your inventory when you are hurt.",
  offer: "Take a bowl of my soup for the road. It will mend you.",
  taken: "Warm up by the fire any time.",
} as const;

/** Everything she says: the hint, then her soup line (none in hard mode). */
export const keeperSays = (s: Progress & Pick<GameState, "soupTaken" | "hard">): string =>
  `${keeperLine(s)}${s.hard ? "" : ` ${s.soupTaken ? SOUP.taken : SOUP.offer}`}`;
