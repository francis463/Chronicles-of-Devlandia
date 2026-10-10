import { describe, expect, it } from "vitest";
import { order } from "./shuffle";

describe("order", () => {
  it("order is a stable permutation for a seed and id, and data index 0 (the correct option) lands in every slot across seeds", () => {
    expect(order(4, 7, "x")).toEqual(order(4, 7, "x"));
    expect([...order(4, 7, "x")].sort()).toEqual([0, 1, 2, 3]);
    const slots = new Set(Array.from({ length: 200 }, (_, s) => order(4, s, "x").indexOf(0)));
    expect(slots).toEqual(new Set([0, 1, 2, 3]));
  });
});
