import { describe, expect, it } from "vitest";
import { gameReducer, initialState, isDowned, isModalOpen, reachPlaces, revealedPois, visiblePois } from "./reducer";
import { placeInReach } from "./geometry";
import type { ChallengeState, ChallengeTarget, GameState, Point } from "./types";
import { NO_FLAGS } from "./team";
import { HIDDEN_ARTIFACT, INTERACT_RADIUS, LOG, PLAYER_START, POIS } from "./constants";
import { cardFor } from "./cards";
import { isNorthOfWall } from "./wall";
import { ZONES, type ZoneId } from "./zones";

const s0 = initialState;
/** A freshly opened terminal for a target, as the reducer opens it. */
const openOn = (target: ChallengeTarget): ChallengeState => ({ target, error: null, wrongTries: 0, solved: false, lastWrong: null });
const opened: GameState = { ...s0, gateUnlocked: true };
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
      "Objective: open the north gate, then survey the frozen river.",
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
    expect(gameReducer({ ...s0, challenge: openOn("gate") }, { type: "move", dir: "up" }).player).toEqual(
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
    expect(gameReducer({ ...inRiver, towerPowered: true }, { type: "riverDamage" }).hp).toBe(100);
    expect(gameReducer(s0, { type: "riverDamage" })).toBe(s0);
    const downed = { ...inRiver, hp: 0 };
    expect(gameReducer(downed, { type: "riverDamage" })).toBe(downed);
  });

  it("solving the gate leaves the river icy", () => {
    expect(gameReducer({ ...opened, player: { x: 50, y: 33 } }, { type: "riverDamage" }).hp).toBe(92);
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
    expect(s.challenge?.target).toBe("gate");
    expect(lastLog(s)).toBe("Gate terminal ready. Puzzle link found.");
  });

  it("gate: does not reopen the terminal once unlocked", () => {
    const s = gameReducer({ ...s0, gateUnlocked: true }, { type: "interact", poi: "gate" });
    expect(s.challenge).toBeNull();
    expect(lastLog(s)).toBe("Gate open. The way north is clear.");
  });

  it("chest: loots once, then reports empty", () => {
    const c1 = gameReducer(opened, { type: "interact", poi: "chest" });
    expect(c1.hasLoot).toBe(true);
    expect(c1.logs).toContain("Supply cache opened: +1 Repair Patch.");
    expect(lastLog(gameReducer(c1, { type: "interact", poi: "chest" }))).toBe(
      "Supply cache already collected.",
    );
  });

  it("river: the scan reports a safe crossing once the bridge is restored", () => {
    const s = gameReducer({ ...opened, towerPowered: true }, { type: "interact", poi: "river" });
    expect(lastLog(s)).toBe("River scan: bridge stable, crossing is safe.");
  });

  it("river: logs the scan", () => {
    const s = gameReducer({ ...s0, player: { x: 50, y: 33 } }, { type: "interact", poi: "river" });
    expect(s.inspected).toBe("river");
    expect(lastLog(s)).toBe("River scan: unstable ice, thermal damage.");
  });

  it("keeps only the last six log entries but counts every entry", () => {
    expect(s0.logCount).toBe(3);
    let s = opened;
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
  const open = { ...s0, challenge: openOn("gate") };

  it("a correct answer unlocks the gate, closes the terminal and logs", () => {
    const s = gameReducer({ ...open, challenge: { ...openOn("gate"), error: "x" } }, { type: "submitChallenge", value: "block;" });
    expect(s.gateUnlocked).toBe(true);
    expect(s.challenge).toBeNull();
    expect(lastLog(s)).toBe("Gate unlocked. The way north is open.");
  });

  it("a wrong answer keeps the terminal open with the gate's error", () => {
    const s = gameReducer(open, { type: "submitChallenge", value: "flex" });
    expect(s.challenge?.target).toBe("gate");
    expect(s.gateUnlocked).toBe(false);
    expect(s.challenge?.error).toBe("Not quite: display: flex doesn't open this lock. Check the hint or try again.");
  });

  it("revealChallengeHint reveals the gate's hint", () => {
    expect(gameReducer(open, { type: "revealChallengeHint" }).hintsRevealed).toContain("gate-css");
  });

  it("closeChallenge closes and clears the error", () => {
    const s = gameReducer({ ...open, challenge: { ...openOn("gate"), error: "x" } }, { type: "closeChallenge" });
    expect(s.challenge).toBeNull();
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

describe("gameReducer: hidden artifact side quest", () => {
  const looted = gameReducer(opened, { type: "interact", poi: "chest" });

  it("the Supply Cache also yields the encrypted scroll", () => {
    expect(looted.logs.slice(-2)).toEqual([
      "Supply cache opened: +1 Repair Patch.",
      "Found an encrypted scroll: QRAFR SBERFG",
    ]);
    expect(s0.clueDecoded).toBe(false);
    expect(s0.artifactFound).toBe(false);
  });

  it("opens the cipher only once the scroll is found and not yet decoded", () => {
    expect(gameReducer(s0, { type: "openCipher" }).challenge).toBeNull();
    expect(gameReducer(looted, { type: "openCipher" }).challenge).toEqual(openOn("cipher"));
    expect(gameReducer({ ...looted, clueDecoded: true }, { type: "openCipher" }).challenge).toBeNull();
  });

  it("a correct decode closes the cipher and logs the clue", () => {
    const open = gameReducer(looted, { type: "openCipher" });
    const s = gameReducer(open, { type: "submitChallenge", value: "Dense Forest" });
    expect(s.clueDecoded).toBe(true);
    expect(s.challenge).toBeNull();
    expect(lastLog(s)).toBe("Clue decoded: the artifact rests in the Dense Forest.");
  });

  it("a wrong decode keeps the cipher open with an error", () => {
    const open = gameReducer(looted, { type: "openCipher" });
    const s = gameReducer(open, { type: "submitChallenge", value: "frozen river" });
    expect(s.challenge?.target).toBe("cipher");
    expect(s.clueDecoded).toBe(false);
    expect(s.challenge?.error).toBe('Not quite: "frozen river" is not what the scroll says.');
    expect(gameReducer(open, { type: "submitChallenge", value: "  " }).challenge?.error).toBe(
      'Not quite: "(empty)" is not what the scroll says.',
    );
  });

  it("closeChallenge closes the cipher; revealChallengeHint reveals its hint", () => {
    const open = gameReducer(looted, { type: "openCipher" });
    expect(gameReducer(open, { type: "closeChallenge" }).challenge).toBeNull();
    expect(gameReducer(open, { type: "revealChallengeHint" }).hintsRevealed).toContain("scroll-cipher");
  });

  it("ignores movement while the cipher is open", () => {
    const open = gameReducer(looted, { type: "openCipher" });
    expect(gameReducer(open, { type: "move", dir: "up" }).player).toEqual(open.player);
  });

  it("the artifact cannot be dug up before the clue is decoded", () => {
    expect(gameReducer(looted, { type: "interact", poi: "artifact" })).toBe(looted);
  });

  it("digging after decoding finds the artifact once", () => {
    const decoded = { ...looted, clueDecoded: true };
    const found = gameReducer(decoded, { type: "interact", poi: "artifact" });
    expect(found.artifactFound).toBe(true);
    expect(found.inspected).toBe("artifact");
    expect(lastLog(found)).toBe("Artifact found: the Golden Semicolon!");
    expect(gameReducer(found, { type: "interact", poi: "artifact" })).toBe(found);
  });

  it("reveals the dig spot only between decoding and finding", () => {
    expect(revealedPois(looted)).toEqual([]);
    expect(revealedPois({ ...looted, clueDecoded: true }).map((p) => p.id)).toEqual(["artifact"]);
    expect(revealedPois({ ...looted, clueDecoded: true, artifactFound: true })).toEqual([]);
  });
});

describe("gameReducer: signal tower logic lock", () => {
  it("interacting with the tower opens the logic lock and logs it", () => {
    const s = gameReducer(opened, { type: "interact", poi: "tower" });
    expect(s.logicOpen).toBe(true);
    expect(s.inspected).toBe("tower");
    expect(lastLog(s)).toBe("Signal tower terminal ready. Logic lock found.");
  });

  it("does not reopen the lock once the tower is powered", () => {
    const s = gameReducer({ ...opened, towerPowered: true }, { type: "interact", poi: "tower" });
    expect(s.logicOpen).toBe(false);
    expect(lastLog(s)).toBe("Signal tower online. The beam holds.");
  });

  it("the solved circuit powers the tower, closes the lock and logs it", () => {
    const open = { ...gameReducer(opened, { type: "interact", poi: "tower" }), logicError: "x" };
    const s = gameReducer(open, { type: "submitLogic", bits: [1, 1, 0, 0] });
    expect(s.towerPowered).toBe(true);
    expect(s.logicOpen).toBe(false);
    expect(s.logicError).toBeNull();
    expect(lastLog(s)).toBe("Signal tower online: the fog lifts and the bridge returns.");
  });

  it("a failing circuit keeps the lock open and names the failing line", () => {
    const open = gameReducer(opened, { type: "interact", poi: "tower" });
    const s = gameReducer(open, { type: "submitLogic", bits: [1, 1, 1, 0] });
    expect(s.logicOpen).toBe(true);
    expect(s.towerPowered).toBe(false);
    expect(s.logicError).toBe("Circuit failed: line 3 (B XOR C) outputs 0.");
  });

  it("closeLogic closes and clears the error; revealLogicHint reveals the hint", () => {
    const open = { ...gameReducer(opened, { type: "interact", poi: "tower" }), logicError: "x" };
    const closed = gameReducer(open, { type: "closeLogic" });
    expect(closed.logicOpen).toBe(false);
    expect(closed.logicError).toBeNull();
    expect(gameReducer(open, { type: "revealLogicHint" }).logicHintRevealed).toBe(true);
  });

  it("ignores movement while the logic lock is open", () => {
    const open = gameReducer(opened, { type: "interact", poi: "tower" });
    expect(gameReducer(open, { type: "move", dir: "up" }).player).toEqual(open.player);
  });

  it("isModalOpen is true while any terminal is open", () => {
    expect(isModalOpen(s0)).toBe(false);
    expect(isModalOpen({ ...s0, challenge: openOn("gate") })).toBe(true);
    expect(isModalOpen({ ...s0, challenge: openOn("cipher") })).toBe(true);
    expect(isModalOpen({ ...s0, logicOpen: true })).toBe(true);
  });
});

describe("gameReducer: only one terminal at a time", () => {
  it("does not open a second terminal while one is open", () => {
    const gateOpen = { ...s0, hasLoot: true, challenge: openOn("gate") };
    expect(gameReducer(gateOpen, { type: "openCipher" })).toBe(gateOpen);
    expect(gameReducer(gateOpen, { type: "interact", poi: "tower" })).toBe(gateOpen);
    const cipherOpen = { ...s0, hasLoot: true, challenge: openOn("cipher") };
    expect(gameReducer(cipherOpen, { type: "interact", poi: "gate" })).toBe(cipherOpen);
    const logicOpen = { ...s0, logicOpen: true };
    expect(gameReducer(logicOpen, { type: "interact", poi: "gate" })).toBe(logicOpen);
  });
});

describe("gameReducer: teammates", () => {
  it("teamSync ORs teammates' flags in and logs each newly set one in order", () => {
    const s = gameReducer(s0, { type: "teamSync", flags: { ...NO_FLAGS, gateUnlocked: true, hasLoot: true }, by: "Kai" });
    expect(s.gateUnlocked).toBe(true);
    expect(s.hasLoot).toBe(true);
    expect(s.logs.slice(-2)).toEqual(["Kai opened the Supply Cache.", "Kai opened the gate."]);
  });

  it("teamSync with nothing new returns the same state", () => {
    const s = gameReducer(s0, { type: "teamSync", flags: { ...NO_FLAGS, gateUnlocked: true }, by: "Kai" });
    expect(gameReducer(s, { type: "teamSync", flags: { ...NO_FLAGS, gateUnlocked: true }, by: "Kai" })).toBe(s);
  });

  it("teamSync never unsets a flag", () => {
    expect(gameReducer({ ...s0, towerPowered: true }, { type: "teamSync", flags: NO_FLAGS, by: "Kai" }).towerPowered).toBe(true);
  });

  it("note adds a log line", () => {
    expect(lastLog(gameReducer(s0, { type: "note", text: "Kai joined the team." }))).toBe("Kai joined the team.");
  });
});

describe("gameReducer: the north wall", () => {
  const poi = (id: string) => POIS.find((p) => p.id === id)!;

  it("a step into the locked wall stays put, costs no stamina and logs the locked line", () => {
    const start = { ...s0, player: { x: 30, y: 52 } };
    const s = gameReducer(start, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 30, y: 52 });
    expect(s.stamina).toBe(100);
    expect(lastLog(s)).toBe(LOG.wallLocked);
    expect(s.logCount).toBe(start.logCount + 1);
  });

  it("a held key against the wall logs once", () => {
    const start = { ...s0, player: { x: 30, y: 52 } };
    const once = gameReducer(start, { type: "move", dir: "up" });
    expect(gameReducer(once, { type: "move", dir: "up" })).toBe(once);
    let s = once;
    for (let i = 0; i < 4; i++) s = gameReducer(s, { type: "move", dir: "up" });
    expect(s.logCount).toBe(start.logCount + 1);
    expect(s.logs.filter((l) => l === LOG.wallLocked)).toHaveLength(1);
  });

  it("through the open gate's opening a step moves and costs stamina (guard)", () => {
    const s = gameReducer({ ...opened, player: { x: 48, y: 52 } }, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 48, y: 48 });
    expect(s.stamina).toBe(99);
  });

  it("with the gate open the wall is solid elsewhere, posts included", () => {
    for (const x of [30, 54]) {
      const s = gameReducer({ ...opened, player: { x, y: 52 } }, { type: "move", dir: "up" });
      expect(s.player).toEqual({ x, y: 52 });
      expect(lastLog(s)).toBe(LOG.wallSolid);
    }
  });

  it("a teammate's gate opens your way through", () => {
    let s = gameReducer({ ...s0, player: { x: 48, y: 52 } }, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 48, y: 52 });
    s = gameReducer(s, { type: "teamSync", flags: { ...NO_FLAGS, gateUnlocked: true }, by: "Ana" });
    s = gameReducer(s, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 48, y: 48 });
  });

  it("remote use of north landmarks waits for the gate", () => {
    const tower = gameReducer(s0, { type: "interact", poi: "tower" });
    expect([tower.logicOpen, tower.inspected, lastLog(tower)]).toEqual([false, "tower", LOG.wallLocked]);
    const chest = gameReducer(s0, { type: "interact", poi: "chest" });
    expect([chest.hasLoot, chest.inspected, lastLog(chest)]).toEqual([false, "chest", LOG.wallLocked]);
    const river = gameReducer(s0, { type: "interact", poi: "river" });
    expect([river.inspected, lastLog(river)]).toEqual(["river", LOG.wallLocked]);
    // Guards: with the gate open, or from the north side, they work as before.
    expect(gameReducer(opened, { type: "interact", poi: "tower" }).logicOpen).toBe(true);
    expect(gameReducer(opened, { type: "interact", poi: "chest" }).hasLoot).toBe(true);
    expect(gameReducer({ ...s0, player: { x: 14, y: 26 } }, { type: "interact", poi: "tower" }).logicOpen).toBe(true);
  });

  it("the gate is the only way north (reachability)", () => {
    type Spot = { zone: ZoneId; player: Point };
    function reachable(gateUnlocked: boolean) {
      const key = (s: Spot) => `${s.zone},${s.player.x},${s.player.y}`;
      const start: Spot = { zone: "peaks", player: PLAYER_START };
      const seen = new Map<string, Spot>([[key(start), start]]);
      const queue: Spot[] = [start];
      const crossings: Spot[] = [];
      while (queue.length) {
        const p = queue.shift()!;
        for (const dir of ["up", "down", "left", "right"] as const) {
          const next = gameReducer({ ...s0, gateUnlocked, zone: p.zone, player: p.player }, { type: "move", dir });
          const q: Spot = { zone: next.zone, player: next.player };
          if (q.zone === p.zone && ZONES[q.zone].wall && isNorthOfWall(q.player) !== isNorthOfWall(p.player)) crossings.push(p);
          if (!seen.has(key(q))) {
            seen.set(key(q), q);
            queue.push(q);
          }
        }
      }
      const spots = [...seen.values()];
      return { spots, peaks: spots.filter((s) => s.zone === "peaks").map((s) => s.player), crossings };
    }
    const inReach = (points: Point[], target: Point) =>
      points.some((p) => Math.hypot(p.x - target.x, p.y - target.y) <= INTERACT_RADIUS);

    const locked = reachable(false);
    expect([poi("tower"), poi("chest"), poi("river")].map((t) => inReach(locked.peaks, t))).toEqual([false, false, false]);
    expect([poi("gate"), HIDDEN_ARTIFACT].map((t) => inReach(locked.peaks, t))).toEqual([true, true]);
    expect(locked.spots.some((s) => ZONES[s.zone].wall && s.player.y < 49)).toBe(false);
    expect(locked.spots.some((s) => s.zone === "village")).toBe(true);

    const open = reachable(true);
    expect([poi("tower"), poi("chest"), poi("river"), poi("gate"), HIDDEN_ARTIFACT].every((t) => inReach(open.peaks, t))).toBe(true);
    expect(open.crossings.length).toBeGreaterThan(0);
    expect(open.crossings.every((c) => c.zone === "peaks")).toBe(true);
    expect(new Set(open.crossings.map((c) => c.player.x))).toEqual(new Set([48, 50, 52]));
    expect(open.spots.some((s) => s.zone === "village" && s.player.y < 49)).toBe(false);
  });
});

describe("gameReducer: zones", () => {
  const left = { type: "move", dir: "left" } as const;
  const right = { type: "move", dir: "right" } as const;

  it("left from (6, 72) in the Peaks enters the village at (94, 72)", () => {
    const s = gameReducer({ ...s0, player: { x: 6, y: 72 }, inspected: "gate", stamina: 50 }, left);
    expect(s.zone).toBe("village");
    expect(s.player).toEqual({ x: 94, y: 72 });
    expect(s.drone).toEqual({ x: 86, y: 70 });
    expect(s.stamina).toBe(49);
    expect(s.inspected).toBeNull();
    expect(lastLog(s)).toBe("Entered Dev Village.");
  });

  it("right from (94, 72) in the village enters the Peaks at (6, 72)", () => {
    const s = gameReducer({ ...s0, zone: "village", player: { x: 94, y: 72 } }, right);
    expect(s.zone).toBe("peaks");
    expect(s.player).toEqual({ x: 6, y: 72 });
    expect(s.drone).toEqual({ x: 14, y: 70 });
    expect(lastLog(s)).toBe("Entered C++ Peaks.");
  });

  it("the exit spans y 62–78: (6, 62) and (8, 68) leave; (6, 60), (8, 80) and (6, 50) stay clamped", () => {
    for (const player of [{ x: 6, y: 62 }, { x: 8, y: 68 }]) {
      expect(gameReducer({ ...s0, player }, left).zone, JSON.stringify(player)).toBe("village");
    }
    for (const player of [{ x: 6, y: 60 }, { x: 8, y: 80 }, { x: 6, y: 50 }]) {
      const s = gameReducer({ ...s0, player }, left);
      expect([s.zone, s.player.x], JSON.stringify(player)).toEqual(["peaks", 6]);
    }
  });

  it("vertical steps at an edge never change zones", () => {
    for (const dir of ["up", "down"] as const) {
      expect(gameReducer({ ...s0, player: { x: 6, y: 72 } }, { type: "move", dir }).zone).toBe("peaks");
    }
  });

  it("a held left from camp walks out through the exit and on into the village", () => {
    let s = s0;
    for (let i = 0; i < 7; i++) s = gameReducer(s, left);
    expect(s.zone).toBe("village");
    expect(s.player).toEqual({ x: 90, y: 72 });
  });

  it("respawn returns to camp in the Peaks", () => {
    const s = gameReducer({ ...s0, zone: "village", hp: 0, player: { x: 60, y: 70 } }, { type: "respawn" });
    expect(s.zone).toBe("peaks");
    expect(s.player).toEqual({ x: 28, y: 72 });
  });

  it("the village wall is solid whether or not the gate is open, and logs once", () => {
    for (const gateUnlocked of [false, true]) {
      const start: GameState = { ...s0, zone: "village", gateUnlocked, player: { x: 30, y: 52 } };
      const once = gameReducer(start, { type: "move", dir: "up" });
      expect(once.player).toEqual({ x: 30, y: 52 });
      expect(once.stamina).toBe(start.stamina);
      expect(lastLog(once)).toBe(LOG.wallSolid);
      expect(gameReducer(once, { type: "move", dir: "up" })).toBe(once);
    }
  });

  it("the river does nothing in the village", () => {
    const onIce: GameState = { ...s0, zone: "village", player: { x: 50, y: 33 } };
    expect(gameReducer(onIce, { type: "riverDamage" })).toBe(onIce);
    const s = gameReducer({ ...s0, zone: "village", player: { x: 50, y: 37 } }, { type: "move", dir: "up" });
    expect(s.questComplete).toBe(false);
  });
});

describe("gameReducer: places and talking", () => {
  const village: GameState = { ...s0, zone: "village" };
  const ADA_GATE_LINE = 'Ada: "Heading north? The gate\'s terminal wants one CSS fix. Get the display right and the wall lets you through."';

  it("visiblePois: your zone's places, plus the dig spot in the Peaks once revealed", () => {
    expect(visiblePois(s0).map((p) => p.id)).toEqual([
      "gate", "chest", "river", "tower", "chest-cpp-1", "chest-java", "chest-cpp-2", "chest-html", "chest-css", "chest-py-1",
    ]);
    expect(visiblePois({ ...village, clueDecoded: true }).map((p) => p.id)).toEqual([
      "villager", "signpost", "terminal", "archive", "chest-php", "chest-sql", "chest-py-2",
    ]);
    expect(visiblePois({ ...s0, clueDecoded: true }).map((p) => p.id).at(-1)).toBe("artifact");
  });

  it("places outside your zone do nothing", () => {
    for (const poi of ["gate", "tower", "chest"] as const) {
      expect(gameReducer(village, { type: "interact", poi }), poi).toBe(village);
    }
    expect(gameReducer(s0, { type: "interact", poi: "villager" })).toBe(s0);
  });

  it("talking to Ada opens her card and logs her line once", () => {
    const once = gameReducer(village, { type: "interact", poi: "villager" });
    expect(once.inspected).toBe("villager");
    expect(lastLog(once)).toBe(ADA_GATE_LINE);
    const twice = gameReducer(once, { type: "interact", poi: "villager" });
    expect(twice.logCount).toBe(once.logCount);
    expect(twice).toEqual(once);
  });

  it("Ada's line follows your progress", () => {
    const s = gameReducer({ ...village, gateUnlocked: true }, { type: "interact", poi: "villager" });
    expect(lastLog(s)).toBe(
      'Ada: "The gate\'s open! The signal tower in the snowy north-west is dark. Power it and the bridge over the river comes back."',
    );
  });

  it("the signpost opens its card and logs nothing", () => {
    const s = gameReducer(village, { type: "interact", poi: "signpost" });
    expect(s.inspected).toBe("signpost");
    expect(s.logCount).toBe(village.logCount);
  });
});

describe("gameReducer: the challenge engine", () => {
  const gate = { ...s0, challenge: openOn("gate") };

  it("interacting with the locked gate opens the gate challenge and logs as before", () => {
    const s = gameReducer(s0, { type: "interact", poi: "gate" });
    expect(s.challenge).toEqual(openOn("gate"));
    expect(lastLog(s)).toBe("Gate terminal ready. Puzzle link found.");
  });

  it("submitting `block;` opens the gate, closes the terminal and logs `Gate unlocked. The way north is open.`", () => {
    const s = gameReducer(gate, { type: "submitChallenge", value: "block;" });
    expect(s.gateUnlocked).toBe(true);
    expect(s.challenge).toBeNull();
    expect(lastLog(s)).toBe("Gate unlocked. The way north is open.");
  });

  it("a wrong gate value sets the new error and counts one wrong try; the same value again changes nothing", () => {
    const once = gameReducer(gate, { type: "submitChallenge", value: "flex" });
    expect(once.challenge?.error).toBe("Not quite: display: flex doesn't open this lock. Check the hint or try again.");
    expect(once.challenge?.wrongTries).toBe(1);
    expect(gameReducer(once, { type: "submitChallenge", value: "flex" })).toBe(once);
  });

  it("the second different wrong answer reveals the hint, appends the drone note, and keeps counting", () => {
    const once = gameReducer(gate, { type: "submitChallenge", value: "flex" });
    const twice = gameReducer(once, { type: "submitChallenge", value: "grid" });
    expect(twice.hintsRevealed).toContain("gate-css");
    expect(twice.challenge?.error).toBe(
      "Not quite: display: grid doesn't open this lock. Check the hint or try again. The drone has a tip below.",
    );
    expect(twice.challenge?.wrongTries).toBe(2);
    const thrice = gameReducer(twice, { type: "submitChallenge", value: "inline" });
    expect(thrice.challenge?.wrongTries).toBe(3);
    expect(thrice.challenge?.error?.endsWith(" The drone has a tip below.")).toBe(true);
    expect(thrice.hintsRevealed.filter((id) => id === "gate-css")).toHaveLength(1);
  });

  it("closing resets the tries but keeps a revealed hint", () => {
    const twice = [
      { type: "submitChallenge", value: "flex" },
      { type: "submitChallenge", value: "grid" },
    ].reduce((s, a) => gameReducer(s, a as Parameters<typeof gameReducer>[1]), gate as GameState);
    const closed = gameReducer(twice, { type: "closeChallenge" });
    expect(closed.challenge).toBeNull();
    expect(closed.hintsRevealed).toContain("gate-css");
    const reopened = gameReducer(closed, { type: "interact", poi: "gate" });
    expect(reopened.challenge?.wrongTries).toBe(0);
  });

  it("the cipher accepts `dense-forest!` (letters compare), logs the clue line and closes", () => {
    const cipher = { ...s0, hasLoot: true, challenge: openOn("cipher") };
    const s = gameReducer(cipher, { type: "submitChallenge", value: "dense-forest!" });
    expect(s.clueDecoded).toBe(true);
    expect(s.challenge).toBeNull();
    expect(lastLog(s)).toBe("Clue decoded: the artifact rests in the Dense Forest.");
  });

  it("crafted submits do nothing", () => {
    expect(gameReducer(s0, { type: "submitChallenge", value: "block" })).toBe(s0);
    expect(gameReducer(gate, { type: "submitChallenge", value: 3 })).toBe(gate);
    const cipher = { ...s0, hasLoot: true, challenge: openOn("cipher") };
    expect(gameReducer(cipher, { type: "submitChallenge", value: [0, 1] })).toBe(cipher);
  });

  it("isModalOpen: a challenge, the logic lock or the Codex", () => {
    expect(isModalOpen(s0)).toBe(false);
    expect(isModalOpen(gate)).toBe(true);
    expect(isModalOpen({ ...s0, logicOpen: true })).toBe(true);
    expect(isModalOpen({ ...s0, codexOpen: true })).toBe(true);
  });

  it("toggleCodex opens the Codex only while no challenge and no logic lock is open, and always closes it", () => {
    const opened = gameReducer(s0, { type: "toggleCodex" });
    expect(opened.codexOpen).toBe(true);
    expect(gameReducer(opened, { type: "toggleCodex" }).codexOpen).toBe(false);
    expect(gameReducer(gate, { type: "toggleCodex" })).toBe(gate);
    const logic = { ...s0, logicOpen: true };
    expect(gameReducer(logic, { type: "toggleCodex" })).toBe(logic);
    expect(gameReducer({ ...gate, codexOpen: true }, { type: "toggleCodex" }).codexOpen).toBe(false);
  });
});

describe("gameReducer: chests", () => {
  const village: GameState = { ...s0, zone: "village", player: { x: 42, y: 66 } };
  const sqlOpen: GameState = { ...village, challenge: openOn("chest-sql") };

  it("a south chest opens its picked challenge and sets inspected", () => {
    const s = gameReducer({ ...s0, player: { x: 14, y: 64 } }, { type: "interact", poi: "chest-html" });
    expect(s.challenge?.target).toBe("chest-html");
    expect(s.inspected).toBe("chest-html");
  });

  it("a north chest before the gate logs LOG.wallLocked, sets inspected and opens nothing; after the gate it opens", () => {
    const locked = gameReducer(s0, { type: "interact", poi: "chest-java" });
    expect(locked.challenge).toBeNull();
    expect(locked.inspected).toBe("chest-java");
    expect(lastLog(locked)).toBe(LOG.wallLocked);
    expect(gameReducer(opened, { type: "interact", poi: "chest-java" }).challenge?.target).toBe("chest-java");
  });

  it("a right answer earns the badge once, records the answer, logs it and shows the success view", () => {
    const s = gameReducer(sqlOpen, { type: "submitChallenge", value: "from" });
    expect(s.badges).toEqual(["chest-sql"]);
    expect(s.answered["chest-sql"]).toBe("from");
    expect(lastLog(s)).toBe("Earned the SQL Badge.");
    expect(s.challenge?.solved).toBe(true);
    expect(gameReducer(s, { type: "submitChallenge", value: "from" })).toBe(s);
    const closed = gameReducer(s, { type: "closeChallenge" });
    expect(closed.challenge).toBeNull();
    const php = gameReducer(closed, { type: "interact", poi: "chest-php" });
    expect(php.challenge?.target).toBe("chest-php");
    expect(gameReducer(php, { type: "submitChallenge", value: "echo" }).badges).toEqual(["chest-sql", "chest-php"]);
  });

  it("records a typed answer in its accepted form: no trailing ';', single spaces, your case (final review)", () => {
    const s = gameReducer(sqlOpen, { type: "submitChallenge", value: "  From; " });
    expect(s.badges).toEqual(["chest-sql"]);
    expect(s.answered["chest-sql"]).toBe("From");
  });

  it("a choice is checked by data index and records the option text", () => {
    const where = { ...sqlOpen, picks: { ...s0.picks, "chest-sql": 1 as const } };
    const s = gameReducer(where, { type: "submitChallenge", value: 0 });
    expect(s.badges).toEqual(["chest-sql"]);
    expect(s.answered["chest-sql"]).toBe("WHERE age > 18");
  });

  it("a wrong chest answer uses the generic copy and the drone after two tries", () => {
    const once = gameReducer(sqlOpen, { type: "submitChallenge", value: "INTO" });
    expect(once.challenge?.error).toBe('Not quite: "INTO" isn\'t the answer. Check the hint or try again.');
    expect(once.badges).toEqual([]);
    const twice = gameReducer(once, { type: "submitChallenge", value: "WHERE" });
    expect(twice.hintsRevealed).toContain("sql-from");
    expect(twice.challenge?.error?.endsWith(" The drone has a tip below.")).toBe(true);
  });

  it("an earned chest opens its card, not the challenge", () => {
    const s = gameReducer({ ...village, badges: ["chest-sql"] }, { type: "interact", poi: "chest-sql" });
    expect(s.challenge).toBeNull();
    expect(s.inspected).toBe("chest-sql");
  });

  it("badges, answers, picks and seed survive respawn", () => {
    const earned: GameState = {
      ...village, hp: 0, badges: ["chest-sql"], answered: { "chest-sql": "from" }, seed: 7,
      picks: { ...s0.picks, "chest-php": 2 },
    };
    const s = gameReducer(earned, { type: "respawn" });
    expect([s.badges, s.answered, s.seed, s.picks]).toEqual([earned.badges, earned.answered, 7, earned.picks]);
  });

  it("places outside your zone do nothing", () => {
    expect(gameReducer(s0, { type: "interact", poi: "chest-php" })).toBe(s0);
  });

  it("south of the locked wall, north chests are out of reach of [E]", () => {
    const p = { x: 16, y: 50 };
    expect(placeInReach(p, reachPlaces({ ...s0, player: p }))?.id).toBe("chest-html");
    expect(placeInReach(p, reachPlaces({ ...opened, player: p }))?.id).toBe("chest-java");
  });
});

describe("gameReducer: the Syntax Terminal and the Archive", () => {
  const village: GameState = { ...s0, zone: "village", player: { x: 60, y: 64 } };
  const RIGHT = [0, 1, 2, 3, 4];
  const codeLines = (s: GameState) => s.logs.filter((l) => l.startsWith("Syntax Terminal: access code")).length;

  it("using the terminal opens the Matcher; solving it logs the code and shows the success view; using it again reopens the solved view", () => {
    const open = gameReducer(village, { type: "interact", poi: "terminal" });
    expect(open.challenge).toEqual(openOn("matcher"));
    expect(open.inspected).toBe("terminal");
    const solved = gameReducer(open, { type: "submitChallenge", value: RIGHT });
    expect(solved.matcherSolved).toBe(true);
    expect(lastLog(solved)).toBe(`Syntax Terminal: access code ${solved.accessCode}.`);
    expect(solved.challenge?.solved).toBe(true);
    const closed = gameReducer(solved, { type: "closeChallenge" });
    expect(closed.challenge).toBeNull();
    const again = gameReducer(closed, { type: "interact", poi: "terminal" });
    expect(again.challenge).toMatchObject({ target: "matcher", solved: true, error: null });
    expect(again.matcherSolved).toBe(true);
    expect(codeLines(again)).toBe(1);
  });

  it("a wrong pairing reports the count", () => {
    const open = gameReducer(village, { type: "interact", poi: "terminal" });
    const s = gameReducer(open, { type: "submitChallenge", value: [1, 0, 2, 3, 4] });
    expect(s.challenge?.error).toBe("2 of 5 pairs are wrong.");
    expect(s.matcherSolved).toBe(false);
    expect(gameReducer(open, { type: "submitChallenge", value: [0, 1] })).toBe(open);
  });

  it("the sealed Archive opens the keypad; a wrong code is denied; the right code (any case, spaces around) unseals it, logs once and closes", () => {
    const keypad = gameReducer(village, { type: "interact", poi: "archive" });
    expect(keypad.challenge).toEqual(openOn("archive"));
    expect(keypad.inspected).toBe("archive");
    const wrongCode = keypad.accessCode === "ZZZZ" ? "YYYY" : "ZZZZ";
    const denied = gameReducer(keypad, { type: "submitChallenge", value: wrongCode });
    expect(denied.challenge?.error).toBe("Access denied.");
    expect(denied.archiveOpen).toBe(false);
    const open = gameReducer(denied, { type: "submitChallenge", value: `  ${keypad.accessCode.toLowerCase()} ` });
    expect(open.archiveOpen).toBe(true);
    expect(open.challenge).toBeNull();
    expect(open.logs.filter((l) => l === "Archive unsealed.")).toHaveLength(1);
    expect(lastLog(open)).toBe("Archive unsealed.");
  });

  it("the keypad never unseals on an empty, malformed or crafted value", () => {
    const keypad = gameReducer(village, { type: "interact", poi: "archive" });
    for (const value of ["", "AB", 5, "O0I1"]) {
      const s = gameReducer(keypad, { type: "submitChallenge", value });
      expect(s.archiveOpen, String(value)).toBe(false);
      expect(s, String(value)).toBe(keypad);
    }
  });

  it("the keypad accepts the code before the Matcher is solved", () => {
    const keypad = gameReducer({ ...village, matcherSolved: false }, { type: "interact", poi: "archive" });
    expect(gameReducer(keypad, { type: "submitChallenge", value: keypad.accessCode }).archiveOpen).toBe(true);
  });

  it("once open, the Archive acts as the C# chest", () => {
    const open: GameState = { ...village, archiveOpen: true };
    const cs = gameReducer(open, { type: "interact", poi: "archive" });
    expect(cs.challenge?.target).toBe("chest-cs");
    expect(cs.inspected).toBe("archive");
    const earned = gameReducer(cs, { type: "submitChallenge", value: "WriteLine" });
    expect(earned.badges).toEqual(["chest-cs"]);
    expect(lastLog(earned)).toBe("Earned the C# Badge.");
    const again = gameReducer(gameReducer(earned, { type: "closeChallenge" }), { type: "interact", poi: "archive" });
    expect(again.challenge).toBeNull();
    expect(cardFor(again)?.text.startsWith("C# Badge earned.")).toBe(true);
  });

  it("resetLogic clears the logic error", () => {
    const failed: GameState = { ...s0, logicOpen: true, logicError: "Circuit failed: line 2 (A AND B) outputs 0." };
    expect(gameReducer(failed, { type: "resetLogic" }).logicError).toBeNull();
  });
});

describe("gameReducer: teammates close stale terminals (Review Focus 1)", () => {
  it("a teammate's flags close your open terminal for the same thing, logging only the teammate line", () => {
    const cases = [
      { target: "gate", flag: "gateUnlocked", line: "Ana opened the gate." },
      { target: "cipher", flag: "clueDecoded", line: "Ana decoded the scroll: the artifact rests in the Dense Forest." },
      { target: "archive", flag: "archiveOpen", line: "Ana unsealed the Archive." },
    ] as const;
    for (const { target, flag, line } of cases) {
      const open: GameState = { ...s0, hasLoot: true, challenge: openOn(target) };
      const s = gameReducer(open, { type: "teamSync", flags: { ...NO_FLAGS, hasLoot: true, [flag]: true }, by: "Ana" });
      expect(s.challenge, target).toBeNull();
      expect(lastLog(s), target).toBe(line);
      expect(s.logs.length - open.logs.length, target).toBe(1);
    }
  });

  it("a teammate's other progress leaves your terminal open", () => {
    const open: GameState = { ...s0, challenge: openOn("gate") };
    expect(gameReducer(open, { type: "teamSync", flags: { ...NO_FLAGS, hasLoot: true }, by: "Ana" }).challenge).toEqual(openOn("gate"));
  });
});

describe("gameReducer: the Dense Forest (Review Focus 1 and 5)", () => {
  const down = { type: "move", dir: "down" } as const;
  const up = { type: "move", dir: "up" } as const;

  it("down from (70, 90) in the Peaks enters the forest at (70, 10) with the drone behind", () => {
    const s = gameReducer({ ...s0, player: { x: 70, y: 90 } }, down);
    expect(s.zone).toBe("forest");
    expect(s.player).toEqual({ x: 70, y: 10 });
    expect(s.drone).toEqual({ x: 68, y: 18 });
    expect(s.stamina).toBe(s0.stamina - 1);
    expect(s.inspected).toBeNull();
    expect(lastLog(s)).toBe("Entered Dense Forest.");
  });

  it("up from (70, 10) in the forest returns to the Peaks at (70, 90)", () => {
    const s = gameReducer({ ...s0, zone: "forest", player: { x: 70, y: 10 } }, up);
    expect(s.zone).toBe("peaks");
    expect(s.player).toEqual({ x: 70, y: 90 });
    expect(lastLog(s)).toBe("Entered C++ Peaks.");
  });

  it("a column outside the span stays in the Peaks, clamped at the edge", () => {
    for (const x of [58, 82]) {
      const s = gameReducer({ ...s0, player: { x, y: 90 } }, down);
      expect([s.zone, s.player], `x ${x}`).toEqual(["peaks", { x, y: 90 }]);
    }
    expect(gameReducer({ ...s0, zone: "forest", player: { x: 58, y: 10 } }, up).zone).toBe("forest");
  });

  it("the forest has no wall: y 48 and y 52 are one free step apart, with no wall log", () => {
    const north = gameReducer({ ...s0, zone: "forest", player: { x: 70, y: 52 } }, up);
    expect(north.player).toEqual({ x: 70, y: 48 });
    const south = gameReducer(north, down);
    expect(south.player).toEqual({ x: 70, y: 52 });
    expect(south.logs).toEqual(s0.logs);
  });

  it("the river's cold never applies in the forest, and a downed player respawns at the Peaks camp", () => {
    const onIce: GameState = { ...s0, zone: "forest", player: { x: 50, y: 33 } };
    expect(gameReducer(onIce, { type: "riverDamage" })).toBe(onIce);
    const s = gameReducer({ ...s0, zone: "forest", hp: 0, player: { x: 60, y: 70 } }, { type: "respawn" });
    expect([s.zone, s.player, s.drone]).toEqual(["peaks", { x: 28, y: 72 }, { x: 36, y: 70 }]);
  });
});
