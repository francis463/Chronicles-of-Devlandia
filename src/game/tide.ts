/** The Sunny Beach's tide: one full cycle every 12 hours of game time. */
export const TIDE_PERIOD = 720;

/** How high the water stands at game minute `minutes`: 0 (lowest) to 1 (highest). The game starts near low tide. */
export function tideLevel(minutes: number): number {
  return 0.5 + 0.5 * Math.sin((2 * Math.PI * minutes) / TIDE_PERIOD);
}

export type TideName = "Low" | "Rising" | "High" | "Falling";

/** The tide's name: Low and High near the extremes, otherwise Rising or Falling. */
export function tideName(minutes: number): TideName {
  const level = tideLevel(minutes);
  if (level >= 0.75) return "High";
  if (level <= 0.25) return "Low";
  return Math.cos((2 * Math.PI * minutes) / TIDE_PERIOD) > 0 ? "Rising" : "Falling";
}

/** How many 8 px strips of shallow water cover the shore: 0 at low tide, 2 at high. */
export const tideStrips = (minutes: number): 0 | 1 | 2 => Math.round(tideLevel(minutes) * 2) as 0 | 1 | 2;
