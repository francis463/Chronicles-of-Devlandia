import { describe, expect, it } from "vitest";
import { BOUNDS } from "./constants";
import { HALL_SIGNPOST, HALL_SLOTS, HALL_SLOT_COUNT, hallLine, hallSlotIndex, isHallSlot } from "./hall";
import { ZONES } from "./zones";

describe("Hall of Fame spots", () => {
  it("has ten spots, rank 1 in the middle of the stage, 2 on its left and 3 on its right", () => {
    expect(HALL_SLOT_COUNT).toBe(10);
    expect(HALL_SLOTS.map((s) => s.id)).toEqual(Array.from({ length: 10 }, (_, i) => `hall-${i + 1}`));
    const [first, second, third] = HALL_SLOTS;
    expect(second.x).toBeLessThan(first.x);
    expect(third.x).toBeGreaterThan(first.x);
    expect(first.y).toBeLessThanOrEqual(Math.min(second.y, third.y)); // the tallest block is at the back
  });

  it("puts ranks 4 to 10 on the ground, south of the stage", () => {
    const stageFloor = Math.max(...HALL_SLOTS.slice(0, 3).map((s) => s.y));
    for (const s of HALL_SLOTS.slice(3)) expect(s.y, s.id).toBeGreaterThan(stageFloor);
  });

  it("keeps every spot and the signpost inside the zone, apart from each other", () => {
    const all = [...HALL_SLOTS, HALL_SIGNPOST];
    for (const p of all) {
      expect(p.x, p.id).toBeGreaterThanOrEqual(BOUNDS.minX);
      expect(p.x, p.id).toBeLessThanOrEqual(BOUNDS.maxX);
      expect(p.y, p.id).toBeGreaterThanOrEqual(BOUNDS.minY);
      expect(p.y, p.id).toBeLessThanOrEqual(BOUNDS.maxY);
    }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y), `${all[i].id} ${all[j].id}`).toBeGreaterThan(8);
  });

  it("recognises its spots and numbers them from 0", () => {
    expect(isHallSlot("hall-1")).toBe(true);
    expect(isHallSlot("hall-10")).toBe(true);
    expect(isHallSlot("hall-signpost")).toBe(false);
    expect(isHallSlot("villager")).toBe(false);
    expect(hallSlotIndex("hall-1")).toBe(0);
    expect(hallSlotIndex("hall-10")).toBe(9);
  });

  it("is a zone of its own with its places, a south way back and no wall, gate or river", () => {
    const hall = ZONES.hall;
    expect(hall.name).toBe("Hall of Fame");
    expect(hall.places.map((p) => p.id)).toEqual([...HALL_SLOTS.map((s) => s.id), "hall-signpost"]);
    expect([hall.wall, hall.gate, hall.river]).toEqual([false, false, false]);
    expect(hall.exits).toEqual([{ edge: "south", min: 40, max: 56, to: "village" }]);
    expect(ZONES.village.exits).toContainEqual({ edge: "north", min: 40, max: 56, to: "hall" });
  });
});

describe("hallLine", () => {
  it("says the name, rank, badges and class of the player on a spot", () => {
    expect(hallLine({ rank: 1, name: "Alice", badges: 3, cls: "mage" }, 0)).toBe("Alice: rank 1, 3/11 badges, Mage.");
  });
  it("shows the real rank of a tied player, and Warrior when the class is unknown", () => {
    expect(hallLine({ rank: 1, name: "Bobby", badges: 3 }, 1)).toBe("Bobby: rank 1, 3/11 badges, Warrior.");
  });
  it("masks a name the chat filter would mask", () => {
    const line = hallLine({ rank: 2, name: "Bobo", badges: 2 }, 1);
    expect(line).toContain("***");
    expect(line).not.toContain("Bobo");
  });
  it("says an empty spot is waiting, with its number", () => {
    expect(hallLine(null, 3)).toBe("Spot 4 is waiting for a player.");
  });
});
