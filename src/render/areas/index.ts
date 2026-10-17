import type { ZoneId } from "../../game/zones";
import type { Area } from "./area";
import { DESERT } from "./desert";
import { FOGGATEN } from "./foggaten";
import { FOREST } from "./forest";
import { PEAKS } from "./peaks";
import { VILLAGE } from "./village";

export const AREAS: Record<ZoneId, Area> = { peaks: PEAKS, village: VILLAGE, forest: FOREST, foggaten: FOGGATEN, desert: DESERT };
