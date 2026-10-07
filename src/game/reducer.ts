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
  puzzleError,
} from "./constants";
import { clampPlayer, isInRiver } from "./geometry";
import { isCorrectAnswer, normalizeAnswer } from "./puzzle";
import type { Direction, GameAction, GameState, Point } from "./types";

export const initialState: GameState = {
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
  logs: INITIAL_LOGS,
};

export const isDowned = (s: GameState) => s.hp <= 0;

const DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function pushLog(state: GameState, message: string): GameState {
  return { ...state, logs: [...state.logs, message].slice(-LOG_LIMIT) };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "move": {
      if (isDowned(state) || state.terminalOpen) return state;
      const delta = DELTAS[action.dir];
      const player = clampPlayer({
        x: state.player.x + delta.x * STEP,
        y: state.player.y + delta.y * STEP,
      });
      const next = { ...state, player, stamina: Math.max(0, state.stamina - 1) };
      if (!state.questComplete && isInRiver(player)) {
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
    case "riverDamage":
      if (isDowned(state) || state.gateUnlocked || !isInRiver(state.player)) return state;
      return pushLog({ ...state, hp: Math.max(0, state.hp - RIVER_DAMAGE) }, LOG.coldExposure);
    case "droneFollow":
      return {
        ...state,
        drone: {
          x: state.drone.x + (state.player.x - state.drone.x) * DRONE_FOLLOW,
          y: state.drone.y + (state.player.y - state.drone.y) * DRONE_FOLLOW,
        },
      };
    case "interact": {
      if (isDowned(state)) return state;
      const inspected = { ...state, inspected: action.poi };
      if (action.poi === "gate") {
        return state.gateUnlocked
          ? pushLog(inspected, LOG.gateOpen)
          : pushLog({ ...inspected, terminalOpen: true }, LOG.gate);
      }
      if (action.poi === "chest") {
        return state.hasLoot
          ? pushLog(inspected, LOG.chestEmpty)
          : pushLog({ ...inspected, hasLoot: true }, LOG.chestOpened);
      }
      return pushLog(inspected, LOG.river);
    }
    case "closeInspection":
      return { ...state, inspected: null };
    case "closeTerminal":
      return { ...state, terminalOpen: false, puzzleError: null };
    case "submitCode":
      if (isCorrectAnswer(action.value)) {
        return pushLog(
          { ...state, gateUnlocked: true, terminalOpen: false, puzzleError: null },
          LOG.bridgeRestored,
        );
      }
      return { ...state, puzzleError: puzzleError(normalizeAnswer(action.value) || "(empty)") };
    case "revealHint":
      return { ...state, hintRevealed: true };
    case "respawn":
      return pushLog(
        { ...state, hp: MAX_HP, player: PLAYER_START, drone: DRONE_START, inspected: null },
        LOG.revived,
      );
  }
}
