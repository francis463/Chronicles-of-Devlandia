import { MINUTES_PER_DAY, TICK_MINUTES } from "./constants";
import type { Phase } from "./types";

export function advanceClock(minutes: number): number {
  return (minutes + TICK_MINUTES) % MINUTES_PER_DAY;
}

export function phaseOf(minutes: number): Phase {
  const m = minutes % MINUTES_PER_DAY;
  if (m < 6 * 60 || m >= 20 * 60) return "Night";
  if (m >= 18 * 60) return "Dusk";
  return "Day";
}

export function formatTime(minutes: number): string {
  const m = minutes % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
