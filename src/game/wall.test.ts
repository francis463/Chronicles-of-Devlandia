import { describe, expect, it } from "vitest";
import { crossesWall, isNorthOfWall, wallBlock } from "./wall";

const EVEN_X = Array.from({ length: 45 }, (_, i) => 6 + 2 * i); // 6 … 94
// Both rows a player can stand on either side of the wall: the 4k grid (52 ↔ 48) and 4k + 2 (50 ↔ 46).
const CROSSINGS: Array<[number, number]> = [
  [52, 48],
  [48, 52],
  [50, 46],
  [46, 50],
];

describe("the north wall", () => {
  it("a step crosses the wall only when it changes side", () => {
    expect(crossesWall({ x: 50, y: 50 }, { x: 50, y: 46 })).toBe(true);
    expect(crossesWall({ x: 50, y: 48 }, { x: 50, y: 52 })).toBe(true);
    expect(crossesWall({ x: 50, y: 48 }, { x: 50, y: 44 })).toBe(false);
    expect(crossesWall({ x: 50, y: 52 }, { x: 50, y: 56 })).toBe(false);
    expect(crossesWall({ x: 46, y: 48 }, { x: 50, y: 48 })).toBe(false);
    expect([isNorthOfWall({ x: 50, y: 48 }), isNorthOfWall({ x: 50, y: 50 })]).toEqual([true, false]);
  });

  it("while the gate is locked every crossing is blocked as locked, wherever it is", () => {
    for (const x of EVEN_X)
      for (const [a, b] of CROSSINGS) expect(wallBlock({ x, y: a }, { x, y: b }, false), `${x}: ${a}→${b}`).toBe("locked");
  });

  it("once open, crossings pass between the posts (x 48, 50, 52) and are solid elsewhere, posts included", () => {
    for (const x of [48, 50, 52])
      for (const [a, b] of CROSSINGS) expect(wallBlock({ x, y: a }, { x, y: b }, true), `${x}: ${a}→${b}`).toBeNull();
    for (const x of [6, 44, 46, 54, 56, 94])
      for (const [a, b] of CROSSINGS) expect(wallBlock({ x, y: a }, { x, y: b }, true), `${x}: ${a}→${b}`).toBe("solid");
  });

  it("steps along the wall and steps that stay on one side are never blocked", () => {
    for (const open of [false, true]) {
      expect(wallBlock({ x: 44, y: 48 }, { x: 48, y: 48 }, open)).toBeNull();
      expect(wallBlock({ x: 30, y: 52 }, { x: 30, y: 56 }, open)).toBeNull();
      expect(wallBlock({ x: 30, y: 46 }, { x: 30, y: 42 }, open)).toBeNull();
    }
  });
});
