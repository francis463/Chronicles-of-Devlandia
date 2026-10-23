import { describe, expect, it } from "vitest";
import { CLASSES, CLASS_IDS, DEFAULT_CLASS, classOrDefault, isClassId } from "./classes";

describe("character classes", () => {
  it("lists the six classes in order, defaulting to the warrior", () => {
    expect([...CLASS_IDS]).toEqual(["warrior", "archer", "mage", "assassin", "tank", "healer"]);
    expect(DEFAULT_CLASS).toBe("warrior");
  });

  it("classOrDefault keeps a valid id and turns anything else into the default", () => {
    for (const id of CLASS_IDS) expect(classOrDefault(id)).toBe(id);
    for (const bad of [undefined, null, 42, {}, "", "Mage", "__proto__", "constructor", "toString"]) {
      expect(classOrDefault(bad)).toBe("warrior");
      expect(isClassId(bad)).toBe(false);
    }
  });

  it("describes every class with a name, a blurb and two distinct-looking colours", () => {
    for (const id of CLASS_IDS) {
      const c = CLASSES[id];
      expect(c.name).toBe(id[0].toUpperCase() + id.slice(1));
      expect(c.blurb.length).toBeGreaterThan(0);
      expect(c.outfit).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.trim).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(CLASS_IDS.map((id) => CLASSES[id].outfit)).size).toBe(6);
  });

  it("uses the blurbs from the design", () => {
    expect(CLASS_IDS.map((id) => CLASSES[id].blurb)).toEqual([
      "Steel and nerve.",
      "Sharp eyes, steady hands.",
      "Reads the code between the lines.",
      "Quiet feet, quick fixes.",
      "Nothing gets past the wall.",
      "Mends bugs and spirits.",
    ]);
  });
});
