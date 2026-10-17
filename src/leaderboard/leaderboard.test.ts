import { describe, expect, it } from "vitest";
import { parseMe, parseRows } from "./leaderboard";

describe("parseRows", () => {
  it("keeps well-formed rows", () => {
    const rows = [
      { rank: 1, name: "Alice", badges: 3 },
      { rank: 3, name: "Carol", badges: 1 },
    ];
    expect(parseRows(rows)).toEqual(rows);
  });

  it("returns nothing for anything that is not a list", () => {
    for (const bad of [null, undefined, {}, "rows", 7]) expect(parseRows(bad)).toEqual([]);
  });

  it("drops odd rows and keeps the rest", () => {
    const good = { rank: 2, name: "Bobby", badges: 2 };
    const odd: unknown[] = [
      null,
      "row",
      [],
      { rank: 0, name: "A", badges: 1 },
      { rank: -1, name: "A", badges: 1 },
      { rank: 1.5, name: "A", badges: 1 },
      { rank: "1", name: "A", badges: 1 },
      { rank: Number.NaN, name: "A", badges: 1 },
      { rank: Number.POSITIVE_INFINITY, name: "A", badges: 1 },
      { rank: 1, name: "A", badges: 0 },
      { rank: 1, name: "A", badges: 12 },
      { rank: 1, name: "A", badges: 2.5 },
      { rank: 1, name: "", badges: 1 },
      { rank: 1, name: 42, badges: 1 },
      { rank: 1, name: "ThirteenChars", badges: 1 },
      { rank: 1, badges: 1 },
    ];
    expect(parseRows([...odd, good])).toEqual([good]);
  });
});

describe("parseMe", () => {
  it("reads the first row of the reply", () => {
    expect(parseMe([{ rank: 4, badges: 2, hidden: false }])).toEqual({ rank: 4, badges: 2, hidden: false });
    expect(parseMe([{ rank: null, badges: 0, hidden: true }])).toEqual({ rank: null, badges: 0, hidden: true });
  });

  it("is null for an empty or odd reply", () => {
    for (const bad of [[], null, undefined, {}, "x", [null], [{ rank: 1, badges: 1 }], [{ rank: 1, badges: 1, hidden: "no" }]]) {
      expect(parseMe(bad)).toBeNull();
    }
    for (const bad of [{ rank: 1, badges: -1, hidden: false }, { rank: 1, badges: 1.5, hidden: false }, { rank: 1.5, badges: 1, hidden: false }, { rank: 0, badges: 1, hidden: false }, { rank: "1", badges: 1, hidden: false }, { rank: 1, badges: 12, hidden: false }]) {
      expect(parseMe([bad])).toBeNull();
    }
  });
});
