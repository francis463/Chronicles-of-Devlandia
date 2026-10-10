import { describe, expect, it } from "vitest";
import { BOUNDS } from "./constants";
import { isInRiver } from "./geometry";
import { ZONES, arrival, exitFor } from "./zones";

const inBounds = (p: { x: number; y: number }) =>
  p.x >= BOUNDS.minX && p.x <= BOUNDS.maxX && p.y >= BOUNDS.minY && p.y <= BOUNDS.maxY;

describe("zones", () => {
  it("every exit has a matching exit back on the opposite edge, with the same span", () => {
    for (const z of Object.values(ZONES)) {
      const back = ZONES[z.exit.to].exit;
      expect(back.to, z.id).toBe(z.id);
      expect(back.edge, z.id).not.toBe(z.exit.edge);
      expect([back.minY, back.maxY], z.id).toEqual([z.exit.minY, z.exit.maxY]);
    }
  });

  it("every arrival point is even, inside the bounds, south of the wall and outside the river", () => {
    for (const z of Object.values(ZONES)) {
      for (let y = 62; y <= 78; y += 2) {
        const { player, drone } = arrival(z.exit, y);
        const where = `${z.id} y ${y}`;
        expect(player.x % 2, where).toBe(0);
        expect(player.y % 2, where).toBe(0);
        expect(inBounds(player), where).toBe(true);
        expect(player.y, where).toBeGreaterThan(49);
        expect(isInRiver(player), where).toBe(false);
        expect(inBounds(drone), where).toBe(true);
      }
    }
  });

  it("village places in order: villager, signpost, terminal, archive, chest-php, chest-sql, chest-py-2", () => {
    expect(ZONES.village.places.map((p) => p.id)).toEqual([
      "villager", "signpost", "terminal", "archive", "chest-php", "chest-sql", "chest-py-2",
    ]);
    expect(ZONES.village.places.find((p) => p.id === "chest-sql")).toMatchObject({ label: "SQL Chest", x: 12, y: 80 });
  });

  it("exitFor: only a horizontal step off the exit edge inside the span", () => {
    expect(exitFor("peaks", { x: 6, y: 72 }, { x: 2, y: 72 })?.to).toBe("village");
    expect(exitFor("peaks", { x: 8, y: 62 }, { x: 4, y: 62 })?.to).toBe("village");
    expect(exitFor("peaks", { x: 6, y: 60 }, { x: 2, y: 60 })).toBeNull();
    expect(exitFor("peaks", { x: 8, y: 80 }, { x: 4, y: 80 })).toBeNull();
    expect(exitFor("peaks", { x: 6, y: 72 }, { x: 6, y: 68 })).toBeNull();
    expect(exitFor("village", { x: 94, y: 72 }, { x: 98, y: 72 })?.to).toBe("peaks");
    expect(exitFor("village", { x: 6, y: 72 }, { x: 2, y: 72 })).toBeNull();
  });
});
