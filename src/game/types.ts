export type Point = { x: number; y: number };

export type PoiId = "gate" | "chest" | "river";

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
  logs: string[];
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
  | { type: "respawn" };
