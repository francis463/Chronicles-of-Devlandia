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
    for (const z of Object.values(ZONES).filter((zone) => zone.exits.length > 0)) {
      for (let y = 62; y <= 78; y += 2) {
        const { player, drone } = arrival(z.exits[0], { x: z.exits[0].edge === "west" ? 6 : 94, y });
        const where = `${z.id} y ${y}`;
        expect(player.x % 2, where).toBe(0);
        expect(player.y % 2, where).toBe(0);
        expect(inBounds(player), where).toBe(true);
        // Only a zone with the north wall has a north part to arrive south of.
        if (ZONES[z.exits[0].to].wall) expect(player.y, where).toBeGreaterThan(49);
        expect(isInRiver(player), where).toBe(false);
        expect(inBounds(drone), where).toBe(true);
      }
    }
  });

  it("village places in order: villager, signpost, terminal, archive, the garden carrot, chest-php, chest-sql", () => {
    expect(ZONES.village.places.map((p) => p.id)).toEqual([
      "villager", "signpost", "terminal", "archive", "remedy-carrot", "chest-php", "chest-sql",
    ]);
    expect(ZONES.village.places.find((p) => p.id === "chest-sql")).toMatchObject({ label: "Windmill", x: 13.75, y: 42.2 });
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

describe("the way to the Hall of Fame", () => {
  it("walking north out of the village at any column of the exit lands you at the Hall's south edge, and back", () => {
    const north = ZONES.village.exits.find((e) => e.to === "hall")!;
    const south = ZONES.hall.exits[0];
    for (let x = north.min; x <= north.max; x += 2) {
      const up = arrival(north, { x, y: BOUNDS.minY });
      expect(up.player, `x ${x}`).toEqual({ x, y: BOUNDS.maxY });
      expect(inBounds(up.drone), `x ${x}`).toBe(true);
      expect(exitFor("hall", { x, y: BOUNDS.maxY }, { x, y: BOUNDS.maxY + 2 }), `x ${x}`).toEqual(south);
      expect(arrival(south, { x, y: BOUNDS.maxY }).player, `x ${x}`).toEqual({ x, y: BOUNDS.minY });
    }
    expect(exitFor("village", { x: 30, y: BOUNDS.minY }, { x: 30, y: BOUNDS.minY - 2 })).toBeNull(); // outside the gap, the hedge holds
  });
});

describe("the Dense Forest zone", () => {
  it("has eight zones (seven outdoors and the lodge), the forest is named Dense Forest and has no wall, gate or river", () => {
    expect(Object.keys(ZONES).sort()).toEqual(["beach", "desert", "foggaten", "forest", "hall", "lodge", "peaks", "village"]);
    expect(ZONES.forest).toMatchObject({ name: "Dense Forest", wall: false, gate: false, river: false });
    expect(ZONES.peaks).toMatchObject({ wall: true, gate: true, river: true });
    expect(ZONES.village).toMatchObject({ wall: false, gate: false, river: false });
  });

  it("the Peaks has a west and a south exit, the forest a north one, the village an east one", () => {
    expect(ZONES.peaks.exits).toEqual([
      { edge: "west", min: 62, max: 78, to: "village" },
      { edge: "south", min: 62, max: 78, to: "forest" },
    ]);
    expect(ZONES.village.exits).toEqual([
      { edge: "east", min: 62, max: 78, to: "peaks" },
      { edge: "north", min: 40, max: 56, to: "hall" },
    ]);
    expect(ZONES.forest.exits).toEqual([
      { edge: "north", min: 62, max: 78, to: "peaks" },
      { edge: "west", min: 62, max: 78, to: "desert" },
      { edge: "east", min: 62, max: 78, to: "beach" },
    ]);
  });

  it("exitFor walks between the Peaks and the forest, and west/east still work", () => {
    expect(exitFor("peaks", { x: 70, y: 90 }, { x: 70, y: 94 })?.to).toBe("forest");
    expect(exitFor("forest", { x: 70, y: 10 }, { x: 70, y: 6 })?.to).toBe("peaks");
    expect(exitFor("peaks", { x: 58, y: 90 }, { x: 58, y: 94 })).toBeNull();
    expect(exitFor("forest", { x: 6, y: 72 }, { x: 2, y: 72 })?.to).toBe("desert");
    expect(exitFor("forest", { x: 6, y: 50 }, { x: 2, y: 50 })).toBeNull();
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

describe("Foggaten Island", () => {
  it("is a zone with no exits, wall, gate or river, four places and the ruins chest", () => {
    expect(ZONES.foggaten).toMatchObject({ id: "foggaten", name: "Foggaten Island", exits: [], wall: false, gate: false, river: false });
    expect(ZONES.foggaten.places.map((p) => p.id)).toEqual(["island-dock", "lighthouse", "hermit", "island-fire", "chest-py-1"]);
  });

  it("the Peaks has a dock", () => {
    expect(ZONES.peaks.places.map((p) => p.id)).toContain("dock");
    expect(ZONES.peaks.places.map((p) => p.id)).toEqual(expect.arrayContaining(["peaks-signpost", "weather-station"]));
    expect(ZONES.peaks.places.map((p) => p.id)).not.toContain("snow-cave");
    expect(ZONES.peaks.places.find((p) => p.id === "dock")).toMatchObject({ label: "Dock", x: 92, y: 74 });
  });
});

describe("the Sunbaked Desert zone", () => {
  it("is west of the forest, with an east exit back, and no wall, gate or river", () => {
    expect(ZONES.desert).toMatchObject({ id: "desert", name: "Sunbaked Desert", wall: false, gate: false, river: false });
    expect(ZONES.desert.exits).toEqual([{ edge: "east", min: 62, max: 78, to: "forest" }]);
    expect(ZONES.forest.exits).toContainEqual({ edge: "west", min: 62, max: 78, to: "desert" });
  });

  it("walking off the forest's west edge, or the desert's east edge, inside the span crosses; outside it does not", () => {
    expect(exitFor("forest", { x: 6, y: 70 }, { x: 2, y: 70 })?.to).toBe("desert");
    expect(exitFor("desert", { x: 94, y: 70 }, { x: 98, y: 70 })?.to).toBe("forest");
    expect(exitFor("forest", { x: 6, y: 50 }, { x: 2, y: 50 })).toBeNull();
    expect(exitFor("desert", { x: 94, y: 86 }, { x: 98, y: 86 })).toBeNull();
  });

  it("its places are the nomad, the signpost and the pyramid and oasis chests", () => {
    expect(ZONES.desert.places.map((p) => p.id)).toEqual(["nomad", "desert-signpost", "caravan-camp", "desert-well", "temple-door", "dry-riverbed", "obelisk", "jar-1", "jar-2", "jar-3", "remedy-fruit", "secret-cave", "secret-ridge", "chest-java", "chest-py-2"]);
    expect(ZONES.desert.places.map((p) => p.label)).toEqual(["Nomad", "Signpost", "Caravan Camp", "Old Well", "Buried Door", "Dry Riverbed", "Obelisk", "Water Jar", "Water Jar", "Water Jar", "Cactus Fruit", "Hidden Cave", "Dune Ridge", "Pyramid", "Oasis"]);
  });
});

describe("the Sunny Beach zone", () => {
  it("is east of the forest, with a west exit back, and no wall, gate or river", () => {
    expect(ZONES.beach).toMatchObject({ id: "beach", name: "Sunny Beach", wall: false, gate: false, river: false });
    expect(ZONES.beach.exits).toEqual([{ edge: "west", min: 62, max: 78, to: "forest" }]);
  });
  it("crossing the forest's east edge or the beach's west edge works inside the span only", () => {
    expect(exitFor("forest", { x: 94, y: 70 }, { x: 98, y: 70 })?.to).toBe("beach");
    expect(exitFor("beach", { x: 6, y: 70 }, { x: 2, y: 70 })?.to).toBe("forest");
    expect(exitFor("forest", { x: 94, y: 50 }, { x: 98, y: 50 })).toBeNull();
    expect(exitFor("beach", { x: 6, y: 86 }, { x: 2, y: 86 })).toBeNull();
  });
  it("its places are the fisher, the signpost and the pier and shipwreck chests", () => {
    expect(ZONES.beach.places.map((p) => p.id)).toEqual(["fisher", "beach-signpost", "sandcastle", "remedy-drink", "secret-pool", "secret-bottle", "chest-cpp-1", "chest-cpp-2"]);
    expect(ZONES.beach.places.map((p) => p.label)).toEqual(["Fisher", "Signpost", "Sandcastle", "Cold Drink", "Tide Pool", "Message in a Bottle", "Pier", "Shipwreck"]);
  });
});
