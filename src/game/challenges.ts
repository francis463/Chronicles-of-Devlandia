import { ARCHIVE_LOCK, GATE_CSS, SCROLL_CIPHER } from "../learn/bank/builtin";
import { MATCHER_ROUNDS } from "../learn/bank/matcher";
import { chestChallenge } from "../learn/chests";
import type { Challenge, ChallengeTarget } from "../learn/types";
import type { GameState } from "./types";

/** The challenge a terminal target asks in this game. */
export function challengeOf(s: GameState, target: ChallengeTarget): Challenge {
  switch (target) {
    case "gate":
      return GATE_CSS;
    case "cipher":
      return SCROLL_CIPHER;
    case "archive":
      return ARCHIVE_LOCK;
    case "matcher":
      return MATCHER_ROUNDS[s.matcherRound];
    default:
      return chestChallenge(s.picks, target);
  }
}
