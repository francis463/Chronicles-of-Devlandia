/** The challenge engine's data types: every challenge (chest, gate, cipher, keypad, Matcher) is one of these. */

export type Lang = "html" | "css" | "php" | "python" | "java" | "csharp" | "sql" | "cpp" | "javascript" | "logic";

export type ChestId =
  | "chest-cpp-1"
  | "chest-java"
  | "chest-cpp-2"
  | "chest-html"
  | "chest-css"
  | "chest-py-1"
  | "chest-php"
  | "chest-sql"
  | "chest-py-2"
  | "chest-cs"
  | "chest-js";

export type ChallengeTarget = ChestId | "gate" | "cipher" | "matcher" | "archive";

/**
 * What the live check knows about a blank: a closed set (`legal`, complete), an open set
 * (`notLegal`, only certain near-misses are flagged) or a pattern (the cipher and the keypad).
 */
export type LiveData =
  | { kind: "legal"; tokens: readonly string[]; label: string }
  | { kind: "notLegal"; tokens: readonly string[]; label: string }
  | { kind: "pattern"; pattern: RegExp; reason: string };

type Base = { id: string; lang: Lang; title: string; prompt: string; hint: string; explain: string };

export type BlankChallenge = Base & {
  kind: "blank";
  /** Code lines with exactly one gap, written `___`. */
  code: readonly string[];
  answers: readonly string[];
  start?: string;
  caseSensitive: boolean;
  compare?: "normalised" | "letters";
  live: LiveData;
  /** Blocks-mode tiles: one accepted answer and at least two wrong tiles that pass the live check. */
  blocks?: readonly string[];
  instructionsLabel?: string;
  submitLabel?: string;
  inputLabel?: string;
  placeholder?: string;
  upperCase?: boolean;
  /** Wrong-answer copy for the gate and cipher; chests use the generic copy. */
  wrong?: (value: string) => string;
  /** Live-check line before the first edit (the keypad's). */
  pristine?: string;
};

export type ChoiceChallenge = Base & {
  kind: "choice";
  code?: readonly string[];
  options: readonly [string, string, string, string];
  /** The data index of the right option, never the shown position. */
  correct: 0 | 1 | 2 | 3;
  codeOptions?: boolean;
};

export type MatchPair = { snippet: string; label: string; tag?: string };
export type MatchChallenge = Base & { kind: "match"; pairs: readonly MatchPair[] };

export type Challenge = BlankChallenge | ChoiceChallenge | MatchChallenge;
export type Untitled<T> = Omit<T, "title">;
export type ChestQuestion = Untitled<BlankChallenge> | Untitled<ChoiceChallenge>;

export type CheckResult = { ok: true } | { ok: false; reason: string };
export type BlankMode = "type" | "blocks";
/** A blank's text, a choice's data index, or a match's label index per snippet. */
export type SubmitValue = string | number | readonly number[];
