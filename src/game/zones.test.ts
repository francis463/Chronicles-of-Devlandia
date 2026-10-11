import { describe, expect, it } from "vitest";
import { BOUNDS } from "./constants";
import { isInRiver } from "./geometry";
import { ZONES, arrival, exitFor, exitFrom, type Exit } from "./zones";

const inBounds = (p: { x: number; y: number }) =>
  p.x >= BOUNDS.minX && p.x <= BOUNDS.maxX && p.y >= BOUNDS.minY && p.y <= BOUNDS.maxY;

describe("zones", () => {
  it("every exit has a matching exit back on the opposite edge, with the same span", () => {
    for (const z of Object.values(ZONES)) {
      for (const exit of z.exits) {
        const back = ZONES[exit.to].exits.find((e) => e.to === z.id)!;
        expect(back, z.id).toBeDefined();
        expect(back.edge, z.id).not.toBe(exit.edge);
        expect([back.min, back.max], z.id).toEqual([exit.min, exit.max]);
      }
    }
  });

  it("every arrival point is even, inside the bounds, south of the wall and outside the river", () => {
    for (const z of Object.values(ZONES)) {
      for (let y = 62; y <= 78; y += 2) {
        const { player, drone } = arrival(z.exits[0], { x: z.exits[0].edge === "west" ? 6 : 94, y });
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

const SOUTH: Exit = { edge: "south", min: 62, max: 78, to: "village" };
const NORTH: Exit = { edge: "north", min: 62, max: 78, to: "peaks" };
const WEST: Exit = { edge: "west", min: 62, max: 78, to: "village" };

describe("the Dense Forest zone", () => {
  it("has three zones, the forest is named Dense Forest and has no wall, gate or river", () => {
    expect(Object.keys(ZONES).sort()).toEqual(["forest", "peaks", "village"]);
    expect(ZONES.forest).toMatchObject({ name: "Dense Forest", wall: false, gate: false, river: false });
    expect(ZONES.peaks).toMatchObject({ wall: true, gate: true, river: true });
    expect(ZONES.village).toMatchObject({ wall: true, gate: false, river: false });
  });

  it("the Peaks has a west and a south exit, the forest a north one, the village an east one", () => {
    expect(ZONES.peaks.exits).toEqual([
      { edge: "west", min: 62, max: 78, to: "village" },
      { edge: "south", min: 62, max: 78, to: "forest" },
    ]);
    expect(ZONES.village.exits).toEqual([{ edge: "east", min: 62, max: 78, to: "peaks" }]);
    expect(ZONES.forest.exits).toEqual([{ edge: "north", min: 62, max: 78, to: "peaks" }]);
  });

  it("exitFor walks between the Peaks and the forest, and west/east still work", () => {
    expect(exitFor("peaks", { x: 70, y: 90 }, { x: 70, y: 94 })?.to).toBe("forest");
    expect(exitFor("forest", { x: 70, y: 10 }, { x: 70, y: 6 })?.to).toBe("peaks");
    expect(exitFor("peaks", { x: 58, y: 90 }, { x: 58, y: 94 })).toBeNull();
    expect(exitFor("forest", { x: 6, y: 72 }, { x: 2, y: 72 })).toBeNull();
    expect(exitFor("peaks", { x: 6, y: 72 }, { x: 2, y: 72 })?.to).toBe("village");
  });
});

describe("exitFrom: vertical edges (Review Focus 1)", () => {
  it("a step off the south edge leaves from a column inside the span, including its ends", () => {
    for (const x of [62, 70, 78]) expect(exitFrom([SOUTH], { x, y: 90 }, { x, y: 94 }), `x ${x}`).toBe(SOUTH);
    // Like the horizontal exits, a step whose target is past the edge leaves even from one step short of it.
    expect(exitFrom([SOUTH], { x: 70, y: 88 }, { x: 70, y: 92 })).toBe(SOUTH);
  });

  it("columns outside the span, horizontal steps and steps that stay inside do not leave", () => {
    for (const x of [58, 60, 80, 82]) expect(exitFrom([SOUTH], { x, y: 90 }, { x, y: 94 }), `x ${x}`).toBeNull();
    expect(exitFrom([SOUTH], { x: 70, y: 90 }, { x: 74, y: 90 })).toBeNull();
    expect(exitFrom([SOUTH], { x: 70, y: 84 }, { x: 70, y: 88 })).toBeNull();
    expect(exitFrom([SOUTH], { x: 70, y: 90 }, { x: 70, y: 86 })).toBeNull();
    expect(exitFrom([SOUTH], { x: 70, y: 90 }, { x: 66, y: 94 })).toBeNull();
  });

  it("the north edge mirrors the south edge", () => {
    for (const x of [62, 70, 78]) expect(exitFrom([NORTH], { x, y: 10 }, { x, y: 6 }), `x ${x}`).toBe(NORTH);
    expect(exitFrom([NORTH], { x: 58, y: 10 }, { x: 58, y: 6 })).toBeNull();
    expect(exitFrom([NORTH], { x: 70, y: 10 }, { x: 70, y: 14 })).toBeNull();
  });

  it("picks the exit whose edge the step leaves through, among several", () => {
    expect(exitFrom([WEST, SOUTH], { x: 6, y: 70 }, { x: 2, y: 70 })).toBe(WEST);
    expect(exitFrom([WEST, SOUTH], { x: 70, y: 90 }, { x: 70, y: 94 })).toBe(SOUTH);
    expect(exitFrom([], { x: 70, y: 90 }, { x: 70, y: 94 })).toBeNull();
  });
});

describe("arrival on vertical edges", () => {
  it("a south exit arrives at the top edge, same column, the drone 8 rows in and 2 columns over", () => {
    expect(arrival(SOUTH, { x: 70, y: 90 })).toEqual({ player: { x: 70, y: 10 }, drone: { x: 68, y: 18 } });
  });

  it("a north exit arrives at the bottom edge, same column", () => {
    expect(arrival(NORTH, { x: 70, y: 10 })).toEqual({ player: { x: 70, y: 90 }, drone: { x: 68, y: 82 } });
  });

  it("horizontal arrivals keep the row and put the drone 8 columns in and 2 rows up", () => {
    expect(arrival(WEST, { x: 6, y: 72 })).toEqual({ player: { x: 94, y: 72 }, drone: { x: 86, y: 70 } });
    expect(arrival({ edge: "east", min: 62, max: 78, to: "peaks" }, { x: 94, y: 72 })).toEqual({ player: { x: 6, y: 72 }, drone: { x: 14, y: 70 } });
  });

  it("every vertical arrival and its drone are inside the bounds for every column in the span", () => {
    for (let x = 62; x <= 78; x += 2) {
      for (const exit of [SOUTH, NORTH]) {
        const { player, drone } = arrival(exit, { x, y: exit.edge === "south" ? 90 : 10 });
        expect(inBounds(player), `${exit.edge} ${x}`).toBe(true);
        expect(inBounds(drone), `${exit.edge} ${x}`).toBe(true);
        expect(player.x).toBe(x);
      }
    }
  });
});
