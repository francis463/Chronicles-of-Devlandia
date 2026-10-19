import { maskRude } from "../chat/filter";
import type { Row } from "../leaderboard/leaderboard";
import { CLASSES, DEFAULT_CLASS } from "./classes";
import type { HallSlotId, Poi } from "./types";

export const HALL_SLOT_COUNT = 10;

/**
 * Where the top ten stand, in rank order (percent of the zone). Rank 1 is on the tallest block in the middle of the stage,
 * 2 on its left and 3 on its right; ranks 4 to 10 stand on the ground below in two rows (three, then four, keeping clear of the door columns at the
 * bottom), each far enough from its neighbours that the name plates above their heads stay apart.
 */
const SPOTS: ReadonlyArray<[number, number]> = [
  // The heroes' feet are the tops of the podium blocks (22, 16 and 12 px high) that stand on the stage floor 60 px down.
  [50, 21.1], [28, 24.4], [72, 26.7],
  [24, 60], [50, 60], [76, 60],
  [11, 90], [33, 90], [67, 90], [89, 90],
];

export const HALL_SLOTS: Poi[] = SPOTS.map(([x, y], i) => ({ id: `hall-${i + 1}` as HallSlotId, label: `Spot ${i + 1}`, x, y }));

/** The signpost in the north-west corner, beside the stage. */
export const HALL_SIGNPOST: Poi = { id: "hall-signpost", label: "Signpost", x: 10, y: 25 };

const SLOT_IDS: ReadonlySet<string> = new Set(HALL_SLOTS.map((s) => s.id));
export const isHallSlot = (id: string): id is HallSlotId => SLOT_IDS.has(id);
/** 0-based position of a spot in the list (rank order). */
export const hallSlotIndex = (id: HallSlotId): number => Number(id.slice("hall-".length)) - 1;

/** The signpost's card. */
export const HALL_SIGN_TEXT = "Hall of Fame. The top ten players by badges stand here: the first three on the stage, the rest on the ground. Walk up to a figure and press [E] to read who they are. The list is fetched each time you walk in.";

/** What pressing E on a spot says: who stands there (name, true rank, badges, class), or that it waits for a player. */
export function hallLine(slot: Row | null, index: number): string {
  if (!slot) return `Spot ${index + 1} is waiting for a player.`;
  return `${maskRude(slot.name)}: rank ${slot.rank}, ${slot.badges}/11 badges, ${CLASSES[slot.cls ?? DEFAULT_CLASS].name}.`;
}
