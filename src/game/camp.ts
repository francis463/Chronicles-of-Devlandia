import { formatTime, phaseOf } from "./clock";
import type { GameState } from "./types";

/** The camp signpost: where everything is in the Peaks, and what is still waiting. */
export function signpostText(s: Pick<GameState, "gateUnlocked" | "towerPowered">): string {
  return [
    "Base camp. The Gate stands north: solve its terminal to open the way.",
    "The Tower is north-west, beyond the river; powering it brings the bridge back.",
    "The Supply Cache is north-east, past the wall.",
    "Chests: HTML in the ski lodge, south-west; CSS in the ice cave, north of the wall.",
    "The Dock on the east shore sails to Foggaten Island once the gate is open.",
    "Dev Village lies west and the Forest south.",
    s.gateUnlocked ? "The gate is open." : "The gate is still locked.",
    ...(s.towerPowered ? ["The tower is powered."] : []),
  ].join(" ");
}

const PHASE_LINE = {
  Day: "Bright and still. The snow keeps falling softly.",
  Dusk: "The light is fading and the wind is rising.",
  Night: "The coldest hour. Look north for the aurora.",
} as const;

/** The weather station's reading: the time, the phase of the day and a line about it. Read only. */
export function stationText(s: Pick<GameState, "minutes">): string {
  const phase = phaseOf(s.minutes);
  return `The station reads ${formatTime(s.minutes)} (${phase}). ${PHASE_LINE[phase]}`;
}

export const CAVE_TEXT =
  "Behind a curtain of ice a snow cave opens, its door melted by the signal tower's light. A faint blue glow shines deep inside. There is nothing to take, only a quiet place out of the wind.";
