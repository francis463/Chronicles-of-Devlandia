import { isClassId, type ClassId } from "../game/classes";
import { SUPABASE_URL } from "../net/config";

/** One line of the leaderboard. `avatar` is the random key of the player's photo and `cls` their hero class, when known. */
export type Row = { rank: number; name: string; badges: number; avatar?: string; cls?: ClassId };
/** The caller's own standing; `rank` is null while they have no badges. */
export type Me = { rank: number | null; badges: number; hidden: boolean; avatar?: string };

export interface LeaderboardStore {
  /** The top players, `rows` of them (20 by default; the server allows 1 to 50). */
  top(rows?: number): Promise<Row[]>;
  /** The caller's standing; null for a guest or when the server has none. */
  me(): Promise<Me | null>;
  setHidden(hidden: boolean): Promise<void>;
  /** Replaces the caller's photo with this (already shrunk) JPEG. Does nothing for a guest. */
  setAvatar(photo: Blob): Promise<void>;
  /** Removes the caller's photo. Does nothing for a guest. */
  removeAvatar(): Promise<void>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
/** There are 11 badges; no rank above a million is believable. */
const BADGES = 11;
const MAX_RANK = 1_000_000;

/** A photo's key is a random uuid. Anything else is dropped, so a key can never steer the address elsewhere. */
const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isAvatarKey = (v: unknown): v is string => typeof v === "string" && KEY.test(v);
const withAvatar = (v: unknown): { avatar?: string } => (isAvatarKey(v) ? { avatar: v } : {});
/** Where a photo is served from: the public `avatars` storage bucket. */
export const avatarUrl = (key: string): string => `${SUPABASE_URL}/storage/v1/object/public/avatars/${key}.jpg`;

/** Reads the server's list; whatever it sends, a row that does not fit is dropped rather than shown. */
export function parseRows(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((r): Row[] =>
    isObj(r) && isInt(r.rank, 1, MAX_RANK) && isInt(r.badges, 1, BADGES) && typeof r.name === "string" && r.name.length >= 1 && r.name.length <= 12
      ? [{ rank: r.rank, name: r.name, badges: r.badges, ...withAvatar(r.avatar), ...(isClassId(r.cls) ? { cls: r.cls } : {}) }]
      : [],
  );
}

/** Reads the first row of the caller's standing, or null when there is none or it does not fit. */
export function parseMe(data: unknown): Me | null {
  const r = Array.isArray(data) ? data[0] : null;
  if (!isObj(r) || typeof r.hidden !== "boolean" || !isInt(r.badges, 0, BADGES)) return null;
  if (r.rank !== null && !isInt(r.rank, 1, MAX_RANK)) return null;
  return { rank: r.rank, badges: r.badges, hidden: r.hidden, ...withAvatar(r.avatar) };
}

/** A store that cannot be reached: what a screen gets when no leaderboard was given. */
export const NO_LEADERBOARD: LeaderboardStore = {
  top: () => Promise.reject(new Error("no leaderboard")),
  me: () => Promise.resolve(null),
  setHidden: () => Promise.resolve(),
  setAvatar: () => Promise.resolve(),
  removeAvatar: () => Promise.resolve(),
};
