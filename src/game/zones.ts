import { CHESTS } from "../learn/chests";
import { ADA, ARCHIVE, BEACH_SIGNPOST, BOUNDS, CAMPFIRE, DESERT_SIGNPOST, DOCK, FISHER, FOREST_SIGNPOST, HERMIT, ISLAND_DOCK, ISLAND_FIRE, LIGHTHOUSE, LOG, NOMAD, PEAKS_SIGNPOST, POIS, RANGER, SANDCASTLE_POI, SIGNPOST, TERMINAL, WEATHER_STATION } from "./constants";
import { DESERT_JARS, DESERT_LORE } from "./desertLore";
import { FOREST_LORE, FOREST_MUSHROOMS } from "./forestLore";
import type { Poi, PoiId, Point } from "./types";

export type ZoneId = "peaks" | "village" | "forest" | "foggaten" | "desert" | "beach";

/**
 * Where a zone's edge opens onto its neighbour. `min`/`max` are the rows (inclusive) a horizontal step
 * leaves through on a west or east edge, or the columns on a south or north edge.
 */
export type Exit = { edge: "west" | "east" | "south" | "north"; min: number; max: number; to: ZoneId };

/**
 * One screen of the world. `wall`: the north wall runs across it; `gate`: that wall has the gate's opening
 * (otherwise it is solid everywhere); `river`: the frozen river's cold and survey apply there.
 */
export type Zone = { id: ZoneId; name: string; entered: string; exits: Exit[]; wall: boolean; gate: boolean; places: Poi[]; river: boolean };

/** A zone's outdoor language chests as places, named after the landmark they are inside, in the chest table's order. */
export function chestPlaces(zone: ZoneId): Poi[] {
  return CHESTS.flatMap((c) => (c.zone === zone && c.at ? [{ id: c.id as PoiId, label: c.host!, ...c.at }] : []));
}

export const ZONES: Record<ZoneId, Zone> = {
  peaks: {
    id: "peaks",
    name: "C++ Peaks",
    entered: LOG.enteredPeaks,
    exits: [
      { edge: "west", min: 62, max: 78, to: "village" },
      { edge: "south", min: 62, max: 78, to: "forest" },
    ],
    wall: true,
    gate: true,
    places: [...POIS, DOCK, PEAKS_SIGNPOST, WEATHER_STATION, ...chestPlaces("peaks")],
    river: true,
  },
  village: {
    id: "village",
    name: "Dev Village",
    entered: LOG.enteredVillage,
    exits: [{ edge: "east", min: 62, max: 78, to: "peaks" }],
    wall: false,
    gate: false,
    places: [ADA, SIGNPOST, TERMINAL, ARCHIVE, ...chestPlaces("village")],
    river: false,
  },
  forest: {
    id: "forest",
    name: "Dense Forest",
    entered: LOG.enteredForest,
    exits: [
      { edge: "north", min: 62, max: 78, to: "peaks" },
      { edge: "west", min: 62, max: 78, to: "desert" },
      { edge: "east", min: 62, max: 78, to: "beach" },
    ],
    wall: false,
    gate: false,
    places: [RANGER, CAMPFIRE, FOREST_SIGNPOST, ...FOREST_LORE, ...FOREST_MUSHROOMS, ...chestPlaces("forest")],
    river: false,
  },
  desert: {
    id: "desert",
    name: "Sunbaked Desert",
    entered: LOG.enteredDesert,
    exits: [{ edge: "east", min: 62, max: 78, to: "forest" }],
    wall: false,
    gate: false,
    places: [NOMAD, DESERT_SIGNPOST, ...DESERT_LORE, ...DESERT_JARS, ...chestPlaces("desert")],
    river: false,
  },
  beach: {
    id: "beach",
    name: "Sunny Beach",
    entered: LOG.enteredBeach,
    exits: [{ edge: "west", min: 62, max: 78, to: "forest" }],
    wall: false,
    gate: false,
    places: [FISHER, BEACH_SIGNPOST, SANDCASTLE_POI, ...chestPlaces("beach")],
    river: false,
  },
  // No edge leads here: the island is entered and left by boat, from a dock (the `sail` action).
  foggaten: {
    id: "foggaten",
    name: "Foggaten Island",
    entered: LOG.enteredFoggaten,
    exits: [],
    wall: false,
    gate: false,
    places: [ISLAND_DOCK, LIGHTHOUSE, HERMIT, ISLAND_FIRE, ...chestPlaces("foggaten")],
    river: false,
  },
};

/**
 * The exit a step leaves through: a step whose target is off one of the zone's edges, taken along that
 * edge's axis from a row (west/east) or column (south/north) inside the exit's span.
 */
export function exitFrom(exits: readonly Exit[], from: Point, to: Point): Exit | null {
  for (const exit of exits) {
    const horizontal = exit.edge === "west" || exit.edge === "east";
    const off =
      exit.edge === "west" ? to.x < BOUNDS.minX
      : exit.edge === "east" ? to.x > BOUNDS.maxX
      : exit.edge === "south" ? to.y > BOUNDS.maxY
      : to.y < BOUNDS.minY;
    const along = horizontal ? to.y === from.y && from.y >= exit.min && from.y <= exit.max : to.x === from.x && from.x >= exit.min && from.x <= exit.max;
    if (off && along) return exit;
  }
  return null;
}

export const exitFor = (zone: ZoneId, from: Point, to: Point): Exit | null => exitFrom(ZONES[zone].exits, from, to);

/** Where you and the drone land after leaving through an exit: on the opposite edge, same row or column, the drone 8 steps in and 2 aside. */
export function arrival(exit: Exit, from: Point): { player: Point; drone: Point } {
  switch (exit.edge) {
    case "west":
      return { player: { x: BOUNDS.maxX, y: from.y }, drone: { x: BOUNDS.maxX - 8, y: from.y - 2 } };
    case "east":
      return { player: { x: BOUNDS.minX, y: from.y }, drone: { x: BOUNDS.minX + 8, y: from.y - 2 } };
    case "south":
      return { player: { x: from.x, y: BOUNDS.minY }, drone: { x: from.x - 2, y: BOUNDS.minY + 8 } };
    case "north":
      return { player: { x: from.x, y: BOUNDS.maxY }, drone: { x: from.x - 2, y: BOUNDS.maxY - 8 } };
  }
}
