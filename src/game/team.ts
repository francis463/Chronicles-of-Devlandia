import { RAW_CHAT_MAX, CHAT_MAX, chatLength, cleanChat, maskRude } from "../chat/filter";
import { isPingPlace, placeSpot, type PingPlace } from "../chat/places";
import { CHEST_IDS } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { BOUNDS, MINUTES_PER_DAY, START_MINUTES, TICK_MINUTES, TICK_MS } from "./constants";
import type { GameState } from "./types";
import type { ZoneId } from "./zones";

// ── Shapes ────────────────────────────────────────────────────────────────

/** World progress shared by the whole team. One-way: once set, never unset. */
export type TeamFlags = {
  questComplete: boolean;
  hasLoot: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  gateUnlocked: boolean;
  towerPowered: boolean;
  archiveOpen: boolean;
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
  /** Where they are; null means a zone this version doesn't know (shown nowhere, still in the team). */
  zone: ZoneId | null;
};

export type TeamMessage =
  | { type: "pos"; id: string; x: number; y: number; zone: ZoneId | null }
  | { type: "progress"; id: string; name: string; flags: TeamFlags }
  | { type: "start"; startedAt: number }
  /** Badges are personal: a teammate's badge is news for the log, never shared progress. */
  | { type: "badge"; id: string; name: string; chest: ChestId }
  /** Chat text arrives cleaned and masked, at most CHAT_MAX characters. */
  | { type: "chat"; id: string; name: string; text: string }
  /** A named ping carries the place's own zone and point. */
  | { type: "ping"; id: string; name: string; zone: ZoneId; x: number; y: number; place: PingPlace | null };

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

const FLAG_KEYS: FlagKey[] = ["questComplete", "hasLoot", "clueDecoded", "artifactFound", "gateUnlocked", "towerPowered", "archiveOpen"];
/** Every version sends these; newer flags are optional so older clients' messages still parse. */
const REQUIRED_FLAGS: FlagKey[] = FLAG_KEYS.filter((k) => k !== "archiveOpen");

export const NO_FLAGS: TeamFlags = {
  questComplete: false,
  hasLoot: false,
  clueDecoded: false,
  artifactFound: false,
  gateUnlocked: false,
  towerPowered: false,
  archiveOpen: false,
};

const TEAMMATE_LOG: Record<FlagKey, (name: string) => string> = {
  questComplete: (n) => `${n} surveyed the Frozen River.`,
  hasLoot: (n) => `${n} opened the Supply Cache.`,
  clueDecoded: (n) => `${n} decoded the scroll: the artifact rests in the Dense Forest.`,
  artifactFound: (n) => `${n} found the Golden Semicolon!`,
  gateUnlocked: (n) => `${n} opened the gate.`,
  towerPowered: (n) => `${n} powered the signal tower. The fog lifts and the bridge returns.`,
  archiveOpen: (n) => `${n} unsealed the Archive.`,
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

/** Older clients send no zone (they are in the Peaks); a zone we don't know is "elsewhere", never a reason to drop. */
function parseZone(v: unknown): ZoneId | null {
  if (v === undefined) return "peaks";
  return v === "peaks" || v === "village" ? v : null;
}

/** The six original flags must be booleans; `archiveOpen` is read leniently (missing or odd means false). */
function parseFlags(v: unknown): TeamFlags | null {
  if (!isObj(v) || !REQUIRED_FLAGS.every((k) => typeof v[k] === "boolean")) return null;
  return { ...(Object.fromEntries(REQUIRED_FLAGS.map((k) => [k, v[k]])) as Omit<TeamFlags, "archiveOpen">), archiveOpen: v.archiveOpen === true };
}

export function parsePresence(raw: unknown, now: number): PresenceMeta | null {
  if (!isObj(raw) || !isId(raw.id) || typeof raw.name !== "string" || !isNum(raw.joinedAt)) return null;
  const name = normalizeNickname(raw.name);
  const flags = parseFlags(raw.flags);
  const startedAt = raw.startedAt === null ? null : isStart(raw.startedAt, now) ? raw.startedAt : undefined;
  if (!name || !flags || startedAt === undefined || !isX(raw.x) || !isY(raw.y)) return null;
  return { id: raw.id, name, joinedAt: raw.joinedAt, startedAt, flags, x: raw.x, y: raw.y, zone: parseZone(raw.zone) };
}

export function parseMessage(raw: unknown, now: number): TeamMessage | null {
  if (!isObj(raw)) return null;
  if (raw.type === "pos") {
    return isId(raw.id) && isX(raw.x) && isY(raw.y) ? { type: "pos", id: raw.id, x: raw.x, y: raw.y, zone: parseZone(raw.zone) } : null;
  }
  if (raw.type === "progress") {
    const name = typeof raw.name === "string" ? normalizeNickname(raw.name) : null;
    const flags = parseFlags(raw.flags);
    return isId(raw.id) && name && flags ? { type: "progress", id: raw.id, name, flags } : null;
  }
  if (raw.type === "start") {
    return isStart(raw.startedAt, now) ? { type: "start", startedAt: raw.startedAt } : null;
  }
  if (raw.type === "badge") {
    const name = typeof raw.name === "string" ? normalizeNickname(raw.name) : null;
    const chest = CHEST_IDS.find((id) => id === raw.chest);
    return isId(raw.id) && name && chest ? { type: "badge", id: raw.id, name, chest } : null;
  }
  if (raw.type === "chat") {
    const name = typeof raw.name === "string" ? normalizeNickname(raw.name) : null;
    // A modified game could send far more than a message may hold: refuse before cleaning.
    const text = typeof raw.text === "string" && raw.text.length <= RAW_CHAT_MAX ? maskRude(cleanChat(raw.text)) : "";
    return isId(raw.id) && name && text && chatLength(text) <= CHAT_MAX ? { type: "chat", id: raw.id, name, text } : null;
  }
  if (raw.type === "ping") {
    const name = typeof raw.name === "string" ? normalizeNickname(raw.name) : null;
    // The zone is strict here (parseZone's lenient default is for older clients' positions).
    const zone = raw.zone === "peaks" || raw.zone === "village" ? raw.zone : null;
    const place = raw.place === null ? null : isPingPlace(raw.place) ? raw.place : undefined;
    if (!isId(raw.id) || !name || !zone || !isX(raw.x) || !isY(raw.y) || place === undefined) return null;
    return { type: "ping", id: raw.id, name, ...(place ? { ...placeSpot(place), place } : { zone, x: raw.x, y: raw.y, place }) };
  }
  return null;
}
