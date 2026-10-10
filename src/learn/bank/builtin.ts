import { rot13 } from "../../game/cipher";
import { CIPHER_HINT, cipherError, PUZZLE_ANSWER, PUZZLE_HINT, puzzleError, SCROLL_CIPHERTEXT } from "../../game/constants";
import { CODE_ALPHABET } from "../access";
import type { BlankChallenge } from "../types";

/** The north gate's lock: fix the CSS value. */
export const GATE_CSS: BlankChallenge = {
  kind: "blank",
  id: "gate-css",
  lang: "logic",
  title: "< TERMINAL GATE LOCK: C++ PEAKS >",
  prompt: "Fix the CSS value below to open the north gate.",
  code: [".north-gate {", "    width: 100%;", "    display: ___;  <-- FIX THIS VALUE", "}"],
  answers: [PUZZLE_ANSWER],
  start: "none",
  caseSensitive: false,
  live: { kind: "notLegal", tokens: ["hidden", "visible", "show", "hide"], label: "a display value" },
  blocks: ["none", "block", "hidden", "inline", "flex"],
  inputLabel: "display value",
  hint: PUZZLE_HINT,
  explain: "",
  wrong: puzzleError,
};

/** The scroll from the Supply Cache: decode the ROT13 text. */
export const SCROLL_CIPHER: BlankChallenge = {
  kind: "blank",
  id: "scroll-cipher",
  lang: "logic",
  title: "< SCROLL CIPHER: ROT13 >",
  prompt: "Decode the scroll to learn where the artifact is hidden.",
  code: ["// ROT13: every letter is shifted 13 places", `rot13("${SCROLL_CIPHERTEXT}")  → ___`],
  answers: [rot13(SCROLL_CIPHERTEXT)],
  caseSensitive: false,
  compare: "letters",
  live: { kind: "pattern", pattern: /^[^0-9]*$/, reason: "No digits: the scroll is plain words." },
  instructionsLabel: "SCROLL INSTRUCTIONS:",
  submitLabel: "[ SUBMIT DECODE ]",
  inputLabel: "decoded text",
  placeholder: "plain text",
  upperCase: true,
  hint: CIPHER_HINT,
  explain: "",
  wrong: cipherError,
};

/** The sealed Archive's keypad; the reducer compares the code, so it lists no answers. */
export const ARCHIVE_LOCK: BlankChallenge = {
  kind: "blank",
  id: "archive-lock",
  lang: "logic",
  title: "< ARCHIVE LOCK: DEV VILLAGE >",
  prompt: "Enter the Archive's 4-character access code. The Syntax Terminal in this village prints it.",
  code: ["ACCESS CODE: ___"],
  answers: [],
  caseSensitive: false,
  live: {
    kind: "pattern",
    pattern: new RegExp(`^[${CODE_ALPHABET}]{4}$`, "i"),
    reason: "Codes are 4 letters or digits (no O, 0, I or 1).",
  },
  submitLabel: "[ ENTER CODE ]",
  inputLabel: "access code",
  upperCase: true,
  pristine: "Type the 4-character code.",
  hint: "Solve the Syntax Terminal's matcher to get the code. In a team game every explorer's code is the same, so ask a teammate.",
  explain: "",
  wrong: () => "Access denied.",
};
