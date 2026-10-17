import { accessCode } from "../learn/access";
import { CHESTS, type Picks } from "../learn/chests";
import type { Recent } from "../learn/recent";
import type { GameState } from "./types";

/**
 * What each game rolls once, when the Overworld mounts: every chest's question, the shuffle seed, the
 * Matcher round and the Archive's code. A team game passes `codeSeed` (the room's start time) so every
 * teammate's code is the same. A chest steers clear of the questions in `recent` (its last games') while any other remains.
 */
export function rollGame(rand: () => number, codeSeed?: number, recent: Recent = {}): Pick<GameState, "picks" | "seed" | "matcherRound" | "accessCode"> {
  // One draw per chest, always: the choice is among the questions it did not ask lately.
  const picks = Object.fromEntries(
    CHESTS.map((chest) => {
      const fresh = chest.bank.flatMap((q, i) => (recent[chest.id]?.includes(q.id) ? [] : [i]));
      const pool = fresh.length ? fresh : chest.bank.map((_, i) => i);
      return [chest.id, pool[Math.floor(rand() * pool.length)]];
    }),
  ) as Picks;
  const seed = Math.floor(rand() * 2 ** 31);
  const matcherRound = Math.floor(rand() * 3) as 0 | 1 | 2;
  return { picks, seed, matcherRound, accessCode: accessCode(codeSeed ?? Math.floor(rand() * 2 ** 31)) };
}
