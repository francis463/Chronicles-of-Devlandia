import type { Phase } from "../game/types";
import type { SpriteId } from "./sprites";

/** The hours each creature is out and about. A sprite that is not listed is always drawn. */
const ACTIVE: Partial<Record<SpriteId, readonly Phase[]>> = {
  // By day (they turn in at night).
  squirrel: ["Day", "Dusk"],
  chicken: ["Day", "Dusk"],
  bird: ["Day", "Dusk"],
  vulture: ["Day", "Dusk"],
  lizard: ["Day", "Dusk"],
  goat: ["Day", "Dusk"],
  camel: ["Day", "Dusk"],
  // By night (they sleep through the day).
  owl: ["Dusk", "Night"],
  fennec: ["Dusk", "Night"],
  fox: ["Dusk", "Night"],
};

/** Whether a creature is out at this time of day; props, people and the animals that never sleep are always out. */
export function isActive(sprite: SpriteId, phase: Phase): boolean {
  return ACTIVE[sprite]?.includes(phase) ?? true;
}

/** The campfire is only lit from dusk until dawn: by day it is a heap of cold logs. */
export const campfireLit = (phase: Phase): boolean => phase !== "Day";
