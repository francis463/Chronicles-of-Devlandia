import { maskRude } from "../chat/filter";
import type { Row } from "../leaderboard/leaderboard";
import { CLASSES, DEFAULT_CLASS } from "./classes";
import type { HallSlotId, Poi } from "./types";

export const HALL_SLOT_COUNT = 10;

/**
 * Where the top ten stand, in rank order (percent of the zone). Rank 1 is on the tallest block in the middle of the stage,
 * 2 on its left and 3 on its right; ranks 4 to 10 stand on the ground below in two staggered rows, leaving the middle aisle
 * from the south door to the stage open.
 */
const SPOTS: ReadonlyArray<[number, number]> = [
  // The heroes' feet are the tops of the podium blocks (22, 16 and 12 px high) that stand on the stage floor 66 px down.
  [50, 24.4], [34, 27.8], [66, 30],
  [14, 52], [30, 52], [70, 52], [86, 52],
  [24, 68], [50, 68], [76, 68],
];

export const HALL_SLOTS: Poi[] = SPOTS.map(([x, y], i) => ({ id: `hall-${i + 1}` as HallSlotId, label: `Spot ${i + 1}`, x, y }));

/** The signpost by the south door. */
export const HALL_SIGNPOST: Poi = { id: "hall-signpost", label: "Signpost", x: 84, y: 82 };

const SLOT_IDS: ReadonlySet<string> = new Set(HALL_SLOTS.map((s) => s.id));
export const isHallSlot = (id: string): id is HallSlotId => SLOT_IDS.has(id);
/** 0-based position of a spot in the list (rank order). */
export const hallSlotIndex = (id: HallSlotId): number => Number(id.slice("hall-".length)) - 1;

/** What pressing E on a spot says: who stands there (name, true rank, badges, class), or that it waits for a player. */
export function hallLine(slot: Row | null, index: number): string {
  if (!slot) return `Spot ${index + 1} is waiting for a player.`;
  return `${maskRude(slot.name)}: rank ${slot.rank}, ${slot.badges}/11 badges, ${CLASSES[slot.cls ?? DEFAULT_CLASS].name}.`;
}
