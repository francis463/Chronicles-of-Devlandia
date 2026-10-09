import type { Bits } from "./logic";
import type { TeamFlags } from "./team";
import type { ZoneId } from "./zones";

export type Point = { x: number; y: number };

export type PoiId = "gate" | "chest" | "river" | "tower" | "artifact";

export type Poi = { id: PoiId; label: string } & Point;

export type Direction = "up" | "down" | "left" | "right";

export type Phase = "Day" | "Dusk" | "Night";

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
  terminalOpen: boolean;
  puzzleError: string | null;
  hintRevealed: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  cipherOpen: boolean;
  cipherError: string | null;
  cipherHintRevealed: boolean;
  towerPowered: boolean;
  logicOpen: boolean;
  logicError: string | null;
  logicHintRevealed: boolean;
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
  | { type: "closeTerminal" }
  | { type: "submitCode"; value: string }
  | { type: "revealHint" }
  | { type: "openCipher" }
  | { type: "closeCipher" }
  | { type: "submitCipher"; value: string }
  | { type: "revealCipherHint" }
  | { type: "submitLogic"; bits: Bits }
  | { type: "closeLogic" }
  | { type: "revealLogicHint" }
  | { type: "teamSync"; flags: TeamFlags; by: string }
  | { type: "note"; text: string }
  | { type: "respawn" };
