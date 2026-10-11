import { describe, expect, it } from "vitest";
import {
  NO_FLAGS,
  TEAM_COLORS,
  flagsOf,
  makeRoomCode,
  mergeFlags,
  newlySet,
  normalizeNickname,
  normalizeRoomCode,
  parseMessage,
  parsePresence,
  rankPlayers,
  teamFlags,
  teamMinutes,
  teamStartedAt,
  teammateLog,
  type PresenceMeta,
} from "./team";
import { gameReducer, initialState } from "./reducer";

const NOW = 1_800_000_000_000;
const meta = (id: string, joinedAt: number, extra: Partial<PresenceMeta> = {}): PresenceMeta => ({
  id,
  name: `P-${id}`,
  joinedAt,
  startedAt: null,
  flags: NO_FLAGS,
  x: 28,
  y: 72,
  zone: "peaks",
  ...extra,
});

describe("team flags", () => {
  it("reads the shared flags from game state", () => {
    expect(flagsOf(initialState)).toEqual(NO_FLAGS);
    expect(flagsOf({ ...initialState, towerPowered: true }).towerPowered).toBe(true);
  });

  it("merges by OR and never unsets", () => {
    expect(mergeFlags({ ...NO_FLAGS, gateUnlocked: true }, { ...NO_FLAGS, hasLoot: true })).toEqual({
      ...NO_FLAGS,
      gateUnlocked: true,
      hasLoot: true,
    });
    expect(mergeFlags({ ...NO_FLAGS, towerPowered: true }, NO_FLAGS).towerPowered).toBe(true);
  });

  it("lists newly set flags in a fixed order", () => {
    expect(newlySet(NO_FLAGS, { ...NO_FLAGS, towerPowered: true, hasLoot: true })).toEqual(["hasLoot", "towerPowered"]);
    expect(newlySet({ ...NO_FLAGS, hasLoot: true }, { ...NO_FLAGS, hasLoot: true })).toEqual([]);
  });

  it("writes the teammate log lines from the spec", () => {
    expect(teammateLog("Kai", "questComplete")).toBe("Kai surveyed the Frozen River.");
    expect(teammateLog("Kai", "hasLoot")).toBe("Kai opened the Supply Cache.");
    expect(teammateLog("Kai", "clueDecoded")).toBe("Kai decoded the scroll: the artifact rests in the Dense Forest.");
    expect(teammateLog("Kai", "artifactFound")).toBe("Kai found the Golden Semicolon!");
    expect(teammateLog("Kai", "gateUnlocked")).toBe("Kai opened the gate.");
    expect(teammateLog("Kai", "towerPowered")).toBe("Kai powered the signal tower. The fog lifts and the bridge returns.");
  });

  it("ORs every member's flags for late joiners", () => {
    expect(
      teamFlags([meta("a", 1, { flags: { ...NO_FLAGS, hasLoot: true } }), meta("b", 2, { flags: { ...NO_FLAGS, gateUnlocked: true } })]),
    ).toEqual({ ...NO_FLAGS, hasLoot: true, gateUnlocked: true });
  });
});

describe("nicknames and room codes", () => {
  it("accepts 1–12 letters, digits, spaces, - or _ (trimmed)", () => {
    expect(normalizeNickname("  Kai  ")).toBe("Kai");
    expect(normalizeNickname("Ana_B-2 x")).toBe("Ana_B-2 x");
    expect(normalizeNickname("")).toBeNull();
    expect(normalizeNickname("   ")).toBeNull();
    expect(normalizeNickname("a".repeat(13))).toBeNull();
    expect(normalizeNickname("<b>")).toBeNull();
  });

  it("normalizes 4-letter codes without I or O", () => {
    expect(normalizeRoomCode("kqzm")).toBe("KQZM");
    expect(normalizeRoomCode(" kqzm ")).toBe("KQZM");
    expect(normalizeRoomCode("KQZ")).toBeNull();
    expect(normalizeRoomCode("KQIO")).toBeNull();
    expect(normalizeRoomCode("KQ1M")).toBeNull();
  });

  it("makes codes from the alphabet", () => {
    expect(makeRoomCode(() => new Uint32Array([0, 1, 2, 23]))).toBe("ABCZ");
    expect(makeRoomCode()).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });
});

describe("roster", () => {
  it("ranks by join time then id, assigns colors and the host, and dedupes ids", () => {
    const ranked = rankPlayers([meta("b", 20), meta("a", 10), meta("c", 20), meta("d", 30), meta("e", 40), meta("a", 10)]);
    expect(ranked.map((p) => p.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(ranked.map((p) => p.rank)).toEqual([0, 1, 2, 3, 4]);
    expect(ranked[0].isHost).toBe(true);
    expect(ranked.slice(1).every((p) => !p.isHost)).toBe(true);
    expect(ranked.map((p) => p.color).slice(0, 4)).toEqual(TEAM_COLORS);
  });

  it("keeps teammates' colors distinct from the AI drone (sky #38bdf8) and the amber items (#f59e0b)", () => {
    expect(TEAM_COLORS).not.toContain("#38bdf8");
    expect(TEAM_COLORS).not.toContain("#f59e0b");
    expect(new Set(TEAM_COLORS).size).toBe(4);
  });

  it("reads the team's start time from any member", () => {
    expect(teamStartedAt([meta("a", 1), meta("b", 2, { startedAt: 500 })])).toBe(500);
    expect(teamStartedAt([meta("a", 1)])).toBeNull();
  });
});

describe("team clock", () => {
  it("counts 5 minutes per 2 seconds from 19:29 and wraps at midnight", () => {
    expect(teamMinutes(0, 0)).toBe(1169);
    expect(teamMinutes(0, 1999)).toBe(1169);
    expect(teamMinutes(0, 2000)).toBe(1174);
    expect(teamMinutes(0, 2000 * 55)).toBe((1169 + 275) % 1440);
  });
});

describe("validation of teammate input", () => {
  it("accepts a well-formed presence meta", () => {
    expect(parsePresence(meta("a", 1), NOW)).toEqual(meta("a", 1));
  });

  it("rejects out-of-range positions, bad flags, bad names and implausible start times", () => {
    expect(parsePresence({ ...meta("a", 1), x: 500 }, NOW)).toBeNull();
    expect(parsePresence({ ...meta("a", 1), y: Number.NaN }, NOW)).toBeNull();
    expect(parsePresence({ ...meta("a", 1), flags: { ...NO_FLAGS, gateUnlocked: "yes" } }, NOW)).toBeNull();
    expect(parsePresence({ ...meta("a", 1), name: "x".repeat(40) }, NOW)).toBeNull();
    expect(parsePresence({ ...meta("a", 1), id: "" }, NOW)).toBeNull();
    expect(parsePresence({ ...meta("a", 1), startedAt: NOW + 2 * 86_400_000 }, NOW)).toBeNull();
    expect(parsePresence("nope", NOW)).toBeNull();
  });

  it("zones are parsed leniently and never drop a teammate", () => {
    expect(parsePresence({ ...meta("a", 1), zone: undefined }, NOW)?.zone).toBe("peaks");
    expect(parsePresence({ ...meta("a", 1), zone: "village" }, NOW)?.zone).toBe("village");
    const future = parsePresence({ ...meta("a", 1), zone: "marsh" }, NOW);
    expect(future).not.toBeNull();
    expect(future?.zone).toBeNull();
    expect(parseMessage({ type: "pos", id: "a", x: 50, y: 50, zone: 7 }, NOW)).toEqual({ type: "pos", id: "a", x: 50, y: 50, zone: null });
  });

  it("parses the three message types and drops anything else", () => {
    expect(parseMessage({ type: "pos", id: "a", x: 50, y: 50 }, NOW)).toEqual({ type: "pos", id: "a", x: 50, y: 50, zone: "peaks" });
    expect(parseMessage({ type: "progress", id: "a", name: "Kai", flags: NO_FLAGS }, NOW)).toEqual({
      type: "progress",
      id: "a",
      name: "Kai",
      flags: NO_FLAGS,
    });
    expect(parseMessage({ type: "start", startedAt: NOW }, NOW)).toEqual({ type: "start", startedAt: NOW });
    expect(parseMessage({ type: "pos", id: "a", x: 3, y: 50 }, NOW)).toBeNull();
    expect(parseMessage({ type: "progress", id: "a", name: "<x>", flags: NO_FLAGS }, NOW)).toBeNull();
    expect(parseMessage({ type: "start", startedAt: "soon" }, NOW)).toBeNull();
    expect(parseMessage({ type: "nope" }, NOW)).toBeNull();
    expect(parseMessage(null, NOW)).toBeNull();
  });
});

describe("team: the Archive and badges", () => {
  it("flags parse leniently: a flags object without archiveOpen is accepted as false; with it, true is kept", () => {
    const { archiveOpen: _, ...older } = NO_FLAGS;
    expect(parsePresence({ ...meta("a", 1), flags: { ...older, gateUnlocked: true } }, NOW)?.flags).toEqual({
      ...NO_FLAGS,
      gateUnlocked: true,
    });
    expect(parsePresence({ ...meta("a", 1), flags: { ...NO_FLAGS, archiveOpen: true } }, NOW)?.flags.archiveOpen).toBe(true);
    expect(parseMessage({ type: "progress", id: "a", name: "Kai", flags: older }, NOW)).toEqual({
      type: "progress", id: "a", name: "Kai", flags: NO_FLAGS,
    });
    expect(parsePresence({ ...meta("a", 1), flags: { ...older, archiveOpen: "yes" } }, NOW)?.flags.archiveOpen).toBe(false);
    expect(parsePresence({ ...meta("a", 1), flags: { ...NO_FLAGS, hasLoot: undefined } }, NOW)).toBeNull();
  });

  it("a badge message parses; an unknown chest, a bad name or a missing id is dropped", () => {
    expect(parseMessage({ type: "badge", id: "a", name: "Kai", chest: "chest-sql" }, NOW)).toEqual({
      type: "badge", id: "a", name: "Kai", chest: "chest-sql",
    });
    expect(parseMessage({ type: "badge", id: "a", name: "Kai", chest: "chest-rust" }, NOW)).toBeNull();
    expect(parseMessage({ type: "badge", id: "a", name: "<x>", chest: "chest-sql" }, NOW)).toBeNull();
    expect(parseMessage({ type: "badge", name: "Kai", chest: "chest-sql" }, NOW)).toBeNull();
  });

  it("archiveOpen merges one-way and logs `Kai unsealed the Archive.`", () => {
    expect(mergeFlags({ ...NO_FLAGS, archiveOpen: true }, NO_FLAGS).archiveOpen).toBe(true);
    expect(teammateLog("Kai", "archiveOpen")).toBe("Kai unsealed the Archive.");
    const s = gameReducer(initialState, { type: "teamSync", flags: { ...NO_FLAGS, archiveOpen: true }, by: "Kai" });
    expect(s.archiveOpen).toBe(true);
    expect(s.logs.at(-1)).toBe("Kai unsealed the Archive.");
  });
});

describe("team: chat and ping messages", () => {
  const ZWSP = String.fromCharCode(0x200b);
  const FILLER = String.fromCharCode(0x3164);
  const chat = (text: unknown, over: Record<string, unknown> = {}) => parseMessage({ type: "chat", id: "a", name: "Kai", text, ...over }, NOW);
  const ping = (over: Record<string, unknown> = {}) => parseMessage({ type: "ping", id: "a", name: "Kai", zone: "peaks", x: 40, y: 50, place: null, ...over }, NOW);

  it("a chat parses with its text cleaned and masked", () => {
    expect(chat("hello   team")).toEqual({ type: "chat", id: "a", name: "Kai", text: "hello team" });
    expect(chat("fu" + ZWSP + "ck")).toEqual({ type: "chat", id: "a", name: "Kai", text: "***" });
  });

  it("a chat is dropped when blank, too long (raw 480 UTF-16 units, 120 code points) or malformed", () => {
    expect(chat(FILLER)).toBeNull();
    expect(chat("a".repeat(481))).toBeNull();
    expect(chat("a".repeat(120))).not.toBeNull();
    expect(chat("a".repeat(121))).toBeNull();
    expect(chat("😀".repeat(60))).not.toBeNull();
    expect(chat("😀".repeat(120))).not.toBeNull();
    expect(chat("😀".repeat(121))).toBeNull();
    expect(chat("hi", { id: undefined })).toBeNull();
    expect(chat("hi", { name: "<x>" })).toBeNull();
    expect(chat(42)).toBeNull();
  });

  it("a ping parses, with a strict zone, point and place", () => {
    expect(ping()).toEqual({ type: "ping", id: "a", name: "Kai", zone: "peaks", x: 40, y: 50, place: null });
    expect(ping({ zone: undefined })).toBeNull();
    expect(ping({ zone: "moon" })).toBeNull();
    expect(ping({ x: 5 })).toBeNull();
    expect(ping({ y: 95 })).toBeNull();
    expect(ping({ place: "moon" })).toBeNull();
    expect(ping({ place: undefined })).toBeNull();
    expect(ping({ place: "gate", zone: "moon" })).toBeNull();
  });

  it("a named ping takes the place's zone and point, whatever was sent", () => {
    expect(ping({ place: "gate", zone: "village", x: 10, y: 10 })).toEqual({
      type: "ping", id: "a", name: "Kai", zone: "peaks", x: 50, y: 50, place: "gate",
    });
  });

  it("older clients' messages are unaffected, and an unknown type is still ignored", () => {
    expect(parseMessage({ type: "chat2", id: "a" }, NOW)).toBeNull();
    expect(parseMessage({ type: "pos", id: "a", x: 40, y: 50, zone: "peaks" }, NOW)).toEqual({ type: "pos", id: "a", x: 40, y: 50, zone: "peaks" });
  });
});
