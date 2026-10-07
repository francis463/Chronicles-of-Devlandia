export type Bit = 0 | 1;
/** Switch positions A, B, C, D. */
export type Bits = [Bit, Bit, Bit, Bit];

/** The signal tower's circuit; `line` is the line number shown in the terminal (line 1 is a comment). */
export const CIRCUIT: Array<{ line: number; expr: string; output: (b: Bits) => Bit }> = [
  { line: 2, expr: "A AND B", output: ([a, b]) => (a & b) as Bit },
  { line: 3, expr: "B XOR C", output: ([, b, c]) => (b ^ c) as Bit },
  { line: 4, expr: "NOT D", output: ([, , , d]) => (d ^ 1) as Bit },
];

export const evaluateCircuit = (bits: Bits): Bit[] => CIRCUIT.map((l) => l.output(bits));

export const isCircuitSolved = (bits: Bits): boolean => evaluateCircuit(bits).every((out) => out === 1);

/** The error for the first line that outputs 0, or null when every line outputs 1. */
export function circuitError(bits: Bits): string | null {
  const failing = CIRCUIT.find((l) => l.output(bits) === 0);
  return failing ? `Circuit failed: line ${failing.line} (${failing.expr}) outputs 0.` : null;
}

export const bitsToBinary = (bits: Bits): string => bits.join("");

export const bitsToDecimal = (bits: Bits): number => parseInt(bitsToBinary(bits), 2);
