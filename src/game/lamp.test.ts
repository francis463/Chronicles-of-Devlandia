import { describe, expect, it } from "vitest";
import { bits8ToBinary, bits8ToDecimal, isBits8, isLampLit, lampError, lampLetter, LAMP_LETTER, type Bits8 } from "./lamp";

const bitsOf = (n: number): Bits8 => n.toString(2).padStart(8, "0").split("").map(Number) as Bits8;

describe("the lighthouse lamp", () => {
  it("isBits8 accepts exactly eight bits", () => {
    expect(isBits8([0, 1, 0, 0, 1, 0, 0, 0])).toBe(true);
    for (const bad of [[0, 1, 0, 0, 1, 0, 0], [0, 1, 0, 0, 1, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0], ["0", 0, 0, 0, 0, 0, 0, 0], null, "01001000", undefined, {}]) {
      expect(isBits8(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("names the letter the switches spell, or ? when it is not a letter", () => {
    expect(LAMP_LETTER).toBe("H");
    expect(lampLetter(bitsOf(72))).toBe("H");
    expect(lampLetter(bitsOf(75))).toBe("K");
    expect(lampLetter(bitsOf(97))).toBe("a");
    expect(lampLetter(bitsOf(0))).toBe("?");
    expect(lampLetter(bitsOf(255))).toBe("?");
    expect(lampLetter(bitsOf(48))).toBe("?");
  });

  it("only 01001000 lights the lamp", () => {
    const lit = Array.from({ length: 256 }, (_, n) => n).filter((n) => isLampLit(bitsOf(n)));
    expect(lit).toEqual([72]);
  });

  it("says what the lamp sent instead", () => {
    expect(lampError(bitsOf(72))).toBeNull();
    expect(lampError(bitsOf(75))).toBe('The lamp sent "K". It should send "H".');
    expect(lampError(bitsOf(0))).toBe('The lamp sent "?". It should send "H".');
  });

  it("reads the switches as binary and decimal", () => {
    expect(bits8ToBinary(bitsOf(72))).toBe("01001000");
    expect(bits8ToDecimal(bitsOf(72))).toBe(72);
    expect(bits8ToDecimal(bitsOf(255))).toBe(255);
  });
});
