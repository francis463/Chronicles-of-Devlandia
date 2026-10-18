import type { Poi } from "./types";

/** The Peaks' ski lodge as a place: the building you walk into by its door (the HTML chest has moved inside). */
export const LODGE_DOOR: Poi = { id: "lodge-door", label: "Ski Lodge", x: 19.4, y: 89.4 };

/** The lodge's fireplace: a landmark with a card. */
export const LODGE_FIREPLACE: Poi = { id: "lodge-fireplace", label: "Fireplace", x: 20, y: 31 };

export const LODGE_CARDS = {
  door: "The Ski Lodge. Walk into its door to go inside.",
  fireplace: "A crackling fire. The logs burn in order, one after another, like the lines of a program.",
} as const;
