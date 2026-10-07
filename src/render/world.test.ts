import { describe, expect, it } from "vitest";
import { REACHABLE_RECT, fitWorld, grow, intersects, toArt, type ArtPoint, type Rect } from "./world";

const r1 = (n: number) => Math.round(n * 10) / 10;
const inside = (p: ArtPoint, r: Rect) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

describe("fitWorld", () => {
  it("fits the spec's examples", () => {
    const rows: Array<[number, number, number, number, number, number, number, number]> = [
      [668, 360, 1, 2, 640, 360, 14, 0],
      [668, 360, 2, 4, 640, 360, 14, 0],
      [668, 360, 1.25, 2, 512, 288, 78.4, 36],
      [668, 360, 0.9, 1, 355.6, 200, 156.7, 80],
      [354, 360, 3, 3, 320, 180, 17, 90],
      [600, 360, 1, 1, 320, 180, 140, 90],
    ];
    for (const [width, height, dpr, s, w, h, left, top] of rows) {
      const world = fitWorld({ width, height, dpr });
      expect([world.s, r1(world.width), r1(world.height), r1(world.left), r1(world.top)], `${width}×${height}@${dpr}`).toEqual([
        s,
        w,
        h,
        left,
        top,
      ]);
      expect(Number.isInteger(world.ox) && Number.isInteger(world.oy)).toBe(true);
      expect(world.scale).toBeCloseTo(s / dpr);
    }
    const w125 = fitWorld({ width: 668, height: 360, dpr: 1.25 });
    expect([w125.backingWidth, w125.backingHeight]).toEqual([835, 450]);
  });

  it("fitWorld of a 300-px-wide view centres and clips", () => {
    const world = fitWorld({ width: 300, height: 360, dpr: 1 });
    expect([world.s, world.width, world.left]).toEqual([1, 320, -10]);
    expect([world.backingWidth, world.backingHeight]).toEqual([300, 360]);
  });
});

describe("art coordinates", () => {
  it("toArt rounds percentages to art pixels", () => {
    expect(toArt({ x: 24, y: 28 })).toEqual({ x: 77, y: 50 });
    expect(toArt({ x: 76, y: 39 })).toEqual({ x: 243, y: 70 });
    expect(toArt({ x: 14, y: 18 })).toEqual({ x: 45, y: 32 });
    expect(toArt({ x: 82, y: 18 })).toEqual({ x: 262, y: 32 });
    expect(toArt({ x: 50, y: 50 })).toEqual({ x: 160, y: 90 });
    expect(toArt({ x: 72, y: 84 })).toEqual({ x: 230, y: 151 });
    expect(toArt({ x: 28, y: 72 })).toEqual({ x: 90, y: 130 });
  });

  it("REACHABLE_RECT covers BOUNDS", () => {
    expect(inside(toArt({ x: 6, y: 10 }), REACHABLE_RECT)).toBe(true);
    expect(inside(toArt({ x: 94, y: 90 }), REACHABLE_RECT)).toBe(true);
    expect(inside(toArt({ x: 2, y: 10 }), REACHABLE_RECT)).toBe(false);
    expect(inside(toArt({ x: 98, y: 90 }), REACHABLE_RECT)).toBe(false);
    expect(inside(toArt({ x: 6, y: 6 }), REACHABLE_RECT)).toBe(false);
    expect(inside(toArt({ x: 94, y: 94 }), REACHABLE_RECT)).toBe(false);
  });

  it("intersects and grow", () => {
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 })).toBe(true);
    expect(grow({ x: 5, y: 5, w: 2, h: 2 }, 1)).toEqual({ x: 4, y: 4, w: 4, h: 4 });
  });
});
