import { describe, expect, it } from "vitest";
import { bitsToBinary, bitsToDecimal, CIRCUIT, circuitError, evaluateCircuit, isCircuitSolved, type Bits } from "./logic";

const all: Bits[] = Array.from({ length: 16 }, (_, n) => [(n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1] as Bits);

describe("signal tower circuit", () => {
  it("has the three lines shown in the terminal", () => {
    expect(CIRCUIT.map((l) => l.expr)).toEqual(["A AND B", "B XOR C", "NOT D"]);
  });

  it("evaluates AND, XOR and NOT", () => {
    expect(evaluateCircuit([0, 0, 0, 0])).toEqual([0, 0, 1]);
    expect(evaluateCircuit([1, 1, 0, 0])).toEqual([1, 1, 1]);
    expect(evaluateCircuit([1, 1, 1, 1])).toEqual([1, 0, 0]);
    expect(evaluateCircuit([0, 1, 0, 1])).toEqual([0, 1, 0]);
  });

  it("has exactly one solution: A=1, B=1, C=0, D=0", () => {
    expect(all.filter(isCircuitSolved)).toEqual([[1, 1, 0, 0]]);
  });

  it("names the first failing line, numbered as in the terminal", () => {
    expect(circuitError([0, 0, 0, 0])).toBe("Circuit failed: line 2 (A AND B) outputs 0.");
    expect(circuitError([1, 1, 1, 0])).toBe("Circuit failed: line 3 (B XOR C) outputs 0.");
    expect(circuitError([1, 1, 0, 1])).toBe("Circuit failed: line 4 (NOT D) outputs 0.");
    expect(circuitError([1, 1, 0, 0])).toBeNull();
  });

  it("reads the switches as a binary and a decimal number", () => {
    expect(bitsToBinary([1, 1, 0, 0])).toBe("1100");
    expect(bitsToDecimal([1, 1, 0, 0])).toBe(12);
    expect(bitsToDecimal([0, 0, 0, 0])).toBe(0);
    expect(bitsToDecimal([1, 1, 1, 1])).toBe(15);
  });
});
