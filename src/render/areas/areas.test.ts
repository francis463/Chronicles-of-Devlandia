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
});
