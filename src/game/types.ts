export type Point = { x: number; y: number };

export type PoiId = "gate" | "chest" | "river" | "artifact";

export type Poi = { id: PoiId; label: string } & Point;

export type Direction = "up" | "down" | "left" | "right";

export type Phase = "Day" | "Dusk" | "Night";

export type GameState = {
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
  | { type: "respawn" };
