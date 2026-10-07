import { BOUNDS, MINUTES_PER_DAY, START_MINUTES, TICK_MINUTES, TICK_MS } from "./constants";
import type { GameState } from "./types";

// ── Shapes ────────────────────────────────────────────────────────────────

/** World progress shared by the whole team. One-way: once set, never unset. */
export type TeamFlags = {
  questComplete: boolean;
  hasLoot: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  gateUnlocked: boolean;
  towerPowered: boolean;
};
export type FlagKey = keyof TeamFlags;

export type PresenceMeta = {
  id: string;
  name: string;
  joinedAt: number;
  startedAt: number | null;
  flags: TeamFlags;
  x: number;
  y: number;
};

export type TeamMessage =
  | { type: "pos"; id: string; x: number; y: number }
  | { type: "progress"; id: string; name: string; flags: TeamFlags }
  | { type: "start"; startedAt: number };

export type RankedPlayer = PresenceMeta & { rank: number; color: string; isHost: boolean };

// ── Constants ─────────────────────────────────────────────────────────────

export const TEAM_MAX = 4;
// Green, snow, pink, violet: distinct from your AI drone (sky) and the amber gate/cache/artifact.
export const TEAM_COLORS = ["#22c55e", "#e2e8f0", "#f472b6", "#a78bfa"];
export const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const NO_ROOM_TIMEOUT_MS = 3000;
/** A join that hasn't settled by now fails as unreachable, so the lobby never stays on "Connecting…". */
export const JOIN_TIMEOUT_MS = 12_000;
// 4 positions a second keeps one walking team of 4 well under the free plan's 100 messages a second.
export const POS_INTERVAL_MS = 250;
const MAX_START_SKEW_MS = 86_400_000;

const FLAG_KEYS: FlagKey[] = ["questComplete", "hasLoot", "clueDecoded", "artifactFound", "gateUnlocked", "towerPowered"];

export const NO_FLAGS: TeamFlags = {
  questComplete: false,
  hasLoot: false,
  clueDecoded: false,
  artifactFound: false,
  gateUnlocked: false,
  towerPowered: false,
};

const TEAMMATE_LOG: Record<FlagKey, (name: string) => string> = {
  questComplete: (n) => `${n} surveyed the Frozen River.`,
  hasLoot: (n) => `${n} opened the Supply Cache.`,
  clueDecoded: (n) => `${n} decoded the scroll: the artifact rests in the Dense Forest.`,
  artifactFound: (n) => `${n} found the Golden Semicolon!`,
  gateUnlocked: (n) => `${n} restored the bridge.`,
  towerPowered: (n) => `${n} powered the signal tower. The fog lifts.`,
};

// ── Flags ─────────────────────────────────────────────────────────────────

export const flagsOf = (s: GameState): TeamFlags =>
  Object.fromEntries(FLAG_KEYS.map((k) => [k, s[k]])) as TeamFlags;

export const mergeFlags = (a: TeamFlags, b: TeamFlags): TeamFlags =>
  Object.fromEntries(FLAG_KEYS.map((k) => [k, a[k] || b[k]])) as TeamFlags;

export const newlySet = (before: TeamFlags, after: TeamFlags): FlagKey[] =>
  FLAG_KEYS.filter((k) => !before[k] && after[k]);

export const teammateLog = (name: string, key: FlagKey): string => TEAMMATE_LOG[key](name);

export const teamFlags = (metas: PresenceMeta[]): TeamFlags =>
  metas.reduce((acc, m) => mergeFlags(acc, m.flags), NO_FLAGS);

// ── Names and codes ───────────────────────────────────────────────────────

export function normalizeNickname(raw: string): string | null {
  const name = raw.trim();
  return /^[A-Za-z0-9 _-]{1,12}$/.test(name) ? name : null;
}

export function normalizeRoomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return code.length === 4 && [...code].every((ch) => ROOM_ALPHABET.includes(ch)) ? code : null;
}

const cryptoRandom = (n: number) => crypto.getRandomValues(new Uint32Array(n));

export function makeRoomCode(random: (n: number) => Uint32Array = cryptoRandom): string {
  return [...random(4)].map((v) => ROOM_ALPHABET[v % ROOM_ALPHABET.length]).join("");
}

// ── Roster ────────────────────────────────────────────────────────────────

/** Join order decides rank, color and host (earliest joiner); ties break on id. Later duplicates of an id win. */
export function rankPlayers(metas: PresenceMeta[]): RankedPlayer[] {
  const byId = new Map(metas.map((m) => [m.id, m]));
  return [...byId.values()]
    .sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((m, rank) => ({ ...m, rank, color: TEAM_COLORS[rank % TEAM_COLORS.length], isHost: rank === 0 }));
}

export const teamStartedAt = (metas: PresenceMeta[]): number | null =>
  metas.find((m) => m.startedAt !== null)?.startedAt ?? null;

// ── Clock ─────────────────────────────────────────────────────────────────

export const teamMinutes = (startedAt: number, now: number): number =>
  (START_MINUTES + Math.floor(Math.max(0, now - startedAt) / TICK_MS) * TICK_MINUTES) % MINUTES_PER_DAY;

// ── Validation (teammate input is untrusted) ──────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null;
const isId = (v: unknown): v is string => typeof v === "string" && v.length >= 1 && v.length <= 40;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isX = (v: unknown): v is number => isNum(v) && v >= BOUNDS.minX && v <= BOUNDS.maxX;
const isY = (v: unknown): v is number => isNum(v) && v >= BOUNDS.minY && v <= BOUNDS.maxY;
const isStart = (v: unknown, now: number): v is number => isNum(v) && Math.abs(v - now) <= MAX_START_SKEW_MS;

function parseFlags(v: unknown): TeamFlags | null {
  if (!isObj(v) || !FLAG_KEYS.every((k) => typeof v[k] === "boolean")) return null;
  return Object.fromEntries(FLAG_KEYS.map((k) => [k, v[k]])) as TeamFlags;
}

export function parsePresence(raw: unknown, now: number): PresenceMeta | null {
  if (!isObj(raw) || !isId(raw.id) || typeof raw.name !== "string" || !isNum(raw.joinedAt)) return null;
  const name = normalizeNickname(raw.name);
  const flags = parseFlags(raw.flags);
  const startedAt = raw.startedAt === null ? null : isStart(raw.startedAt, now) ? raw.startedAt : undefined;
  if (!name || !flags || startedAt === undefined || !isX(raw.x) || !isY(raw.y)) return null;
  return { id: raw.id, name, joinedAt: raw.joinedAt, startedAt, flags, x: raw.x, y: raw.y };
}

export function parseMessage(raw: unknown, now: number): TeamMessage | null {
  if (!isObj(raw)) return null;
  if (raw.type === "pos") {
    return isId(raw.id) && isX(raw.x) && isY(raw.y) ? { type: "pos", id: raw.id, x: raw.x, y: raw.y } : null;
  }
  if (raw.type === "progress") {
    const name = typeof raw.name === "string" ? normalizeNickname(raw.name) : null;
    const flags = parseFlags(raw.flags);
    return isId(raw.id) && name && flags ? { type: "progress", id: raw.id, name, flags } : null;
  }
  if (raw.type === "start") {
    return isStart(raw.startedAt, now) ? { type: "start", startedAt: raw.startedAt } : null;
  }
  return null;
}
