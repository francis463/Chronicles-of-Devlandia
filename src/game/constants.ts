import { HOLLOW_CACHE } from "./forestLore";
import type { Poi, Point } from "./types";

export const PLAYER_START: Point = { x: 28, y: 72 };
export const DRONE_START: Point = { x: 36, y: 70 };

export const STEP = 4;
export const BOUNDS = { minX: 6, maxX: 94, minY: 10, maxY: 90 };

export const POIS: Poi[] = [
  { id: "gate", label: "Terminal Gate", x: 50, y: 50 },
  { id: "river", label: "Frozen River", x: 54, y: 33 },
  { id: "tower", label: "Signal Tower", x: 14, y: 18 },
];
export const INTERACT_RADIUS = 13;
/** Buried in the south-east of Foggaten Island; not on the map until the scroll is decoded. */
export const HIDDEN_ARTIFACT: Poi = { id: "artifact", label: "Golden Semicolon", x: 86, y: 80 };
/** Dev Village's villager and its signpost by the exit to the Peaks. */
export const ADA: Poi = { id: "villager", label: "Ada", x: 34, y: 70 };
export const SIGNPOST: Poi = { id: "signpost", label: "Signpost", x: 86, y: 62 };
/** The Dense Forest's ranger, campfire, old oak and signpost (by the way back to the Peaks). */
export const RANGER: Poi = { id: "ranger", label: "Ranger", x: 60, y: 62 };
export const CAMPFIRE: Poi = { id: "campfire", label: "Campfire", x: 46, y: 66 };
/** The old oak, where the JavaScript chest is. */
export const OLD_OAK: Point = { x: 24, y: 50 };
export const FOREST_SIGNPOST: Poi = { id: "forest-signpost", label: "Signpost", x: 72, y: 89 };
/** The village's Syntax Terminal (it prints the Archive's access code) and the Archive (the C# chest is inside). */
export const TERMINAL: Poi = { id: "terminal", label: "Syntax Terminal", x: 68, y: 60 };
export const ARCHIVE: Poi = { id: "archive", label: "Archive", x: 55, y: 66 };
/** The Peaks' dock on the east shore, and Foggaten Island's: its dock, lighthouse, hermit, campfire and ruins. */
/** The Peaks: a signpost and a weather station on the east road, and the snow cave the signal tower's light reveals. */
export const PEAKS_SIGNPOST: Poi = { id: "peaks-signpost", label: "Signpost", x: 72.5, y: 60 };
export const WEATHER_STATION: Poi = { id: "weather-station", label: "Weather Station", x: 72, y: 81 };
export const SNOW_CAVE: Poi = { id: "snow-cave", label: "Snow Cave", x: 10.5, y: 44.5 };
export const DOCK: Poi = { id: "dock", label: "Dock", x: 92, y: 74 };
export const ISLAND_DOCK: Poi = { id: "island-dock", label: "Dock", x: 8, y: 62 };
export const LIGHTHOUSE: Poi = { id: "lighthouse", label: "Lighthouse", x: 50, y: 46 };
export const HERMIT: Poi = { id: "hermit", label: "Hermit", x: 68, y: 62 };
export const ISLAND_FIRE: Poi = { id: "island-fire", label: "Campfire", x: 44, y: 66 };
export const RUINS: Point = { x: 28, y: 50 };
/** The Sunbaked Desert: a signpost by the way back east, a nomad, an oasis and a pyramid far to the west. */
export const DESERT_SIGNPOST: Poi = { id: "desert-signpost", label: "Signpost", x: 84, y: 60 };
export const NOMAD: Poi = { id: "nomad", label: "Nomad", x: 62, y: 70 };
export const OASIS: Point = { x: 42, y: 52 };
/** Sunny Beach: a signpost by the way back west, a fisher, a pier into the sea and a shipwreck up the shore. */
export const BEACH_SIGNPOST: Poi = { id: "beach-signpost", label: "Signpost", x: 14, y: 58 };
/** The sandcastle on the Sunny Beach: a build-it-in-order puzzle. */
export const SANDCASTLE_POI: Poi = { id: "sandcastle", label: "Sandcastle", x: 58, y: 84 };
export const FISHER: Poi = { id: "fisher", label: "Fisher", x: 34, y: 72 };
export const BEACH_PIER: Point = { x: 90, y: 62 };
export const SHIPWRECK: Point = { x: 60, y: 30 };
export const DESERT_PYRAMID: Point = { x: 20, y: 34 };
/** Where you and the drone land after sailing: a few steps in from the other island's dock. */
export const SAIL_LANDING = { foggaten: { x: 24, y: 62 }, peaks: { x: 78, y: 74 } } as const;
export const RIVER_ZONE = { minX: 24, maxX: 76, minY: 28, maxY: 39 };

/** Five hearts, one HP each. */
export const MAX_HP = 5;
/** HP one piece of food restores (food is the only way to heal), and how long (ms) before you can pass another to a teammate. */
export const FOOD_HEAL = 1;
export const FOOD_COOLDOWN_MS = 10_000;
/** At or under this many HP the hearts pulse, the screen edges glow red and the log warns you once. */
export const LOW_HP = 2;
export const START_MINUTES = 19 * 60 + 29;
export const MINUTES_PER_DAY = 1440;
export const TICK_MS = 2000;
/** Every hint used adds this much to the time played (2 minutes). */
export const HINT_PENALTY_MS = 2 * 60_000;
export const TICK_MINUTES = 5;
export const RIVER_DAMAGE = 1;
/** HP lost for each wrong answer at a terminal or the lighthouse lamp. */
export const WRONG_DAMAGE = 1;
export const RIVER_DAMAGE_MS = 4500;
export const DRONE_DELAY_MS = 320;
export const DRONE_FOLLOW = 0.58;
export const LOG_LIMIT = 6;
export const TOUCH_REPEAT_MS = 150;

export const INITIAL_LOGS = [
  "Entered C++ Peaks.",
  "Drone link established.",
  "Objective: open the north gate, then survey the frozen river.",
];

export const LOG = {
  gate: "Gate terminal ready. Puzzle link found.",
  chestOpened: "Supply cache opened: +1 Repair Patch.",
  chestEmpty: "Supply cache already collected.",
  river: "River scan: unstable ice, thermal damage.",
  riverBridged: "River scan: bridge stable, crossing is safe.",
  questComplete: "Quest complete: Frozen River surveyed.",
  coldExposure: `Cold exposure: -${RIVER_DAMAGE} HP.`,
  gateUnlocked: "Gate unlocked. The way north is open.",
  revived: "Drone revived you in the Ski Lodge.",
  gateOpen: "Gate open. The way north is clear.",
  downed: "You are downed. Press Respawn.",
  scrollFound: "Found an encrypted scroll: QRAFR SBERFG",
  clueDecoded: "Clue decoded: the artifact is buried in the Dense Forest, south of camp.",
  artifactFound: "Artifact found: the Golden Semicolon!",
  tower: "Signal tower terminal ready. Logic lock found.",
  towerOnline: "Signal tower online. The beam holds.",
  towerPowered: "Signal tower online: the fog lifts and the bridge returns.",
  wallLocked: "The gate is locked. Solve its terminal to pass.",
  wallSolid: "The wall is solid here. Go through the gate.",
  enteredPeaks: "Entered C++ Peaks.",
  enteredVillage: "Entered Dev Village.",
  enteredForest: "Entered Dense Forest.",
  enteredBeach: "Entered Sunny Beach.",
  enteredLodge: "Entered the Ski Lodge.",
  enteredHall: "Entered the Hall of Fame.",
  hallLoading: "The Hall is waking up…",
  hallOffline: "Can't reach the leaderboard.",
  enteredDesert: "Entered the Sunbaked Desert.",
  enteredFoggaten: "Fog rolls over Foggaten Island. A lighthouse stands dark at the far end.",
  lampOpened: "Lighthouse terminal ready. Lamp lock found.",
  lampLit: "The lamp catches. The lighthouse beam sweeps the fog.",
  lighthouseOnline: "The lighthouse lamp burns bright. Its beam sweeps the fog, and something stirs far across the water.",
  sailOut: "You sail through the fog to Foggaten Island.",
  sailBack: "You sail back to the Peaks.",
  dockLocked: "The boatman waits for the gate to open",
  castleBuilt: "The sandcastle stands finished, a flag on its tallest tower.",
  finale: "All 11 badges earned: you are a Master of Devlandia!",
  foodReceived: (name: string) => `${name} gave you food. Eat it from your inventory.`,
  foodGiven: (name: string) => `You gave ${name} a piece of food.`,
  foodOffline: "The team connection is down: your food did not go out.",
  foodEmpty: "Wait a few seconds before you give more food.",
  foodNone: "You have no food to give.",
  ate: `You eat some food: +${FOOD_HEAL} HP.`,
  notHungry: "You are not hungry. Eat when you are hurt.",
  lowHp: "Low health! Eat or rest, or ask a teammate to share food.",
  wrongAnswer: `Wrong answer: -${WRONG_DAMAGE} HP.`,
  badge: (badge: string) => `Earned the ${badge} Badge.`,
  matcher: (code: string) => `Syntax Terminal: access code ${code}.`,
  archiveUnsealed: "Archive unsealed.",
  teammateBadge: (name: string, badge: string) => `${name} earned the ${badge} Badge.`,
  saveFailed: "Couldn't save your badge. It'll retry.",
  badgesPersonal: "Badges are personal: each explorer opens their own chest.",
};

/** The forest signpost's directions to everything nearby (the dig spot is added once the scroll is decoded). */
export const FOREST_DIRECTIONS = "RANGER and CAMPFIRE → Northwest, in the clearing. OLD OAK (the JavaScript chest) → Far west. SUNBAKED DESERT → Out the west gap. SUNNY BEACH → Out the east gap.";

/** The landmarks' cards. Ada's shows her current line (village.ts); chests, the terminal and the Archive are in cards.ts. */
export const INSPECT_COPY: Record<"gate" | "chest" | "river" | "tower" | "signpost" | "artifact" | "campfire" | "forest-signpost", { default: string; looted?: string; opened?: string; bridged?: string; powered?: string }> = {
  gate: {
    default: "A locked compiler gate in the north wall. Its terminal leads to the code puzzle.",
    opened: "The compiler gate stands open. The way north is clear.",
  },
  chest: {
    default: `${HOLLOW_CACHE.text} A sealed supply cache is wedged inside. Move closer and press [E] to open it.`,
    looted: "Cache recovered. Repair Patch added to inventory.",
  },
  river: {
    default: "Ice integrity: 42%. Exposure drains HP while crossing.",
    bridged: "The bridge spans the river. Crossing is safe now.",
  },
  tower: {
    default: "A dark signal tower. Its logic lock needs every line of the circuit to output 1.",
    powered: "The signal tower hums. Its beam keeps the fog away and holds the bridge.",
  },
  signpost: { default: "C++ PEAKS → East through the hedge: base camp, the north gate and the frozen river." },
  campfire: { default: "A campfire crackles in the clearing. Someone left it burning for the next explorer." },
  "forest-signpost": { default: "C++ PEAKS → North through the trees: base camp, the north gate and the frozen river." },
  artifact: { default: "The Golden Semicolon, Devlandia's lost line-ender. Every statement can finally be completed." },
};

export const PUZZLE_ANSWER = "block";

// Hidden artifact side quest: the Supply Cache holds a ROT13 scroll naming where it is buried.
export const SCROLL_CIPHERTEXT = "QRAFR SBERFG";
export const CIPHER_HINT = "Shift each letter 13 places: Q→D, R→E, A→N, F→S, S→F, B→O, E→R, G→T.";
export const LOGIC_HINT = "AND needs both inputs at 1. XOR needs exactly one. NOT flips the bit.";
export const cipherError = (value: string) => `Not quite: "${value}" is not what the scroll says.`;
export const PUZZLE_HINT = "\"Setting display to 'none' hides the object. Try 'block' instead!\"";
export const LAMP_HINT = "Each switch is worth a power of two: 128, 64, 32, 16, 8, 4, 2, 1. H is number 72 in the ASCII table: 64 + 8.";
export const PUZZLE_HINT_LOCKED = "Hint locked. Use a hint item to decode.";
export const puzzleError = (value: string) =>
  `Not quite: display: ${value} doesn't open this lock. Check the hint or try again.`;
