import { PUZZLE_ANSWER } from "./constants";

export function normalizeAnswer(raw: string): string {
  return raw.trim().replace(/;$/, "").trim().toLowerCase();
}

export function isCorrectAnswer(raw: string): boolean {
  return normalizeAnswer(raw) === PUZZLE_ANSWER;
}
