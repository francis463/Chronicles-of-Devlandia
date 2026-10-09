import { advanceClock } from "./clock";
import {
  DRONE_FOLLOW,
  DRONE_START,
  INITIAL_LOGS,
  LOG,
  LOG_LIMIT,
  MAX_HP,
  MAX_STAMINA,
  PLAYER_START,
  RIVER_DAMAGE,
  STAMINA_REGEN,
  START_MINUTES,
  STEP,
  HIDDEN_ARTIFACT,
  cipherError,
  puzzleError,
} from "./constants";
import { clampPlayer, isInRiver } from "./geometry";
import { isCorrectAnswer, normalizeAnswer } from "./puzzle";
import { isCorrectDecode } from "./cipher";
import { circuitError } from "./logic";
import { flagsOf, mergeFlags, newlySet, teammateLog } from "./team";
import type { Direction, GameAction, GameState, Poi, Point } from "./types";
import { crossesWall, isNorthOfWall, wallBlock } from "./wall";
import { ZONES, arrival, exitFor } from "./zones";
import { adaLine } from "./village";

export const initialState: GameState = {
  zone: "peaks",
  player: PLAYER_START,
  drone: DRONE_START,
  hp: MAX_HP,
  stamina: MAX_STAMINA,
  minutes: START_MINUTES,
  inspected: null,
  questComplete: false,
  hasLoot: false,
  gateUnlocked: false,
  terminalOpen: false,
  puzzleError: null,
  hintRevealed: false,
  clueDecoded: false,
  artifactFound: false,
  cipherOpen: false,
  cipherError: null,
  cipherHintRevealed: false,
  towerPowered: false,
  logicOpen: false,
  logicError: null,
  logicHintRevealed: false,
  logs: INITIAL_LOGS,
  logCount: INITIAL_LOGS.length,
};

export const isDowned = (s: GameState) => s.hp <= 0;

/** True while any puzzle terminal (gate, scroll cipher, tower logic lock) is open. */
export const isModalOpen = (s: GameState) => s.terminalOpen || s.cipherOpen || s.logicOpen;

/** Hidden points of interest that are currently diggable: the artifact, after decoding, until found. */
/** What you can use in your zone: its places, plus the dig spot in the Peaks once revealed. */
export const visiblePois = (s: GameState): Poi[] => [...ZONES[s.zone].places, ...(s.zone === "peaks" ? revealedPois(s) : [])];

/** On the frozen river's ice, in a zone that has the river. */
export const inRiver = (s: GameState): boolean => ZONES[s.zone].river && isInRiver(s.player);

export const revealedPois = (s: GameState): Poi[] => (s.clueDecoded && !s.artifactFound ? [HIDDEN_ARTIFACT] : []);

const DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Adds a line unless it is already the newest one (bumping the wall again, or pressing on). */
function pushLogOnce(state: GameState, message: string): GameState {
  return state.logs.at(-1) === message ? state : pushLog(state, message);
}

function pushLog(state: GameState, message: string): GameState {
  return {
    ...state,
    logs: [...state.logs, message].slice(-LOG_LIMIT),
    logCount: state.logCount + 1,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "move": {
      if (isDowned(state) || isModalOpen(state)) return state;
      const delta = DELTAS[action.dir];
      const target = { x: state.player.x + delta.x * STEP, y: state.player.y + delta.y * STEP };
      const exit = exitFor(state.zone, state.player, target);
      if (exit) {
        return pushLog(
          { ...state, zone: exit.to, ...arrival(exit, state.player.y), inspected: null, stamina: Math.max(0, state.stamina - 1) },
          ZONES[exit.to].entered,
        );
      }
      const player = clampPlayer(target);
      const block = ZONES[state.zone].gate
        ? wallBlock(state.player, player, state.gateUnlocked)
        : crossesWall(state.player, player)
          ? "solid"
          : null;
      if (block) return pushLogOnce(state, block === "locked" ? LOG.wallLocked : LOG.wallSolid);
      const next = { ...state, player, stamina: Math.max(0, state.stamina - 1) };
      if (!state.questComplete && inRiver({ ...state, player })) {
        return pushLog({ ...next, questComplete: true }, LOG.questComplete);
      }
      return next;
    }
    case "tick":
      return {
        ...state,
        minutes: advanceClock(state.minutes),
        stamina: Math.min(MAX_STAMINA, state.stamina + STAMINA_REGEN),
      };
    case "riverDamage": {
      if (isDowned(state) || state.towerPowered || !inRiver(state)) return state;
      const hurt = pushLog({ ...state, hp: Math.max(0, state.hp - RIVER_DAMAGE) }, LOG.coldExposure);
      return isDowned(hurt) ? pushLog(hurt, LOG.downed) : hurt;
    }
    case "droneFollow":
      return {
        ...state,
        drone: {
          x: state.drone.x + (state.player.x - state.drone.x) * DRONE_FOLLOW,
          y: state.drone.y + (state.player.y - state.drone.y) * DRONE_FOLLOW,
        },
      };
    case "interact": {
      if (isDowned(state) || isModalOpen(state)) return state;
      // Only places in your zone answer (a crafted action, or a stale button after crossing, does nothing).
      if (!visiblePois(state).some((p) => p.id === action.poi)) return state;
      // The map's buttons work from anywhere, but the north landmarks wait for the gate.
      const north = action.poi === "tower" || action.poi === "chest" || action.poi === "river";
      if (north && !state.gateUnlocked && !isNorthOfWall(state.player)) {
        return pushLogOnce({ ...state, inspected: action.poi }, LOG.wallLocked);
      }
      if (action.poi === "artifact") {
        if (!state.clueDecoded || state.artifactFound) return state;
        return pushLog({ ...state, artifactFound: true, inspected: "artifact" }, LOG.artifactFound);
      }
      if (action.poi === "villager") return pushLogOnce({ ...state, inspected: "villager" }, `Ada: "${adaLine(state)}"`);
      if (action.poi === "signpost") return { ...state, inspected: "signpost" };
      const inspected = { ...state, inspected: action.poi };
      if (action.poi === "gate") {
        return state.gateUnlocked
          ? pushLog(inspected, LOG.gateOpen)
          : pushLog({ ...inspected, terminalOpen: true }, LOG.gate);
      }
      if (action.poi === "tower") {
        return state.towerPowered
          ? pushLog(inspected, LOG.towerOnline)
          : pushLog({ ...inspected, logicOpen: true }, LOG.tower);
      }
      if (action.poi === "chest") {
        return state.hasLoot
          ? pushLog(inspected, LOG.chestEmpty)
          : pushLog(pushLog({ ...inspected, hasLoot: true }, LOG.chestOpened), LOG.scrollFound);
      }
      if (action.poi === "river") return pushLog(inspected, state.towerPowered ? LOG.riverBridged : LOG.river);
      return state;
    }
    case "closeInspection":
      return { ...state, inspected: null };
    case "closeTerminal":
      return { ...state, terminalOpen: false, puzzleError: null };
    case "submitCode":
      if (isCorrectAnswer(action.value)) {
        return pushLog(
          { ...state, gateUnlocked: true, terminalOpen: false, puzzleError: null },
          LOG.gateUnlocked,
        );
      }
      return { ...state, puzzleError: puzzleError(normalizeAnswer(action.value) || "(empty)") };
    case "revealHint":
      return { ...state, hintRevealed: true };
    case "openCipher":
      if (!state.hasLoot || state.clueDecoded || isDowned(state) || isModalOpen(state)) return state;
      return { ...state, cipherOpen: true };
    case "closeCipher":
      return { ...state, cipherOpen: false, cipherError: null };
    case "submitCipher":
      if (isCorrectDecode(action.value)) {
        return pushLog({ ...state, clueDecoded: true, cipherOpen: false, cipherError: null }, LOG.clueDecoded);
      }
      return { ...state, cipherError: cipherError(action.value.trim() || "(empty)") };
    case "revealCipherHint":
      return { ...state, cipherHintRevealed: true };
    case "submitLogic": {
      const error = circuitError(action.bits);
      if (error) return { ...state, logicError: error };
      return pushLog({ ...state, towerPowered: true, logicOpen: false, logicError: null }, LOG.towerPowered);
    }
    case "closeLogic":
      return { ...state, logicOpen: false, logicError: null };
    case "revealLogicHint":
      return { ...state, logicHintRevealed: true };
    case "teamSync": {
      const before = flagsOf(state);
      const added = newlySet(before, mergeFlags(before, action.flags));
      if (added.length === 0) return state;
      const merged = { ...state, ...Object.fromEntries(added.map((k) => [k, true])) };
      return added.reduce((s, key) => pushLog(s, teammateLog(action.by, key)), merged);
    }
    case "note":
      return pushLog(state, action.text);
    case "respawn":
      return pushLog(
        { ...state, hp: MAX_HP, zone: "peaks", player: PLAYER_START, drone: DRONE_START, inspected: null },
        LOG.revived,
      );
  }
}
