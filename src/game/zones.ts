import { BOUNDS, LOG, POIS } from "./constants";
import type { Poi, Point } from "./types";

export type ZoneId = "peaks" | "village";

/** Where a zone's edge opens onto its neighbour: the rows (inclusive) a horizontal step leaves through. */
export type Exit = { edge: "west" | "east"; minY: number; maxY: number; to: ZoneId };

/**
 * One screen of the world. `gate`: the wall there has the gate's opening (otherwise it is solid
 * everywhere); `river`: the frozen river's cold and survey apply there.
 */
export type Zone = { id: ZoneId; name: string; entered: string; exit: Exit; gate: boolean; places: Poi[]; river: boolean };

export const ZONES: Record<ZoneId, Zone> = {
  peaks: {
    id: "peaks",
    name: "C++ Peaks",
    entered: LOG.enteredPeaks,
    exit: { edge: "west", minY: 62, maxY: 78, to: "village" },
    gate: true,
    places: POIS,
    river: true,
  },
  village: {
    id: "village",
    name: "Dev Village",
    entered: LOG.enteredVillage,
    exit: { edge: "east", minY: 62, maxY: 78, to: "peaks" },
    gate: false,
    places: [],
    river: false,
  },
};

/** The exit a step leaves through: a horizontal step off the zone's exit edge, from a row inside its span. */
export function exitFor(zone: ZoneId, from: Point, to: Point): Exit | null {
  const exit = ZONES[zone].exit;
  const off = exit.edge === "west" ? to.x < BOUNDS.minX : to.x > BOUNDS.maxX;
  return off && to.y === from.y && from.y >= exit.minY && from.y <= exit.maxY ? exit : null;
}

/** Where you and the drone land after leaving through an exit: on the opposite edge, same row, the drone two steps in. */
export function arrival(exit: Exit, y: number): { player: Point; drone: Point } {
  const x = exit.edge === "west" ? BOUNDS.maxX : BOUNDS.minX;
  const inward = exit.edge === "west" ? -8 : 8;
  return { player: { x, y }, drone: { x: x + inward, y: y - 2 } };
}
