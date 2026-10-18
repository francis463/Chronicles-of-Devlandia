import { describe, expect, it } from "vitest";
import { ADA, SIGNPOST } from "../../game/constants";
import { spriteBox } from "../sprites";
import { intersects, reachableRect, toArt, zoneToArt, type Rect } from "../world";
import { AREAS } from ".";
import { FOREST_POINTS } from "./forest";
import { FOGGATEN, FOGGATEN_POINTS } from "./foggaten";
import { DOCK_POINT, ICE_RECT, BRIDGE_RECT, LANDMARK_POINTS as PEAKS_POINTS, PEAKS, WILDLIFE, foxPose, goatPose } from "./peaks";
import { REACHABLE_RECT } from "../world";
import { DESERT_PYRAMID, DESERT_SIGNPOST, NOMAD, OASIS } from "../../game/constants";
import { DESERT_POINTS } from "./desert";
import { BEACH_POINTS } from "./beach";
import { BEACH_PIER, FISHER, SHIPWRECK, BEACH_SIGNPOST } from "../../game/constants";
import { HIDDEN_ARTIFACT } from "../../game/constants";
import { DOCK, HERMIT, ISLAND_DOCK, ISLAND_FIRE, LIGHTHOUSE, RUINS } from "../../game/constants";
import { VILLAGE_LIFE, VILLAGE_POINTS, wandererPose } from "./village";
import { ARCHIVE_POINT, TERMINAL_POINT } from "../learnPoints";
import { CHESTS } from "../../learn/chests";

describe("areas", () => {
  it("village art points are the game places' art points", () => {
    expect(VILLAGE_POINTS.villager).toEqual(toArt(ADA));
    expect(VILLAGE_POINTS.signpost).toEqual(toArt(SIGNPOST));
    expect(AREAS.peaks.id).toBe("peaks");
  });

  it("the forest is an area, with a mouth in its top edge and a clear corridor above it", () => {
    expect(AREAS.forest.id).toBe("forest");
    const K = AREAS.forest.world.width / 320;
    expect(AREAS.forest.mouths).toEqual([{ x: 192 * K, y: 0, w: 64 * K, h: 32 }, { x: 0, y: 112 * K, w: 32, h: 32 * K }, { x: 320 * K - 32, y: 112 * K, w: 32, h: 32 * K }]);
    expect(AREAS.forest.corridors).toEqual([{ x: 192 * K, y: -1000, w: 64 * K, h: 1000 }, { x: -1000, y: 112 * K, w: 1000, h: 32 * K }, { x: 320 * K, y: 112 * K, w: 1000, h: 32 * K }]);
    expect(AREAS.forest.gateBox).toBeNull();
    expect(AREAS.forest.ice).toBeNull();
  });

  it("the forest is forest-floor everywhere but a meadow clearing, with no snow and no ice", () => {
    const { terrainAt } = AREAS.forest;
    const K = AREAS.forest.world.width / 320;
    expect(terrainAt(10, 10)).toBe("forest");
    expect(terrainAt(300 * K, 170 * K)).toBe("forest");
    expect(terrainAt(170 * K, 120 * K)).toBe("meadow");
    for (const [x, y] of [[0, 0], [160 * K, 90 * K], [319 * K, 179 * K], [-50, -50], [400 * K, 300 * K]]) expect(["forest", "meadow"]).toContain(terrainAt(x, y));
  });

  it("the wall flag: only the Peaks have a wall: the village and the forest do not", () => {
    expect([AREAS.peaks.wall, AREAS.village.wall, AREAS.forest.wall]).toEqual([true, false, false]);
  });

  it("the forest's path winds from its north mouth to the clearing, as one connected trail", () => {
    const paths = AREAS.forest.paths;
    const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
    const seen = new Set<number>([0]);
    for (const queue = [0]; queue.length; ) {
      const i = queue.pop()!;
      paths.forEach((p, j) => void (!seen.has(j) && touch(paths[i], p) && (seen.add(j), queue.push(j))));
    }
    expect(seen.size, "every path piece joins the trail from the mouth").toBe(paths.length);
    const K = AREAS.forest.world.width / 320;
    const slack = 14 * K;
    const reaches = (x: number, y: number) => paths.some((r) => Math.abs(x - (r.x + r.w / 2)) <= r.w / 2 + slack && y >= r.y - slack && y < r.y + r.h + slack);
    expect(reaches(FOREST_POINTS.campfire.x, FOREST_POINTS.campfire.y), "campfire").toBe(true);
    expect(paths.some((r) => r.x < 0 || r.y <= -999)).toBe(true);
    // Winding: between the mouth and the fork the trail's left edge changes column at least three times.
    const left = (y: number) => Math.min(...paths.filter((r) => y >= r.y && y < r.y + r.h).map((r) => r.x));
    const columns = new Set<number>();
    for (let y = 36 * K; y <= 96 * K; y++) columns.add(left(y));
    expect(columns.size).toBeGreaterThanOrEqual(3);
    expect(left(0)).toBeLessThan(Infinity);
  });

  it("every mouth touches the edge of the world it opens onto, and has its corridor beyond it", () => {
    for (const area of Object.values(AREAS)) {
      const touches = (r: { x: number; y: number; w: number; h: number }) => r.x <= 0 || r.y <= 0 || r.x + r.w >= area.world.width || r.y + r.h >= area.world.height;
      for (const m of area.mouths) expect(touches(m), `${area.id} ${JSON.stringify(m)}`).toBe(true);
    }
  });

  it("every area lists its exit mouths and corridors, each with the same count", () => {
    for (const area of Object.values(AREAS).filter((a) => a.id !== "foggaten")) {
      expect(area.mouths.length, area.id).toBeGreaterThan(0);
      expect(area.corridors, area.id).toHaveLength(area.mouths.length);
    }
  });

  it("the forest's props are inside the world, clear of each other and of the north mouth, and their places are 12 game-% apart", () => {
    const boxes = AREAS.forest.props.map((p) => spriteBox(p.sprite, p.at));
    const K = AREAS.forest.world.width / 320;
    const base = ["brook", "cabin", "campfire", "explorer-down", "fairy-ring", "hollow-tree", "old-oak", "signpost", "well"];
    // A bigger forest has stumps, logs, ferns, flower patches and mushroom clumps through the wood.
    const extras = K === 1 ? [] : ["fern", "fern", "fern", "fern", "fern", "fern", "fern", "fern", "flowers", "flowers", "flowers", "flowers", "flowers", "flowers", "flowers", "flowers", "flowers", "flowers", "log", "log", "log", "log", "log", "mushroom", "mushroom", "stump", "stump", "stump", "stump", "stump", "stump"];
    expect(AREAS.forest.props.map((p) => p.sprite).sort()).toEqual([...base, ...extras].sort());
    for (const [i, a] of boxes.entries()) {
      expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= AREAS.forest.world.width && a.y + a.h <= AREAS.forest.world.height, `prop ${i} in the world`).toBe(true);
      expect(AREAS.forest.mouths.some((m) => intersects(a, m)), `prop ${i} on a mouth`).toBe(false);
      for (const b of boxes.slice(i + 1)) expect(intersects(a, b), `props ${i} overlap`).toBe(false);
    }
    const pts = Object.values(FOREST_POINTS);
    for (const [i, a] of pts.entries())
      for (const b of pts.slice(i + 1)) expect(Math.hypot((a.x - b.x) / (3.2 * K), (a.y - b.y) / (1.8 * K))).toBeGreaterThanOrEqual(12);
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
      dig: toArt(HIDDEN_ARTIFACT),
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

describe("Dev Village's decorations and its life", () => {
  const village = AREAS.village;
  const sprites = village.props.map((p) => p.sprite);
  const landmarks: Rect[] = [
    spriteBox("archive", ARCHIVE_POINT),
    spriteBox("syntax-terminal", TERMINAL_POINT),
  ];
  const decor = village.props.filter((p) => ["lantern", "garden", "stall"].includes(p.sprite));

  it("has a lantern by the well, a market stall and (with the north-east field) four garden plots", () => {
    expect(sprites.filter((s) => s === "lantern")).toHaveLength(1);
    expect(sprites.filter((s) => s === "garden")).toHaveLength(4);
    expect(sprites.filter((s) => s === "stall")).toHaveLength(1);
  });

  it("keeps them clear of each other, every other prop, the landmarks, Ada and the east exit", () => {
    const boxes = decor.map((p) => spriteBox(p.sprite, p.at));
    const others = village.props.filter((p) => !decor.includes(p)).map((p) => spriteBox(p.sprite, p.at));
    for (const [i, a] of boxes.entries()) {
      const where = `${decor[i].sprite}@${decor[i].at.x},${decor[i].at.y}`;
      for (const b of [...boxes.slice(i + 1), ...others, ...landmarks, ...village.mouths]) expect(intersects(a, b), where).toBe(false);
      expect(a.x >= REACHABLE_RECT.x && a.y >= REACHABLE_RECT.y && a.x + a.w <= REACHABLE_RECT.x + REACHABLE_RECT.w && a.y + a.h <= REACHABLE_RECT.y + REACHABLE_RECT.h, where).toBe(true);
    }
  });

  it("the wanderers and the chicken never cross a prop, a landmark or a decoration, at any moment", () => {
    const blockers = [...village.props.filter((p) => p.sprite !== "explorer-down").map((p) => spriteBox(p.sprite, p.at)), ...landmarks];
    for (const w of VILLAGE_LIFE.wanderers) {
      for (let t = 0; t < 120_000; t += 250) {
        const pose = wandererPose(t, false, w);
        const feet = { x: pose.x - 6, y: pose.y - 5, w: 12, h: 6 };
        for (const b of blockers) expect(intersects(feet, b), `wanderer ${w.variant} at t=${t}`).toBe(false);
      }
    }
    const hen = spriteBox("chicken", VILLAGE_LIFE.chicken);
    for (const b of blockers) expect(intersects(hen, b), "chicken").toBe(false);
  });

  it("the wanderers walk back and forth, face the way they go, and stand still when motion is reduced", () => {
    for (const w of VILLAGE_LIFE.wanderers) {
      const a = wandererPose(0, false, w);
      const b = wandererPose(7000, false, w);
      expect(a.x !== b.x || a.y !== b.y, w.variant).toBe(true);
      expect(new Set([1, 2, 3, 4, 5, 6].map((s) => wandererPose(s * 3000, false, w).facing)).size).toBeGreaterThan(1);
      expect(wandererPose(0, true, w)).toEqual(wandererPose(90_000, true, w));
    }
  });

  it("everything they walk on is open ground (the road or the square)", () => {
    for (const w of VILLAGE_LIFE.wanderers) {
      for (let t = 0; t < 60_000; t += 500) {
        const { x, y } = wandererPose(t, false, w);
        expect(village.paths.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h), `${w.variant} t=${t} at ${x},${y}`).toBe(true);
      }
    }
  });
});

describe("Dev Village's north half", () => {
  const village = AREAS.village;
  const boxOfProp = (p: { sprite: Parameters<typeof spriteBox>[0]; at: { x: number; y: number } }) => spriteBox(p.sprite, p.at);
  const count = (id: string) => village.props.filter((p) => p.sprite === id).length;
  const landmarks: Rect[] = [
    spriteBox("archive", ARCHIVE_POINT),
    spriteBox("syntax-terminal", TERMINAL_POINT),
  ];

  it("has a pond, two benches, a windmill, a fountain, five fruit trees, five huts, four gardens and a fence", () => {
    expect(["pond", "bench", "windmill", "fountain", "fruit-tree", "hut", "garden"].map(count)).toEqual([1, 2, 1, 1, 5, 5, 4]);
    expect(count("fence")).toBeGreaterThanOrEqual(4);
  });

  it("keeps every prop inside the walkable area, off every other prop, every landmark and the east exit", () => {
    const boxes = village.props.map(boxOfProp);
    for (const [i, a] of boxes.entries()) {
      const where = `${village.props[i].sprite}@${village.props[i].at.x},${village.props[i].at.y}`;
      for (const [j, b] of boxes.entries()) if (j > i) expect(intersects(a, b), `${where} / ${village.props[j].sprite}@${village.props[j].at.x},${village.props[j].at.y}`).toBe(false);
      for (const l of [...landmarks, ...village.mouths]) expect(intersects(a, l), where).toBe(false);
      expect(a.x >= REACHABLE_RECT.x && a.y >= REACHABLE_RECT.y && a.x + a.w <= REACHABLE_RECT.x + REACHABLE_RECT.w && a.y + a.h <= REACHABLE_RECT.y + REACHABLE_RECT.h, where).toBe(true);
    }
  });

  it("the new road and square join the old road, so the whole village is one connected path network", () => {
    const paths = village.paths;
    const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
    const seen = new Set<number>([0]);
    for (const queue = [0]; queue.length; ) {
      const i = queue.pop()!;
      paths.forEach((p, j) => void (!seen.has(j) && touch(paths[i], p) && (seen.add(j), queue.push(j))));
    }
    expect(seen.size).toBe(paths.length);
    // The fountain stands on the square, and the square reaches the main road.
    const fountain = village.props.find((p) => p.sprite === "fountain")!;
    expect(paths.some((r) => fountain.at.x >= r.x && fountain.at.x < r.x + r.w && fountain.at.y >= r.y && fountain.at.y < r.y + r.h)).toBe(true);
    expect(paths.some((r) => r.y <= 44 && r.y + r.h >= 128)).toBe(true);
  });

  it("is all walkable meadow with no wall, and the old snow band has no landmarks in it", () => {
    expect(village.wall).toBe(false);
    for (const y of [0, 20, 40, 60, 80, 100, 140]) expect(village.terrainAt(100, y), `y=${y}`).toBe("meadow");
  });
});

describe("the Snowy Peaks' lodge, wildlife and trail", () => {
  const peaks = AREAS.peaks;
  const boxes = peaks.props.map((p) => ({ id: `${p.sprite}@${p.at.x},${p.at.y}`, sprite: p.sprite, box: spriteBox(p.sprite, p.at) }));
  const landmarks: Array<[string, Rect]> = [
    ["tower", spriteBox("tower", PEAKS_POINTS.tower)],
    ["cache", spriteBox("chest-closed", PEAKS_POINTS.chest)],
    ["gate", spriteBox("gate", PEAKS_POINTS.gate)],
    ["start", spriteBox("explorer-down", PEAKS_POINTS.start)],
    ["dock", spriteBox("dock", DOCK_POINT)],
    ["ice", ICE_RECT],
    ["bridge", BRIDGE_RECT],
    ...peaks.mouths.map((m, i): [string, Rect] => [`mouth${i}`, m]),
    ...peaks.paths.map((r, i): [string, Rect] => [`path${i}`, r]),
  ];

  it("has a lodge, a campfire with two benches, a frozen waterfall and two cave mouths", () => {
    const count = (id: string) => boxes.filter((b) => b.sprite === id).length;
    expect(["lodge", "campfire", "bench", "waterfall", "cave-mouth"].map(count)).toEqual([1, 1, 2, 1, 2]);
    expect(count("post")).toBeGreaterThanOrEqual(8);
  });

  it("keeps every prop off every landmark, chest, path, the river, the exits and every other prop", () => {
    for (const [i, a] of boxes.entries()) {
      for (const [name, r] of landmarks) expect(intersects(a.box, r), `${a.id} / ${name}`).toBe(false);
      for (const b of boxes.slice(i + 1)) expect(intersects(a.box, b.box), `${a.id} / ${b.id}`).toBe(false);
    }
  });

  it("puts every prop inside the world, and everything but the waterfall and caves inside the walkable area", () => {
    for (const b of boxes) {
      expect(b.box.x >= 0 && b.box.y >= 0 && b.box.x + b.box.w <= 320 && b.box.y + b.box.h <= 180, b.id).toBe(true);
      if (!["waterfall", "cave-mouth"].includes(b.sprite)) {
        const r = REACHABLE_RECT;
        expect(b.box.x >= r.x && b.box.y >= r.y && b.box.x + b.box.w <= r.x + r.w && b.box.y + b.box.h <= r.y + r.h, b.id).toBe(true);
      }
    }
  });

  it("guards its props from scenery", () => {
    for (const b of boxes) expect(peaks.protected, b.id).toContainEqual(b.box);
  });

  it("the fox and goat stay in their zones and clear of every landmark, whoever is near, at any moment", () => {
    for (const [name, pose, zone] of [["fox", foxPose, WILDLIFE.fox.zone], ["goat", goatPose, WILDLIFE.goat.zone]] as const) {
      const sprite = name;
      for (let t = 0; t < 30_000; t += 2800) {
        for (let px = 0; px <= 320; px += 24) {
          for (let py = 0; py <= 180; py += 30) {
            const at = pose(t, false, { x: px, y: py });
            expect(at.x >= zone.x && at.x <= zone.x + zone.w && at.y >= zone.y && at.y <= zone.y + zone.h, `${name} zone t=${t} p=${px},${py} at ${at.x},${at.y}`).toBe(true);
            const box = spriteBox(sprite, at);
            for (const [lname, r] of landmarks) expect(intersects(box, r), `${name} / ${lname} t=${t} p=${px},${py}`).toBe(false);
            for (const b of boxes) expect(intersects(box, b.box), `${name} / ${b.id}`).toBe(false);
          }
        }
      }
    }
  });

  it("an animal drifts away from you as you get close, and rests when motion is reduced", () => {
    const far = foxPose(0, false, { x: 20, y: 150 });
    const near = foxPose(0, false, { x: far.x - 8, y: far.y });
    expect(near.x).toBeGreaterThan(far.x);
    expect(foxPose(0, true, { x: near.x - 4, y: near.y })).toEqual(foxPose(90_000, true, { x: 5, y: 5 }));
  });
});

describe("the Sunbaked Desert's area", () => {
  const D = AREAS.desert;
  const K = D.world.width / 320;
  const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

  it("is a plain dune area with an east mouth, its corridor beyond, no wall, gate or ice", () => {
    expect(D).toMatchObject({ id: "desert", wall: false, gateBox: null, ice: null });
    expect(D.mouths).toEqual([{ x: D.world.width - 32, y: 112 * K, w: 32, h: 32 * K }]);
    expect(D.corridors).toEqual([{ x: D.world.width, y: 112 * K, w: 1000, h: 32 * K }]);
    for (const [x, y] of [[0, 0], [160 * K, 90 * K], [319 * K, 179 * K], [-50, -50], [400 * K, 300 * K]]) expect(D.terrainAt(x, y)).toBe("dune");
  });

  it("the forest's west mouth has a road that runs out through it and joins the trail", () => {
    const K = AREAS.forest.world.width / 320;
    const west = AREAS.forest.paths.filter((r) => r.x < 0 && r.y >= 112 * K && r.y + r.h <= 144 * K);
    expect(west.length).toBeGreaterThan(0);
    expect(AREAS.forest.paths.some((r) => touch(r, west[0]) && r !== west[0])).toBe(true);
  });

  it("its places' art points are the game places' art points", () => {
    expect(DESERT_POINTS).toMatchObject({ nomad: zoneToArt(NOMAD, "desert"), oasis: zoneToArt(OASIS, "desert"), pyramid: zoneToArt(DESERT_PYRAMID, "desert"), signpost: zoneToArt(DESERT_SIGNPOST, "desert") });
  });

  it("its road is one connected road from the east mouth and reaches every place", () => {
    const seen = new Set([0]);
    for (const queue = [0]; queue.length; ) {
      const i = queue.pop()!;
      D.paths.forEach((r, j) => void (!seen.has(j) && touch(D.paths[i], r) && (seen.add(j), queue.push(j))));
    }
    expect(seen.size).toBe(D.paths.length);
    expect(D.paths.some((r) => r.x + r.w > D.world.width)).toBe(true);
    const slack = 14 * K; // a place sits as far from its road, in screens, on a bigger desert
    const reaches = (x: number, y: number) => D.paths.some((r) => Math.abs(x - (r.x + r.w / 2)) <= r.w / 2 + slack && y >= r.y - slack && y < r.y + r.h + slack);
    for (const k of ["nomad", "oasis", "pyramid", "signpost"] as const) expect(reaches(DESERT_POINTS[k].x, DESERT_POINTS[k].y), k).toBe(true);
  });

  it("its props are inside the world, clear of each other and the mouth, and are protected", () => {
    const base = ["explorer-down", "oasis", "obelisk", "palm", "palm", "pyramid", "riverbed", "rock", "signpost", "temple-door", "tent", "well"];
    // A bigger desert has a palm grove round the oasis, a ruin, bones, cactus and rock patches and bushes out in the dunes.
    const extras = K === 1 ? [] : ["arch", "arch", "bloom-cactus", "bloom-cactus", "bloom-cactus", "bloom-cactus", "cactus", "cactus", "cactus", "cactus", "cactus", "cactus", "cactus", "cactus", "dry-bush", "dry-bush", "dry-bush", "dry-bush", "dry-bush", "palm", "palm", "palm", "palm", "rock", "rock", "rock", "rock", "skull", "skull"];
    expect(D.props.map((p) => p.sprite).sort()).toEqual([...base, ...extras].sort());
    const boxes = D.props.map((p) => spriteBox(p.sprite, p.at));
    for (const [i, a] of boxes.entries()) {
      expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= D.world.width && a.y + a.h <= D.world.height, `prop ${i} in the world`).toBe(true);
      expect(intersects(a, D.mouths[0]), `prop ${i} on the mouth`).toBe(false);
      for (const b of boxes.slice(i + 1)) expect(intersects(a, b), `props ${i} overlap`).toBe(false);
      expect(D.protected).toContainEqual(a);
    }
    const pts = [DESERT_POINTS.nomad, DESERT_POINTS.oasis, DESERT_POINTS.pyramid, DESERT_POINTS.signpost];
    for (const [i, a] of pts.entries())
      for (const b of pts.slice(i + 1)) expect(Math.hypot((a.x - b.x) / (3.2 * K), (a.y - b.y) / (1.8 * K))).toBeGreaterThanOrEqual(12);
  });

  it("the lizard's rock is a prop and the lizard sits on its top", () => {
    const rock = D.props.find((p) => p.sprite === "rock")!;
    expect(DESERT_POINTS.lizardRock).toEqual(rock.at);
  });
});

describe("the Sunny Beach's area", () => {
  const B = AREAS.beach;
  const K = B.world.width / 320;
  const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

  it("is a beach area with a west mouth, its corridor beyond, no wall, gate or ice, and sea past the walkable east and north", () => {
    expect(B).toMatchObject({ id: "beach", wall: false, gateBox: null, ice: null });
    expect(B.mouths).toEqual([{ x: 0, y: 112 * K, w: 32, h: 32 * K }]);
    expect(B.corridors).toEqual([{ x: -1000, y: 112 * K, w: 1000, h: 32 * K }]);
    const r = reachableRect(B.world);
    for (let y = r.y; y < r.y + r.h; y += 3) for (let x = r.x; x < r.x + r.w; x += 3) expect(B.terrainAt(x, y), `${x},${y}`).toBe("beach");
    for (const [x, y] of [[310 * K, 90 * K], [200 * K, 4 * K], [400 * K, 150 * K]]) expect(B.terrainAt(x, y), `${x},${y}`).toBe("sea");
    for (const [x, y] of [[-50, 100 * K], [100 * K, 179 * K]]) expect(B.terrainAt(x, y)).toBe("beach");
  });

  it("the forest's east mouth has a road that runs out through it and joins the trail", () => {
    const K = AREAS.forest.world.width / 320;
    const east = AREAS.forest.paths.filter((r) => r.x + r.w > 320 * K && r.y >= 112 * K && r.y + r.h <= 144 * K);
    expect(east.length).toBeGreaterThan(0);
    expect(AREAS.forest.paths.some((r) => touch(r, east[0]) && r !== east[0])).toBe(true);
  });

  it("its places' art points are the game places' art points", () => {
    expect(BEACH_POINTS).toMatchObject({ fisher: zoneToArt(FISHER, "beach"), pier: zoneToArt(BEACH_PIER, "beach"), shipwreck: zoneToArt(SHIPWRECK, "beach"), signpost: zoneToArt(BEACH_SIGNPOST, "beach") });
  });

  it("its road is one connected road from the west mouth and reaches every place", () => {
    const seen = new Set([0]);
    for (const queue = [0]; queue.length; ) {
      const i = queue.pop()!;
      B.paths.forEach((r, j) => void (!seen.has(j) && touch(B.paths[i], r) && (seen.add(j), queue.push(j))));
    }
    expect(seen.size).toBe(B.paths.length);
    expect(B.paths.some((r) => r.x < 0)).toBe(true);
    const slack = 14 * K; // a place sits as far from its road, in screens, on a bigger beach
    const reaches = (x: number, y: number) => B.paths.some((r) => Math.abs(x - (r.x + r.w / 2)) <= r.w / 2 + slack && y >= r.y - slack && y < r.y + r.h + slack);
    for (const k of ["fisher", "pier", "shipwreck", "signpost"] as const) expect(reaches(BEACH_POINTS[k].x, BEACH_POINTS[k].y), k).toBe(true);
  });

  it("its props are inside the world, clear of each other and the mouth, and protected", () => {
    const base = ["boat", "explorer-down", "palm", "palm", "pier", "sandcastle", "shipwreck", "signpost", "umbrella", "umbrella"];
    // A bigger beach has palm groves, rocks, umbrellas and a boat down the shore.
    const extras = K === 1 ? [] : ["boat", "palm", "palm", "palm", "palm", "palm", "palm", "palm", "palm", "palm", "rock", "rock", "rock", "rock", "rock", "rock", "rock", "umbrella", "umbrella", "umbrella", "umbrella", "umbrella"];
    expect(B.props.map((p) => p.sprite).sort()).toEqual([...base, ...extras].sort());
    const boxes = B.props.map((p) => spriteBox(p.sprite, p.at));
    for (const [i, a] of boxes.entries()) {
      expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= B.world.width && a.y + a.h <= B.world.height, `prop ${i} in the world`).toBe(true);
      expect(intersects(a, B.mouths[0]), `prop ${i} on the mouth`).toBe(false);
      for (const b of boxes.slice(i + 1)) expect(intersects(a, b), `props ${i} overlap`).toBe(false);
      expect(B.protected).toContainEqual(a);
    }
    const pts = [BEACH_POINTS.fisher, BEACH_POINTS.pier, BEACH_POINTS.shipwreck, BEACH_POINTS.signpost];
    for (const [i, a] of pts.entries())
      for (const b of pts.slice(i + 1)) expect(Math.hypot((a.x - b.x) / (3.2 * K), (a.y - b.y) / (1.8 * K))).toBeGreaterThanOrEqual(12);
  });

  it("the crab's lane and the boat are named points", () => {
    expect(BEACH_POINTS.crabLane.y).toBeGreaterThan(130);
  });
});

describe("hosted chests' landmarks", () => {
  const HOSTS = [["chest-html", "lodge"], ["chest-css", "cave-mouth"], ["chest-php", "hut"], ["chest-sql", "windmill"], ["chest-js", "old-oak"], ["chest-java", "pyramid"], ["chest-py-2", "oasis"], ["chest-cpp-2", "shipwreck"], ["chest-cpp-1", "pier"], ["chest-py-1", "ruins"]] as const;

  it("every chest stands at a landmark drawing of its zone, so the landmark is the chest", () => {
    for (const [id, sprite] of HOSTS) {
      const chest = CHESTS.find((c) => c.id === id)!;
      const spot = zoneToArt(chest.at!, chest.zone);
      expect(AREAS[chest.zone].props.some((p) => p.sprite === sprite && p.at.x === spot.x && p.at.y === spot.y), `${id} at ${sprite}`).toBe(true);
    }
  });
});

describe("Foggaten Island's dig corner", () => {
  it("the island's road reaches the dig spot, and the spot is on land outside every prop", () => {
    const { dig } = FOGGATEN_POINTS;
    const reaches = FOGGATEN.paths.some((r) => Math.abs(dig.x - (r.x + r.w / 2)) <= r.w / 2 + 14 && dig.y >= r.y - 14 && dig.y < r.y + r.h + 14);
    expect(reaches).toBe(true);
    expect(FOGGATEN.terrainAt(dig.x, dig.y)).not.toBe("sea");
    for (const p of FOGGATEN.props) expect(intersects(spriteBox("x-mark", dig), spriteBox(p.sprite, p.at)), p.sprite).toBe(false);
  });
});
