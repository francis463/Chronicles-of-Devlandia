import { describe, expect, it } from "vitest";
import { spriteBox } from "./sprites";
import { LANDMARK_POINTS, WALL_RECT, decorations, onPath, protectedBoxes, terrainAt, wallTiles } from "./terrain";
import { REACHABLE_RECT, WORLD, grow, intersects, type Rect } from "./world";

const WORLD_RECT: Rect = { x: 0, y: 0, w: WORLD.width, h: WORLD.height };
// A phone-sized view: 90 art px of scenery above and below the world, some to the sides.
const VIEW: Rect = { x: -40, y: -96, w: 400, h: 372 };
const boxOf = (d: ReturnType<typeof decorations>[number]) => spriteBox(d.sprite, d.at);
const key = (d: ReturnType<typeof decorations>[number]) => `${d.sprite}@${d.at.x},${d.at.y}`;

describe("terrain", () => {
  it("regions by art pixel, inside and outside the world", () => {
    expect(terrainAt(77, 50)).toBe("ice");
    expect(terrainAt(243, 70)).toBe("ice");
    expect(terrainAt(76, 50)).not.toBe("ice");
    expect(terrainAt(244, 70)).not.toBe("ice");
    expect(terrainAt(100, 71)).not.toBe("ice");
    expect(terrainAt(10, 15)).toBe("mountains");
    expect(terrainAt(10, 16)).toBe("snow");
    expect(terrainAt(10, 82)).toBe("snow");
    expect(terrainAt(10, 83)).toBe("meadow");
    expect(terrainAt(186, 112)).toBe("forest");
    expect(terrainAt(185, 112)).toBe("meadow");
    expect(terrainAt(186, 111)).toBe("meadow");
    expect(terrainAt(-20, -40)).toBe("mountains");
    expect(terrainAt(400, 300)).toBe("forest");
    expect(terrainAt(-20, 150)).toBe("meadow");
  });

  it("path: 6 px wide from the start up to just under the gate", () => {
    expect(onPath(90, 115)).toBe(true);
    expect(onPath(125, 100)).toBe(true);
    expect(onPath(160, 93)).toBe(true);
    expect(onPath(87, 115)).toBe(true);
    expect(onPath(92, 115)).toBe(true);
    expect(onPath(93, 115)).toBe(false);
    expect(onPath(120, 115)).toBe(false);
  });
});

describe("decorations", () => {
  it("are deterministic, and a sub-range returns a subset", () => {
    const all = decorations(VIEW).map(key);
    expect(decorations(VIEW).map(key)).toEqual(all);
    const sub = decorations({ x: 100, y: 40, w: 120, h: 100 }).map(key);
    expect(sub.length).toBeGreaterThan(0);
    for (const k of sub) expect(all).toContain(k);
  });

  it("inside the reachable area no grown decoration box hits a protected box, trees ≤ 24 px tall and ≥ 24 px apart", () => {
    const inside = decorations(VIEW).filter((d) => intersects(boxOf(d), REACHABLE_RECT));
    expect(inside.length).toBeGreaterThan(8);
    const guarded = protectedBoxes();
    for (const d of inside) {
      for (const p of guarded) expect(intersects(grow(boxOf(d), 4), p), `${key(d)} vs ${JSON.stringify(p)}`).toBe(false);
      expect(boxOf(d).h).toBeLessThanOrEqual(24);
    }
    for (const a of inside)
      for (const b of inside)
        if (a !== b) expect(Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y), `${key(a)} / ${key(b)}`).toBeGreaterThanOrEqual(24);
  });

  it("barrier decorations lie outside REACHABLE_RECT, and the barrier closes the sides and bottom", () => {
    const touching = decorations(VIEW).filter((d) => intersects(boxOf(d), WORLD_RECT) && !intersects(boxOf(d), REACHABLE_RECT));
    for (const d of touching) expect(["bush", "rock", "snow-rock"], key(d)).toContain(d.sprite);
    const covers = (x: number, y: number) => touching.some((d) => intersects(boxOf(d), { x, y, w: 1, h: 1 }));
    for (let x = 0; x < WORLD.width; x += 4) expect(covers(x, 172), `bottom at ${x}`).toBe(true);
    for (let y = 24; y < 170; y += 4) {
      expect(covers(9, y), `left at ${y}`).toBe(true);
      expect(covers(311, y), `right at ${y}`).toBe(true);
    }
  });
});

describe("the north wall", () => {
  it("wall tiles: 18 inside the world at feet row 89, none over the gate", () => {
    const tiles = wallTiles(WALL_RECT);
    const xs = [...Array.from({ length: 9 }, (_, k) => 8 + 16 * k), ...Array.from({ length: 9 }, (_, i) => 8 + 16 * (11 + i))];
    expect(tiles.map((t) => t.x)).toEqual(xs);
    expect(tiles.every((t) => t.y === 89)).toBe(true);
    const gate = spriteBox("gate", LANDMARK_POINTS.gate);
    expect(tiles.some((t) => intersects(spriteBox("wall", t), gate))).toBe(false);
  });

  it("wall tiles continue beyond the world, by box", () => {
    const xs = wallTiles({ x: -7, y: 0, w: 334, h: 180 }).map((t) => t.x);
    expect(xs).toContain(-8);
    expect(xs).toContain(328);
    expect(wallTiles({ x: 0, y: 0, w: 320, h: 70 })).toEqual([]);
  });

  it("no interior decoration comes near the wall", () => {
    const band: Rect = { x: -1000, y: 80, w: 3000, h: 10 };
    const interior = decorations(REACHABLE_RECT).filter((d) => intersects(boxOf(d), REACHABLE_RECT));
    for (const d of interior) expect(intersects(grow(boxOf(d), 4), band), key(d)).toBe(false);
  });
});
