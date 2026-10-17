import { TERMINAL } from "../game/constants";
import { toArt, type ArtPoint } from "./world";

/** Where the learning core's places stand in art pixels. The Archive is the village's middle hut. */
export const ARCHIVE_POINT: ArtPoint = { x: 176, y: 116 };
export const TERMINAL_POINT: ArtPoint = toArt(TERMINAL);
