import { describe, expect, it } from "vitest";
import { EXPLORER_BOX, SEMICOLON_BOX, labelBoxes, labelLayout, teammateLabelSide, type MapSize, type MarkerBox, type Obstacle } from "./labelLayout";
import type { Point } from "../../game/types";
import { fitWorld } from "../../render/world";
import { exitSignBox, landmarkCaptions } from "./mapLayout";

// The exhaustive grid tests check every position on both zones; they take ~3 s alone and more under a loaded suite.
const GRID_TIMEOUT_MS = 30_000;

const ZONES = ["peaks", "village"] as const;
// The drone trails the player by up to a step and a bit, from any direction.
const TRAIL = [[-3, 0], [3, 0], [0, -3], [0, 3], [-1.7, 0], [1.7, 0], [0, -1.7], [0, 1.7]];
/** In the village the wall is solid, so you never stand north of it. */
const firstRow = (zone: (typeof ZONES)[number]) => (zone === "village" ? 50 : 10);

// The world layer's CSS size: phones (1 CSS px per art px) and desktop (2).
const world320: MapSize = { width: 320, height: 180 };
const world640: MapSize = { width: 640, height: 360 };
const WORLDS: Array<[MapSize, number]> = [
  [world320, 1],
  [world640, 2],
];

type Box = { left: number; right: number; top: number; bottom: number };
const overlap = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const inside = (a: Box, map: MapSize) => a.left >= 0 && a.top >= 0 && a.right <= map.width && a.bottom <= map.height;
const boxAt = (p: Point, box: MarkerBox, map: MapSize, scale: number): Box => {
  const x = (p.x / 100) * map.width;
  const y = (p.y / 100) * map.height;
  return { left: x + box.left * scale, right: x + box.right * scale, top: y + box.top * scale, bottom: y + box.bottom * scale };
};

function expectClear(player: Point, drone: Point, map: MapSize, scale: number, obstacles: Obstacle[] = []) {
  const layout = labelLayout(player, drone, map, obstacles, scale);
  const b = labelBoxes(player, drone, map, layout, scale);
  const where = `${JSON.stringify(player)} ${JSON.stringify(drone)} @${map.width} → ${JSON.stringify(layout)}`;
  expect(overlap(b.playerLabel, b.droneLabel), `labels overlap: ${where}`).toBe(false);
  expect(overlap(b.playerLabel, b.droneDot), `player label on drone: ${where}`).toBe(false);
  expect(overlap(b.droneLabel, b.playerDot), `drone label on player: ${where}`).toBe(false);
  expect(inside(b.playerLabel, map), `player label off the world: ${where}`).toBe(true);
  expect(inside(b.droneLabel, map), `drone label off the world: ${where}`).toBe(true);
  for (const o of obstacles) {
    const ob = boxAt(o, o.box, map, scale);
    expect(overlap(b.playerLabel, ob) || overlap(b.droneLabel, ob), `label on obstacle: ${where}`).toBe(false);
  }
}

describe("labelLayout", () => {
  it("keeps both labels on the right when the markers are far apart", () => {
    const layout = labelLayout({ x: 28, y: 72 }, { x: 60, y: 20 }, world640, [], 2);
    expect(layout.player.side).toBe("right");
    expect(layout.drone.side).toBe("right");
  });

  it("points the labels away from each other at the spawn point", () => {
    const layout = labelLayout({ x: 28, y: 72 }, { x: 36, y: 70 }, world320, [], 1);
    expect(layout.player.side).toBe("left");
    expect(layout.drone.side).toBe("right");
  });

  it("keeps labels clear of each other and inside the world for nearby markers anywhere, edges included", () => {
    for (const [map, scale] of WORLDS) {
      for (const px of [6, 10, 28, 50, 72, 90, 94]) {
        for (const py of [10, 50, 90]) {
          for (const [dx, dy] of [[-8, 0], [8, 0], [0, -6], [0, 6], [-5, -3], [5, 3], [3, 1], [-3, -1], [0, 0]]) {
            // The drone only ever moves toward the player, so it stays inside the player's bounds.
            const drone = { x: Math.min(94, Math.max(6, px + dx)), y: Math.min(90, Math.max(10, py + dy)) };
            expectClear({ x: px, y: py }, drone, map, scale);
          }
        }
      }
    }
  });

  it("shifts an above/below label sideways so it stays inside the world", () => {
    const layout = labelLayout({ x: 94, y: 60 }, { x: 86.5, y: 59.8 }, world320, [], 1);
    expectClear({ x: 94, y: 60 }, { x: 86.5, y: 59.8 }, world320, 1);
    expect(["above", "below", "left"]).toContain(layout.player.side);
  });

  it("keeps labels off the found Golden Semicolon", () => {
    const player = { x: 40, y: 50 };
    const drone = { x: 46, y: 50 };
    // sits where the drone's default right-hand label would go
    const semicolon: Obstacle = { x: 54, y: 46, box: SEMICOLON_BOX };
    expectClear(player, drone, world640, 2, [semicolon]);
  });

  it("keeps your labels off a teammate standing next to you", () => {
    const player = { x: 40, y: 50 };
    const drone = { x: 46, y: 50 };
    const kai: Obstacle = { x: 56, y: 48, box: EXPLORER_BOX };
    const plain = labelBoxes(player, drone, world320, labelLayout(player, drone, world320, [], 1), 1);
    expect(overlap(plain.droneLabel, boxAt(kai, kai.box, world320, 1))).toBe(true);
    expectClear(player, drone, world320, 1, [kai]);
  });

  it("measures markers by their sprite boxes, scaled to the world", () => {
    const b = labelBoxes({ x: 50, y: 50 }, { x: 10, y: 10 }, world640, { player: { side: "right", shift: 0 }, drone: { side: "right", shift: 0 } }, 2);
    expect(b.playerDot).toEqual({ left: 304, right: 336, top: 150, bottom: 182 });
    expect(b.playerLabel.left).toBe(336 + 8);
    expect((b.playerLabel.top + b.playerLabel.bottom) / 2).toBe(166);
  });
});

describe("fixed obstacles", () => {
  it("keeps labels off fixed boxes such as landmark captions", () => {
    const player = { x: 40, y: 50 };
    const drone = { x: 46, y: 50 };
    const plain = labelBoxes(player, drone, world320, labelLayout(player, drone, world320, [], 1), 1);
    const caption = { left: plain.droneLabel.left, right: plain.droneLabel.right, top: plain.droneLabel.top, bottom: plain.droneLabel.bottom };
    const layout = labelLayout(player, drone, world320, [], 1, [caption]);
    const b = labelBoxes(player, drone, world320, layout, 1);
    expect(overlap(b.droneLabel, caption) || overlap(b.playerLabel, caption)).toBe(false);
  });

  it("with the landmark captions and drawings MapViewport passes, your labels still never cover each other or the other sprite", () => {
    // A phone (s 3, world 320×180 CSS) and a desktop (s 2, 640×360) map area, as MapViewport sizes them.
    for (const view of [{ width: 354, height: 360, dpr: 3 }, { width: 668, height: 360, dpr: 1 }]) {
      const world = fitWorld(view);
      const map: MapSize = { width: world.width, height: world.height };
      for (const zone of ZONES) {
        for (const state of [{ hasLoot: false, towerPowered: false }, { hasLoot: true, towerPowered: true }]) {
          const fixed = [...landmarkCaptions(world, view, state, zone), exitSignBox(world, zone)];
          for (let px = 6; px <= 94; px += 2) {
            for (let py = firstRow(zone); py <= 90; py += 2) {
              for (const [dx, dy] of TRAIL) {
                const player = { x: px, y: py };
                const drone = { x: px + dx, y: py + dy };
                const layout = labelLayout(player, drone, map, [], world.scale, fixed);
                const b = labelBoxes(player, drone, map, layout, world.scale);
                const where = `${zone} ${px},${py} ${dx},${dy} @${view.width}/${view.dpr} loot ${state.hasLoot} → ${JSON.stringify(layout)}`;
                expect(overlap(b.playerLabel, b.droneLabel), `labels overlap: ${where}`).toBe(false);
                expect(overlap(b.playerLabel, b.droneDot), `player label on drone: ${where}`).toBe(false);
                expect(overlap(b.droneLabel, b.playerDot), `drone label on player: ${where}`).toBe(false);
                expect(inside(b.playerLabel, map) && inside(b.droneLabel, map), `label off the world: ${where}`).toBe(true);
              }
            }
          }
        }
      }
    }
  }, GRID_TIMEOUT_MS);

  it("at 2× and 3× no label overlaps an exit sign", () => {
    for (const view of [{ width: 668, height: 360, dpr: 1 }, { width: 989, height: 610, dpr: 1 }]) {
      const world = fitWorld(view);
      const map: MapSize = { width: world.width, height: world.height };
      for (const zone of ZONES) {
        const sign = exitSignBox(world, zone);
        const fixed = [...landmarkCaptions(world, view, { hasLoot: false, towerPowered: false }, zone), sign];
        for (let px = 6; px <= 94; px += 2) {
          for (let py = firstRow(zone); py <= 90; py += 2) {
            for (const [dx, dy] of TRAIL) {
              const player = { x: px, y: py };
              const drone = { x: px + dx, y: py + dy };
              const b = labelBoxes(player, drone, map, labelLayout(player, drone, map, [], world.scale, fixed), world.scale);
              const where = `${zone} ${px},${py} ${dx},${dy} @${view.width}`;
              expect(overlap(b.playerLabel, sign) || overlap(b.droneLabel, sign), `label on the exit sign: ${where}`).toBe(false);
            }
          }
        }
      }
    }
  }, GRID_TIMEOUT_MS);
});

describe("teammate labels", () => {
  it("flip left in the right 20 % of the world", () => {
    expect(teammateLabelSide(81)).toBe("left");
    expect(teammateLabelSide(80)).toBe("right");
    expect(teammateLabelSide(10)).toBe("right");
  });
});
