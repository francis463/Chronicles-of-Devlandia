import { SECRETS } from "../../game/secrets";
import type { ZoneId } from "../../game/zones";
import type { SpriteId } from "../sprites";
import { zoneToArt } from "../world";

const SPRITE_OF = {
  "secret-moss": "moss",
  "secret-den": "fox-den",
  "secret-cave": "desert-cave",
  "secret-ridge": "dune-ridge",
  "secret-pool": "tide-pool",
  "secret-bottle": "bottle",
} as const satisfies Record<string, SpriteId>;

/** Where each hidden spot stands, in art px. Drawn by the scene (found or not), never as props. */
export const SECRET_SPOTS = SECRETS.map((s) => ({ id: s.id, zone: s.zone, sprite: SPRITE_OF[s.id], at: zoneToArt(s, s.zone) }));
export const secretSpotsIn = (zone: ZoneId) => SECRET_SPOTS.filter((s) => s.zone === zone);
