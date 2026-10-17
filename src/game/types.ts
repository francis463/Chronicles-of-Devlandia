import type { ChallengeTarget, ChestId, SubmitValue } from "../learn/types";
import type { Picks } from "../learn/chests";
import type { Bits8 } from "./lamp";
import type { Bits } from "./logic";
import type { TeamFlags } from "./team";
import type { ZoneId } from "./zones";

export type Point = { x: number; y: number };

/** Every place you can use: the landmarks, the village's, and the outdoor language chests (the C# chest lives in the Archive). */
export type PoiId =
  | "gate"
  | "chest"
  | "river"
  | "tower"
  | "artifact"
  | "villager"
  | "signpost"
  | "ranger"
  | "campfire"
  | "old-oak"
  | "forest-signpost"
  | "terminal"
  | "archive"
  | "dock"
  | "peaks-signpost"
  | "weather-station"
  | "snow-cave"
  | "island-dock"
  | "lighthouse"
  | "hermit"
  | "island-fire"
  | "ruins"
  | "nomad"
  | "oasis"
  | "desert-pyramid"
  | "desert-signpost"
  | Exclude<ChestId, "chest-cs">;

export type Poi = { id: PoiId; label: string } & Point;

export type Direction = "up" | "down" | "left" | "right";

export type Phase = "Day" | "Dusk" | "Night";

export type { ChallengeTarget, ChestId };

/** The open challenge terminal. `lastWrong` is the JSON of the last wrong value, so resubmitting it does nothing. */
export type ChallengeState = {
  target: ChallengeTarget;
  error: string | null;
  wrongTries: number;
  solved: boolean;
  lastWrong: string | null;
};

export type GameState = {
  /** Which screen of the world you are on. */
  zone: ZoneId;
  player: Point;
  drone: Point;
  hp: number;
  stamina: number;
  minutes: number;
  inspected: PoiId | null;
  questComplete: boolean;
  hasLoot: boolean;
  gateUnlocked: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  towerPowered: boolean;
  logicOpen: boolean;
  logicError: string | null;
  logicHintRevealed: boolean;
  /** The Lighthouse Lamp terminal: open, its last error, wrong runs so far, and whether the drone's tip shows. */
  lampOpen: boolean;
  lampError: string | null;
  lampTries: number;
  lampHintRevealed: boolean;
  /** Which bank challenge each chest asks this game. */
  picks: Picks;
  /** The per-game shuffle seed for options, tiles and labels. */
  seed: number;
  /** Earned chests, in earn order. */
  badges: ChestId[];
  /** Your answer text per earned chest, for the Codex. */
  answered: Partial<Record<ChestId, string>>;
  challenge: ChallengeState | null;
  /** Challenge ids whose hint is revealed. */
  hintsRevealed: string[];
  matcherRound: 0 | 1 | 2;
  matcherSolved: boolean;
  accessCode: string;
  /** Shared with the team. */
  archiveOpen: boolean;
  lighthouseLit: boolean;
  codexOpen: boolean;
  logs: string[];
  /** Total entries ever logged; gives each visible entry a stable identity. */
  logCount: number;
};

export type GameAction =
  | { type: "move"; dir: Direction }
  | { type: "tick" }
  | { type: "riverDamage" }
  | { type: "droneFollow" }
  | { type: "interact"; poi: PoiId }
  /** Board a boat at the dock you stand by (Peaks ↔ Foggaten Island). */
  | { type: "sail"; to: ZoneId }
  | { type: "closeInspection" }
  | { type: "openCipher" }
  | { type: "submitChallenge"; value: SubmitValue }
  | { type: "revealChallengeHint" }
  | { type: "closeChallenge" }
  | { type: "resetLogic" }
  | { type: "toggleCodex" }
  | { type: "submitLogic"; bits: Bits }
  | { type: "closeLogic" }
  | { type: "revealLogicHint" }
  | { type: "submitLamp"; bits: Bits8 }
  | { type: "closeLamp" }
  | { type: "resetLamp" }
  | { type: "revealLampHint" }
  | { type: "teamSync"; flags: TeamFlags; by: string }
  | { type: "note"; text: string }
  | { type: "respawn" };
