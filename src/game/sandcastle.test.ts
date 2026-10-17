import { describe, expect, it } from "vitest";
import { cardFor } from "./cards";
import { CASTLE_COPY } from "./beach";
import { LOG } from "./constants";
import { challengeOf, challengeView } from "./challenges";
import { promptText } from "./geometry";
import { gameReducer, initialState, isModalOpen, reachPlaces } from "./reducer";
import { SANDCASTLE } from "../learn/bank/sandcastle";
import { SANDCASTLE_POI } from "./constants";
import { ZONES } from "./zones";
import type { GameState } from "./types";

const beach: GameState = { ...initialState, zone: "beach", player: { x: 56, y: 80 } };
const right = SANDCASTLE.pairs.map((_, i) => i);
// Every snippet to the label of the next pair around: all wrong.
const shifted = SANDCASTLE.pairs.map((_, i) => (i + 1) % SANDCASTLE.pairs.length);

describe("the sandcastle puzzle", () => {
  it("is a place on the beach, with the Build the Sandcastle prompt until it is finished", () => {
    expect(ZONES.beach.places.map((p) => p.id)).toContain("sandcastle");
    expect(reachPlaces(beach).map((p) => p.id)).toContain("sandcastle");
    expect(promptText(beach, SANDCASTLE_POI)).toBe("[E] Build the Sandcastle");
    expect(promptText({ ...beach, sandcastleBuilt: true }, SANDCASTLE_POI)).toBe("[E] Inspect Sandcastle");
  });

  it("is five steps with unique first-to-fifth labels, listed out of order", () => {
    expect(SANDCASTLE.pairs).toHaveLength(5);
    expect(new Set(SANDCASTLE.pairs.map((p) => p.label)).size).toBe(5);
    expect(SANDCASTLE.pairs.map((p) => p.label)).not.toEqual(["1st", "2nd", "3rd", "4th", "5th"]);
    expect(SANDCASTLE.pairs.map((p) => p.label).sort()).toEqual(["1st", "2nd", "3rd", "4th", "5th"]);
  });

  it("interacting opens its terminal and pauses the game; the card invites you to build", () => {
    const opened = gameReducer(beach, { type: "interact", poi: "sandcastle" });
    expect(opened.challenge?.target).toBe("sandcastle");
    expect(challengeOf(opened, "sandcastle")).toBe(SANDCASTLE);
    expect(isModalOpen(opened)).toBe(true);
    expect(cardFor({ ...beach, inspected: "sandcastle" })?.text).toBe(CASTLE_COPY.unbuilt);
  });

  it("a wrong order costs a try and builds nothing; the right order finishes the castle", () => {
    const opened = gameReducer(beach, { type: "interact", poi: "sandcastle" });
    const miss = gameReducer(opened, { type: "submitChallenge", value: shifted });
    expect(miss.sandcastleBuilt).toBe(false);
    expect(miss.challenge?.wrongTries).toBe(1);
    const solved = gameReducer(miss, { type: "submitChallenge", value: right });
    expect(solved.sandcastleBuilt).toBe(true);
    expect(solved.challenge?.solved).toBe(true);
    expect(solved.logs[solved.logs.length - 1]).toBe(LOG.castleBuilt);
    expect(challengeView(solved)?.success).toMatchObject({ line: "✓ Sandcastle built", explain: SANDCASTLE.explain });
    const closed = gameReducer(solved, { type: "closeChallenge" });
    expect(closed.challenge).toBeNull();
  });

  it("once built it only shows its card, and a malformed submission is ignored", () => {
    const built: GameState = { ...beach, sandcastleBuilt: true };
    const again = gameReducer(built, { type: "interact", poi: "sandcastle" });
    expect([again.challenge, again.inspected]).toEqual([null, "sandcastle"]);
    expect(cardFor({ ...built, inspected: "sandcastle" })?.text).toBe(CASTLE_COPY.built);
    const opened = gameReducer(beach, { type: "interact", poi: "sandcastle" });
    expect(gameReducer(opened, { type: "submitChallenge", value: "nope" })).toBe(opened);
    expect(gameReducer(opened, { type: "submitChallenge", value: [0, 1] })).toBe(opened);
  });
});
