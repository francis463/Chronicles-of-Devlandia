import { describe, expect, it } from "vitest";
import { ARROW_INSET, pingArrow } from "./pingArrow";

const map = { width: 600, height: 400 };

describe("pingArrow", () => {
  it("is null for a point on the map, edges included", () => {
    for (const p of [{ x: 300, y: 200 }, { x: 0, y: 0 }, { x: 600, y: 400 }]) expect(pingArrow(p, map)).toBeNull();
  });

  it("points left, right, up and down from the middle of each edge", () => {
    expect(pingArrow({ x: -500, y: 200 }, map)).toEqual({ left: ARROW_INSET, top: 200, angle: 180 });
    expect(pingArrow({ x: 1500, y: 200 }, map)).toEqual({ left: 600 - ARROW_INSET, top: 200, angle: 0 });
    expect(pingArrow({ x: 300, y: -300 }, map)).toEqual({ left: 300, top: ARROW_INSET, angle: -90 });
    expect(pingArrow({ x: 300, y: 900 }, map)).toEqual({ left: 300, top: 400 - ARROW_INSET, angle: 90 });
  });

  it("a point past a corner puts the arrow on the line to it, inside the map", () => {
    const a = pingArrow({ x: 1500, y: 1000 }, map)!;
    expect(a.left).toBeGreaterThanOrEqual(ARROW_INSET);
    expect(a.left).toBeLessThanOrEqual(600 - ARROW_INSET);
    expect(a.top).toBeGreaterThanOrEqual(ARROW_INSET);
    expect(a.top).toBeLessThanOrEqual(400 - ARROW_INSET);
    // On the line from the centre (300, 200) toward (1500, 1000): its slope is 800 / 1200.
    expect((a.top - 200) / (a.left - 300)).toBeCloseTo(800 / 1200, 5);
    expect(a.angle).toBeCloseTo((Math.atan2(800, 1200) * 180) / Math.PI, 5);
  });
});
