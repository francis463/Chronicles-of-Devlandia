import type { ChallengeTarget, ChestId, SubmitValue } from "../learn/types";
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
  | "terminal"
  | "archive"
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
  /** Which bank challenge each chest asks this game. */
  picks: Record<ChestId, 0 | 1 | 2>;
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
  | { type: "teamSync"; flags: TeamFlags; by: string }
  | { type: "note"; text: string }
  | { type: "respawn" };
