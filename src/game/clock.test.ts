import { describe, expect, it } from "vitest";
import { advanceClock, formatTime, phaseOf } from "./clock";

describe("clock", () => {
  it("formats minutes as HH:MM", () => {
    expect(formatTime(1169)).toBe("19:29");
    expect(formatTime(0)).toBe("00:00");
  });

  it("advances five minutes and wraps at midnight", () => {
    expect(advanceClock(1169)).toBe(1174);
    expect(advanceClock(1439)).toBe(4);
    expect(formatTime(advanceClock(1439))).toBe("00:04");
  });

  it("derives the day phase", () => {
    expect(phaseOf(4)).toBe("Night");
    expect(phaseOf(359)).toBe("Night");
    expect(phaseOf(360)).toBe("Day");
    expect(phaseOf(1079)).toBe("Day");
    expect(phaseOf(1080)).toBe("Dusk");
    expect(phaseOf(1199)).toBe("Dusk");
    expect(phaseOf(1200)).toBe("Night");
  });
});
