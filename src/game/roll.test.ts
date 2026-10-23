import { describe, expect, it } from "vitest";
import { accessCode } from "../learn/access";
import { BANK_SIZE, CHEST_IDS } from "../learn/chests";
import { rollGame } from "./roll";

const cycling = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("rollGame", () => {
  it("rollGame uses the random source in order and the code seed when given", () => {
    const rolled = rollGame(cycling([0.5, 0.9, 0.1]), 1234);
    // 11 picks (0.5, 0.9, 0.1, …), then the seed (12th draw), then the Matcher round (13th).
    const draws = [0.5, 0.9, 0.1, 0.5, 0.9, 0.1, 0.5, 0.9, 0.1, 0.5, 0.9];
    expect(CHEST_IDS.map((id) => rolled.picks[id])).toEqual(draws.map((d) => Math.floor(d * BANK_SIZE)));
    expect(rolled.seed).toBe(Math.floor(0.1 * 2 ** 31));
    expect(rolled.matcherRound).toBe(Math.floor(0.5 * 3));
    expect(CHEST_IDS).toHaveLength(11);
    expect(rolled.accessCode).toBe(accessCode(1234));
    const fresh = rollGame(cycling([0.25]));
    expect(fresh.accessCode).toBe(accessCode(Math.floor(0.25 * 2 ** 31)));
  });

  it("a draw of 0.999 picks the last question of every chest", () => {
    const rolled = rollGame(() => 0.999);
    for (const id of CHEST_IDS) expect(rolled.picks[id]).toBe(BANK_SIZE - 1);
  });
});
