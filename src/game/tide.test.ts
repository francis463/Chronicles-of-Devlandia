import { describe, expect, it } from "vitest";
import { START_MINUTES } from "./constants";
import { TIDE_PERIOD, tideLevel, tideName, tideStrips } from "./tide";

describe("the tide", () => {
  it("rises and falls once every twelve game hours, between 0 and 1", () => {
    for (let m = 0; m < 3 * TIDE_PERIOD; m += 17) {
      const level = tideLevel(m);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
      expect(tideLevel(m + TIDE_PERIOD)).toBeCloseTo(level, 6);
    }
    expect(tideLevel(TIDE_PERIOD / 4)).toBeCloseTo(1, 6);
    expect(tideLevel((3 * TIDE_PERIOD) / 4)).toBeCloseTo(0, 6);
  });

  it("is named Low and High at the extremes and Rising or Falling between", () => {
    expect(tideName(TIDE_PERIOD / 4)).toBe("High");
    expect(tideName((3 * TIDE_PERIOD) / 4)).toBe("Low");
    expect(tideName(0)).toBe("Rising");
    expect(tideName(TIDE_PERIOD / 2)).toBe("Falling");
    const seen = new Set(Array.from({ length: TIDE_PERIOD }, (_, m) => tideName(m)));
    expect(seen).toEqual(new Set(["Low", "Rising", "High", "Falling"]));
  });

  it("covers the shore with 0, 1 or 2 strips of shallow water, none at low tide and two at high", () => {
    expect(tideStrips((3 * TIDE_PERIOD) / 4)).toBe(0);
    expect(tideStrips(TIDE_PERIOD / 4)).toBe(2);
    expect(tideStrips(0)).toBe(1);
    expect(new Set(Array.from({ length: TIDE_PERIOD }, (_, m) => tideStrips(m)))).toEqual(new Set([0, 1, 2]));
  });

  it("the game starts near low tide", () => {
    expect(tideName(START_MINUTES)).toBe("Low");
  });
});
