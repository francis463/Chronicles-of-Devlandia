import { ARCHIVE_LOCK, GATE_CSS, SCROLL_CIPHER } from "../learn/bank/builtin";
import { MATCHER_ROUNDS } from "../learn/bank/matcher";
import { chestChallenge, CHESTS } from "../learn/chests";
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

/** What the challenge terminal shows for the open challenge, beyond the challenge's own data. */
export type ChallengeView = {
  error: string | null;
  wrongTries: number;
  solved: boolean;
  hintRevealed: boolean;
  seed: number;
  /** A chest's badge line and your answer, or the Matcher's access code; null until solved. */
  success: { line: string; spoken: string; explain: string; answer: string } | { code: string; explain: string } | null;
  /** The keypad shows your code once your Matcher is solved. */
  yourCode: string | null;
};

export function challengeView(s: GameState): ChallengeView | null {
  const open = s.challenge;
  if (!open) return null;
  const c = challengeOf(s, open.target);
  let success: ChallengeView["success"] = null;
  if (open.solved && open.target === "matcher") success = { code: s.accessCode, explain: c.explain };
  else if (open.solved) {
    const chest = CHESTS.find((ch) => ch.id === open.target);
    if (chest) {
      success = {
        line: `✓ ${chest.badge} Badge earned`,
        spoken: `${chest.spoken} Badge earned`,
        explain: c.explain,
        answer: s.answered[chest.id] ?? "",
      };
    }
  }
  return {
    error: open.error,
    wrongTries: open.wrongTries,
    solved: open.solved,
    hintRevealed: s.hintsRevealed.includes(c.id),
    seed: s.seed,
    success,
    yourCode: open.target === "archive" && s.matcherSolved ? s.accessCode : null,
  };
}
