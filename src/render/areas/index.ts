import type { ZoneId } from "../../game/zones";
import type { Area } from "./area";
import { PEAKS } from "./peaks";
import { VILLAGE } from "./village";

export const AREAS: Record<ZoneId, Area> = { peaks: PEAKS, village: VILLAGE };
