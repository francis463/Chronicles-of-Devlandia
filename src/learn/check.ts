import type { BlankChallenge, BlankMode, CheckResult, MatchChallenge } from "./types";

const GAP = "___";
const BRACKETS: Record<string, string> = { ")": "(", "]": "[", "}": "{", ">": "<" };
const OPENERS = new Set(Object.values(BRACKETS));
const QUOTED = /^(["']).*\1$/;

/** Trims, drops one trailing `;` (trimming again), collapses inner spaces, and lower-cases unless case-sensitive. */
export function normalize(raw: string, caseSensitive: boolean): string {
  const text = raw.trim().replace(/;$/, "").trim().replace(/ {2,}/g, " ");
  return caseSensitive ? text : text.toLowerCase();
}

/** The upper-cased letters A–Z of a text, nothing else. */
export const lettersOf = (raw: string) => raw.toUpperCase().replace(/[^A-Z]/g, "");

/**
 * The code touching the gap: on its left, back to the previous space (empty when a space touches it);
 * on its right, the one character after it when that is punctuation (null for a letter, digit, space or line end).
 */
export function gapContext(code: readonly string[]): { left: string; right: string | null } {
  const line = code.find((l) => l.includes(GAP)) ?? "";
  const at = line.indexOf(GAP);
  const before = line.slice(0, at);
  const left = before.slice(before.search(/\S*$/));
  const next = line.charAt(at + GAP.length);
  const right = next !== "" && !/[\p{L}\p{N}\s]/u.test(next) ? next : null;
  return { left, right };
}

const count = (text: string, ch: string) => text.split(ch).length - 1;

function bracketsPair(text: string): boolean {
  const stack: string[] = [];
  for (const ch of text) {
    if (OPENERS.has(ch)) stack.push(ch);
    else if (ch in BRACKETS && stack.pop() !== BRACKETS[ch]) return false;
  }
  return stack.length === 0;
}

const fail = (reason: string): CheckResult => ({ ok: false, reason });
const REPEATS_CODE = "Type just the missing part: the code around the blank is already there.";

/** The live check: judges the input's syntax from the input alone. It never reads `answers`. */
export function checkBlank(c: BlankChallenge, input: string, mode: BlankMode = "type"): CheckResult {
  const trimmed = input.trim();
  if (trimmed === "") return fail(mode === "blocks" ? "Place a block first." : "Type something first.");

  const live = c.live;
  if (live.kind === "pattern") return live.pattern.test(trimmed) ? { ok: true } : fail(live.reason);

  const legal = live.kind === "legal" ? live.tokens : [];
  const legalHas = (chars: string) => legal.some((t) => t.includes(chars));

  if (count(trimmed, '"') % 2 === 1 || count(trimmed, "'") % 2 === 1) return fail("Unclosed quote.");
  if (!legal.some((t) => /[()[\]{}<>]/.test(t)) && !bracketsPair(trimmed)) return fail("Unclosed or extra bracket.");

  const norm = normalize(input, c.caseSensitive);
  const fold = (s: string) => (c.caseSensitive ? s : s.toLowerCase());
  const { left, right } = gapContext(c.code);
  const repeatsLeft = left !== "" && !legalHas(left) && norm.startsWith(fold(left));
  const repeatsRight = right !== null && !legalHas(right) && norm.includes(right);
  const wrapped = QUOTED.test(norm) && !legalHas('"') && !legalHas("'");
  if (repeatsLeft || repeatsRight || wrapped) return fail(REPEATS_CODE);

  // The reason quotes the input as typed (normalised, case kept).
  const shown = normalize(input, true);
  if (live.kind === "legal") {
    if (legal.some((t) => fold(t) === norm)) return { ok: true };
    const caseOnly = c.caseSensitive && legal.some((t) => t.toLowerCase() === norm.toLowerCase());
    return fail(`'${shown}' is not ${live.label}.${caseOnly ? " Names are case-sensitive." : ""}`);
  }
  const flagged = live.tokens.some((t) => t.toLowerCase() === norm.toLowerCase());
  return flagged ? fail(`'${shown}' is not ${live.label}.`) : { ok: true };
}

/** Whether a blank's input is an accepted answer (normalised, or by letters for the cipher). */
export function isCorrectBlank(c: BlankChallenge, input: string): boolean {
  if (c.compare === "letters") return c.answers.some((a) => lettersOf(a) === lettersOf(input) && lettersOf(a) !== "");
  const norm = normalize(input, c.caseSensitive);
  return c.answers.some((a) => normalize(a, c.caseSensitive) === norm);
}

const MAX_SHOWN = 24;

export function wrongBlankCopy(input: string): string {
  const text = input.trim();
  const shown = text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}…` : text;
  return `Not quite: "${shown}" isn't the answer. Check the hint or try again.`;
}

export const wrongChoiceCopy = () => "Not quite: that isn't the answer. Check the hint or try again.";

export const wrongMatchCopy = (n: number) => (n === 1 ? "1 of 5 pairs is wrong." : `${n} of 5 pairs are wrong.`);

/** How many snippets are paired with the wrong label; `value[i]` is the label's data index for snippet i. */
export function matchWrongCount(c: MatchChallenge, value: readonly number[]): number {
  return c.pairs.filter((_, i) => value[i] !== i).length;
}
