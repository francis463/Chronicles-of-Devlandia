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
  | "nomad"
  | "fisher"
  | "beach-signpost"
  | "desert-signpost"
  | "hunter-cabin"
  | "forest-well"
  | "forest-brook"
  | "fairy-ring"
  | "hollow-tree"
  | "sandcastle"
  | MushroomId
  | "caravan-camp"
  | "desert-well"
  | "temple-door"
  | "dry-riverbed"
  | "obelisk"
  | JarId
  | RemedyId
  | SecretId
  | "lodge-door"
  | "lodge-fireplace"
  | "lodge-keeper"
  | "lodge-book"
  | Exclude<ChestId, "chest-cs">;

/** The ranger's three lost glow mushrooms. */
export type MushroomId = "mushroom-1" | "mushroom-2" | "mushroom-3";

/** The healing finds: a herb in the forest, a cactus fruit in the desert and a cold drink on the beach. */
export type RemedyId = "remedy-herb" | "remedy-fruit" | "remedy-drink";

/** The six hidden spots: two in each of the forest, the desert and the beach. */
export type SecretId = "secret-moss" | "secret-den" | "secret-cave" | "secret-ridge" | "secret-pool" | "secret-bottle";

/** The nomad's three lost water jars. */
export type JarId = "jar-1" | "jar-2" | "jar-3";

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
  /** Which of the ranger's glow mushrooms you have picked, and whether she has cooked them. */
  mushrooms: MushroomId[];
  rangerFed: boolean;
  /** Which of the nomad's water jars you have picked up, and whether she has had her water. */
  jars: JarId[];
  /** Which healing finds you have used up (each heals once). */
  remedies: RemedyId[];
  /** The lodge keeper's soup has been served (once per game). */
  soupTaken: boolean;
  /** Pieces of food in your bag: healing finds and the keeper's soup. Eating one heals. */
  food: number;
  /** The hidden spots you have found (personal, not shared with the team). */
  secrets: SecretId[];
  nomadServed: boolean;
  /** The Sunny Beach's sandcastle puzzle, solved: the castle stands finished, with its flag. */
  sandcastleBuilt: boolean;
  codexOpen: boolean;
  /** The lodge's review book is open (a window, like the Codex). */
  bookOpen: boolean;
  /** The Master of Devlandia finale: open now, and whether it has been shown this game. */
  finaleOpen: boolean;
  finaleSeen: boolean;
  /** New Game+: questions come from each chest's harder half and a wrong answer costs HP. */
  hard: boolean;
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
  | { type: "toggleBook" }
  | { type: "eat" }
  | { type: "openFinale" }
  | { type: "closeFinale" }
  /** The Codex's "Go there": close it and log where the chest is. */
  | { type: "goTo"; chest: ChestId }
  | { type: "submitLogic"; bits: Bits }
  | { type: "closeLogic" }
  | { type: "revealLogicHint" }
  | { type: "submitLamp"; bits: Bits8 }
  | { type: "closeLamp" }
  | { type: "resetLamp" }
  | { type: "revealLampHint" }
  | { type: "teamSync"; flags: TeamFlags; by: string }
  | { type: "note"; text: string }
  /** A teammate shared water with you: it heals you a little (not when downed, and never past the maximum). */
  | { type: "shareWater"; from: string }
  | { type: "respawn" };
