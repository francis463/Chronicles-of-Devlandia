import { SCROLL_CIPHERTEXT } from "./constants";

/** Shifts every letter 13 places; applying it twice gives back the original text. */
export function rot13(text: string): string {
  return text.replace(/[a-z]/gi, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
  });
}

const lettersOnly = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, "");

/** True when the answer spells the scroll's plain text, ignoring case, spaces and punctuation. */
export function isCorrectDecode(answer: string): boolean {
  return lettersOnly(answer) === lettersOnly(rot13(SCROLL_CIPHERTEXT));
}
