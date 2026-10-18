import { REMEDIES } from "../../game/remedies";
import type { ZoneId } from "../../game/zones";
import type { SpriteId } from "../sprites";
import { toArt } from "../world";

const SPRITE_OF = { "remedy-herb": "herb", "remedy-fruit": "cactus-fruit", "remedy-drink": "cold-drink" } as const satisfies Record<string, SpriteId>;

/** Where each healing find stands, in art px. Drawn by the scene until used, never as props. */
export const REMEDY_SPOTS = REMEDIES.map((r) => ({ id: r.id, zone: r.zone, sprite: SPRITE_OF[r.id], at: toArt(r) }));
export const remedySpotsIn = (zone: ZoneId) => REMEDY_SPOTS.filter((r) => r.zone === zone);
