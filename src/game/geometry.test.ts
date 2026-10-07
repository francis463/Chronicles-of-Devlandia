import { describe, expect, it } from "vitest";
import { clampPlayer, distance, isInRiver, nearestPoi, poiInRange } from "./geometry";

describe("geometry", () => {
  it("measures Euclidean distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("clamps the player inside the map bounds", () => {
    expect(clampPlayer({ x: 2, y: 95 })).toEqual({ x: 6, y: 90 });
    expect(clampPlayer({ x: 99, y: 3 })).toEqual({ x: 94, y: 10 });
  });

  it("finds the nearest point of interest", () => {
    const nearest = nearestPoi({ x: 50, y: 52 });
    expect(nearest.poi.id).toBe("gate");
    expect(nearest.distance).toBe(2);
  });

  it("treats the river zone bounds as inclusive", () => {
    expect(isInRiver({ x: 24, y: 28 })).toBe(true);
    expect(isInRiver({ x: 76, y: 39 })).toBe(true);
    expect(isInRiver({ x: 23.9, y: 30 })).toBe(false);
    expect(isInRiver({ x: 50, y: 39.1 })).toBe(false);
  });

  it("finds the signal tower in the snowy top-left", () => {
    expect(poiInRange({ x: 14, y: 26 })?.id).toBe("tower");
  });

  it("also considers extra points of interest passed in, such as a revealed dig spot", () => {
    const spot = { id: "artifact" as const, label: "Golden Semicolon", x: 72, y: 84 };
    expect(poiInRange({ x: 72, y: 80 })).toBeNull();
    expect(poiInRange({ x: 72, y: 80 }, [spot])?.id).toBe("artifact");
  });

  it("returns the nearest point of interest only when within interact range", () => {
    expect(poiInRange({ x: 50, y: 58 })?.id).toBe("gate");
    expect(poiInRange({ x: 50, y: 63 })?.id).toBe("gate");
    expect(poiInRange({ x: 50, y: 63.1 })).toBeNull();
    expect(poiInRange({ x: 28, y: 72 })).toBeNull();
  });
});
