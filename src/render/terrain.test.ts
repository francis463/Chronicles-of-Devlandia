import { TERMINAL } from "../game/constants";
import { describe, expect, it } from "vitest";
import { AREAS } from "./areas";
import type { Area } from "./areas/area";
import { spriteBox } from "./sprites";
import { LANDMARK_POINTS, WALL_RECT, decorations, onPath, protectedBoxes, terrainAt, wallTiles } from "./terrain";
import { REACHABLE_RECT, WORLD, grow, intersects, reachableRect, toArt, type Rect } from "./world";

const WORLD_RECT: Rect = { x: 0, y: 0, w: WORLD.width, h: WORLD.height };
// A phone-sized view: 90 art px of scenery above and below the world, some to the sides.
const VIEW: Rect = { x: -40, y: -96, w: 400, h: 372 };
const boxOf = (d: ReturnType<typeof decorations>[number]) => spriteBox(d.sprite, d.at);
const key = (d: ReturnType<typeof decorations>[number]) => `${d.sprite}@${d.at.x},${d.at.y}`;
const { peaks: PEAKS, village: VILLAGE, forest: FOREST } = AREAS;

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
    // South of the wall is snow too: the whole Peaks is the snowy top.
    for (const [x, y] of [[10, 83], [186, 112], [185, 112], [186, 111], [400, 300], [-20, 150], [160, 140]]) expect(terrainAt(x, y), `${x},${y}`).toBe("snow");
    expect(terrainAt(-20, -40)).toBe("mountains");
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

  it("the Peaks' path runs west out of the map", () => {
    expect(onPath(-1003, 127)).toBe(true);
    expect(onPath(92, 132)).toBe(true);
    expect(onPath(0, 133)).toBe(false);
    expect(onPath(0, 126)).toBe(false);
  });

  it("the village: all meadow from top to bottom, its dirt square and its path", () => {
    for (const y of [0, 15, 30, 82, 83, 120]) expect(terrainAt(10, y, VILLAGE), `y=${y}`).toBe("meadow");
    expect(terrainAt(250, 150, VILLAGE)).toBe("meadow");
    expect(onPath(100, 120, VILLAGE)).toBe(true);
    expect(onPath(175, 159, VILLAGE)).toBe(true);
    expect(onPath(176, 130, VILLAGE)).toBe(true);
    expect(onPath(330, 130, VILLAGE)).toBe(true);
    expect(onPath(176, 159, VILLAGE)).toBe(false);
    expect(onPath(200, 140, VILLAGE)).toBe(false);
  });
});

describe("decorations", () => {
  it("are deterministic, and a sub-range returns a subset", () => {
    const all = decorations(VIEW).map(key);
    expect(decorations(VIEW).map(key)).toEqual(all);
    const sub = decorations({ x: 0, y: 40, w: 320, h: 140 }).map(key);
    expect(sub.length).toBeGreaterThan(0);
    for (const k of sub) expect(all).toContain(k);
  });

  it("inside the reachable area no grown decoration box hits a protected box, trees ≤ 24 px tall and ≥ 24 px apart", () => {
    const inside = decorations(VIEW).filter((d) => intersects(boxOf(d), REACHABLE_RECT));
    expect(inside.length).toBeGreaterThan(4);
    const guarded = protectedBoxes();
    for (const d of inside) {
      for (const p of guarded) expect(intersects(grow(boxOf(d), 4), p), `${key(d)} vs ${JSON.stringify(p)}`).toBe(false);
      expect(boxOf(d).h).toBeLessThanOrEqual(24);
    }
    for (const a of inside)
      for (const b of inside)
        if (a !== b) expect(Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y), `${key(a)} / ${key(b)}`).toBeGreaterThanOrEqual(24);
  });

  it.each([
    ["peaks", 9, 311],
    ["village", 311, 9],
    ["forest", null, 9],
    ["desert", 311, 9],
    ["beach", 9, 311],
  ] as const)("barrier decorations lie outside REACHABLE_RECT, and the barrier closes the sides and bottom (%s: open at its exit)", (id, exitX, otherX) => {
    const area = AREAS[id];
    // A bigger area has the same hedge, one screen's art scaled out to its own edges.
    const { width, height } = area.world;
    const K = width / WORLD.width;
    const view: Rect = { x: -40, y: -96, w: width + 80, h: height + 192 };
    const touching = decorations(view, area).filter((d) => intersects(boxOf(d), { x: 0, y: 0, w: width, h: height }) && !intersects(boxOf(d), reachableRect(area.world)));
    // The forest has no hedge on top: trees from the scenery above reach into its top rows.
    for (const d of touching) expect(["bush", "rock", "snow-rock", ...(id === "forest" || id === "village" ? ["tree", "birch", "stump", "log", "mushroom", "fern", "flowers"] : []), ...(id === "desert" ? ["dry-bush", "cactus", "bloom-cactus", "skull", "arch"] : []), ...(id === "beach" ? ["palm"] : [])], key(d)).toContain(d.sprite);
    const covers = (x: number, y: number) => touching.some((d) => intersects(boxOf(d), { x, y, w: 1, h: 1 }));
    // The Peaks' bottom hedge is open at its south exit (art x 192–255); everywhere clear of it the hedge is closed.
    for (let x = 0; x < width; x += 4) {
      const gap = id === "peaks" && x >= 192 && x < 256;
      const nearGap = id === "peaks" && x >= 176 && x < 272;
      if (gap) expect(covers(x, height - 8), `south mouth at ${x}`).toBe(false);
      else if (!nearGap) expect(covers(x, height - 8), `bottom at ${x}`).toBe(true);
    }
    const exitRows = (y: number) => y >= 112 * K && y <= 144 * K - 1;
    const eastX = width - 9;
    const wallX = (x: number) => (x === 311 ? width - 9 : x);
    for (let y = 24; y < height - 10; y += 4) {
      if (exitX !== null) expect(covers(wallX(exitX), y), `exit side at ${y}`).toBe(!exitRows(y));
      // The forest's west side is open at its exit to the desert (rows 112–143, scaled).
      expect(covers(wallX(otherX), y), `other side at ${y}`).toBe(!(id === "forest" && exitRows(y)));
    }
    if (exitX === null) for (let y = 24; y < height - 10; y += 4) expect(covers(eastX, y), `east side at ${y}`).toBe(!(id === "forest" && exitRows(y)));
  });

  it("no scenery stands in the corridor beyond an exit", () => {
    const west = decorations(VIEW, PEAKS).filter((d) => boxOf(d).x + boxOf(d).w <= 0);
    expect(west.length).toBeGreaterThan(0);
    for (const d of west) expect(PEAKS.corridors.some((c) => intersects(boxOf(d), c)), key(d)).toBe(false);
    const east = decorations(VIEW, VILLAGE).filter((d) => boxOf(d).x >= WORLD.width);
    expect(east.length).toBeGreaterThan(0);
    for (const d of east) expect(VILLAGE.corridors.some((c) => intersects(boxOf(d), c)), key(d)).toBe(false);
  });

  it("an area with a second, bottom exit leaves a gap in the bottom hedge and no scenery in its corridor", () => {
    const mouth: Rect = { x: 192, y: 148, w: 64, h: 32 };
    const corridor: Rect = { x: 192, y: 180, w: 64, h: 1000 };
    // The village has no south exit; a copy of it with one is compared with a plain copy.
    const south = { ...VILLAGE, mouths: [...VILLAGE.mouths, mouth], corridors: [...VILLAGE.corridors, corridor] };
    const plain = { ...VILLAGE };
    const bottomRow = (area: typeof PEAKS) =>
      decorations(VIEW, area).filter((d) => intersects(boxOf(d), WORLD_RECT) && !intersects(boxOf(d), REACHABLE_RECT) && d.at.y === WORLD.height - 1);
    const withGap = bottomRow(south);
    const without = bottomRow(plain);
    expect(without.length).toBeGreaterThan(withGap.length);
    for (const d of withGap) expect(intersects(boxOf(d), mouth), key(d)).toBe(false);
    expect(without.some((d) => intersects(boxOf(d), mouth))).toBe(true);
    // Pieces away from the mouth are untouched.
    const away = (list: typeof withGap) => list.filter((d) => !intersects(boxOf(d), mouth)).map(key);
    expect(away(withGap)).toEqual(away(without));
    const below = decorations(VIEW, south).filter((d) => boxOf(d).y >= WORLD.height);
    expect(below.length).toBeGreaterThan(0);
    for (const d of below) expect(intersects(boxOf(d), corridor), key(d)).toBe(false);
  });

  it("the forest's decorations stay clear of its protected boxes, its mouth, and trees fill the scenery above its north mouth except its corridor", () => {
    const inside = decorations(VIEW, FOREST).filter((d) => intersects(boxOf(d), REACHABLE_RECT));
    expect(inside.length).toBeGreaterThan(5);
    // No wall runs here, so trees stand in the rows where the other zones keep a bare strip (art rows 80–89).
    expect(inside.some((d) => d.at.y >= 80 && d.at.y <= 89)).toBe(true);
    for (const d of inside) {
      for (const p of protectedBoxes(FOREST)) expect(intersects(grow(boxOf(d), 4), p), `${key(d)} vs ${JSON.stringify(p)}`).toBe(false);
      for (const m of FOREST.mouths) expect(intersects(boxOf(d), m), key(d)).toBe(false);
    }
    const above = decorations(VIEW, FOREST).filter((d) => boxOf(d).y + boxOf(d).h <= 0);
    expect(above.length).toBeGreaterThan(5);
    for (const d of above) {
      expect(["tree", "birch"], key(d)).toContain(d.sprite);
      expect(FOREST.corridors.some((c) => intersects(boxOf(d), c)), key(d)).toBe(false);
    }
  });

  it("the Peaks' south mouth and corridor guard the path out, and the forest has no wall tiles", () => {
    expect(PEAKS.mouths).toContainEqual({ x: 192, y: 148, w: 64, h: 32 });
    expect(PEAKS.corridors).toContainEqual({ x: 192, y: 180, w: 64, h: 1000 });
    expect(onPath(206, 170, PEAKS)).toBe(true);
    expect(onPath(206, 700, PEAKS)).toBe(true);
    expect(protectedBoxes(PEAKS)).toContainEqual({ x: 192, y: 148, w: 64, h: 32 });
    expect(wallTiles(WALL_RECT, FOREST)).toEqual([]);
    expect(wallTiles(WALL_RECT, PEAKS).length).toBeGreaterThan(0);
  });

  it("the village guards the Archive and the Syntax Terminal", () => {
    const guarded = (area: typeof VILLAGE) => protectedBoxes(area).map((r) => JSON.stringify(r));
    const has = (area: typeof VILLAGE, box: Rect) => expect(guarded(area)).toContain(JSON.stringify(box));
    has(VILLAGE, spriteBox("archive", { x: 176, y: 116 }));
    has(VILLAGE, spriteBox("syntax-terminal", toArt(TERMINAL)));
    expect(VILLAGE.props.some((p) => p.sprite === "hut" && p.at.x === 176 && p.at.y === 116)).toBe(false);
  });

  it("village decorations stay clear of its protected boxes, even after the Peaks were computed", () => {
    decorations(REACHABLE_RECT, PEAKS);
    const inside = decorations(VIEW, VILLAGE).filter((d) => intersects(boxOf(d), REACHABLE_RECT));
    expect(inside.length).toBeGreaterThan(0);
    const guarded = protectedBoxes(VILLAGE);
    for (const d of inside) {
      for (const p of guarded) expect(intersects(grow(boxOf(d), 4), p), `${key(d)} vs ${JSON.stringify(p)}`).toBe(false);
    }
    for (const a of inside)
      for (const b of inside)
        if (a !== b) expect(Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y), `${key(a)} / ${key(b)}`).toBeGreaterThanOrEqual(24);
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

  it("the village has no wall tiles", () => {
    expect(wallTiles(WALL_RECT, VILLAGE)).toEqual([]);
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

describe("decorations at sea", () => {
  it("no tree or bush stands in the water, on the island or the Peaks' east shore; only reef rocks do", () => {
    for (const zone of ["foggaten", "peaks"] as const) {
      const area = AREAS[zone];
      const all = decorations({ x: -64, y: -64, w: WORLD.width + 128, h: WORLD.height + 128 }, area);
      const wet = all.filter((d) => area.terrainAt(d.at.x, d.at.y) === "sea");
      expect(wet.length, zone).toBeGreaterThan(0);
      for (const d of wet) expect(d.sprite, `${zone} ${d.sprite}@${d.at.x},${d.at.y}`).toBe("rock");
    }
  });
});

describe("dune decorations", () => {
  const dunes: Area = { id: "desert", world: { width: 320, height: 180 }, wall: false, terrainAt: () => "dune", paths: [], mouths: [], corridors: [], gateBox: null, ice: null, props: [], protected: [] };
  const found = decorations(VIEW, dunes);

  it("a dune area gets only desert scenery: cacti, palms, dry bushes, rocks, skulls and arches", () => {
    expect(found.length).toBeGreaterThan(10);
    for (const d of found) expect(["cactus", "bloom-cactus", "palm", "dry-bush", "rock", "skull", "arch"], d.sprite).toContain(d.sprite);
    expect(new Set(found.map((d) => d.sprite))).toContain("cactus");
    expect(new Set(found.map((d) => d.sprite))).toContain("dry-bush");
  });

  it("is deterministic", () => {
    expect(decorations(VIEW, dunes).map(key)).toEqual(found.map(key));
  });
});

describe("the desert's scenery fades away from the world", () => {
  const desert = AREAS.desert;
  const w = desert.world;
  const count = (from: number, to: number) => {
    // Decorations in the band between `from` and `to` art px west of the world's edge (the world's height), per 1000 px².
    const band = { x: -to, y: 0, w: to - from, h: w.height };
    return (decorations(band, desert).length / (band.w * band.h)) * 1000;
  };

  it("is dense just behind the hedge and thin far out", () => {
    const near = count(0, 48);
    const far = count(400, 448);
    expect(near).toBeGreaterThan(1.5);
    expect(far).toBeLessThan(near * 0.45);
    expect(far).toBeGreaterThan(0);
  });

  it("still never stands on the exit corridor or inside the world", () => {
    for (const d of decorations({ x: -300, y: -300, w: w.width + 600, h: w.height + 600 }, desert)) {
      const box = spriteBox(d.sprite, d.at);
      const outside = box.x + box.w <= 0 || box.x >= w.width || box.y + box.h <= 0 || box.y >= w.height;
      if (!outside) continue;
      for (const c of desert.corridors) expect(intersects(box, c), d.sprite).toBe(false);
    }
  });
});

describe("beach decorations", () => {
  const sand: Area = { id: "beach", world: { width: 320, height: 180 }, wall: false, terrainAt: () => "beach", paths: [], mouths: [], corridors: [], gateBox: null, ice: null, props: [], protected: [] };
  const found = decorations(VIEW, sand);

  it("a beach area gets only palms and rocks", () => {
    expect(found.length).toBeGreaterThan(10);
    for (const d of found) expect(["palm", "rock"], d.sprite).toContain(d.sprite);
    expect(new Set(found.map((d) => d.sprite))).toContain("palm");
  });
});

describe("decorations in a world bigger than one screen", () => {
  const big: Area = { ...AREAS.forest, world: { width: 640, height: 360 } };
  const everything: Rect = { x: -40, y: -40, w: 720, h: 440 };
  const found = decorations(everything, big);
  // Ferns, stumps, logs and mushrooms are only ever placed by the interior rules, never as the scenery around a world.
  const interiorOnly = (d: { sprite: string }) => ["fern", "stump", "log", "mushroom"].includes(d.sprite);

  it("fill every screen of the reachable rectangle with interior scenery, not only the first", () => {
    for (const [name, inQuarter] of [
      ["east", (d: { at: { x: number; y: number } }) => d.at.x > 360 && d.at.y < 160],
      ["south", (d: { at: { x: number; y: number } }) => d.at.x < 280 && d.at.y > 200],
      ["south-east", (d: { at: { x: number; y: number } }) => d.at.x > 360 && d.at.y > 200],
    ] as const)
      expect(found.some((d) => interiorOnly(d) && inQuarter(d)), name).toBe(true);
  });

  it("put the hedge along the big world's whole bottom edge and down its sides", () => {
    for (let cx = 4; cx <= Math.floor(639 / 16); cx++) expect(found.some((d) => d.at.x === cx * 16 + 8 && d.at.y === 359), `bottom ${cx}`).toBe(true);
    for (const cy of [3, 10, 19, 21]) {
      expect(found.some((d) => d.at.x === 10 && d.at.y === cy * 16 + 15), `west ${cy}`).toBe(true);
      expect(found.some((d) => d.at.x === 631 && d.at.y === cy * 16 + 15), `east ${cy}`).toBe(true);
    }
  });

  it("keep interior scenery off the area's protected boxes", () => {
    for (const d of found.filter(interiorOnly)) for (const p of big.protected) expect(intersects(boxOf(d), p), `${d.sprite}@${d.at.x},${d.at.y}`).toBe(false);
  });
});
