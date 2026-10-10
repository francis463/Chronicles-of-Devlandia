import { fnv1a, mulberry32 } from "./shuffle";

/** No O, 0, I or 1, so the code can be read aloud and typed without confusion. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const CODE_BLOCKLIST: readonly string[] = [
  "FUCK", "FVCK", "CUNT", "TWAT", "SLUT", "CRAP", "DAMN", "SUCK", "WANK", "DUMB", "DYKE", "FAGS", "HELL", "KKKK",
];

function codeFor(n: number): string {
  const rand = mulberry32(fnv1a(String(n)));
  return Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]).join("");
}

/** The Archive's 4-character access code for an integer; blocklisted words re-hash with n + 1, n + 2, … */
export function accessCode(n: number): string {
  for (let i = n; ; i++) {
    const code = codeFor(i);
    if (!CODE_BLOCKLIST.includes(code)) return code;
  }
}
