import type { Bit } from "./logic";

/** The Lighthouse Lamp's eight switches, 128 first. */
export type Bits8 = [Bit, Bit, Bit, Bit, Bit, Bit, Bit, Bit];

/** The letter the lamp must send (ASCII 72 = 01001000). */
export const LAMP_LETTER = "H";

export const isBits8 = (v: unknown): v is Bits8 => Array.isArray(v) && v.length === 8 && v.every((b) => b === 0 || b === 1);

export const bits8ToBinary = (bits: Bits8): string => bits.join("");

export const bits8ToDecimal = (bits: Bits8): number => parseInt(bits8ToBinary(bits), 2);

/** The letter the switches spell (A–Z or a–z), or "?" when that number is not a letter. */
export function lampLetter(bits: Bits8): string {
  const ch = String.fromCharCode(bits8ToDecimal(bits));
  return /^[A-Za-z]$/.test(ch) ? ch : "?";
}

export const isLampLit = (bits: Bits8): boolean => lampLetter(bits) === LAMP_LETTER;

/** What the lamp sent instead of the right letter, or null when it is lit. */
export const lampError = (bits: Bits8): string | null =>
  isLampLit(bits) ? null : `The lamp sent "${lampLetter(bits)}". It should send "${LAMP_LETTER}".`;
