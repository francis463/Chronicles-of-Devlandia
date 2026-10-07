import { describe, expect, it } from "vitest";
import { circlePixels, diamondPixels, greyscale, gridRuns, mirror, rotate90, shade } from "./pixels";

describe("pixel grids", () => {
  it("gridRuns merges same-colour horizontal runs and skips transparent pixels", () => {
    expect(gridRuns([".aab"], { a: "#111111", b: "#222222" })).toEqual([
      { x: 1, y: 0, w: 2, color: "#111111" },
      { x: 3, y: 0, w: 1, color: "#222222" },
    ]);
    expect(gridRuns(["a.", ".a"], { a: "#111111" })).toEqual([
      { x: 0, y: 0, w: 1, color: "#111111" },
      { x: 1, y: 1, w: 1, color: "#111111" },
    ]);
  });

  it("mirror flips left-right; rotate90 turns clockwise", () => {
    expect(mirror(["ab."])).toEqual([".ba"]);
    expect(rotate90(["ab", "cd"])).toEqual(["ca", "db"]);
    expect(rotate90(["abc"])).toEqual(["a", "b", "c"]);
  });

  it("greyscale uses luma; shade mixes toward black or white", () => {
    expect(greyscale({ a: "#ff0000" }).a).toBe("#4c4c4c");
    expect(shade("#22c55e", -1)).toBe("#000000");
    expect(shade("#000000", 1)).toBe("#ffffff");
    expect(shade("#808080", 0)).toBe("#808080");
    expect(shade("#ff0000", -0.5)).toBe("#800000");
  });

  it("circle and diamond pixel sets", () => {
    const circle = circlePixels(4);
    const keys = circle.map((p) => `${p.x},${p.y}`);
    for (const k of ["4,0", "0,4", "-4,0", "0,-4"]) expect(keys).toContain(k);
    expect(new Set(keys).size).toBe(keys.length);
    expect(circle.every((p) => Math.abs(Math.hypot(p.x, p.y) - 4) < 1)).toBe(true);
    expect(diamondPixels(2)).toHaveLength(13);
    expect(diamondPixels(0)).toEqual([{ x: 0, y: 0 }]);
  });
});
