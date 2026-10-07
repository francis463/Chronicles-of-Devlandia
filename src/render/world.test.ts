import { describe, expect, it } from "vitest";
import { DRONE_START, PLAYER_START } from "../game/constants";
import { visibleArt } from "./paint";
import { spriteBox } from "./sprites";
import { REACHABLE_RECT, backdropWorld, fitWorld, grow, intersects, toArt, type ArtPoint, type Rect, type ViewSize } from "./world";

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

describe("backdropWorld", () => {
  // Desktops, laptops, tablets, phones in both orientations, a split window, fractional pixel ratios.
  const VIEWS: ViewSize[] = [
    { width: 1280, height: 800, dpr: 1 },
    { width: 1920, height: 1080, dpr: 1 },
    { width: 1440, height: 900, dpr: 2 },
    { width: 2560, height: 1440, dpr: 2 },
    { width: 3440, height: 1440, dpr: 1 },
    { width: 1280, height: 800, dpr: 1.25 },
    { width: 768, height: 1024, dpr: 2 },
    { width: 500, height: 900, dpr: 1 },
    { width: 390, height: 844, dpr: 3 },
    { width: 412, height: 915, dpr: 2.625 },
    { width: 360, height: 800, dpr: 3 },
    { width: 375, height: 667, dpr: 2 },
    { width: 360, height: 640, dpr: 3 },
    { width: 320, height: 568, dpr: 2 },
    { width: 844, height: 390, dpr: 3 },
  ];
  const camp = toArt(PLAYER_START);
  const name = (v: ViewSize) => `${v.width}x${v.height}@${v.dpr}`;

  it("covers the whole view with whole device pixels per art pixel, no strip left uncovered", () => {
    for (const v of VIEWS) {
      const w = backdropWorld(v, camp);
      const bw = Math.round(v.width * v.dpr);
      const bh = Math.round(v.height * v.dpr);
      expect([w.backingWidth, w.backingHeight], name(v)).toEqual([bw, bh]);
      expect(Number.isInteger(w.s) && w.s >= 1, name(v)).toBe(true);
      expect(w.scale, name(v)).toBeCloseTo(w.s / v.dpr, 10);
      // The world spans the full width, and from the top of its rows to the bottom of the screen.
      expect(w.ox, name(v)).toBeLessThanOrEqual(0);
      expect(w.ox + 320 * w.s, name(v)).toBeGreaterThanOrEqual(bw);
      expect(w.oy + 180 * w.s, name(v)).toBeGreaterThanOrEqual(bh);
      expect([w.left, w.top, w.width, w.height], name(v)).toEqual([w.ox / v.dpr, w.oy / v.dpr, 320 * w.scale, 180 * w.scale]);
    }
  });

  it("never bakes more ground than the world itself, whatever the screen", () => {
    for (const v of VIEWS) {
      const area = visibleArt(backdropWorld(v, camp));
      expect(area.w, name(v)).toBeLessThanOrEqual(321);
      expect(area.h, name(v)).toBeLessThanOrEqual(181);
    }
  });

  it("keeps the explorer and drone at camp on screen, centred across where the world allows, and low enough to clear a menu", () => {
    for (const v of VIEWS) {
      const w = backdropWorld(v, camp);
      const css = (r: Rect) => ({ left: (w.ox + r.x * w.s) / v.dpr, right: (w.ox + (r.x + r.w) * w.s) / v.dpr, top: (w.oy + r.y * w.s) / v.dpr, bottom: (w.oy + (r.y + r.h) * w.s) / v.dpr });
      const me = css(spriteBox("explorer-down", camp));
      const drone = css(spriteBox("drone", toArt(DRONE_START)));
      for (const box of [me, drone]) {
        expect(box.left >= 0 && box.right <= v.width && box.top >= 0 && box.bottom <= v.height, `${name(v)} ${JSON.stringify(box)}`).toBe(true);
      }
      // Feet in the bottom fifth of the screen, the explorer's middle as near the centre as the world allows.
      expect(me.bottom, name(v)).toBeGreaterThanOrEqual(0.8 * v.height - 1);
      const atAnEdge = w.ox === 0 || w.ox === w.backingWidth - 320 * w.s;
      const offCentre = Math.abs((me.left + me.right) / 2 - v.width / 2);
      expect(atAnEdge || offCentre <= w.scale, `${name(v)} off centre by ${offCentre}`).toBe(true);
    }
  });
});
