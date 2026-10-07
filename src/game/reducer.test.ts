import { describe, expect, it } from "vitest";
import { gameReducer, initialState, isDowned } from "./reducer";
import type { GameState } from "./types";

const s0 = initialState;
const lastLog = (s: GameState) => s.logs.at(-1);

describe("gameReducer: initial state", () => {
  it("starts at the spec's positions, full bars, 19:29 and three log lines", () => {
    expect(s0.player).toEqual({ x: 28, y: 72 });
    expect(s0.drone).toEqual({ x: 36, y: 70 });
    expect(s0.hp).toBe(100);
    expect(s0.stamina).toBe(100);
    expect(s0.minutes).toBe(1169);
    expect(s0.logs).toEqual([
      "Entered C++ Peaks.",
      "Drone link established.",
      "Objective: survey the frozen river.",
    ]);
    expect(isDowned(s0)).toBe(false);
  });
});

describe("gameReducer: move", () => {
  it("moves four units and spends one stamina", () => {
    const s = gameReducer(s0, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 28, y: 68 });
    expect(s.stamina).toBe(99);
  });

  it("moves in all four directions", () => {
    expect(gameReducer(s0, { type: "move", dir: "down" }).player).toEqual({ x: 28, y: 76 });
    expect(gameReducer(s0, { type: "move", dir: "left" }).player).toEqual({ x: 24, y: 72 });
    expect(gameReducer(s0, { type: "move", dir: "right" }).player).toEqual({ x: 32, y: 72 });
  });

  it("stays clamped at a map edge and never drives stamina below 0", () => {
    const edge = { ...s0, player: { x: 6, y: 50 }, stamina: 0 };
    const s = gameReducer(edge, { type: "move", dir: "left" });
    expect(s.player.x).toBe(6);
    expect(s.stamina).toBe(0);
  });

  it("completes the quest once on first entering the river", () => {
    const r1 = gameReducer({ ...s0, player: { x: 50, y: 43 } }, { type: "move", dir: "up" });
    expect(r1.questComplete).toBe(true);
    expect(lastLog(r1)).toBe("Quest complete: Frozen River surveyed.");
    const r2 = gameReducer(r1, { type: "move", dir: "right" });
    expect(r2.logs.filter((l) => l.startsWith("Quest complete"))).toHaveLength(1);
  });

  it("is ignored while downed or while the terminal is open", () => {
    expect(gameReducer({ ...s0, hp: 0 }, { type: "move", dir: "up" }).player).toEqual(s0.player);
    expect(gameReducer({ ...s0, terminalOpen: true }, { type: "move", dir: "up" }).player).toEqual(
      s0.player,
    );
  });
});

describe("gameReducer: tick", () => {
  it("advances five minutes and regenerates two stamina capped at 100", () => {
    const s = gameReducer({ ...s0, stamina: 99 }, { type: "tick" });
    expect(s.minutes).toBe(1174);
    expect(s.stamina).toBe(100);
    expect(gameReducer({ ...s0, stamina: 50 }, { type: "tick" }).stamina).toBe(52);
  });

  it("wraps the clock at midnight", () => {
    expect(gameReducer({ ...s0, minutes: 1439 }, { type: "tick" }).minutes).toBe(4);
  });
});

describe("gameReducer: riverDamage", () => {
  const inRiver = { ...s0, player: { x: 50, y: 33 } };

  it("deals 8 damage in the river and logs it", () => {
    const s = gameReducer(inRiver, { type: "riverDamage" });
    expect(s.hp).toBe(92);
    expect(lastLog(s)).toBe("Cold exposure: -8 HP.");
  });

  it("floors HP at 0", () => {
    const s = gameReducer({ ...inRiver, hp: 5 }, { type: "riverDamage" });
    expect(s.hp).toBe(0);
    expect(isDowned(s)).toBe(true);
  });

  it("logs being downed when HP reaches 0", () => {
    const s = gameReducer({ ...inRiver, hp: 5 }, { type: "riverDamage" });
    expect(s.logs.slice(-2)).toEqual(["Cold exposure: -8 HP.", "You are downed. Press Respawn."]);
  });

  it("does nothing once the bridge is restored, outside the river, or when downed", () => {
    expect(gameReducer({ ...inRiver, gateUnlocked: true }, { type: "riverDamage" }).hp).toBe(100);
    expect(gameReducer(s0, { type: "riverDamage" })).toBe(s0);
    const downed = { ...inRiver, hp: 0 };
    expect(gameReducer(downed, { type: "riverDamage" })).toBe(downed);
  });
});

describe("gameReducer: droneFollow", () => {
  it("moves the drone 58% of the way to the player", () => {
    const s = gameReducer({ ...s0, drone: { x: 0, y: 0 }, player: { x: 100, y: 50 } }, { type: "droneFollow" });
    expect(s.drone.x).toBeCloseTo(58);
    expect(s.drone.y).toBeCloseTo(29);
  });
});

describe("gameReducer: interact", () => {
  it("gate: inspects, logs and opens the terminal", () => {
    const s = gameReducer(s0, { type: "interact", poi: "gate" });
    expect(s.inspected).toBe("gate");
    expect(s.terminalOpen).toBe(true);
    expect(lastLog(s)).toBe("Gate terminal ready. Puzzle link found.");
  });

  it("gate: does not reopen the terminal once unlocked", () => {
    const s = gameReducer({ ...s0, gateUnlocked: true }, { type: "interact", poi: "gate" });
    expect(s.terminalOpen).toBe(false);
    expect(lastLog(s)).toBe("Gate unlocked. The bridge holds.");
  });

  it("chest: loots once, then reports empty", () => {
    const c1 = gameReducer(s0, { type: "interact", poi: "chest" });
    expect(c1.hasLoot).toBe(true);
    expect(lastLog(c1)).toBe("Supply cache opened: +1 Repair Patch.");
    expect(lastLog(gameReducer(c1, { type: "interact", poi: "chest" }))).toBe(
      "Supply cache already collected.",
    );
  });

  it("river: logs the scan", () => {
    const s = gameReducer(s0, { type: "interact", poi: "river" });
    expect(s.inspected).toBe("river");
    expect(lastLog(s)).toBe("River scan: unstable ice, thermal damage.");
  });

  it("keeps only the last six log entries but counts every entry", () => {
    expect(s0.logCount).toBe(3);
    let s = s0;
    for (let i = 0; i < 10; i++) s = gameReducer(s, { type: "interact", poi: "river" });
    expect(s.logs).toHaveLength(6);
    expect(s.logCount).toBe(13);
  });

  it("closeInspection clears the inspected POI", () => {
    const s = gameReducer({ ...s0, inspected: "river" }, { type: "closeInspection" });
    expect(s.inspected).toBeNull();
  });
});

describe("gameReducer: terminal", () => {
  const open = { ...s0, terminalOpen: true };

  it("a correct answer unlocks the gate, closes the terminal and logs", () => {
    const s = gameReducer({ ...open, puzzleError: "x" }, { type: "submitCode", value: "block;" });
    expect(s.gateUnlocked).toBe(true);
    expect(s.terminalOpen).toBe(false);
    expect(s.puzzleError).toBeNull();
    expect(lastLog(s)).toBe("Bridge restored. The river can be crossed safely.");
  });

  it("a wrong answer keeps the terminal open with a compile error", () => {
    const s = gameReducer(open, { type: "submitCode", value: "flex" });
    expect(s.terminalOpen).toBe(true);
    expect(s.gateUnlocked).toBe(false);
    expect(s.puzzleError).toBe("Compile error: display: flex keeps the bridge hidden.");
  });

  it("revealHint reveals the hint", () => {
    expect(gameReducer(open, { type: "revealHint" }).hintRevealed).toBe(true);
  });

  it("closeTerminal closes and clears the error", () => {
    const s = gameReducer({ ...open, puzzleError: "x" }, { type: "closeTerminal" });
    expect(s.terminalOpen).toBe(false);
    expect(s.puzzleError).toBeNull();
  });
});

describe("gameReducer: respawn", () => {
  it("restores HP, returns player and drone to start, and logs", () => {
    const s = gameReducer({ ...s0, hp: 0, player: { x: 50, y: 33 }, drone: { x: 52, y: 34 } }, { type: "respawn" });
    expect(s.hp).toBe(100);
    expect(s.player).toEqual({ x: 28, y: 72 });
    expect(s.drone).toEqual({ x: 36, y: 70 });
    expect(lastLog(s)).toBe("Drone revived you at base camp.");
  });
});
