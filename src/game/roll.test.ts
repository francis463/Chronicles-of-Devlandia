import { describe, expect, it } from "vitest";
import { accessCode } from "../learn/access";
import { CHEST_IDS } from "../learn/chests";
import { rollGame } from "./roll";

const cycling = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("rollGame", () => {
  it("rollGame uses the random source in order and the code seed when given", () => {
    const rolled = rollGame(cycling([0.5, 0.9, 0.1]), 1234);
    // 10 picks (0.5, 0.9, 0.1, …), then the seed (11th draw), then the Matcher round (12th).
    const draws = [0.5, 0.9, 0.1, 0.5, 0.9, 0.1, 0.5, 0.9, 0.1, 0.5];
    expect(CHEST_IDS.map((id) => rolled.picks[id])).toEqual(draws.map((d) => Math.floor(d * 3)));
    expect(rolled.seed).toBe(Math.floor(0.9 * 2 ** 31));
    expect(rolled.matcherRound).toBe(0);
    expect(rolled.accessCode).toBe(accessCode(1234));
    const fresh = rollGame(cycling([0.25]));
    expect(fresh.accessCode).toBe(accessCode(Math.floor(0.25 * 2 ** 31)));
  });
});
