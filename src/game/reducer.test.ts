import { describe, expect, it } from "vitest";
import { gameReducer, initialState, isDowned, isModalOpen, reachPlaces, revealedPois, visiblePois } from "./reducer";
import { placeInReach } from "./geometry";
import type { ChallengeState, ChallengeTarget, GameState, Point } from "./types";
import { NO_FLAGS } from "./team";
import { DOCK, HIDDEN_ARTIFACT, INTERACT_RADIUS, ISLAND_DOCK, LIGHTHOUSE, LOG, PEAKS_SIGNPOST, PLAYER_START, POIS, SAIL_LANDING, SNOW_CAVE, WEATHER_STATION } from "./constants";
import type { Bits8 } from "./lamp";
import { cardFor } from "./cards";
import { hermitLine } from "./island";
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
    expect(s0.hp).toBe(5);
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
  it("moves four units", () => {
    const s = gameReducer(s0, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 28, y: 68 });
  });

  it("moves in all four directions", () => {
    expect(gameReducer(s0, { type: "move", dir: "down" }).player).toEqual({ x: 28, y: 76 });
    expect(gameReducer(s0, { type: "move", dir: "left" }).player).toEqual({ x: 24, y: 72 });
    expect(gameReducer(s0, { type: "move", dir: "right" }).player).toEqual({ x: 32, y: 72 });
  });

  it("stays clamped at a map edge", () => {
    const edge = { ...s0, player: { x: 6, y: 50 } };
    const s = gameReducer(edge, { type: "move", dir: "left" });
    expect(s.player.x).toBe(6);
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
  it("advances five minutes", () => {
    const s = gameReducer(s0, { type: "tick" });
    expect(s.minutes).toBe(1174);
  });

  it("wraps the clock at midnight", () => {
    expect(gameReducer({ ...s0, minutes: 1439 }, { type: "tick" }).minutes).toBe(4);
  });
});

describe("gameReducer: riverDamage", () => {
  const inRiver = { ...s0, player: { x: 50, y: 33 } };

  it("deals 1 damage in the river and logs it", () => {
    const s = gameReducer(inRiver, { type: "riverDamage" });
    expect(s.hp).toBe(4);
    expect(lastLog(s)).toBe("Cold exposure: -1 HP.");
  });

  it("warns once as health falls to 2 hearts, not again while it stays low", () => {
    const falling = gameReducer({ ...inRiver, hp: 3 }, { type: "riverDamage" });
    expect(falling.hp).toBe(2);
    expect(falling.logs.slice(-2)).toEqual(["Cold exposure: -1 HP.", "Low health! Eat or rest, or ask a teammate to share water."]);
    const again = gameReducer(falling, { type: "riverDamage" });
    expect(again.logs.filter((l) => l.startsWith("Low health")).length).toBe(falling.logs.filter((l) => l.startsWith("Low health")).length);
    expect(gameReducer({ ...inRiver, hp: 5 }, { type: "riverDamage" }).logs.some((l) => l.startsWith("Low health"))).toBe(false);
  });

  it("floors HP at 0", () => {
    const s = gameReducer({ ...inRiver, hp: 1 }, { type: "riverDamage" });
    expect(s.hp).toBe(0);
    expect(isDowned(s)).toBe(true);
  });

  it("logs being downed when HP reaches 0", () => {
    const s = gameReducer({ ...inRiver, hp: 1 }, { type: "riverDamage" });
    expect(s.logs.slice(-2)).toEqual(["Cold exposure: -1 HP.", "You are downed. Press Respawn."]);
  });

  it("does nothing once the bridge is restored, outside the river, or when downed", () => {
    expect(gameReducer({ ...inRiver, towerPowered: true }, { type: "riverDamage" }).hp).toBe(5);
    expect(gameReducer(s0, { type: "riverDamage" })).toBe(s0);
    const downed = { ...inRiver, hp: 0 };
    expect(gameReducer(downed, { type: "riverDamage" })).toBe(downed);
  });

  it("solving the gate leaves the river icy", () => {
    expect(gameReducer({ ...opened, player: { x: 50, y: 33 } }, { type: "riverDamage" }).hp).toBe(4);
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
    expect(s.hp).toBe(5);
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
    expect(lastLog(s)).toBe("Clue decoded: the artifact is buried in the Dense Forest, south of camp.");
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
    const onIsland = { ...looted, zone: "foggaten" as const };
    expect(gameReducer(onIsland, { type: "interact", poi: "artifact" })).toBe(onIsland);
  });

  it("the dig spot is only on Foggaten Island: never visible or usable in the Peaks or the forest (Review Focus 3)", () => {
    const decoded = { ...looted, clueDecoded: true };
    expect(visiblePois(decoded).map((p) => p.id)).not.toContain("artifact");
    expect(gameReducer(decoded, { type: "interact", poi: "artifact" })).toBe(decoded);
    expect(visiblePois({ ...decoded, zone: "forest" }).map((p) => p.id)).not.toContain("artifact");
    expect(gameReducer({ ...decoded, zone: "forest" }, { type: "interact", poi: "artifact" })).toEqual({ ...decoded, zone: "forest" });
    expect(visiblePois({ ...decoded, zone: "foggaten" }).map((p) => p.id)).toContain("artifact");
    expect(visiblePois({ ...decoded, zone: "foggaten", artifactFound: true }).map((p) => p.id)).not.toContain("artifact");
  });

  it("digging after decoding finds the artifact once", () => {
    const decoded = { ...looted, zone: "foggaten" as const, clueDecoded: true };
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

  it("a step into the locked wall stays put, logs the locked line", () => {
    const start = { ...s0, player: { x: 30, y: 52 } };
    const s = gameReducer(start, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 30, y: 52 });
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

  it("through the open gate's opening a step moves (guard)", () => {
    const s = gameReducer({ ...opened, player: { x: 48, y: 52 } }, { type: "move", dir: "up" });
    expect(s.player).toEqual({ x: 48, y: 48 });
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
    expect([poi("gate")].map((t) => inReach(locked.peaks, t))).toEqual([true]);
    expect(HIDDEN_ARTIFACT).toMatchObject({ x: 86, y: 80 });
    expect(locked.spots.some((s) => ZONES[s.zone].wall && s.player.y < 49)).toBe(false);
    expect(locked.spots.some((s) => s.zone === "village")).toBe(true);

    const open = reachable(true);
    expect([poi("tower"), poi("chest"), poi("river"), poi("gate")].every((t) => inReach(open.peaks, t))).toBe(true);
    expect(open.crossings.length).toBeGreaterThan(0);
    expect(open.crossings.every((c) => c.zone === "peaks")).toBe(true);
    expect(new Set(open.crossings.map((c) => c.player.x))).toEqual(new Set([48, 50, 52]));
    // The village has no wall, so its north half is open to walk once you are in it (gate or not).
    expect(open.spots.some((s) => s.zone === "village" && s.player.y < 49)).toBe(true);
    expect(locked.spots.some((s) => s.zone === "village" && s.player.y < 49)).toBe(true);
  });
});

describe("gameReducer: zones", () => {
  const left = { type: "move", dir: "left" } as const;
  const right = { type: "move", dir: "right" } as const;

  it("left from (6, 72) in the Peaks enters the village at (94, 72)", () => {
    const s = gameReducer({ ...s0, player: { x: 6, y: 72 }, inspected: "gate" }, left);
    expect(s.zone).toBe("village");
    expect(s.player).toEqual({ x: 94, y: 72 });
    expect(s.drone).toEqual({ x: 86, y: 70 });
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

  it("the village has no wall: you walk north of the old wall line, gate open or not", () => {
    for (const gateUnlocked of [false, true]) {
      const start: GameState = { ...s0, zone: "village", gateUnlocked, player: { x: 30, y: 52 } };
      const moved = gameReducer(start, { type: "move", dir: "up" });
      expect(moved.player).toEqual({ x: 30, y: 48 });
      expect(moved.logs).toEqual(start.logs);
      expect(isNorthOfWall(moved.player)).toBe(true);
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

  it("visiblePois: your zone's places, plus the dig spot on the island once revealed", () => {
    expect(visiblePois(s0).map((p) => p.id)).toEqual([
      "gate", "chest", "river", "tower", "dock", "peaks-signpost", "weather-station", "chest-html", "chest-css",
    ]);
    expect(visiblePois({ ...village, clueDecoded: true }).map((p) => p.id)).toEqual([
      "villager", "signpost", "terminal", "archive", "chest-php", "chest-sql",
    ]);
    expect(visiblePois({ ...s0, clueDecoded: true }).map((p) => p.id)).not.toContain("artifact");
    expect(visiblePois({ ...s0, zone: "foggaten", clueDecoded: true }).map((p) => p.id).at(-1)).toBe("artifact");
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
    expect(lastLog(s)).toBe("Clue decoded: the artifact is buried in the Dense Forest, south of camp.");
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
    const s = gameReducer({ ...s0, player: { x: 19, y: 84 } }, { type: "interact", poi: "chest-html" });
    expect(s.challenge?.target).toBe("chest-html");
    expect(s.inspected).toBe("chest-html");
  });

  it("a north chest before the gate logs LOG.wallLocked, sets inspected and opens nothing; after the gate it opens", () => {
    const locked = gameReducer(s0, { type: "interact", poi: "chest-css" });
    expect(locked.challenge).toBeNull();
    expect(locked.inspected).toBe("chest-css");
    expect(lastLog(locked)).toBe(LOG.wallLocked);
    expect(gameReducer(opened, { type: "interact", poi: "chest-css" }).challenge?.target).toBe("chest-css");
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
    expect(reachPlaces({ ...s0, player: p }).map((q) => q.id)).not.toContain("chest-css");
    expect(reachPlaces({ ...opened, player: p }).map((q) => q.id)).toContain("chest-css");
    expect(placeInReach({ x: 19, y: 84 }, reachPlaces({ ...s0, player: { x: 19, y: 84 } }))?.id).toBe("chest-html");
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
      { target: "cipher", flag: "clueDecoded", line: "Ana decoded the scroll: the artifact is buried in the Dense Forest, south of camp." },
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

describe("gameReducer: the Dense Forest's places", () => {
  const forest: GameState = { ...s0, zone: "forest" };

  it("the forest's places are the ranger, campfire, signpost and the old oak's JavaScript chest", () => {
    expect(reachPlaces(forest).map((p) => p.id)).toEqual(["ranger", "campfire", "forest-signpost", "hunter-cabin", "forest-well", "forest-brook", "fairy-ring", "hollow-tree", "mushroom-1", "mushroom-2", "mushroom-3", "remedy-herb", "chest-js"]);
  });

  it("talking to the ranger opens her card and logs her line once", () => {
    const once = gameReducer(forest, { type: "interact", poi: "ranger" });
    expect(once.inspected).toBe("ranger");
    expect(lastLog(once)).toBe(
      'Ranger: "Welcome to the Dense Forest! Back north, the Supply Cache waits behind the wall. Its gate opens with one CSS fix. Oh, and if you pass any glow mushrooms, bring me three for my stew (0 of 3)."',
    );
    const twice = gameReducer(once, { type: "interact", poi: "ranger" });
    expect(twice.logCount).toBe(once.logCount);
  });

  it("the campfire and the signpost inspect and log nothing", () => {
    for (const poi of ["campfire", "forest-signpost"] as const) {
      const s = gameReducer(forest, { type: "interact", poi });
      expect(s.inspected, poi).toBe(poi);
      expect(s.logCount, poi).toBe(forest.logCount);
    }
  });

  it("other zones' places do nothing in the forest, and the ranger does nothing elsewhere", () => {
    for (const poi of ["gate", "villager", "signpost", "terminal"] as const) expect(gameReducer(forest, { type: "interact", poi }), poi).toBe(forest);
    expect(gameReducer(s0, { type: "interact", poi: "ranger" })).toBe(s0);
    expect(gameReducer({ ...s0, zone: "village" }, { type: "interact", poi: "campfire" }).inspected).toBeNull();
  });
});

describe("gameReducer: the Sunbaked Desert's places", () => {
  const desert: GameState = { ...s0, zone: "desert" };

  it("the desert's places are the nomad, signpost and the pyramid and oasis chests", () => {
    expect(reachPlaces(desert).map((p) => p.id)).toEqual(["nomad", "desert-signpost", "caravan-camp", "desert-well", "temple-door", "dry-riverbed", "obelisk", "jar-1", "jar-2", "jar-3", "remedy-fruit", "chest-java", "chest-py-2"]);
  });

  it("the nomad speaks once; the signpost inspects and logs nothing", () => {
    const once = gameReducer(desert, { type: "interact", poi: "nomad" });
    expect(once.inspected).toBe("nomad");
    expect(lastLog(once)).toMatch(/^Nomad: "/);
    expect(gameReducer(once, { type: "interact", poi: "nomad" }).logCount).toBe(once.logCount);
    for (const poi of ["desert-signpost"] as const) {
      const s = gameReducer(desert, { type: "interact", poi });
      expect(s.inspected, poi).toBe(poi);
      expect(s.logCount, poi).toBe(desert.logCount);
    }
  });

  it("the desert's places do nothing elsewhere", () => {
    expect(gameReducer(s0, { type: "interact", poi: "nomad" })).toBe(s0);
    expect(gameReducer({ ...s0, zone: "forest" }, { type: "interact", poi: "chest-py-2" }).inspected).toBeNull();
  });

  it("crossing the forest's west edge enters the desert on its east edge, same row, and logs it once", () => {
    const edge: GameState = { ...s0, zone: "forest", player: { x: 6, y: 70 } };
    const s = gameReducer(edge, { type: "move", dir: "left" });
    expect([s.zone, s.player.x, s.player.y]).toEqual(["desert", 94, 70]);
    expect(lastLog(s)).toBe("Entered the Sunbaked Desert.");
  });
});

describe("gameReducer: the Sunny Beach's places", () => {
  const beach: GameState = { ...s0, zone: "beach" };
  it("the beach's places are the fisher, signpost and the pier and shipwreck chests", () => {
    expect(reachPlaces(beach).map((p) => p.id)).toEqual(["fisher", "beach-signpost", "sandcastle", "remedy-drink", "chest-cpp-1", "chest-cpp-2"]);
  });
  it("the fisher speaks once; the signpost inspects and logs nothing", () => {
    const once = gameReducer(beach, { type: "interact", poi: "fisher" });
    expect(once.inspected).toBe("fisher");
    expect(lastLog(once)).toMatch(/^Fisher: "/);
    expect(gameReducer(once, { type: "interact", poi: "fisher" }).logCount).toBe(once.logCount);
    for (const poi of ["beach-signpost"] as const) {
      const s = gameReducer(beach, { type: "interact", poi });
      expect(s.inspected, poi).toBe(poi);
      expect(s.logCount, poi).toBe(beach.logCount);
    }
  });
  it("the beach's places do nothing elsewhere", () => {
    expect(gameReducer(s0, { type: "interact", poi: "fisher" })).toBe(s0);
    expect(gameReducer({ ...s0, zone: "desert" }, { type: "interact", poi: "chest-cpp-2" }).inspected).toBeNull();
  });
  it("crossing the forest's east edge enters the beach on its west edge, same row", () => {
    const s = gameReducer({ ...s0, zone: "forest", player: { x: 94, y: 70 } }, { type: "move", dir: "right" });
    expect([s.zone, s.player.x, s.player.y]).toEqual(["beach", 6, 70]);
    expect(lastLog(s)).toBe("Entered Sunny Beach.");
  });
});

describe("gameReducer: chests hosted in landmarks", () => {
  const HOSTED = [["chest-html", "peaks"], ["chest-css", "peaks"], ["chest-php", "village"], ["chest-sql", "village"], ["chest-js", "forest"], ["chest-java", "desert"], ["chest-py-2", "desert"], ["chest-cpp-2", "beach"], ["chest-cpp-1", "beach"], ["chest-py-1", "foggaten"]] as const;

  it("standing at its landmark opens each chest's question, and an earned chest can be reviewed", () => {
    for (const [id, zone] of HOSTED) {
      const at = ZONES[zone].places.find((p) => p.id === id)!;
      const here: GameState = { ...s0, zone, player: { x: Math.round(at.x / 2) * 2, y: Math.max(10, Math.round(at.y / 2) * 2) }, gateUnlocked: true };
      expect(gameReducer(here, { type: "interact", poi: id }).challenge?.target, id).toBe(id);
    }
  });

  it("each hosted chest's place is named after its landmark", () => {
    expect(ZONES.village.places.find((p) => p.id === "chest-sql")?.label).toBe("Windmill");
    expect(ZONES.foggaten.places.find((p) => p.id === "chest-py-1")?.label).toBe("Ruins");
  });
});

describe("gameReducer: Codex 'Go there'", () => {
  it("goTo closes the Codex and logs the note, once", () => {
    const open = gameReducer(s0, { type: "toggleCodex" });
    const s = gameReducer(open, { type: "goTo", chest: "chest-sql" });
    expect(s.codexOpen).toBe(false);
    expect(lastLog(s)).toBe("Head to the Windmill in Dev Village, west of the Peaks.");
    expect(gameReducer(s, { type: "goTo", chest: "chest-sql" }).logCount).toBe(s.logCount);
  });

  it("goTo does nothing while a terminal is open", () => {
    const busy: GameState = { ...s0, challenge: openOn("gate") };
    expect(gameReducer(busy, { type: "goTo", chest: "chest-sql" })).toBe(busy);
  });
});

describe("gameReducer: sailing to Foggaten Island", () => {
  const atDock: GameState = { ...s0, gateUnlocked: true, player: { x: DOCK.x - 2, y: DOCK.y } };
  const atIslandDock: GameState = { ...s0, zone: "foggaten", gateUnlocked: true, player: { x: ISLAND_DOCK.x + 2, y: ISLAND_DOCK.y } };

  it("sails from the Peaks' dock to the island once the gate is open, changing nothing else", () => {
    const s = gameReducer({ ...atDock, hp: 77, hasLoot: true, towerPowered: true, minutes: 100 }, { type: "sail", to: "foggaten" });
    expect(s.zone).toBe("foggaten");
    expect(s.player).toEqual(SAIL_LANDING.foggaten);
    expect(s.drone.y).toBe(SAIL_LANDING.foggaten.y);
    expect(s.drone.x).toBeLessThan(SAIL_LANDING.foggaten.x);
    expect(lastLog(s)).toBe(LOG.sailOut);
    expect(s).toMatchObject({ hp: 77, hasLoot: true, towerPowered: true, gateUnlocked: true, minutes: 100, inspected: null });
    expect(s.badges).toEqual(atDock.badges);
  });

  it("lands out of reach of the far dock, so holding E cannot bounce you back and forth", () => {
    const out = gameReducer(atDock, { type: "interact", poi: "dock" });
    expect(gameReducer(out, { type: "interact", poi: "island-dock" })).toMatchObject({ zone: "foggaten", player: out.player });
    const back = gameReducer(atIslandDock, { type: "interact", poi: "island-dock" });
    expect(back.zone).toBe("peaks");
    expect(gameReducer(back, { type: "interact", poi: "dock" })).toMatchObject({ zone: "peaks", player: back.player });
  });

  it("sails back from the island's dock to the Peaks", () => {
    const s = gameReducer(atIslandDock, { type: "sail", to: "peaks" });
    expect(s.zone).toBe("peaks");
    expect(s.player).toEqual(SAIL_LANDING.peaks);
    expect(lastLog(s)).toBe(LOG.sailBack);
  });

  it("the dock waits for the gate: one locked line and no move", () => {
    const locked = { ...atDock, gateUnlocked: false };
    const s = gameReducer(locked, { type: "sail", to: "foggaten" });
    expect(s.zone).toBe("peaks");
    expect(lastLog(s)).toBe(LOG.dockLocked);
    expect(gameReducer(s, { type: "sail", to: "foggaten" }).logCount).toBe(s.logCount);
  });

  it("refuses from far away, with a terminal or the Codex open, and for any other destination", () => {
    const far = { ...atDock, player: { x: 20, y: 20 } };
    expect(gameReducer(far, { type: "sail", to: "foggaten" })).toBe(far);
    expect(gameReducer({ ...atDock, codexOpen: true }, { type: "sail", to: "foggaten" })).toEqual({ ...atDock, codexOpen: true });
    expect(gameReducer({ ...atDock, challenge: openOn("gate") }, { type: "sail", to: "foggaten" }).zone).toBe("peaks");
    for (const to of ["village", "forest", "peaks"] as const) expect(gameReducer(atDock, { type: "sail", to })).toBe(atDock);
    expect(gameReducer(atIslandDock, { type: "sail", to: "foggaten" })).toBe(atIslandDock);
    expect(gameReducer(atIslandDock, { type: "sail", to: "forest" })).toBe(atIslandDock);
    expect(gameReducer({ ...atDock, zone: "village" }, { type: "sail", to: "foggaten" }).zone).toBe("village");
    expect(gameReducer({ ...atDock, hp: 0 }, { type: "sail", to: "foggaten" }).zone).toBe("peaks");
  });

  it("interact on a dock does what sail does, including the locked line", () => {
    expect(gameReducer(atDock, { type: "interact", poi: "dock" }).zone).toBe("foggaten");
    expect(gameReducer(atIslandDock, { type: "interact", poi: "island-dock" }).zone).toBe("peaks");
    const locked = gameReducer({ ...atDock, gateUnlocked: false }, { type: "interact", poi: "dock" });
    expect(locked.zone).toBe("peaks");
    expect(lastLog(locked)).toBe(LOG.dockLocked);
  });

  it("pressing the dock's map button from far away only shows its card", () => {
    const far: GameState = { ...s0, gateUnlocked: true, player: { x: 20, y: 20 } };
    const s = gameReducer(far, { type: "interact", poi: "dock" });
    expect(s.zone).toBe("peaks");
    expect(s.player).toEqual(far.player);
    expect(s.inspected).toBe("dock");
  });

  it("the island's places inspect, and the hermit speaks once", () => {
    const island: GameState = { ...s0, zone: "foggaten" };
    for (const poi of ["lighthouse", "island-fire"] as const) {
      expect(gameReducer(island, { type: "interact", poi }).inspected, poi).toBe(poi);
    }
    const once = gameReducer(island, { type: "interact", poi: "hermit" });
    expect(once.inspected).toBe("hermit");
    expect(lastLog(once)).toBe(`Hermit: "${hermitLine(island)}"`);
    expect(gameReducer(once, { type: "interact", poi: "hermit" }).logCount).toBe(once.logCount);
  });

  it("the island's places do not answer from another zone", () => {
    expect(gameReducer(s0, { type: "interact", poi: "hermit" })).toBe(s0);
    expect(gameReducer({ ...s0, zone: "foggaten" }, { type: "interact", poi: "dock" })).toEqual({ ...s0, zone: "foggaten" });
  });

  it("there is no way off the island by walking and no hazard on it", () => {
    const island: GameState = { ...s0, zone: "foggaten", player: { x: 94, y: 70 } };
    expect(gameReducer(island, { type: "move", dir: "right" }).player).toEqual(island.player);
    expect(gameReducer(island, { type: "riverDamage" }).hp).toBe(island.hp);
  });
});

describe("gameReducer: the lighthouse lamp", () => {
  const bitsOf = (n: number): Bits8 => n.toString(2).padStart(8, "0").split("").map(Number) as Bits8;
  const island: GameState = { ...s0, zone: "foggaten", gateUnlocked: true, player: { x: LIGHTHOUSE.x + 2, y: LIGHTHOUSE.y } };
  const lamp = (over: Partial<GameState> = {}): GameState => ({ ...island, lampOpen: true, ...over });
  const interact = (s: GameState) => gameReducer(s, { type: "interact", poi: "lighthouse" });

  it("starts unlit with the lamp terminal closed", () => {
    expect([s0.lighthouseLit, s0.lampOpen, s0.lampError, s0.lampTries, s0.lampHintRevealed]).toEqual([false, false, null, 0, false]);
  });

  it("E at the unlit lighthouse opens the lamp terminal, a modal", () => {
    const s = interact(island);
    expect(s).toMatchObject({ lampOpen: true, inspected: "lighthouse", lampError: null, lampTries: 0 });
    expect(lastLog(s)).toBe(LOG.lampOpened);
    expect(isModalOpen(s)).toBe(true);
  });

  it("needs you beside it: from far away only the card shows", () => {
    const s = interact({ ...island, player: { x: 10, y: 10 } });
    expect(s.lampOpen).toBe(false);
    expect(s.inspected).toBe("lighthouse");
  });

  it("does not open over another modal", () => {
    for (const over of [{ codexOpen: true }, { logicOpen: true }, { challenge: openOn("gate") }]) {
      const s: GameState = { ...island, ...over };
      expect(interact(s)).toBe(s);
    }
  });

  it("once lit it only inspects, and says so", () => {
    const s = interact({ ...island, lighthouseLit: true });
    expect(s).toMatchObject({ lampOpen: false, inspected: "lighthouse" });
    expect(lastLog(s)).toBe(LOG.lighthouseOnline);
  });

  it("01001000 lights it for the team, closes the terminal and changes nothing else", () => {
    const s = gameReducer(lamp({ hp: 77, minutes: 100 }), { type: "submitLamp", bits: bitsOf(72) });
    expect(s).toMatchObject({ lighthouseLit: true, lampOpen: false, lampError: null, hp: 77, minutes: 100 });
    expect(s.badges).toEqual(island.badges);
    expect(lastLog(s)).toBe(LOG.lampLit);
  });

  it("every other setting from 0 to 255 leaves it dark with the terminal open", () => {
    for (let n = 0; n < 256; n++) {
      if (n === 72) continue;
      const s = gameReducer(lamp(), { type: "submitLamp", bits: bitsOf(n) });
      expect(s.lighthouseLit, String(n)).toBe(false);
      expect(s.lampOpen, String(n)).toBe(true);
      expect(s.lampError, String(n)).toMatch(/^The lamp sent "(.|\?)"\. It should send "H"\./);
    }
  });

  it("the drone's tip comes on the second wrong run", () => {
    const first = gameReducer(lamp(), { type: "submitLamp", bits: bitsOf(75) });
    expect(first).toMatchObject({ lampTries: 1, lampHintRevealed: false, lampError: 'The lamp sent "K". It should send "H".' });
    const second = gameReducer(first, { type: "submitLamp", bits: bitsOf(0) });
    expect(second).toMatchObject({ lampTries: 2, lampHintRevealed: true, lampError: 'The lamp sent "?". It should send "H". The drone has a tip below.' });
  });

  it("ignores crafted submissions and a submission with no terminal open", () => {
    const open = lamp();
    for (const bits of [[0, 1, 0, 0, 1, 0, 0], [0, 1, 0, 0, 1, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0], "01001000", null]) {
      expect(gameReducer(open, { type: "submitLamp", bits: bits as unknown as Bits8 })).toBe(open);
    }
    expect(gameReducer(island, { type: "submitLamp", bits: bitsOf(72) })).toBe(island);
  });

  it("close, reset and the hint item each do one thing", () => {
    const wrong = gameReducer(lamp(), { type: "submitLamp", bits: bitsOf(1) });
    expect(gameReducer(wrong, { type: "resetLamp" })).toMatchObject({ lampOpen: true, lampError: null, lampTries: 1 });
    expect(gameReducer(wrong, { type: "closeLamp" })).toMatchObject({ lampOpen: false, lampError: null });
    expect(gameReducer(lamp(), { type: "revealLampHint" }).lampHintRevealed).toBe(true);
  });

  it("while it is open the Codex, sailing, other places and movement are refused", () => {
    const s = lamp({ player: { x: ISLAND_DOCK.x + 2, y: ISLAND_DOCK.y } });
    expect(gameReducer(s, { type: "toggleCodex" })).toBe(s);
    expect(gameReducer(s, { type: "sail", to: "peaks" })).toBe(s);
    expect(gameReducer(s, { type: "interact", poi: "island-dock" })).toBe(s);
    expect(gameReducer(s, { type: "move", dir: "up" }).player).toEqual(s.player);
  });

  it("a teammate lighting it closes your terminal and logs only their line; it never goes dark", () => {
    const open = lamp();
    const synced = gameReducer(open, { type: "teamSync", flags: { ...NO_FLAGS, lighthouseLit: true }, by: "Kai" });
    expect(synced).toMatchObject({ lighthouseLit: true, lampOpen: false });
    expect(lastLog(synced)).toBe("Kai lit the lighthouse. Its beam sweeps the fog.");
    expect(gameReducer(synced, { type: "teamSync", flags: NO_FLAGS, by: "Mia" })).toBe(synced);
  });
});

describe("gameReducer: the camp signpost, the weather station and the snow cave", () => {
  const beside = (poi: { x: number; y: number }, over: Partial<GameState> = {}): GameState => ({ ...s0, player: { x: poi.x + 2, y: poi.y }, ...over });

  it("the signpost and the weather station are always in the Peaks, and inspecting them only shows a card", () => {
    for (const poi of [PEAKS_SIGNPOST, WEATHER_STATION]) {
      expect(visiblePois(s0).map((p) => p.id)).toContain(poi.id);
      const s = gameReducer(beside(poi), { type: "interact", poi: poi.id });
      expect(s.inspected).toBe(poi.id);
      expect(s.logs).toEqual(beside(poi).logs);
      expect({ hp: s.hp, minutes: s.minutes, zone: s.zone }).toEqual({ hp: 5, minutes: s0.minutes, zone: "peaks" });
    }
  });

  it("they are not places elsewhere", () => {
    for (const zone of ["village", "forest", "foggaten"] as const) {
      const ids = visiblePois({ ...s0, zone }).map((p) => p.id);
      expect(ids).not.toContain("peaks-signpost");
      expect(ids).not.toContain("weather-station");
      expect(ids).not.toContain("snow-cave");
    }
  });

  it("the snow cave is hidden until the signal tower is powered, then it is a place you can inspect", () => {
    expect(visiblePois(s0).map((p) => p.id)).not.toContain("snow-cave");
    const hidden = gameReducer(beside(SNOW_CAVE), { type: "interact", poi: "snow-cave" });
    expect(hidden.inspected).toBeNull();
    const powered = beside(SNOW_CAVE, { towerPowered: true });
    expect(visiblePois(powered).map((p) => p.id)).toContain("snow-cave");
    expect(reachPlaces(powered).map((p) => p.id)).toContain("snow-cave");
    expect(gameReducer(powered, { type: "interact", poi: "snow-cave" }).inspected).toBe("snow-cave");
  });

  it("a teammate powering the tower reveals the cave for you too", () => {
    const synced = gameReducer(beside(SNOW_CAVE), { type: "teamSync", flags: { ...NO_FLAGS, towerPowered: true }, by: "Kai" });
    expect(visiblePois(synced).map((p) => p.id)).toContain("snow-cave");
  });
});

describe("gameReducer: shareWater", () => {
  it("restores 1 HP and logs who shared it, never past the maximum", () => {
    const s = gameReducer({ ...s0, hp: 2 }, { type: "shareWater", from: "Kai" });
    expect(s.hp).toBe(3);
    expect(lastLog(s)).toBe("Kai shared water: +1 HP.");
    expect(gameReducer({ ...s0, hp: 4 }, { type: "shareWater", from: "Kai" }).hp).toBe(5);
  });

  it("says so when you are not hurt, and does nothing for someone who is downed", () => {
    const full = gameReducer(s0, { type: "shareWater", from: "Kai" });
    expect(full.hp).toBe(5);
    expect(lastLog(full)).toBe("Kai offered water, but you are not hurt.");
    const downed = { ...s0, hp: 0 };
    expect(gameReducer(downed, { type: "shareWater", from: "Kai" })).toBe(downed);
  });
});

describe("gameReducer: healing finds", () => {
  const FINDS = [
    { id: "remedy-herb", zone: "forest", sprite: "herb" },
    { id: "remedy-fruit", zone: "desert", sprite: "cactus-fruit" },
    { id: "remedy-drink", zone: "beach", sprite: "cold-drink" },
  ] as const;
  const beside = (id: (typeof FINDS)[number]["id"], zone: ZoneId, hp: number): GameState => {
    const spot = ZONES[zone].places.find((p) => p.id === id)!;
    return { ...initialState, zone, hp, player: { x: spot.x, y: spot.y } };
  };

  it("each is in its own zone, shown on the map until used", () => {
    for (const f of FINDS) {
      expect(visiblePois({ ...initialState, zone: f.zone }).map((p) => p.id)).toContain(f.id);
      expect(visiblePois({ ...initialState, zone: f.zone, remedies: [f.id] }).map((p) => p.id)).not.toContain(f.id);
      for (const other of ["peaks", "village"] as const) expect(ZONES[other].places.map((p) => p.id)).not.toContain(f.id);
    }
  });

  it("picking one beside it heals 2 HP once, logs it, and it leaves the map", () => {
    for (const f of FINDS) {
      const s = gameReducer(beside(f.id, f.zone, 2), { type: "interact", poi: f.id });
      expect(s.hp, f.id).toBe(4);
      expect(s.remedies).toEqual([f.id]);
      expect(lastLog(s)).toMatch(/\+2 HP\.$/);
      expect(gameReducer(s, { type: "interact", poi: f.id }).hp).toBe(4);
    }
  });

  it("never heals past the maximum", () => {
    expect(gameReducer(beside("remedy-herb", "forest", 4), { type: "interact", poi: "remedy-herb" }).hp).toBe(5);
  });

  it("at full health you save it for later: nothing is used up", () => {
    const s = gameReducer(beside("remedy-fruit", "desert", 5), { type: "interact", poi: "remedy-fruit" });
    expect(s.remedies).toEqual([]);
    expect(lastLog(s)).toBe("You feel fine. Come back to the cactus fruit when you are hurt.");
  });

  it("from across the map the button only shows its card", () => {
    const s = gameReducer({ ...initialState, zone: "beach", hp: 2, player: { x: 5, y: 5 } }, { type: "interact", poi: "remedy-drink" });
    expect(s.hp).toBe(2);
    expect(s.remedies).toEqual([]);
    expect(s.inspected).toBe("remedy-drink");
  });

  it("the card says how to pick it, then that it is used", () => {
    expect(cardFor({ ...initialState, zone: "forest", inspected: "remedy-herb" })?.text).toMatch(/press \[E\]/);
    expect(cardFor({ ...initialState, zone: "forest", inspected: "remedy-herb", remedies: ["remedy-herb"] })?.text).toBe("You already picked the healing herb.");
  });
});
