import { accessCode } from "../learn/access";
import { BANK_SIZE, CHEST_IDS, type Picks } from "../learn/chests";
import type { GameState } from "./types";

/**
 * What each game rolls once, when the Overworld mounts: every chest's question, the shuffle seed, the
 * Matcher round and the Archive's code. A team game passes `codeSeed` (the room's start time) so every
 * teammate's code is the same.
 */
export function rollGame(rand: () => number, codeSeed?: number): Pick<GameState, "picks" | "seed" | "matcherRound" | "accessCode"> {
  const picks = Object.fromEntries(CHEST_IDS.map((id) => [id, Math.floor(rand() * BANK_SIZE)])) as Picks;
  const seed = Math.floor(rand() * 2 ** 31);
  const matcherRound = Math.floor(rand() * 3) as 0 | 1 | 2;
  return { picks, seed, matcherRound, accessCode: accessCode(codeSeed ?? Math.floor(rand() * 2 ** 31)) };
}
