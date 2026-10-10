/** What a message may hold: 120 characters (code points) once cleaned, and no more than 480 UTF-16 units on the wire. */
export const CHAT_MAX = 120;
export const RAW_CHAT_MAX = 480;

export const chatLength = (text: string): number => [...text].length;
export const clampChat = (text: string): string => [...text].slice(0, CHAT_MAX).join("");

/**
 * Makes text safe to show: NFKC, tabs and line breaks to spaces, control and format characters
 * (zero-width, bidirectional, soft hyphen, tag characters) deleted, invisible fillers deleted, at most
 * two combining marks in a row, whitespace collapsed and trimmed.
 */
export function cleanChat(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\t\n\r\u2028\u2029]/g, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/[\u115F\u1160\u3164\uFFA0\u2800]/g, "")
    .replace(/(\p{M}{2})\p{M}+/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const ENGLISH =
  "fuck fucks fucking fucked fucker fck fuk fuckyou fuckin fking fkn motherfucker motherfucking shit shits shitty shithead bullshit bitch bitches bastard asshole ass dick dickhead cock pussy cunt slut whore damn crap piss wanker twat retard nigger nigga fag faggot dumbass jackass stfu";
const FILIPINO =
  "putangina putanginamo tangina tanginamo kingina kinginamo putang puta gago gagu ulol olol ulul tanga bobo tarantado tarantada punyeta punyetang pakyu pakshet kupal tite kantot jakol pekpek burat bilat";
/** The list is tuned over time; matching whole words only is a deliberate trade-off against false positives. */
export const RUDE_WORDS: ReadonlySet<string> = new Set(`${ENGLISH} ${FILIPINO}`.split(" "));

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

/** The word as the list would spell it: accents off, lower case, leetspeak undone (only in words with a letter). */
function plain(word: string): string {
  const base = word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  return /\p{L}/u.test(base) ? base.replace(/[0134577@$]/g, (c) => LEET[c] ?? c) : base;
}

const collapse = (word: string, keep: string): string => word.replace(/(\p{L})\1{2,}/gu, keep);

function isRude(word: string): boolean {
  const w = plain(word);
  return RUDE_WORDS.has(collapse(w, "$1")) || RUDE_WORDS.has(collapse(w, "$1$1"));
}

/** Replaces each rude whole word (a run of letters, digits, @ and $) with `***`. */
export function maskRude(text: string): string {
  return text.replace(/[\p{L}\p{N}@$]+/gu, (word) => (isRude(word) ? "***" : word));
}
