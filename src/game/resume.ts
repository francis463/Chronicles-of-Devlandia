import { isClassId, type ClassId } from "./classes";
import { initialState } from "./reducer";
import type { GameState } from "./types";
import { ZONES } from "./zones";

const KEY = "devlandia.savedGame";
const VERSION = 2; // 2: health became 5 hearts (a version-1 save counts HP out of 100)

/** A solo game kept in this browser so a refresh can pick it up again. */
export type SavedGame = { state: GameState; playerClass: ClassId; hard: boolean };

/** The state with every open window shut: a resumed game never comes back inside a terminal or a card. */
const settled = (s: GameState): GameState => ({
  ...s,
  inspected: null,
  challenge: null,
  logicOpen: false,
  lampOpen: false,
  codexOpen: false,
  finaleOpen: false,
  archiveOpen: false,
});

/** Who the save belongs to: an account's id, or "guest". */
const owner = (userId: string | null) => userId ?? "guest";

/** Keep this solo game for its player; blocked or full storage just forgets (a refresh then starts at the menu). */
export function saveGame(userId: string | null, game: SavedGame): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, owner: owner(userId), game: { ...game, state: settled(game.state) } }));
  } catch {
    // nothing to do
  }
}

/** The saved game of this player, or null when there is none, it is another player's, or it does not look right. */
export function loadGame(userId: string | null): SavedGame | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (typeof raw !== "object" || raw === null) return null;
    const { v, owner: who, game } = raw as { v?: unknown; owner?: unknown; game?: Partial<SavedGame> };
    if (v !== VERSION || who !== owner(userId) || !game || typeof game !== "object") return null;
    const { state, playerClass, hard } = game;
    if (!state || typeof state !== "object" || !isClassId(playerClass) || typeof hard !== "boolean") return null;
    // Anything a newer game added is filled in from the start state; a wrong kind of value is a broken save.
    const merged = { ...initialState, ...state } as GameState;
    for (const key of Object.keys(initialState) as Array<keyof GameState>) {
      if (typeof merged[key] !== typeof initialState[key] || Array.isArray(merged[key]) !== Array.isArray(initialState[key])) return null;
    }
    if (!(merged.zone in ZONES) || !Number.isFinite(merged.player.x) || !Number.isFinite(merged.player.y)) return null;
    return { state: settled(merged), playerClass, hard };
  } catch {
    return null;
  }
}

/** Whether any saved game is waiting in this browser (whoever it belongs to). */
export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
