import { describe, expect, it } from "vitest";
import { labelBoxes, labelLayout, type MapSize } from "./labelLayout";
import type { Point } from "../../game/types";

const phone: MapSize = { width: 339, height: 360 };
const desktop: MapSize = { width: 668, height: 360 };

type Box = { left: number; right: number; top: number; bottom: number };
const overlap = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const inside = (a: Box, map: MapSize) => a.left >= 0 && a.top >= 0 && a.right <= map.width && a.bottom <= map.height;

function expectClear(player: Point, drone: Point, map: MapSize) {
  const layout = labelLayout(player, drone, map);
  const b = labelBoxes(player, drone, map, layout);
  const where = `${JSON.stringify(player)} ${JSON.stringify(drone)} → ${JSON.stringify(layout)}`;
  expect(overlap(b.playerLabel, b.droneLabel), `labels overlap: ${where}`).toBe(false);
  expect(overlap(b.playerLabel, b.droneDot), `player label on drone: ${where}`).toBe(false);
  expect(overlap(b.droneLabel, b.playerDot), `drone label on player: ${where}`).toBe(false);
  expect(inside(b.playerLabel, map), `player label off the map: ${where}`).toBe(true);
  expect(inside(b.droneLabel, map), `drone label off the map: ${where}`).toBe(true);
}

describe("labelLayout", () => {
  it("keeps both labels on the right when the markers are far apart", () => {
    const layout = labelLayout({ x: 28, y: 72 }, { x: 60, y: 20 }, desktop);
    expect(layout.player.side).toBe("right");
    expect(layout.drone.side).toBe("right");
  });

  it("points the labels away from each other at the spawn point", () => {
    const layout = labelLayout({ x: 28, y: 72 }, { x: 31.36, y: 71.16 }, phone);
    expect(layout.player.side).toBe("left");
    expect(layout.drone.side).toBe("right");
  });

  it("keeps labels clear of each other and on the map for nearby markers anywhere, edges included", () => {
    for (const map of [phone, desktop]) {
      for (const px of [6, 10, 28, 50, 72, 90, 94]) {
        for (const py of [10, 50, 90]) {
          for (const [dx, dy] of [[-8, 0], [8, 0], [0, -6], [0, 6], [-5, -3], [5, 3], [3, 1], [-3, -1], [0, 0]]) {
            // The drone only ever moves toward the player, so it stays inside the player's bounds.
            const drone = { x: Math.min(94, Math.max(6, px + dx)), y: Math.min(90, Math.max(10, py + dy)) };
            expectClear({ x: px, y: py }, drone, map);
          }
        }
      }
    }
  });

  it("shifts an above/below label sideways so it stays on the map", () => {
    const layout = labelLayout({ x: 94, y: 60 }, { x: 86.5, y: 59.8 }, phone);
    expectClear({ x: 94, y: 60 }, { x: 86.5, y: 59.8 }, phone);
    expect(["above", "below"]).toContain(layout.player.side);
    expect(layout.player.shift).toBeLessThan(0);
  });
});
