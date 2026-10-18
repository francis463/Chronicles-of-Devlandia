import { advanceClock } from "./clock";
import {
  DRONE_FOLLOW,
  DRONE_START,
  INITIAL_LOGS,
  LOG,
  LOG_LIMIT,
  LOW_HP,
  MAX_HP,
  FOOD_HEAL,
  PLAYER_START,
  RIVER_DAMAGE,
  START_MINUTES,
  HIDDEN_ARTIFACT,
  WRONG_DAMAGE,
  DOCK,
  LIGHTHOUSE,
  SNOW_CAVE,
  ISLAND_DOCK,
  SAIL_LANDING,
  BOUNDS,
} from "./constants";
import { clampPlayer, distance, isInRiver } from "./geometry";
import { isBits8, lampError } from "./lamp";
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
import { ZONES, arrival, doorAt, exitFor, type ZoneId } from "./zones";
import { FISHER_LINE } from "./beach";
import { nomadSays } from "./desert";
import { reachFor, stepFor } from "./zoneSize";
import { REMEDIES, isRemedy, remedyPacked } from "./remedies";
import { KEEPER, LODGE_BOOK, SOUP, keeperSays } from "./lodge";
import { SECRETS, firstSentence, isSecret } from "./secrets";
import { DESERT_JARS, DESERT_LOG, DESERT_LORE, JAR_TIPS, isJar } from "./desertLore";
import { goToNote } from "../learn/codexModel";
import { rangerSays } from "./forest";
import { FOREST_LOG, FOREST_LORE, FOREST_MUSHROOMS, MUSHROOM_TIPS, isMushroom } from "./forestLore";
import { hermitLine } from "./island";
import { adaLine } from "./village";

export const initialState: GameState = {
  zone: "peaks",
  player: PLAYER_START,
  drone: DRONE_START,
  hp: MAX_HP,
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
  lampOpen: false,
  lampError: null,
  lampTries: 0,
  lampHintRevealed: false,
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
  lighthouseLit: false,
  mushrooms: [],
  rangerFed: false,
  jars: [],
  remedies: [],
  secrets: [],
  soupTaken: false,
  food: 0,
  nomadServed: false,
  sandcastleBuilt: false,
  codexOpen: false,
  bookOpen: false,
  finaleOpen: false,
  finaleSeen: false,
  hard: false,
  logs: INITIAL_LOGS,
  logCount: INITIAL_LOGS.length,
};

export const isDowned = (s: GameState) => s.hp <= 0;

/** True while a challenge terminal, the tower's logic lock or the Codex is open: movement, time and hazards pause. */
export const isModalOpen = (s: GameState) => s.challenge !== null || s.logicOpen || s.lampOpen || s.codexOpen || s.bookOpen || s.finaleOpen;

/** Hidden points of interest that are currently diggable: the artifact, after decoding, until found. */
/** What you can use in your zone: its places, plus the dig spot on Foggaten Island once revealed. */
export const visiblePois = (s: GameState): Poi[] => [
  // A glow mushroom is gone from the map once you have picked it.
  ...ZONES[s.zone].places.filter((p) => (!isMushroom(p.id) || !s.mushrooms.includes(p.id)) && (!isJar(p.id) || !s.jars.includes(p.id)) && (!isRemedy(p.id) || !s.remedies.includes(p.id))),
  ...(s.zone === "foggaten" ? revealedPois(s) : []),
  // The snow cave is hidden until the signal tower is powered (shared with the team).
  ...(s.zone === "peaks" && s.towerPowered ? [SNOW_CAVE] : []),
];

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
/** The log warns once, as your health falls to LOW_HP (not again until you have healed above it). */
function warnLow(before: GameState, after: GameState): GameState {
  return before.hp > LOW_HP && after.hp > 0 && after.hp <= LOW_HP ? pushLog(after, LOG.lowHp) : after;
}

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

/** The dock you can board a boat at in each zone, where it leads, and what the log says. */
const DOCKS: Partial<Record<ZoneId, { dock: Poi; to: keyof typeof SAIL_LANDING; line: string }>> = {
  peaks: { dock: DOCK, to: "foggaten", line: LOG.sailOut },
  foggaten: { dock: ISLAND_DOCK, to: "peaks", line: LOG.sailBack },
};

/** Sails to the other island: only from beside your zone's dock, never with a window open, and the Peaks' dock waits for the gate. */
function sail(state: GameState, to: ZoneId): GameState {
  const route = DOCKS[state.zone];
  if (!route || route.to !== to || isDowned(state) || isModalOpen(state)) return state;
  if (distance(state.player, route.dock) > reachFor(state.zone)) return state;
  if (state.zone === "peaks" && !state.gateUnlocked) return pushLogOnce(state, LOG.dockLocked);
  const landing = SAIL_LANDING[route.to];
  return pushLog({ ...state, zone: route.to, player: landing, drone: { x: landing.x - 4, y: landing.y }, inspected: null }, route.line);
}

const opened = (target: ChallengeTarget): ChallengeState => ({ target, error: null, wrongTries: 0, solved: false, lastWrong: null });

const DRONE_NOTE = " The drone has a tip below.";

/** A wrong submission: one more try, the error (with the drone's note from the 2nd try on), and the hint once at 2. */
function missed(state: GameState, open: ChallengeState, c: Challenge, error: string, value: SubmitValue): GameState {
  const wrongTries = open.wrongTries + 1;
  const reveal = wrongTries >= 2 && !state.hintsRevealed.includes(c.id);
  return wrongCost({
    ...state,
    hintsRevealed: reveal ? [...state.hintsRevealed, c.id] : state.hintsRevealed,
    challenge: {
      ...open,
      wrongTries,
      lastWrong: JSON.stringify(value),
      error: wrongTries >= 2 ? error + DRONE_NOTE : error,
    },
  });
}

/** Every wrong answer costs a heart; at 0 the terminal and the lamp close so you can respawn. */
function wrongCost(state: GameState): GameState {
  const hp = Math.max(0, state.hp - WRONG_DAMAGE);
  const out = hp === 0 ? { ...state, hp, challenge: null, lampOpen: false, logicOpen: false } : { ...state, hp };
  return warnLow(state, pushLog(out, LOG.wrongAnswer));
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
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= c.options.length) return null;
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
  const badges = [...state.badges, chest];
  const earned = pushLog(
    {
      ...state,
      badges,
      answered: { ...state.answered, [chest]: verdict.answer },
      challenge: { ...open, solved: true, error: null },
    },
    LOG.badge(chestById(chest).badge),
  );
  // The last badge: the finale opens once, when the chest's own success view is closed (see closeChallenge).
  return badges.length === CHEST_IDS.length && !state.finaleSeen ? pushLog(earned, LOG.finale) : earned;
}

/** The Syntax Matcher: a right pairing prints the access code and shows the success view. */
function submitMatcher(state: GameState, open: ChallengeState, c: Challenge, value: SubmitValue): GameState {
  const verdict = judge(c, value);
  if (!verdict || c.kind !== "match") return state;
  if (!verdict.right) return missed(state, open, c, verdict.error, value);
  return pushLog({ ...state, matcherSolved: true, challenge: { ...open, solved: true, error: null } }, LOG.matcher(state.accessCode));
}

/** The sandcastle: the right order finishes the castle (its flag goes up) and shows the success view. */
function submitSandcastle(state: GameState, open: ChallengeState, c: Challenge, value: SubmitValue): GameState {
  const verdict = judge(c, value);
  if (!verdict || c.kind !== "match") return state;
  if (!verdict.right) return missed(state, open, c, verdict.error, value);
  return pushLog({ ...state, sandcastleBuilt: true, challenge: { ...open, solved: true, error: null } }, LOG.castleBuilt);
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

/** Where the drone waits beside you after you arrive somewhere by a door: a little behind and below. */
const droneBeside = (p: Point): Point => ({ x: Math.max(BOUNDS.minX, p.x - 2), y: Math.min(BOUNDS.maxY, p.y + 2) });

/** A new game begins, and a respawn lands, inside the Ski Lodge just in from the Peaks door, by the fire (away from the mat). */
export const LODGE_START: Pick<GameState, "zone" | "player" | "drone"> = {
  zone: ZONES.peaks.doors[0].to,
  player: ZONES.peaks.doors[0].arrive,
  drone: droneBeside(ZONES.peaks.doors[0].arrive),
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "move": {
      if (isDowned(state) || isModalOpen(state)) return state;
      const delta = DELTAS[action.dir];
      const step = stepFor(state.zone);
      const target = { x: state.player.x + delta.x * step, y: state.player.y + delta.y * step };
      const exit = exitFor(state.zone, state.player, target);
      if (exit) {
        return pushLog(
          { ...state, zone: exit.to, ...arrival(exit, state.player), inspected: null },
          ZONES[exit.to].entered,
        );
      }
      const door = doorAt(state.zone, target);
      if (door) {
        return pushLog({ ...state, zone: door.to, player: door.arrive, drone: droneBeside(door.arrive), inspected: null }, ZONES[door.to].entered);
      }
      const player = clampPlayer(target);
      const zone = ZONES[state.zone];
      const block = !zone.wall
        ? null
        : zone.gate
          ? wallBlock(state.player, player, state.gateUnlocked)
          : crossesWall(state.player, player)
            ? "solid"
            : null;
      if (block) return pushLogOnce(state, block === "locked" ? LOG.wallLocked : LOG.wallSolid);
      const next = { ...state, player };
      if (!state.questComplete && inRiver({ ...state, player })) {
        return pushLog({ ...next, questComplete: true }, LOG.questComplete);
      }
      return next;
    }
    case "tick":
      return {
        ...state,
        minutes: advanceClock(state.minutes),
      };
    case "riverDamage": {
      if (isDowned(state) || state.towerPowered || !inRiver(state)) return state;
      const hurt = warnLow(state, pushLog({ ...state, hp: Math.max(0, state.hp - RIVER_DAMAGE) }, LOG.coldExposure));
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
    case "sail":
      return sail(state, action.to);
    case "interact": {
      if (isDowned(state) || isModalOpen(state)) return state;
      // Only places in your zone answer (a crafted action, or a stale button after crossing, does nothing).
      if (!visiblePois(state).some((p) => p.id === action.poi)) return state;
      // The map's buttons work from anywhere, but the north landmarks wait for the gate.
      const north = action.poi === "tower" || action.poi === "river";
      if ((north || isNorthChest(action.poi)) && !state.gateUnlocked && !isNorthOfWall(state.player)) {
        return pushLogOnce({ ...state, inspected: action.poi }, LOG.wallLocked);
      }
      if (action.poi === "artifact") {
        if (!state.clueDecoded || state.artifactFound) return state;
        return pushLog({ ...state, artifactFound: true, inspected: "artifact" }, LOG.artifactFound);
      }
      if (action.poi === "villager") return pushLogOnce({ ...state, inspected: "villager" }, `Ada: "${adaLine(state)}"`);
      if (action.poi === "dock" || action.poi === "island-dock") {
        const route = DOCKS[state.zone]!;
        // The map's dock button works from anywhere, but boarding needs you beside it.
        return distance(state.player, route.dock) > reachFor(state.zone) ? { ...state, inspected: action.poi } : sail(state, route.to);
      }
      if (action.poi === "hermit") return pushLogOnce({ ...state, inspected: "hermit" }, `Hermit: "${hermitLine(state)}"`);
      if (action.poi === "lighthouse") {
        if (state.lighthouseLit) return pushLog({ ...state, inspected: "lighthouse" }, LOG.lighthouseOnline);
        // The map's button works from anywhere; the lamp lock needs you beside the lighthouse.
        if (distance(state.player, LIGHTHOUSE) > reachFor(state.zone)) return { ...state, inspected: "lighthouse" };
        return pushLog({ ...state, inspected: "lighthouse", lampOpen: true, lampError: null, lampTries: 0, lampHintRevealed: false }, LOG.lampOpened);
      }
      if (action.poi === "lodge-book") {
        // The map's button works from anywhere; reading needs you beside the book.
        return distance(state.player, LODGE_BOOK) > reachFor(state.zone) ? { ...state, inspected: "lodge-book" } : { ...state, inspected: "lodge-book", bookOpen: true };
      }
      if (action.poi === "lodge-keeper") {
        const talked = pushLogOnce({ ...state, inspected: "lodge-keeper" }, `Keeper: "${keeperSays(state)}"`);
        // The map's button works from anywhere; the soup needs you beside her. Hard mode never offers it.
        if (state.hard || state.soupTaken || distance(state.player, KEEPER) > reachFor(state.zone)) return talked;
        return pushLog({ ...talked, soupTaken: true, food: state.food + 1 }, SOUP.served);
      }
      if (action.poi === "lodge-door" || action.poi === "lodge-fireplace") return { ...state, inspected: action.poi };
      if (action.poi === "fisher") return pushLogOnce({ ...state, inspected: "fisher" }, `Fisher: "${FISHER_LINE}"`);
      if (action.poi === "beach-signpost") return { ...state, inspected: action.poi };
      if (action.poi === "sandcastle") return state.sandcastleBuilt ? { ...state, inspected: "sandcastle" } : { ...state, inspected: "sandcastle", challenge: opened("sandcastle") };
      if (action.poi === "nomad") {
        const talked = pushLogOnce({ ...state, inspected: "nomad" }, `Nomad: "${nomadSays(state)}"`);
        // Three jars in hand: she shares the water, and she gives you food.
        return state.jars.length >= DESERT_JARS.length && !state.nomadServed ? pushLog({ ...talked, nomadServed: true, food: state.food + 1 }, DESERT_LOG.water) : talked;
      }
      if (isRemedy(action.poi)) {
        const remedy = REMEDIES.find((r) => r.id === action.poi)!;
        // The map's button works from anywhere; taking it needs you beside it. It goes into your bag as food.
        if (state.remedies.includes(remedy.id) || distance(state.player, remedy) > reachFor(state.zone)) return { ...state, inspected: remedy.id };
        return pushLog({ ...state, inspected: remedy.id, remedies: [...state.remedies, remedy.id], food: state.food + 1 }, remedyPacked(remedy.label));
      }
      if (isSecret(action.poi)) {
        const secret = SECRETS.find((x) => x.id === action.poi)!;
        // The map's button works from anywhere; a find needs you beside the spot, and counts once.
        if (state.secrets.includes(secret.id) || distance(state.player, secret) > reachFor(state.zone)) return { ...state, inspected: secret.id };
        return pushLog({ ...state, inspected: secret.id, secrets: [...state.secrets, secret.id] }, `Found ${secret.label}. ${firstSentence(secret.text)}`);
      }
      if (isJar(action.poi)) {
        const id = action.poi;
        const spot = DESERT_JARS.find((j) => j.id === id)!;
        // The map's button works from anywhere; picking up needs you beside the jar.
        if (state.jars.includes(id) || distance(state.player, spot) > reachFor(state.zone)) return { ...state, inspected: id };
        const jars = [...state.jars, id];
        return pushLog({ ...state, inspected: id, jars }, JAR_TIPS[jars.length - 1]);
      }
      if (DESERT_LORE.some((l) => l.id === action.poi)) return { ...state, inspected: action.poi };
      if (action.poi === "desert-signpost") return { ...state, inspected: action.poi };
      if (action.poi === "island-fire") return { ...state, inspected: action.poi };
      if (action.poi === "ranger") {
        const talked = pushLogOnce({ ...state, inspected: "ranger" }, `Ranger: "${rangerSays(state)}"`);
        // Three glow mushrooms in hand: she cooks them, and the stew goes into your bag as food.
        return state.mushrooms.length >= FOREST_MUSHROOMS.length && !state.rangerFed ? pushLog({ ...talked, rangerFed: true, food: state.food + 1 }, FOREST_LOG.stew) : talked;
      }
      if (isMushroom(action.poi)) {
        const id = action.poi;
        const spot = FOREST_MUSHROOMS.find((m) => m.id === id)!;
        // The map's button works from anywhere; picking needs you beside the mushroom.
        if (state.mushrooms.includes(id) || distance(state.player, spot) > reachFor(state.zone)) return { ...state, inspected: id };
        const mushrooms = [...state.mushrooms, id];
        return pushLog({ ...state, inspected: id, mushrooms }, MUSHROOM_TIPS[mushrooms.length - 1]);
      }
      if (FOREST_LORE.some((l) => l.id === action.poi)) return { ...state, inspected: action.poi };
      if (action.poi === "signpost" || action.poi === "peaks-signpost" || action.poi === "weather-station" || action.poi === "snow-cave" || action.poi === "campfire" || action.poi === "forest-signpost")
        return { ...state, inspected: action.poi };
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
      if (open.target === "sandcastle") return submitSandcastle(state, open, c, action.value);
      if (open.target === "archive") return submitKeypad(state, open, action.value);
      return state;
    }
    case "revealChallengeHint": {
      if (!state.challenge) return state;
      const id = challengeOf(state, state.challenge.target).id;
      return state.hintsRevealed.includes(id) ? state : { ...state, hintsRevealed: [...state.hintsRevealed, id] };
    }
    case "closeChallenge": {
      if (!state.challenge) return state;
      // Closing the last chest's success view opens the finale (once): the badge ends the quest of the chests.
      const finale = !state.finaleSeen && state.badges.length === CHEST_IDS.length && state.challenge.solved && isChest(state.challenge.target);
      return { ...state, challenge: null, ...(finale ? { finaleOpen: true, finaleSeen: true } : {}) };
    }
    case "openFinale":
      return state.badges.length === CHEST_IDS.length && state.challenge === null && !state.logicOpen && !state.lampOpen ? { ...state, codexOpen: false, finaleOpen: true } : state;
    case "closeFinale":
      return state.finaleOpen ? { ...state, finaleOpen: false } : state;
    case "resetLogic":
      return { ...state, logicError: null };
    case "toggleCodex":
      if (state.codexOpen) return { ...state, codexOpen: false };
      return state.challenge === null && !state.logicOpen && !state.lampOpen && !state.bookOpen ? { ...state, codexOpen: true } : state;
    case "toggleBook":
      return state.bookOpen ? { ...state, bookOpen: false } : state;
    case "goTo": {
      if (state.challenge !== null || state.logicOpen || state.lampOpen) return state;
      return pushLogOnce({ ...state, codexOpen: false }, goToNote(action.chest));
    }
    case "submitLogic": {
      const error = circuitError(action.bits);
      if (error) return wrongCost({ ...state, logicError: error });
      return pushLog({ ...state, towerPowered: true, logicOpen: false, logicError: null }, LOG.towerPowered);
    }
    case "closeLogic":
      return { ...state, logicOpen: false, logicError: null };
    case "revealLogicHint":
      return { ...state, logicHintRevealed: true };
    case "submitLamp": {
      if (!state.lampOpen || !isBits8(action.bits)) return state;
      const error = lampError(action.bits);
      if (!error) return pushLog({ ...state, lighthouseLit: true, lampOpen: false, lampError: null }, LOG.lampLit);
      const lampTries = state.lampTries + 1;
      return wrongCost({ ...state, lampTries, lampError: lampTries >= 2 ? error + DRONE_NOTE : error, lampHintRevealed: state.lampHintRevealed || lampTries >= 2 });
    }
    case "closeLamp":
      return { ...state, lampOpen: false, lampError: null };
    case "resetLamp":
      return { ...state, lampError: null };
    case "revealLampHint":
      return { ...state, lampHintRevealed: true };
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
      const closed = merged.lampOpen && merged.lighthouseLit ? { ...merged, lampOpen: false, lampError: null } : merged;
      const synced = stale ? { ...closed, challenge: null } : closed;
      return added.reduce((s, key) => pushLog(s, teammateLog(action.by, key)), synced);
    }
    case "note":
      return pushLog(state, action.text);
    case "eat": {
      if (isDowned(state) || state.food <= 0) return state;
      if (state.hp >= MAX_HP) return pushLogOnce(state, LOG.notHungry);
      return pushLog({ ...state, food: state.food - 1, hp: Math.min(MAX_HP, state.hp + FOOD_HEAL) }, LOG.ate);
    }
    case "receiveFood":
      return pushLog({ ...state, food: state.food + 1 }, LOG.foodReceived(action.from));
    case "giveFood":
      return state.food > 0 ? { ...state, food: state.food - 1 } : state;
    case "respawn":
      return pushLog(
        { ...state, ...LODGE_START, hp: 1, inspected: null },
        LOG.revived,
      );
  }
}
