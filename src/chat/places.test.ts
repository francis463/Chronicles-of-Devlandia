import { describe, expect, it } from "vitest";
import { PING_PLACE_NAMES, isPingPlace, pingLine, placeCopy, placeSpot } from "./places";

// The spec's ping-place table, as literals. Chests are where the chest table puts them now.
const TABLE = [
  ["gate", "peaks", 50, 50, "the Terminal Gate"],
  ["tower", "peaks", 14, 18, "the Signal Tower"],
  ["cache", "peaks", 82, 18, "the Supply Cache"],
  ["river", "peaks", 54, 33, "the Frozen River"],
  ["ada", "village", 34, 70, "Ada"],
  ["signpost", "village", 86, 62, "the Signpost"],
  ["terminal", "village", 68, 60, "the Syntax Terminal"],
  ["archive", "village", 55, 66, "the Archive"],
  ["html", "peaks", 10, 60, "the HTML Chest"],
  ["css", "peaks", 46, 82, "the CSS Chest"],
  ["java", "peaks", 20, 44, "the Java Chest"],
  ["cpp1", "peaks", 64, 14, "the C++ I Chest"],
  ["cpp2", "peaks", 84, 44, "the C++ II Chest"],
  ["py1", "peaks", 88, 64, "the Python I Chest"],
  ["php", "village", 44, 62, "the PHP Chest"],
  ["sql", "village", 12, 80, "the SQL Chest"],
  ["py2", "village", 82, 82, "the Python II Chest"],
  ["cs", "village", 55, 66, "the C# Chest"],
  ["ranger", "forest", 60, 62, "the Ranger"],
  ["campfire", "forest", 46, 66, "the Campfire"],
] as const;

describe("ping places", () => {
  it("are the 20 names, in the spec's order", () => {
    expect([...PING_PLACE_NAMES]).toEqual(TABLE.map((row) => row[0]));
  });

  it.each(TABLE)("%s is in %s at (%i, %i) and reads %s", (name, zone, x, y, copy) => {
    expect(placeSpot(name)).toEqual({ zone, x, y });
    expect(placeCopy(name)).toBe(copy);
  });

  it("isPingPlace accepts only the names", () => {
    expect(isPingPlace("gate")).toBe(true);
    expect(isPingPlace("moon")).toBe(false);
    expect(isPingPlace(null)).toBe(false);
    expect(isPingPlace(3)).toBe(false);
  });
});

describe("pingLine", () => {
  it("says where a spot ping is, or what a place ping points at", () => {
    expect(pingLine("Kai", { zone: "peaks", place: null })).toBe("Kai pinged their spot in C++ Peaks.");
    expect(pingLine("Kai", { zone: "village", place: null })).toBe("Kai pinged their spot in Dev Village.");
    expect(pingLine("Kai", { zone: "peaks", place: "gate" })).toBe("Kai pinged the Terminal Gate.");
    expect(pingLine("Kai", { zone: "village", place: "cs" })).toBe("Kai pinged the C# Chest.");
  });
});
