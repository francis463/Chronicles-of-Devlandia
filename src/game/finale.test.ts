import { describe, expect, it } from "vitest";
import { cardFor } from "./cards";
import { HARD_WRONG_DAMAGE, LOG, MAX_HP } from "./constants";
import { gameReducer, initialState, isModalOpen } from "./reducer";
import { rollGame } from "./roll";
import { adaLine, ADA_MASTER } from "./village";
import { CHEST_IDS, CHESTS, BANK_SIZE, type Picks } from "../learn/chests";
import type { ChestId } from "../learn/types";
import type { ChallengeState, GameState } from "./types";

const html = CHESTS.find((c) => c.id === "chest-html")!;
const choiceAt = html.bank.findIndex((q) => q.kind === "choice" && q.options.length === 4);
const choice = html.bank[choiceAt];
if (choice.kind !== "choice") throw new Error("html has a choice");
const right = choice.correct;
const wrong = ([0, 1, 2, 3] as const).find((i) => i !== right)!;
const open = (over: Partial<ChallengeState> = {}): ChallengeState => ({ target: "chest-html", error: null, wrongTries: 0, solved: false, lastWrong: null, ...over });
const nearlyDone = (over: Partial<GameState> = {}): GameState => ({
  ...initialState,
  badges: CHEST_IDS.filter((id) => id !== "chest-html"),
  picks: { ...initialState.picks, "chest-html": choiceAt } as Picks,
  challenge: open(),
  ...over,
});
const earnLast = (s: GameState) => gameReducer(s, { type: "submitChallenge", value: right });

describe("the Master of Devlandia finale", () => {
  it("the last badge logs the finale, which opens when its chest's success view is closed, once", () => {
    const earned = earnLast(nearlyDone());
    expect(earned.badges).toHaveLength(CHEST_IDS.length);
    expect(earned.logs[earned.logs.length - 1]).toBe(LOG.finale);
    expect([earned.finaleOpen, earned.finaleSeen]).toEqual([false, false]);
    const closed = gameReducer(earned, { type: "closeChallenge" });
    expect([closed.finaleOpen, closed.finaleSeen, closed.challenge]).toEqual([true, true, null]);
    const done = gameReducer(closed, { type: "closeFinale" });
    expect([done.finaleOpen, done.finaleSeen]).toEqual([false, true]);
    // Reopening that chest later does not open the finale again.
    const again = gameReducer({ ...done, challenge: open({ solved: true }) }, { type: "closeChallenge" });
    expect(again.finaleOpen).toBe(false);
  });

  it("an earlier badge never opens it", () => {
    const s = nearlyDone({ badges: [] });
    const closed = gameReducer(earnLast(s), { type: "closeChallenge" });
    expect([closed.badges.length, closed.finaleOpen]).toEqual([1, false]);
  });

  it("pauses the game while it is open, and can be reopened from the Codex once all badges are earned", () => {
    const s = gameReducer(gameReducer(earnLast(nearlyDone()), { type: "closeChallenge" }), { type: "move", dir: "right" });
    expect(isModalOpen({ ...s, finaleOpen: true })).toBe(true);
    const opened = { ...s, finaleOpen: true };
    expect(gameReducer(opened, { type: "move", dir: "right" })).toBe(opened);
    const closed = gameReducer(opened, { type: "closeFinale" });
    expect(gameReducer({ ...closed, codexOpen: true }, { type: "openFinale" })).toMatchObject({ finaleOpen: true, codexOpen: false });
    expect(gameReducer({ ...closed, badges: closed.badges.slice(1) }, { type: "openFinale" }).finaleOpen).toBe(false);
  });

  it("Ada congratulates a Master and nobody else", () => {
    expect(adaLine({ ...initialState, badges: [...CHEST_IDS] })).toBe(ADA_MASTER);
    expect(adaLine({ ...initialState, badges: CHEST_IDS.slice(1) })).not.toBe(ADA_MASTER);
    expect(cardFor({ ...initialState, zone: "village", badges: [...CHEST_IDS], inspected: "villager" })?.text).toBe(ADA_MASTER);
  });
});

describe("New Game+", () => {
  const hardTry = (hard: boolean, hp = MAX_HP) =>
    gameReducer(nearlyDone({ hard, hp }), { type: "submitChallenge", value: wrong });

  it("a wrong chest answer costs HP in a hard run only, and says so", () => {
    const miss = hardTry(true);
    expect(miss.hp).toBe(MAX_HP - HARD_WRONG_DAMAGE);
    expect(miss.logs[miss.logs.length - 1]).toBe(LOG.hardMiss);
    expect(miss.challenge?.wrongTries).toBe(1);
    expect(hardTry(false).hp).toBe(MAX_HP);
  });

  it("at 0 HP the terminal closes, and HP never goes below 0", () => {
    const down = hardTry(true, 1);
    expect([down.hp, down.challenge]).toEqual([0, null]);
  });

  it("a right answer costs nothing, and a hard run draws only from the later half of each bank", () => {
    expect(gameReducer(nearlyDone({ hard: true }), { type: "submitChallenge", value: right }).hp).toBe(MAX_HP);
    for (const draw of [0, 0.3, 0.6, 0.999]) {
      const rolled = rollGame(() => draw, undefined, {}, true);
      for (const id of CHEST_IDS) expect(rolled.picks[id as ChestId], `${id} @${draw}`).toBeGreaterThanOrEqual(BANK_SIZE / 2);
    }
    expect(rollGame(() => 0.5, 3, {}, true).seed).toBe(rollGame(() => 0.5, 3).seed);
  });

  it("two-option true-or-false answers are judged, and an out-of-range index is not", () => {
    const tfIndex = html.bank.findIndex((q) => q.kind === "choice" && q.options.length === 2);
    const tf = html.bank[tfIndex];
    if (tf.kind !== "choice") throw new Error("html has a true-or-false");
    const s = nearlyDone({ picks: { ...initialState.picks, "chest-html": tfIndex } as Picks });
    expect(gameReducer(s, { type: "submitChallenge", value: 2 })).toBe(s);
    expect(gameReducer(s, { type: "submitChallenge", value: tf.correct }).badges).toHaveLength(CHEST_IDS.length);
  });
});
