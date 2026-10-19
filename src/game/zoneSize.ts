import { INTERACT_RADIUS, STEP } from "./constants";
import type { ZoneId } from "./zones";

/**
 * How many screens wide and tall each zone is: 1 is one 320 × 180 screen, 2 is 640 × 360 (2 × 2 screens).
 * The game layer owns it; the render layer derives each zone's world from it (`zoneWorld`). Positions stay
 * percent of the zone whatever the scale, so saves and the team protocol never change.
 */
export const ZONE_SCALE: Record<ZoneId, number> = { peaks: 2, village: 1, forest: 2, foggaten: 1, desert: 2, beach: 2, lodge: 1, hall: 1 };

/** A step in percent of the zone: a fixed number of art pixels, so a bigger zone takes more steps to cross. */
export const stepFor = (zone: ZoneId): number => STEP / ZONE_SCALE[zone];

/** How close (in percent of the zone) you must be to use something: a fixed number of art pixels. */
export const reachFor = (zone: ZoneId): number => INTERACT_RADIUS / ZONE_SCALE[zone];
