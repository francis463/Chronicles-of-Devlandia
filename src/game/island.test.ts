import { describe, expect, it } from "vitest";
import { hermitLine } from "./island";

describe("hermitLine", () => {
  const none = { hasLoot: false, clueDecoded: false, artifactFound: false };

  it("gives the first hint you have not done, then a closing line", () => {
    const lines = [
      hermitLine(none),
      hermitLine({ ...none, hasLoot: true }),
      hermitLine({ hasLoot: true, clueDecoded: true, artifactFound: false }),
      hermitLine({ hasLoot: true, clueDecoded: true, artifactFound: true }),
    ];
    expect(new Set(lines).size).toBe(4);
    for (const line of lines) expect(line.length).toBeGreaterThan(20);
  });

  it("never mentions the gate (the island is only reachable once it is open)", () => {
    for (const s of [none, { ...none, hasLoot: true }, { hasLoot: true, clueDecoded: true, artifactFound: false }, { hasLoot: true, clueDecoded: true, artifactFound: true }]) {
      expect(hermitLine(s).toLowerCase()).not.toContain("gate");
    }
  });
});
