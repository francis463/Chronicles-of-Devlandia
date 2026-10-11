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
} from "./constants";
import { clampPlayer, isInRiver } from "./geometry";
import { circuitError } from "./logic";
import { accessCode } from "../learn/access";
import { ARCHIVE_LOCK } from "../learn/bank/builtin";
import { CHEST_IDS, CHESTS, chestById, type Picks } from "../learn/chests";
import { isCorrectBlank, matchWrongCount, normalize, wrongBlankCopy, wrongChoiceCopy, wrongMatchCopy } from "../learn/check";
import type { BlankChallenge, Challenge, ChallengeTarget, ChestId, SubmitValue } from "../learn/types";
import { challengeOf } from "./challenges";
import { flagsOf, mergeFlags, newlySet, teammateLog } from "./team";
import type { ChallengeState, Direction, GameAction, GameState, Poi, Point } from "./types";
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
  clueDecoded: false,
  artifactFound: false,
  towerPowered: false,
  logicOpen: false,
  logicError: null,
  logicHintRevealed: false,
  picks: Object.fromEntries(CHEST_IDS.map((id) => [id, 0])) as Picks,
  seed: 0,
  badges: [],
  answered: {},
  challenge: null,
  hintsRevealed: [],
  matcherRound: 0,
  matcherSolved: false,
  accessCode: accessCode(0),
  archiveOpen: false,
  codexOpen: false,
  logs: INITIAL_LOGS,
  logCount: INITIAL_LOGS.length,
};

export const isDowned = (s: GameState) => s.hp <= 0;

/** True while a challenge terminal, the tower's logic lock or the Codex is open: movement, time and hazards pause. */
export const isModalOpen = (s: GameState) => s.challenge !== null || s.logicOpen || s.codexOpen;

/** Hidden points of interest that are currently diggable: the artifact, after decoding, until found. */
/** What you can use in your zone: its places, plus the dig spot in the Peaks once revealed. */
export const visiblePois = (s: GameState): Poi[] => [...ZONES[s.zone].places, ...(s.zone === "peaks" ? revealedPois(s) : [])];

/** On the frozen river's ice, in a zone that has the river. */
export const inRiver = (s: GameState): boolean => ZONES[s.zone].river && isInRiver(s.player);

export const revealedPois = (s: GameState): Poi[] => (s.clueDecoded && !s.artifactFound ? [HIDDEN_ARTIFACT] : []);

const isNorthChest = (id: string) => CHESTS.some((c) => c.id === id && c.north);

/** What [E] can reach: your zone's places, minus north chests while you stand south of the locked wall. */
export const reachPlaces = (s: GameState): Poi[] =>
  s.gateUnlocked || isNorthOfWall(s.player) ? visiblePois(s) : visiblePois(s).filter((p) => !isNorthChest(p.id));

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

const opened = (target: ChallengeTarget): ChallengeState => ({ target, error: null, wrongTries: 0, solved: false, lastWrong: null });

const DRONE_NOTE = " The drone has a tip below.";

/** A wrong submission: one more try, the error (with the drone's note from the 2nd try on), and the hint once at 2. */
function missed(state: GameState, open: ChallengeState, c: Challenge, error: string, value: SubmitValue): GameState {
  const wrongTries = open.wrongTries + 1;
  const reveal = wrongTries >= 2 && !state.hintsRevealed.includes(c.id);
  return {
    ...state,
    hintsRevealed: reveal ? [...state.hintsRevealed, c.id] : state.hintsRevealed,
    challenge: {
      ...open,
      wrongTries,
      lastWrong: JSON.stringify(value),
      error: wrongTries >= 2 ? error + DRONE_NOTE : error,
    },
  };
}

const isChest = (id: string): id is ChestId => (CHEST_IDS as readonly string[]).includes(id);

/** Judges a value against a challenge: null when the value is of the wrong kind (a crafted action). */
function judge(c: Challenge, value: SubmitValue): { right: boolean; answer: string; error: string } | null {
  if (c.kind === "blank") {
    if (typeof value !== "string") return null;
    // The answer as accepted: trimmed, one trailing ';' dropped, single spaces, your case (the success view shows it in the code).
    return { right: isCorrectBlank(c, value), answer: normalize(value, true), error: wrongBlankCopy(value) };
  }
  if (c.kind === "choice") {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 3) return null;
    return { right: value === c.correct, answer: c.options[value], error: wrongChoiceCopy() };
  }
  if (!Array.isArray(value) || value.length !== c.pairs.length) return null;
  const wrong = matchWrongCount(c, value);
  return { right: wrong === 0, answer: "", error: wrongMatchCopy(wrong) };
}

/** A chest: a right answer earns its badge and shows the success view; a wrong one costs a try. */
function submitChest(state: GameState, open: ChallengeState, chest: ChestId, c: Challenge, value: SubmitValue): GameState {
  if (state.badges.includes(chest)) return state;
  const verdict = judge(c, value);
  if (!verdict) return state;
  if (!verdict.right) return missed(state, open, c, verdict.error, value);
  return pushLog(
    {
      ...state,
      badges: [...state.badges, chest],
      answered: { ...state.answered, [chest]: verdict.answer },
      challenge: { ...open, solved: true, error: null },
    },
    LOG.badge(chestById(chest).badge),
  );
}

/** The Syntax Matcher: a right pairing prints the access code and shows the success view. */
function submitMatcher(state: GameState, open: ChallengeState, c: Challenge, value: SubmitValue): GameState {
  const verdict = judge(c, value);
  if (!verdict || c.kind !== "match") return state;
  if (!verdict.right) return missed(state, open, c, verdict.error, value);
  return pushLog({ ...state, matcherSolved: true, challenge: { ...open, solved: true, error: null } }, LOG.matcher(state.accessCode));
}

/** The Archive's keypad: only a well-formed code is compared; the right one unseals the Archive for good. */
function submitKeypad(state: GameState, open: ChallengeState, value: SubmitValue): GameState {
  if (typeof value !== "string" || ARCHIVE_LOCK.live.kind !== "pattern") return state;
  const code = value.trim().toUpperCase();
  if (!ARCHIVE_LOCK.live.pattern.test(code)) return state;
  if (code !== state.accessCode) return missed(state, open, ARCHIVE_LOCK, ARCHIVE_LOCK.wrong!(code), value);
  return pushLog({ ...state, archiveOpen: true, challenge: null }, LOG.archiveUnsealed);
}

/** The gate and the cipher: their own effects and logs, closing on success. */
function submitBuiltIn(state: GameState, open: ChallengeState, c: BlankChallenge, value: string): GameState {
  const right = isCorrectBlank(c, value);
  if (open.target === "gate") {
    if (right) return pushLog({ ...state, gateUnlocked: true, challenge: null }, LOG.gateUnlocked);
    return missed(state, open, c, c.wrong!(normalize(value, false) || "(empty)"), value);
  }
  if (right) return pushLog({ ...state, clueDecoded: true, challenge: null }, LOG.clueDecoded);
  return missed(state, open, c, c.wrong!(value.trim() || "(empty)"), value);
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
          { ...state, zone: exit.to, ...arrival(exit, state.player), inspected: null, stamina: Math.max(0, state.stamina - 1) },
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
      if ((north || isNorthChest(action.poi)) && !state.gateUnlocked && !isNorthOfWall(state.player)) {
        return pushLogOnce({ ...state, inspected: action.poi }, LOG.wallLocked);
      }
      if (action.poi === "artifact") {
        if (!state.clueDecoded || state.artifactFound) return state;
        return pushLog({ ...state, artifactFound: true, inspected: "artifact" }, LOG.artifactFound);
      }
      if (action.poi === "villager") return pushLogOnce({ ...state, inspected: "villager" }, `Ada: "${adaLine(state)}"`);
      if (action.poi === "signpost") return { ...state, inspected: "signpost" };
      if (action.poi === "terminal") {
        // Once solved, the terminal shows its success view (the code) again, not a new round.
        return { ...state, inspected: "terminal", challenge: { ...opened("matcher"), solved: state.matcherSolved } };
      }
      if (action.poi === "archive") {
        // Sealed: the keypad. Open: the Archive is the C# chest.
        if (!state.archiveOpen) return { ...state, inspected: "archive", challenge: opened("archive") };
        return state.badges.includes("chest-cs")
          ? { ...state, inspected: "archive" }
          : { ...state, inspected: "archive", challenge: opened("chest-cs") };
      }
      if (isChest(action.poi)) {
        const chest = action.poi;
        return state.badges.includes(chest)
          ? { ...state, inspected: chest }
          : { ...state, inspected: chest, challenge: opened(chest) };
      }
      const inspected = { ...state, inspected: action.poi };
      if (action.poi === "gate") {
        return state.gateUnlocked
          ? pushLog(inspected, LOG.gateOpen)
          : pushLog({ ...inspected, challenge: opened("gate") }, LOG.gate);
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
    case "openCipher":
      if (!state.hasLoot || state.clueDecoded || isDowned(state) || isModalOpen(state)) return state;
      return { ...state, challenge: opened("cipher") };
    case "submitChallenge": {
      const open = state.challenge;
      if (!open || open.solved || JSON.stringify(action.value) === open.lastWrong) return state;
      const c = challengeOf(state, open.target);
      if ((open.target === "gate" || open.target === "cipher") && c.kind === "blank" && typeof action.value === "string") {
        return submitBuiltIn(state, open, c, action.value);
      }
      if (isChest(open.target)) return submitChest(state, open, open.target, c, action.value);
      if (open.target === "matcher") return submitMatcher(state, open, c, action.value);
      if (open.target === "archive") return submitKeypad(state, open, action.value);
      return state;
    }
    case "revealChallengeHint": {
      if (!state.challenge) return state;
      const id = challengeOf(state, state.challenge.target).id;
      return state.hintsRevealed.includes(id) ? state : { ...state, hintsRevealed: [...state.hintsRevealed, id] };
    }
    case "closeChallenge":
      return state.challenge ? { ...state, challenge: null } : state;
    case "resetLogic":
      return { ...state, logicError: null };
    case "toggleCodex":
      if (state.codexOpen) return { ...state, codexOpen: false };
      return state.challenge === null && !state.logicOpen ? { ...state, codexOpen: true } : state;
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
      // A teammate finished what your open terminal is for: it closes, and only their line is logged.
      const target = state.challenge?.target;
      const stale =
        (target === "gate" && merged.gateUnlocked) ||
        (target === "cipher" && merged.clueDecoded) ||
        (target === "archive" && merged.archiveOpen);
      const synced = stale ? { ...merged, challenge: null } : merged;
      return added.reduce((s, key) => pushLog(s, teammateLog(action.by, key)), synced);
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
