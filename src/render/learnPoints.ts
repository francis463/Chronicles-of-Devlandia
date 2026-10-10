import { TERMINAL } from "../game/constants";
import type { ZoneId } from "../game/zones";
import { CHESTS } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { toArt, type ArtPoint } from "./world";

/** Where the learning core's places stand in art pixels. The Archive is the village's middle hut. */
export const ARCHIVE_POINT: ArtPoint = { x: 176, y: 116 };
/** The C# chest stands in the Archive's doorway once it is unsealed. */
export const CS_CHEST_POINT: ArtPoint = { x: 176, y: 119 };
export const TERMINAL_POINT: ArtPoint = toArt(TERMINAL);

/** A zone's outdoor chests at their art points, in the chest table's order. */
export const chestPoints = (zone: ZoneId): { id: ChestId; north: boolean; at: ArtPoint }[] =>
  CHESTS.flatMap((c) => (c.zone === zone && c.at ? [{ id: c.id, north: c.north, at: toArt(c.at) }] : []));
