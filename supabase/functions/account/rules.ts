/** The server's copy of the account rules (no imports from src/; src/auth/nameRules.test.ts keeps the two in step). */
export const accountKey = (name: string): string => name.trim().toLowerCase();

export const INTERNAL_EMAIL_DOMAIN = "players.devlandia.invalid";
export const internalEmail = (name: string): string => `${accountKey(name)}@${INTERNAL_EMAIL_DOMAIN}`;
export const isInternalEmail = (email: string): boolean => email.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);

const NAME = /^[A-Za-z0-9_-]{3,12}$/;

export function validateName(name: string): "invalid-name" | null {
  return NAME.test(name) ? null : "invalid-name";
}

export function validatePassword(password: string): "weak-password" | null {
  return password.length >= 8 ? null : "weak-password";
}
