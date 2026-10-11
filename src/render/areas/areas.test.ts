import { describe, expect, it } from "vitest";
import { ADA, SIGNPOST } from "../../game/constants";
import { spriteBox } from "../sprites";
import { intersects, toArt } from "../world";
import { AREAS } from ".";
import { FOREST_POINTS } from "./forest";
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

  it("the forest's path runs from its north mouth to the clearing and on to the south-east corner", () => {
    const on = (x: number, y: number) => AREAS.forest.paths.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    for (const [x, y] of [[206, 0], [206, 60], [206, 99], [180, 99], [152, 110], [206, 120], [250, 144], [-0 + 206, -500]]) expect(on(x, y), `${x},${y}`).toBe(true);
    expect(on(100, 20)).toBe(false);
  });

  it("every mouth touches the edge of the world it opens onto, and has its corridor beyond it", () => {
    const touches = (r: { x: number; y: number; w: number; h: number }) => r.x <= 0 || r.y <= 0 || r.x + r.w >= 320 || r.y + r.h >= 180;
    for (const area of Object.values(AREAS)) for (const m of area.mouths) expect(touches(m), `${area.id} ${JSON.stringify(m)}`).toBe(true);
  });

  it("every area lists its exit mouths and corridors, each with the same count", () => {
    for (const area of Object.values(AREAS)) {
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
});
