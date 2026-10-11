import { ADA, ARCHIVE, CAMPFIRE, POIS, RANGER, SIGNPOST, TERMINAL } from "../game/constants";
import type { Poi } from "../game/types";
import { ZONES, type ZoneId } from "../game/zones";
import { chestById } from "../learn/chests";
import type { ChestId } from "../learn/types";

/** Everything `/ping <place>` can point at, in the spec's order. */
export const PING_PLACE_NAMES = [
  "gate", "tower", "cache", "river", "ada", "signpost", "terminal", "archive",
  "html", "css", "java", "cpp1", "cpp2", "py1", "php", "sql", "py2", "cs", "ranger", "campfire", "js",
] as const;
export type PingPlace = (typeof PING_PLACE_NAMES)[number];

export const isPingPlace = (v: unknown): v is PingPlace => typeof v === "string" && (PING_PLACE_NAMES as readonly string[]).includes(v);

type Spot = { zone: ZoneId; x: number; y: number; copy: string };

const poi = (id: string): Poi => POIS.find((p) => p.id === id)!;
const the = (p: Poi, zone: ZoneId): Spot => ({ zone, x: p.x, y: p.y, copy: `the ${p.label}` });
function chest(id: ChestId): Spot {
  const c = chestById(id);
  // The C# chest has no place of its own: it stands in the Archive's doorway.
  const at = c.at ?? ARCHIVE;
  return { zone: c.zone, x: at.x, y: at.y, copy: `the ${c.badge} Chest` };
}

const SPOTS: Record<PingPlace, Spot> = {
  gate: the(poi("gate"), "peaks"),
  tower: the(poi("tower"), "peaks"),
  cache: the(poi("chest"), "peaks"),
  river: the(poi("river"), "peaks"),
  ada: { zone: "village", x: ADA.x, y: ADA.y, copy: ADA.label },
  signpost: the(SIGNPOST, "village"),
  terminal: the(TERMINAL, "village"),
  archive: the(ARCHIVE, "village"),
  html: chest("chest-html"),
  css: chest("chest-css"),
  java: chest("chest-java"),
  cpp1: chest("chest-cpp-1"),
  cpp2: chest("chest-cpp-2"),
  py1: chest("chest-py-1"),
  php: chest("chest-php"),
  sql: chest("chest-sql"),
  py2: chest("chest-py-2"),
  cs: chest("chest-cs"),
  ranger: the(RANGER, "forest"),
  campfire: the(CAMPFIRE, "forest"),
  js: chest("chest-js"),
};

/** Where a place is: its zone and its point in game percentages. */
export const placeSpot = (place: PingPlace): { zone: ZoneId; x: number; y: number } => {
  const { zone, x, y } = SPOTS[place];
  return { zone, x, y };
};

/** How chat names a place: `the Terminal Gate`, `Ada`, `the C++ I Chest`. */
export const placeCopy = (place: PingPlace): string => SPOTS[place].copy;

/** The line teammates read for a ping: `Kai pinged the Terminal Gate.` or `Kai pinged their spot in C++ Peaks.` */
export function pingLine(name: string, ping: { zone: ZoneId; place: PingPlace | null }): string {
  return ping.place ? `${name} pinged ${placeCopy(ping.place)}.` : `${name} pinged their spot in ${ZONES[ping.zone].name}.`;
}
