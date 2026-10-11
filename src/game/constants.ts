import type { Poi, Point } from "./types";

export const PLAYER_START: Point = { x: 28, y: 72 };
export const DRONE_START: Point = { x: 36, y: 70 };

export const STEP = 4;
export const BOUNDS = { minX: 6, maxX: 94, minY: 10, maxY: 90 };

export const POIS: Poi[] = [
  { id: "gate", label: "Terminal Gate", x: 50, y: 50 },
  { id: "chest", label: "Supply Cache", x: 82, y: 18 },
  { id: "river", label: "Frozen River", x: 54, y: 33 },
  { id: "tower", label: "Signal Tower", x: 14, y: 18 },
];
export const INTERACT_RADIUS = 13;
/** Buried in the Dense Forest; not on the map until the scroll is decoded. */
export const HIDDEN_ARTIFACT: Poi = { id: "artifact", label: "Golden Semicolon", x: 86, y: 80 };
/** Dev Village's villager and its signpost by the exit to the Peaks. */
export const ADA: Poi = { id: "villager", label: "Ada", x: 34, y: 70 };
export const SIGNPOST: Poi = { id: "signpost", label: "Signpost", x: 86, y: 62 };
/** The Dense Forest's ranger, campfire, old oak and signpost (by the way back to the Peaks). */
export const RANGER: Poi = { id: "ranger", label: "Ranger", x: 60, y: 62 };
export const CAMPFIRE: Poi = { id: "campfire", label: "Campfire", x: 46, y: 66 };
export const OLD_OAK: Poi = { id: "old-oak", label: "Old Oak", x: 24, y: 50 };
export const FOREST_SIGNPOST: Poi = { id: "forest-signpost", label: "Signpost", x: 84, y: 26 };
/** The village's Syntax Terminal (it prints the Archive's access code) and the Archive (the C# chest is inside). */
export const TERMINAL: Poi = { id: "terminal", label: "Syntax Terminal", x: 68, y: 60 };
export const ARCHIVE: Poi = { id: "archive", label: "Archive", x: 55, y: 66 };
export const RIVER_ZONE = { minX: 24, maxX: 76, minY: 28, maxY: 39 };

export const MAX_HP = 100;
export const MAX_STAMINA = 100;
export const START_MINUTES = 19 * 60 + 29;
export const MINUTES_PER_DAY = 1440;
export const TICK_MS = 2000;
export const TICK_MINUTES = 5;
export const STAMINA_REGEN = 2;
export const RIVER_DAMAGE = 8;
export const RIVER_DAMAGE_MS = 1800;
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
  revived: "Drone revived you at base camp.",
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
  badge: (badge: string) => `Earned the ${badge} Badge.`,
  matcher: (code: string) => `Syntax Terminal: access code ${code}.`,
  archiveUnsealed: "Archive unsealed.",
  teammateBadge: (name: string, badge: string) => `${name} earned the ${badge} Badge.`,
  badgesPersonal: "Badges are personal: each explorer opens their own chest.",
};

/** The landmarks' cards. Ada's shows her current line (village.ts); chests, the terminal and the Archive are in cards.ts. */
export const INSPECT_COPY: Record<"gate" | "chest" | "river" | "tower" | "signpost" | "artifact" | "campfire" | "old-oak" | "forest-signpost", { default: string; looted?: string; opened?: string; bridged?: string; powered?: string }> = {
  gate: {
    default: "A locked compiler gate in the north wall. Its terminal leads to the code puzzle.",
    opened: "The compiler gate stands open. The way north is clear.",
  },
  chest: {
    default: "A sealed field cache. Move closer and press [E] to open.",
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
  "old-oak": { default: "An enormous old oak. Its bark is carved with a thousand tiny semicolons." },
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
export const PUZZLE_HINT_LOCKED = "Hint locked. Use a hint item to decode.";
export const puzzleError = (value: string) =>
  `Not quite: display: ${value} doesn't open this lock. Check the hint or try again.`;
