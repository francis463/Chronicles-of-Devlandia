import { describe, expect, it } from "vitest";
import { displayNames, nameKey } from "./names";

const players = (...names: string[]) => names.map((name, i) => ({ id: `p${i + 1}`, name }));

describe("nameKey", () => {
  it("trims, collapses spaces and lower-cases", () => {
    expect(nameKey("  Big   Kai ")).toBe("big kai");
    expect(nameKey("KAI")).toBe("kai");
  });
});

describe("displayNames", () => {
  it("the first holder of a nickname keeps it; later holders read (2), (3)", () => {
    const names = displayNames(players("Kai", "Mia", "Kai", "kai"));
    expect([...names.values()]).toEqual(["Kai", "Mia", "Kai (2)", "kai (3)"]);
    expect(names.get("p3")).toBe("Kai (2)");
  });

  it("a nickname that differs only in spacing counts as the same", () => {
    expect([...displayNames(players("Big  Kai", "big kai")).values()]).toEqual(["Big  Kai", "big kai (2)"]);
  });

  it("masks a rude nickname everywhere it is shown", () => {
    expect(displayNames(players("fuck you")).get("p1")).toBe("*** you");
  });
});
