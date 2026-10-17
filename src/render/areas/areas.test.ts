import { describe, expect, it } from "vitest";
import { ADA, SIGNPOST } from "../../game/constants";
import { spriteBox } from "../sprites";
import { intersects, toArt, type Rect } from "../world";
import { AREAS } from ".";
import { FOREST_POINTS } from "./forest";
import { FOGGATEN, FOGGATEN_POINTS } from "./foggaten";
import { DOCK_POINT, PEAKS } from "./peaks";
import { REACHABLE_RECT } from "../world";
import { DOCK, HERMIT, ISLAND_DOCK, ISLAND_FIRE, LIGHTHOUSE, RUINS } from "../../game/constants";
import { VILLAGE_POINTS } from "./village";

describe("areas", () => {
  it("village art points are the game places' art points", () => {
    expect(VILLAGE_POINTS.villager).toEqual(toArt(ADA));
    expect(VILLAGE_POINTS.signpost).toEqual(toArt(SIGNPOST));
    expect(AREAS.peaks.id).toBe("peaks");
  });

  it("the forest is an area, with a mouth in its top edge and a clear corridor above it", () => {
    expect(AREAS.forest.id).toBe("forest");
    expect(AREAS.forest.mouths).toEqual([{ x: 192, y: 0, w: 64, h: 32 }]);
    expect(AREAS.forest.corridors).toEqual([{ x: 192, y: -1000, w: 64, h: 1000 }]);
    expect(AREAS.forest.gateBox).toBeNull();
    expect(AREAS.forest.ice).toBeNull();
  });

  it("the forest is forest-floor everywhere but a meadow clearing, with no snow and no ice", () => {
    const { terrainAt } = AREAS.forest;
    expect(terrainAt(10, 10)).toBe("forest");
    expect(terrainAt(300, 170)).toBe("forest");
    expect(terrainAt(170, 120)).toBe("meadow");
    for (const [x, y] of [[0, 0], [160, 90], [319, 179], [-50, -50], [400, 300]]) expect(["forest", "meadow"]).toContain(terrainAt(x, y));
  });

  it("the wall flag: the Peaks and the village have a wall, the forest does not", () => {
    expect([AREAS.peaks.wall, AREAS.village.wall, AREAS.forest.wall]).toEqual([true, true, false]);
  });

  it("the forest's path winds from its north mouth to the clearing and on to the south-east corner, as one connected trail", () => {
    const paths = AREAS.forest.paths;
    const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
    const seen = new Set<number>([0]);
    for (const queue = [0]; queue.length; ) {
      const i = queue.pop()!;
      paths.forEach((p, j) => void (!seen.has(j) && touch(paths[i], p) && (seen.add(j), queue.push(j))));
    }
    expect(seen.size, "every path piece joins the trail from the mouth").toBe(paths.length);
    const reaches = (x: number, y: number) => paths.some((r) => Math.abs(x - (r.x + r.w / 2)) <= r.w / 2 + 14 && y >= r.y - 14 && y < r.y + r.h + 14);
    expect(reaches(FOREST_POINTS.campfire.x, FOREST_POINTS.campfire.y), "campfire").toBe(true);
    expect(reaches(FOREST_POINTS.dig.x, FOREST_POINTS.dig.y), "dig corner").toBe(true);
    expect(paths.some((r) => r.x < 0 || r.y <= -999)).toBe(true);
    // Winding: between the mouth and the fork the trail's left edge changes column at least three times.
    const left = (y: number) => Math.min(...paths.filter((r) => y >= r.y && y < r.y + r.h).map((r) => r.x));
    const columns = new Set<number>();
    for (let y = 36; y <= 96; y++) columns.add(left(y));
    expect(columns.size).toBeGreaterThanOrEqual(3);
    expect(left(0)).toBeLessThan(Infinity);
  });

  it("every mouth touches the edge of the world it opens onto, and has its corridor beyond it", () => {
    const touches = (r: { x: number; y: number; w: number; h: number }) => r.x <= 0 || r.y <= 0 || r.x + r.w >= 320 || r.y + r.h >= 180;
    for (const area of Object.values(AREAS)) for (const m of area.mouths) expect(touches(m), `${area.id} ${JSON.stringify(m)}`).toBe(true);
  });

  it("every area lists its exit mouths and corridors, each with the same count", () => {
    for (const area of Object.values(AREAS).filter((a) => a.id !== "foggaten")) {
      expect(area.mouths.length, area.id).toBeGreaterThan(0);
      expect(area.corridors, area.id).toHaveLength(area.mouths.length);
    }
  });

  it("the forest's props are inside the world, clear of each other and of the north mouth, and their places are 12 game-% apart", () => {
    const boxes = AREAS.forest.props.map((p) => spriteBox(p.sprite, p.at));
    expect(AREAS.forest.props.map((p) => p.sprite).sort()).toEqual(["campfire", "explorer-down", "old-oak", "signpost"]);
    for (const [i, a] of boxes.entries()) {
      expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= 320 && a.y + a.h <= 180, `prop ${i} in the world`).toBe(true);
      expect(intersects(a, AREAS.forest.mouths[0]), `prop ${i} on the mouth`).toBe(false);
      for (const b of boxes.slice(i + 1)) expect(intersects(a, b), `props ${i} overlap`).toBe(false);
    }
    const pts = Object.values(FOREST_POINTS);
    for (const [i, a] of pts.entries())
      for (const b of pts.slice(i + 1)) expect(Math.hypot((a.x - b.x) / 3.2, (a.y - b.y) / 1.8)).toBeGreaterThanOrEqual(12);
    for (const prop of AREAS.forest.props) expect(AREAS.forest.protected).toContainEqual(spriteBox(prop.sprite, prop.at));
  });

  it("every zone's dirt paths form one connected road (the Peaks' south road joins the camp path)", () => {
    const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
    for (const [id, area] of Object.entries(AREAS)) {
      const seen = new Set([0]);
      const queue = [0];
      while (queue.length) {
        const i = queue.pop()!;
        area.paths.forEach((r, j) => {
          if (!seen.has(j) && touch(area.paths[i], r)) (seen.add(j), queue.push(j));
        });
      }
      expect(seen.size, `${id}: ${area.paths.length} path pieces`).toBe(area.paths.length);
    }
  });
});

describe("Foggaten Island's area", () => {
  it("is an area with no exits, wall, gate or ice", () => {
    expect(AREAS.foggaten).toBe(FOGGATEN);
    expect(FOGGATEN).toMatchObject({ id: "foggaten", wall: false, mouths: [], corridors: [], gateBox: null, ice: null });
  });

  it("its places' art points are the game places' art points", () => {
    expect(FOGGATEN_POINTS).toEqual({
      dock: toArt(ISLAND_DOCK),
      lighthouse: toArt(LIGHTHOUSE),
      hermit: toArt(HERMIT),
      fire: toArt(ISLAND_FIRE),
      ruins: toArt(RUINS),
    });
  });

  it("every cell you can stand on is land, and the sea begins just beyond it (Review Focus 3)", () => {
    const r = REACHABLE_RECT;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) expect(FOGGATEN.terrainAt(x, y), `${x},${y}`).not.toBe("sea");
    for (const [x, y] of [[r.x - 1, 90], [r.x + r.w, 90], [100, r.y - 1], [100, r.y + r.h], [-50, -50], [400, 300]]) expect(FOGGATEN.terrainAt(x, y), `${x},${y}`).toBe("sea");
  });

  it("has sand along the shore, meadow and forest inland, and its path is one connected road", () => {
    const r = REACHABLE_RECT;
    expect(FOGGATEN.terrainAt(r.x + 2, 90)).toBe("sand");
    const kinds = new Set<string>();
    for (let y = r.y; y < r.y + r.h; y += 3) for (let x = r.x; x < r.x + r.w; x += 3) kinds.add(FOGGATEN.terrainAt(x, y));
    expect([...kinds].sort()).toEqual(["forest", "meadow", "sand"]);
    expect(FOGGATEN.paths.length).toBeGreaterThan(0);
  });

  it("its props are the hermit, campfire, ruins, lighthouse and dock, clear of each other and of the path", () => {
    expect(FOGGATEN.props.map((p) => p.sprite).sort()).toEqual(["campfire", "dock", "explorer-down", "lighthouse", "ruins"]);
    const boxes = FOGGATEN.props.map((p) => spriteBox(p.sprite, p.at));
    for (const [i, a] of boxes.entries()) {
      const prop = FOGGATEN.props[i];
      if (prop.sprite !== "dock") {
        const r = REACHABLE_RECT;
        expect(a.x >= r.x && a.y >= r.y && a.x + a.w <= r.x + r.w && a.y + a.h <= r.y + r.h, `${prop.sprite} stands on land`).toBe(true);
      }
      for (const b of boxes.slice(i + 1)) expect(intersects(a, b), `props ${i} overlap`).toBe(false);
      if (prop.sprite !== "dock") for (const path of FOGGATEN.paths) expect(intersects(a, path), `${prop.sprite} on the path`).toBe(false);
    }
    expect(FOGGATEN.props.find((p) => p.sprite === "explorer-down")?.variant).toBeDefined();
    for (const prop of FOGGATEN.props) expect(FOGGATEN.protected).toContainEqual(spriteBox(prop.sprite, prop.at));
  });

  it("the island's dock reaches out over the water", () => {
    const dock = spriteBox("dock", FOGGATEN_POINTS.dock);
    expect(dock.x).toBeLessThan(REACHABLE_RECT.x);
    expect(FOGGATEN.terrainAt(dock.x, dock.y + 6)).toBe("sea");
  });
});

describe("the Peaks' east shore", () => {
  it("is sea beyond the walkable edge, only in a strip by the dock", () => {
    const r = REACHABLE_RECT;
    const east = r.x + r.w;
    for (const y of [118, 133, 147]) expect(PEAKS.terrainAt(east + 1, y), `y ${y}`).toBe("sea");
    expect(PEAKS.terrainAt(east - 4, 133)).toBe("sand");
    for (const [x, y] of [[east + 1, 60], [east + 1, 117], [east + 1, 148], [east - 1, 100], [100, 133], [10, 10]]) expect(PEAKS.terrainAt(x, y), `${x},${y}`).not.toBe("sea");
  });

  it("every cell of the walkable area is as before: nothing in it became sea", () => {
    const r = REACHABLE_RECT;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) expect(PEAKS.terrainAt(x, y), `${x},${y}`).not.toBe("sea");
  });

  it("has a dock whose pier reaches the water and stays clear of the path, tower, gate and chests", () => {
    expect(DOCK_POINT).toEqual(toArt(DOCK));
    const box = spriteBox("dock", DOCK_POINT);
    expect(box.x + box.w).toBeGreaterThan(REACHABLE_RECT.x + REACHABLE_RECT.w);
    expect(PEAKS.protected).toContainEqual(box);
    for (const other of PEAKS.protected.filter((p) => p !== box && !(p.x === box.x && p.y === box.y))) expect(intersects(box, other), JSON.stringify(other)).toBe(false);
  });
});
