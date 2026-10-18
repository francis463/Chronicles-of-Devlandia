import { afterEach, describe, expect, it } from "vitest";
import { INTERACT_RADIUS, STEP } from "./constants";
import { ZONE_SCALE, reachFor, stepFor } from "./zoneSize";
import { ZONES, type ZoneId } from "./zones";

const real = { ...ZONE_SCALE };
afterEach(() => {
  Object.assign(ZONE_SCALE, real);
});

describe("zone scale", () => {
  it("every zone has a scale, and the step and reach follow it", () => {
    for (const zone of Object.keys(ZONES) as ZoneId[]) expect(typeof ZONE_SCALE[zone], zone).toBe("number");
    ZONE_SCALE.beach = 1;
    expect([stepFor("beach"), reachFor("beach")]).toEqual([STEP, INTERACT_RADIUS]);
    ZONE_SCALE.beach = 2;
    expect([stepFor("beach"), reachFor("beach")]).toEqual([STEP / 2, INTERACT_RADIUS / 2]);
    expect(stepFor("village")).toBe(STEP);
  });
});
