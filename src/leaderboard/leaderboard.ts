/** One line of the leaderboard. */
export type Row = { rank: number; name: string; badges: number };
/** The caller's own standing; `rank` is null while they have no badges. */
export type Me = { rank: number | null; badges: number; hidden: boolean };

export interface LeaderboardStore {
  top(): Promise<Row[]>;
  /** The caller's standing; null for a guest or when the server has none. */
  me(): Promise<Me | null>;
  setHidden(hidden: boolean): Promise<void>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
/** There are 11 badges; no rank above a million is believable. */
const BADGES = 11;
const MAX_RANK = 1_000_000;

/** Reads the server's list; whatever it sends, a row that does not fit is dropped rather than shown. */
export function parseRows(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((r): Row[] =>
    isObj(r) && isInt(r.rank, 1, MAX_RANK) && isInt(r.badges, 1, BADGES) && typeof r.name === "string" && r.name.length >= 1 && r.name.length <= 12
      ? [{ rank: r.rank, name: r.name, badges: r.badges }]
      : [],
  );
}

/** Reads the first row of the caller's standing, or null when there is none or it does not fit. */
export function parseMe(data: unknown): Me | null {
  const r = Array.isArray(data) ? data[0] : null;
  if (!isObj(r) || typeof r.hidden !== "boolean" || !isInt(r.badges, 0, BADGES)) return null;
  if (r.rank !== null && !isInt(r.rank, 1, MAX_RANK)) return null;
  return { rank: r.rank, badges: r.badges, hidden: r.hidden };
}
