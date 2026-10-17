import type { ZoneId } from "../../game/zones";
import type { Area } from "./area";
import { FOREST } from "./forest";
import { PEAKS } from "./peaks";
import { VILLAGE } from "./village";

// foggaten is a stand-in until its own area exists (Task 4 of the Foggaten plan).
export const AREAS: Record<ZoneId, Area> = { peaks: PEAKS, village: VILLAGE, forest: FOREST, foggaten: { ...FOREST, id: "foggaten" } };
