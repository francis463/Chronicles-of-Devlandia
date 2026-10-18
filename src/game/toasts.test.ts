import { describe, expect, it } from "vitest";
import { EAT_LINES, toastFor, type ToastSnap } from "./toasts";

const base: ToastSnap = { hasLoot: false, food: 0, hp: 3, rangerFed: false, nomadServed: false, soupTaken: false };

describe("toastFor", () => {
  it("says \"Ohh, a scroll!\" when the cache is first emptied", () => {
    expect(toastFor(base, { ...base, hasLoot: true }, 0)).toEqual({ title: "Ohh, a scroll!", sub: "Decode it from your inventory." });
    expect(toastFor({ ...base, hasLoot: true }, { ...base, hasLoot: true }, 0)).toBeNull();
  });

  it("says thank you when each NPC hands you food", () => {
    const ranger = toastFor(base, { ...base, rangerFed: true, food: 1 }, 0);
    const nomad = toastFor(base, { ...base, nomadServed: true, food: 1 }, 0);
    const keeper = toastFor(base, { ...base, soupTaken: true, food: 1 }, 0);
    expect([ranger?.title, nomad?.title, keeper?.title]).toEqual(["Thank you!", "Thank you!", "Thank you!"]);
    expect(ranger?.sub).toMatch(/ranger/);
    expect(nomad?.sub).toMatch(/nomad/);
    expect(keeper?.sub).toMatch(/keeper/);
  });

  it("says a happy word when you eat, going round the list", () => {
    const ate = (n: number) => toastFor({ ...base, food: 2, hp: 2 }, { ...base, food: 1, hp: 3 }, n);
    expect(EAT_LINES.map((_, i) => ate(i)?.title)).toEqual([...EAT_LINES]);
    expect(ate(EAT_LINES.length)?.title).toBe(EAT_LINES[0]);
    expect(ate(0)?.sub).toBe("+1 heart.");
  });

  it("stays quiet for giving food away, picking food up, or nothing at all", () => {
    expect(toastFor({ ...base, food: 2 }, { ...base, food: 1 }, 0)).toBeNull();
    expect(toastFor(base, { ...base, food: 1 }, 0)).toBeNull();
    expect(toastFor(base, base, 0)).toBeNull();
  });
});
