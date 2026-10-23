import { CHESTS, type Picks } from "./chests";
import type { ChestId } from "./types";

/** The question ids each chest asked in this browser's last games, newest last. */
export type Recent = Partial<Record<ChestId, readonly string[]>>;

const KEY = "devlandia.recentQuestions";
/** How many past games' questions a chest steers clear of. */
export const RECENT_GAMES = 2;

/** Read the recent questions; anything missing or malformed reads as none (storage can be blocked or cleared). */
export function loadRecent(): Recent {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([chest, ids]) => (Array.isArray(ids) && ids.every((id) => typeof id === "string") ? [[chest, ids.slice(-RECENT_GAMES)]] : [])),
    ) as Recent;
  } catch {
    return {};
  }
}

/** This game's questions added to the recent ones, keeping the last RECENT_GAMES per chest. */
export function withPicks(recent: Recent, picks: Picks): Recent {
  return Object.fromEntries(
    CHESTS.map((c) => [c.id, [...(recent[c.id] ?? []), c.bank[picks[c.id]].id].slice(-RECENT_GAMES)]),
  ) as Recent;
}

export function saveRecent(recent: Recent): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(recent));
  } catch {
    // Private windows and blocked storage just forget: the next game may repeat a question.
  }
}
