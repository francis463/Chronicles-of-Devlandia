import { describe, expect, it } from "vitest";
import { hermitLine } from "./island";

describe("hermitLine", () => {
  const none = { hasLoot: false, clueDecoded: false, artifactFound: false, lighthouseLit: false };
  const all = { hasLoot: true, clueDecoded: true, artifactFound: true, lighthouseLit: true };
  const found = { ...all, lighthouseLit: false };

  it("gives the first hint you have not done, then a closing line", () => {
    const lines = [
      hermitLine(none),
      hermitLine({ ...none, hasLoot: true }),
      hermitLine({ ...none, hasLoot: true, clueDecoded: true }),
      hermitLine(found),
      hermitLine(all),
    ];
    expect(new Set(lines).size).toBe(5);
    for (const line of lines) expect(line.length).toBeGreaterThan(20);
  });

  it("sends you to the lighthouse's lamp once the Golden Semicolon is found", () => {
    expect(hermitLine(found)).toContain("lighthouse");
    expect(hermitLine(all)).not.toBe(hermitLine(found));
  });

  it("never mentions the gate (the island is only reachable once it is open)", () => {
    for (const s of [none, { ...none, hasLoot: true }, { ...none, hasLoot: true, clueDecoded: true }, found, all]) {
      expect(hermitLine(s).toLowerCase()).not.toContain("gate");
    }
  });
});
