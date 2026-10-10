import { describe, expect, it } from "vitest";
import { ARCHIVE_LOCK, GATE_CSS, SCROLL_CIPHER } from "../learn/bank/builtin";
import { MATCHER_ROUNDS } from "../learn/bank/matcher";
import { challengeOf } from "./challenges";
import { initialState } from "./reducer";

describe("challengeOf", () => {
  it("challengeOf maps each target", () => {
    const s = { ...initialState, matcherRound: 2 as const, picks: { ...initialState.picks, "chest-sql": 1 as const } };
    expect(challengeOf(s, "gate")).toBe(GATE_CSS);
    expect(challengeOf(s, "cipher")).toBe(SCROLL_CIPHER);
    expect(challengeOf(s, "archive")).toBe(ARCHIVE_LOCK);
    expect(challengeOf(s, "matcher")).toBe(MATCHER_ROUNDS[2]);
    expect(challengeOf(s, "chest-sql").id).toBe("sql-where");
  });
});
