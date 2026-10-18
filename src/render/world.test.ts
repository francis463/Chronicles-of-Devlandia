import { describe, expect, it } from "vitest";
import { DRONE_START, PLAYER_START } from "../game/constants";
import { visibleArt } from "./paint";
import { spriteBox } from "./sprites";
import { ZONE_SCALE } from "../game/zoneSize";
import { AREAS } from "./areas";
import type { ZoneId } from "../game/zones";
import { MAX_ZOOM, REACHABLE_RECT, autoZoom, reachableRect, zoneWorld, zoomRange, backdropWorld, fitStep, fitWorld, zoomLabel, grow, intersects, toArt, type ArtPoint, type Rect, type ViewSize } from "./world";

const r1 = (n: number) => Math.round(n * 10) / 10;
const inside = (p: ArtPoint, r: Rect) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

describe("Whole map", () => {
  const big = { width: 640, height: 360 };
  it("fits the whole zone to the view exactly instead of in whole pixels, so no wide border shows", () => {
    const size = { width: 1152, height: 672, dpr: 1 };
    const { min } = zoomRange(size, big);
    const w = fitWorld(size, min, { x: 320, y: 180 }, big);
    expect(w.s).toBeCloseTo(1.8, 5);
    expect(w.width).toBeCloseTo(1152, 3);
    expect(w.height).toBeLessThanOrEqual(672);
    // One step in is back to whole pixels.
    expect(Number.isInteger(fitWorld(size, min + 1, { x: 320, y: 180 }, big).s)).toBe(true);
  });

  it("is the whole-pixel fit when that already fills the view", () => {
    const size = { width: 1280, height: 720, dpr: 1 };
    expect(fitWorld(size, zoomRange(size, big).min, { x: 320, y: 180 }, big).s).toBe(2);
  });
});

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

describe("fitWorld zoom", () => {
  const view = (width: number, height: number, dpr = 1): ViewSize => ({ width, height, dpr });

  it("zoom 0 is the old fit, whatever the focus", () => {
    const v = view(900, 600);
    expect(fitWorld(v, 0, { x: 300, y: 10 })).toEqual(fitWorld(v));
    expect(fitStep(v)).toBe(2);
  });

  it("one step up is one more device pixel per art pixel: the tight side scrolls, the other stays centred while it fits", () => {
    const w = fitWorld(view(900, 600), 1);
    expect(w.s).toBe(fitStep(view(900, 600)) + 1);
    expect(w.top).toBe((600 - 180 * 3) / 2);
    expect(w.left).toBe(Math.round(900 / 2 - 160.5 * 3));
  });

  it("past the view's size the world scrolls to keep the focus centred, and never past its edges", () => {
    const v = view(600, 360);
    const zoomed = fitWorld(v, 2, { x: 160, y: 90 });
    expect(zoomed.s).toBe(3);
    expect(zoomed.left).toBe(Math.round(600 / 2 - 160.5 * 3));
    const west = fitWorld(v, 2, { x: 0, y: 90 });
    expect(west.left).toBe(0);
    const east = fitWorld(v, 2, { x: 319, y: 90 });
    expect(east.left).toBe(600 - 320 * 3);
    const north = fitWorld(v, 2, { x: 160, y: 0 });
    expect(north.top).toBe(0);
    const south = fitWorld(v, 2, { x: 160, y: 179 });
    expect(south.top).toBe(360 - 180 * 3);
  });

  it("auto zoom steps up only when whole-pixel fitting leaves wide empty bands", () => {
    expect(autoZoom(view(900, 600))).toBe(1);
    expect(autoZoom(view(640, 360))).toBe(0);
    expect(autoZoom(view(700, 400))).toBe(0);
    expect(autoZoom(view(600, 360))).toBe(1);
    expect(MAX_ZOOM).toBe(3);
  });

  it("the label is the zoom as a multiple of fit", () => {
    expect(zoomLabel(view(900, 600), 0)).toBe("1×");
    expect(zoomLabel(view(900, 600), 1)).toBe("1.5×");
    expect(zoomLabel(view(900, 600), 2)).toBe("2×");
    expect(zoomLabel(view(320, 180), 3)).toBe("4×");
  });
});

describe("zone worlds", () => {
  const big = { width: 640, height: 360 };

  it("the reachable rectangle is the game's bounds in art pixels, for any world size", () => {
    expect(reachableRect()).toEqual({ x: 19, y: 18, w: 283, h: 145 });
    expect(REACHABLE_RECT).toEqual(reachableRect());
    expect(reachableRect(big)).toEqual({ x: 38, y: 36, w: 565, h: 289 });
  });

  it("toArt scales a percent by the world it is given", () => {
    expect(toArt({ x: 50, y: 50 })).toEqual({ x: 160, y: 90 });
    expect(toArt({ x: 50, y: 50 }, big)).toEqual({ x: 320, y: 180 });
  });

  it("zoneWorld is the screen times the zone's scale, and every area carries it", () => {
    const real = ZONE_SCALE.forest;
    try {
      ZONE_SCALE.forest = 2;
      expect(zoneWorld("forest")).toEqual(big);
      expect(zoneWorld("village")).toEqual({ width: 320, height: 180 });
    } finally {
      ZONE_SCALE.forest = real;
    }
    for (const zone of Object.keys(AREAS) as ZoneId[]) expect(AREAS[zone].world, zone).toEqual(zoneWorld(zone));
  });
});

describe("the camera in a world bigger than the screen", () => {
  const view = (width: number, height: number, dpr = 1): ViewSize => ({ width, height, dpr });
  const big = { width: 640, height: 360 };

  it("zoomRange: a one-screen world cannot zoom out; a 2 × 2 world can, down to the scale that fits it all", () => {
    expect(zoomRange(view(1100, 540), { width: 320, height: 180 })).toEqual({ min: 0, max: 3 });
    expect(zoomRange(view(1100, 540), big)).toEqual({ min: 1 - 3, max: 3 });
    expect(zoomRange(view(700, 400), big)).toEqual({ min: -1, max: 3 });
    expect(zoomRange(view(330, 190), big)).toEqual({ min: 0, max: 3 });
  });

  it("zoom 0 shows a screen's worth at today's scale and follows the focus", () => {
    const v = view(1100, 540);
    const centre = fitWorld(v, 0, { x: 320, y: 180 }, big);
    expect(centre.s).toBe(fitStep(v));
    expect(centre.width).toBe(640 * centre.scale);
    expect(centre.left).toBe(Math.round(1100 / 2 - 320.5 * centre.s));
    expect(fitWorld(v, 0, { x: 0, y: 0 }, big).left).toBe(0);
    expect(fitWorld(v, 0, { x: 639, y: 359 }, big).left).toBe(1100 - 640 * centre.s);
    expect(fitWorld(v, 0, { x: 639, y: 359 }, big).top).toBe(540 - 360 * centre.s);
  });

  it("the lowest zoom fits the whole zone, centred", () => {
    const v = view(1100, 540);
    const { min } = zoomRange(v, big);
    const whole = fitWorld(v, min, undefined, big);
    // 1100 × 540: the height limits it, at exactly 1.5 device px per art px.
    expect(whole.s).toBe(1.5);
    expect([whole.width, whole.height]).toEqual([960, 540]);
    expect(whole.left).toBe(70);
    expect(fitWorld(v, min - 5, undefined, big).s).toBe(whole.s);
  });

  it("a one-screen world behaves exactly as before, negative zoom included", () => {
    const v = view(900, 600);
    expect(fitWorld(v, -2)).toEqual(fitWorld(v, 0));
    expect(fitWorld(v, 1, { x: 100, y: 50 })).toEqual(fitWorld(v, 1, { x: 100, y: 50 }, { width: 320, height: 180 }));
  });

  it("zoomLabel says Whole map at the lowest zoom of a big world", () => {
    const v = view(1100, 540);
    expect(zoomLabel(v, zoomRange(v, big).min, big)).toBe("Whole map");
    expect(zoomLabel(v, 0, big)).toBe("1×");
    expect(zoomLabel(v, 0)).toBe("1×");
  });
});
