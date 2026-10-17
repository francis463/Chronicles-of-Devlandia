import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rollGame } from "../game/roll";
import { CHESTS } from "./chests";
import { RECENT_GAMES, loadRecent, saveRecent, withPicks } from "./recent";
import type { Picks } from "./chests";

const zeros = Object.fromEntries(CHESTS.map((c) => [c.id, 0])) as Picks;

describe("recent questions", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("start empty, and a broken or odd store reads as empty", () => {
    expect(loadRecent()).toEqual({});
    localStorage.setItem("devlandia.recentQuestions", "{not json");
    expect(loadRecent()).toEqual({});
    localStorage.setItem("devlandia.recentQuestions", JSON.stringify({ "chest-js": [1, 2], "chest-html": ["html-x"] }));
    expect(loadRecent()).toEqual({ "chest-html": ["html-x"] });
  });

  it("remember each chest's question for the last RECENT_GAMES games, newest last", () => {
    let recent = withPicks({}, zeros);
    const next = { ...zeros, "chest-js": 1 } as Picks;
    recent = withPicks(recent, next);
    recent = withPicks(recent, { ...zeros, "chest-js": 2 } as Picks);
    const js = CHESTS.find((c) => c.id === "chest-js")!.bank;
    expect(recent["chest-js"]).toEqual([js[1].id, js[2].id].slice(-RECENT_GAMES));
    saveRecent(recent);
    expect(loadRecent()["chest-js"]).toEqual(recent["chest-js"]);
  });

  it("rollGame steers clear of a chest's recent questions, with the same number of draws", () => {
    const js = CHESTS.find((c) => c.id === "chest-js")!;
    const recent = { "chest-js": [js.bank[0].id, js.bank[1].id] };
    for (const draw of [0, 0.3, 0.999]) {
      const rolled = rollGame(() => draw, undefined, recent);
      expect([0, 1]).not.toContain(rolled.picks["chest-js"]);
    }
    // Every other chest rolls exactly as if nothing were recent.
    expect(rollGame(() => 0.5, 5, recent).picks["chest-html"]).toBe(rollGame(() => 0.5, 5).picks["chest-html"]);
  });

  it("rollGame still picks when every question of a chest is recent", () => {
    const js = CHESTS.find((c) => c.id === "chest-js")!;
    const rolled = rollGame(() => 0.5, undefined, { "chest-js": js.bank.map((q) => q.id) });
    expect(rolled.picks["chest-js"]).toBe(Math.floor(0.5 * js.bank.length));
  });
});
