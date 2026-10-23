import type { Poi, PoiId, SecretId } from "./types";
import type { ZoneId } from "./zones";

/** Two hidden spots in each big area (the forest, desert, beach and Peaks), far out in the new part of the map. */
export const SECRETS: Array<Poi & { id: SecretId; zone: ZoneId; text: string }> = [
  {
    id: "secret-moss",
    zone: "forest",
    label: "Moss Clearing",
    x: 14,
    y: 14,
    text: "A soft moss clearing where nothing ever moves. Moss grows once and stays, like a const: you cannot reassign it. A let is the ivy that keeps changing.",
  },
  {
    id: "secret-den",
    zone: "forest",
    label: "Fox Den",
    x: 88,
    y: 88,
    text: "A fox's den with a hole at the back. The den holds null: a value that means nothing is here, on purpose. Open it without checking and your code crashes.",
  },
  {
    id: "secret-cave",
    zone: "desert",
    label: "Hidden Cave",
    x: 10,
    y: 86,
    text: "A cool hidden cave with scratches on its wall. Each scratch is a line of a stack trace, the path of calls that led to a crash. Read it from the top to find where it began.",
  },
  {
    id: "secret-ridge",
    zone: "desert",
    label: "Dune Ridge",
    x: 84,
    y: 18,
    text: "A dune ridge with stones in a crooked line. Array.sort() with no compare function orders by text, so 10 comes before 9. Give it a rule to sort numbers.",
  },
  {
    id: "secret-pool",
    zone: "beach",
    label: "Tide Pool",
    x: 14,
    y: 88,
    text: "A tide pool where a crab loops round the same rock. A loop repeats until you break out of it. Without a break, or a condition that turns false, it never ends.",
  },
  {
    id: "secret-bottle",
    zone: "beach",
    label: "Message in a Bottle",
    x: 86,
    y: 16,
    text: "A bottle with a note inside: return 42. A function hands its answer back with return and stops right there; the lines after it never run.",
  },
  {
    id: "secret-pointer",
    zone: "peaks",
    label: "Frozen Pointer Stone",
    x: 92,
    y: 58,
    text: "A standing stone with an arrow carved into it, frozen in the ice. A pointer holds an address, not the value itself: follow it with * to reach what it points at, and never follow one that points at nothing.",
  },
  {
    id: "secret-hut",
    zone: "peaks",
    label: "Buried Ski Hut",
    x: 10,
    y: 56,
    text: "A ski hut buried to its roof in snow. What you allocate with new you must free with delete, like digging the hut out and filling the hole again. RAII does it for you: the object cleans up when it goes out of scope.",
  },
];

export const isSecret = (id: PoiId): id is SecretId => id.startsWith("secret-");
export const secretsIn = (zone: ZoneId) => SECRETS.filter((s) => s.zone === zone);
/** The first sentence of a card, for the log. */
export const firstSentence = (text: string): string => text.split(/(?<=\.)\s/)[0];
export const SECRET_CARD = { found: "You already found this spot." };
