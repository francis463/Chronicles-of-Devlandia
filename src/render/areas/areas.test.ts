import { describe, expect, it } from "vitest";
import { ADA, SIGNPOST } from "../../game/constants";
import { toArt } from "../world";
import { AREAS } from ".";
import { VILLAGE_POINTS } from "./village";

describe("areas", () => {
  it("village art points are the game places' art points", () => {
    expect(VILLAGE_POINTS.villager).toEqual(toArt(ADA));
    expect(VILLAGE_POINTS.signpost).toEqual(toArt(SIGNPOST));
    expect(AREAS.peaks.id).toBe("peaks");
  });

  it("every area lists its exit mouths and corridors, each with the same count", () => {
    for (const area of Object.values(AREAS)) {
      expect(area.mouths.length, area.id).toBeGreaterThan(0);
      expect(area.corridors, area.id).toHaveLength(area.mouths.length);
    }
  });
});
