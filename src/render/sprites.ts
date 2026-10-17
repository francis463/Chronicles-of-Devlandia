import { CLASSES, type ClassId } from "../game/classes";
import type { Palette, PixelGrid } from "./pixels";
import { shade } from "./pixels";
import type { ArtPoint, Rect } from "./world";

// Pixel art, one string per row. "." is transparent and "o" is the 1 px outline. Explorer hoods use
// "h" (hood) and "H" (shade), filled in per player by explorerPalette.

export type Facing = "down" | "up" | "left" | "right";
export type SpriteId =
  | "explorer-down"
  | "explorer-up"
  | "explorer-right"
  | "drone"
  | "tower"
  | "chest-closed"
  | "chest-open"
  | "gate"
  | "wall"
  | "x-mark"
  | "semicolon"
  | "pine"
  | "tree"
  | "rock"
  | "bush"
  | "snow-rock"
  | "plank"
  | "hut"
  | "well"
  | "fence"
  | "signpost"
  | "code-chest"
  | "syntax-terminal"
  | "archive"
  | "campfire"
  | "old-oak"
  | "dock"
  | "lantern"
  | "pond"
  | "bench"
  | "fountain"
  | "windmill"
  | "fruit-tree"
  | "chicken"
  | "garden"
  | "stall"
  | "lighthouse"
  | "ruins";
/** bottom: bottom-centre on the art point; centre: centred on it; hover: centred 12 px above it. */
export type SpriteDef = { w: number; h: number; frames: PixelGrid[]; palette: Palette; anchor: "bottom" | "centre" | "hover" };
export type TextureId = "ice" | "mountains" | "snow" | "forest" | "meadow" | "path" | "bank" | "sand" | "sea";

export const OUTLINE = "#0b1020";

/** The old oak's 40 × 48 drawing: a round canopy lit from the top left over a flared trunk, outlined. */
function oakGrid(): PixelGrid {
  const W = 40;
  const H = 48;
  const canopy = (x: number, y: number) => ((x - 19.5) / 19.5) ** 2 + ((y - 17.5) / 17.5) ** 2 <= 1;
  const half = (y: number) => 4 + (y >= 43 ? y - 42 : 0);
  const trunk = (x: number, y: number) => y >= 34 && x >= 20 - half(y) && x <= 19 + half(y);
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && (canopy(x, y) || trunk(x, y));
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      if (!filled(x, y)) return ".";
      if (![filled(x - 1, y), filled(x + 1, y), filled(x, y - 1), filled(x, y + 1)].every(Boolean)) return "o";
      if (canopy(x, y)) {
        const v = x - 19.5 + (y - 17.5);
        if ((x * 7 + y * 13) % 11 === 0) return v < 0 ? "L" : "g";
        return v < -10 ? "L" : v < 8 ? "l" : "g";
      }
      return x < 20 ? "t" : "T";
    }).join(""),
  );
}

/** Outlines every edge cell of a filled shape: a cell with an empty (or off-grid) neighbour becomes "o". */
function outlined(w: number, h: number, kind: (x: number, y: number) => string | null): PixelGrid {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? kind(x, y) : null);
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const k = at(x, y);
      if (!k) return ".";
      return [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].every(Boolean) ? k : "o";
    }).join(""),
  );
}

/** The village pond: a rippling oval with reeds at two edges and a plank footbridge across it. */
function pondGrid(): PixelGrid {
  const inside = (x: number, y: number) => ((x - 23.5) / 23.5) ** 2 + ((y - 11.5) / 11.5) ** 2 <= 1;
  return outlined(48, 24, (x, y) => {
    if (!inside(x, y)) return null;
    if (y >= 10 && y <= 13) return x % 3 === 0 ? "P" : "p";
    if ((x === 6 || x === 7) && y >= 5 && y <= 9) return "e";
    if ((x === 40 || x === 41) && y >= 14 && y <= 19) return "e";
    if ((x + y * 3) % 11 === 0) return "l";
    return (x * 7 + y) % 9 === 0 ? "B" : "b";
  });
}

/** A park bench: a backrest over a plank seat on two legs. */
function benchGrid(): PixelGrid {
  return outlined(12, 8, (x, y) => {
    if (y <= 1) return "P";
    if (y <= 3) return "p";
    return [1, 2, 9, 10].includes(x) ? "k" : null;
  });
}

/** The fountain: a stone basin of water, a pillar and bowl, and spray that dances between two frames. */
function fountainGrid(frame: 0 | 1): PixelGrid {
  const spray = frame === 0 ? ["5,1", "10,1", "4,3", "11,3", "7,0"] : ["6,1", "9,1", "3,2", "12,2", "8,0"];
  const inBasin = (x: number, y: number, rx: number, ry: number) => ((x - 7.5) / rx) ** 2 + ((y - 12) / ry) ** 2 <= 1;
  return outlined(16, 16, (x, y) => {
    if (spray.includes(`${x},${y}`)) return "l";
    if (y >= 3 && y <= 4 && x >= 5 && x <= 10) return "s";
    if (y >= 5 && y <= 10 && (x === 7 || x === 8)) return "S";
    if (y >= 9 && inBasin(x, y, 7.5, 3.5)) return inBasin(x, y, 5.5, 1.8) ? "b" : "s";
    return null;
  });
}

/** The windmill: a tapering brick tower under a red cap, with four sails that turn between a + and an x. */
function windmillGrid(frame: 0 | 1): PixelGrid {
  const hub = { x: 20, y: 14 };
  const sail = (x: number, y: number) => {
    const dx = x - hub.x;
    const dy = y - hub.y;
    if (Math.hypot(dx, dy) > 13) return false;
    return frame === 0 ? Math.abs(dx) <= 1 || Math.abs(dy) <= 1 : Math.abs(dx - dy) <= 1 || Math.abs(dx + dy) <= 1;
  };
  return outlined(40, 48, (x, y) => {
    if (sail(x, y)) return dxy(x, y, hub) ? "C" : "c";
    if (y >= 10 && y <= 16 && Math.abs(x - hub.x) <= y - 9) return "R";
    if (y >= 17) {
      const half = 6 + Math.floor((y - 17) / 6);
      if (Math.abs(x - 19.5) > half) return null;
      if (y >= 42 && x >= 19 && x <= 21) return "d";
      if (y >= 27 && y <= 29 && x >= 19 && x <= 20) return "g";
      return y % 4 === 0 ? "W" : "w";
    }
    return null;
  });
}
const dxy = (x: number, y: number, hub: { x: number; y: number }) => x === hub.x && y === hub.y;

/** A fruit tree: a round canopy with red apples over a short trunk. */
function fruitTreeGrid(): PixelGrid {
  const apples = ["4,5", "10,4", "7,8", "12,9", "3,11", "9,12"];
  return outlined(16, 24, (x, y) => {
    if (y <= 15 && ((x - 7.5) / 7.5) ** 2 + ((y - 8) / 8) ** 2 <= 1) {
      if (apples.includes(`${x},${y}`)) return "a";
      return x + y < 9 ? "L" : x + y > 19 ? "G" : "g";
    }
    if (y >= 16 && y <= 22 && x >= 6 && x <= 9) return "t";
    if (y === 23 && x >= 5 && x <= 10) return "T";
    return null;
  });
}

/** A garden plot: rows of earth with green sprouts. */
function gardenGrid(): PixelGrid {
  return outlined(24, 10, (x, y) => {
    if (y % 3 === 1) return x % 4 === 2 ? "g" : x % 4 === 3 ? "G" : "s";
    return y % 3 === 0 ? "S" : "s";
  });
}

/** A market stall: a striped awning over two posts, a counter with a few apples, and legs. */
function stallGrid(): PixelGrid {
  const stripe = (x: number) => (Math.floor(x / 4) % 2 === 0 ? "R" : "w");
  return outlined(24, 20, (x, y) => {
    if (y <= 4) return stripe(x);
    if (y === 5) return x % 2 === 0 ? stripe(x) : null;
    if (y >= 6 && y <= 9) {
      if ([1, 2, 21, 22].includes(x)) return "p";
      return y === 9 && x >= 5 && x <= 18 && x % 3 === 0 ? "a" : null;
    }
    if (y >= 10 && y <= 12) return x >= 1 && x <= 22 ? (y === 10 ? "P" : "p") : null;
    if (y >= 13 && [2, 3, 20, 21].includes(x)) return "t";
    return null;
  });
}

/** The pier: a plank deck running out to sea (to the right) on three posts. */
function dockGrid(): PixelGrid {
  const post = (x: number) => [3, 12, 20].some((p) => Math.abs(x - p) <= 1);
  return outlined(24, 14, (x, y) => {
    if (y >= 3 && y <= 10) return y === 4 ? "l" : x % 4 === 0 ? "P" : "p";
    if (y >= 11 && post(x)) return "t";
    return null;
  });
}

/** The lighthouse: a banded tower on a gallery, with a cap and a lamp room that is dark glass, or warm lamplight when lit. */
function lighthouseGrid(lit = false): PixelGrid {
  const span = (half: number, x: number) => x >= 11 - half && x <= 10 + half;
  return outlined(22, 44, (x, y) => {
    if (y >= 1 && y <= 5) return span(y, x) ? "c" : null;
    if (y >= 6 && y <= 12) return x >= 7 && x <= 14 ? (lit ? "y" : "k") : null;
    if (y === 13) return span(7, x) ? "g" : null;
    if (y === 14) return span(6, x) ? "g" : null;
    if (y >= 15) {
      const half = 5 + Math.floor((y - 15) / 8);
      if (!span(half, x)) return null;
      if (y >= 38 && x >= 9 && x <= 12) return "d";
      const red = Math.floor((y - 15) / 6) % 2 === 1;
      const shade = x >= 11 + Math.floor(half / 2);
      return red ? (shade ? "R" : "r") : shade ? "W" : "w";
    }
    return null;
  });
}

/** Three broken pillars on a worn slab, with moss. */
function ruinsGrid(): PixelGrid {
  const pillars = [{ x: 2, h: 12 }, { x: 9, h: 8 }, { x: 16, h: 14 }];
  return outlined(22, 16, (x, y) => {
    if (y >= 14) return "s";
    for (const p of pillars) {
      if (x < p.x || x > p.x + 4 || y < 16 - p.h) continue;
      if (y === 16 - p.h && (x === p.x || x === p.x + 4)) continue;
      if ((x * 7 + y * 3) % 11 === 0) return "m";
      return x === p.x + 4 ? "S" : "s";
    }
    return null;
  });
}

/** Choppy water: two blues and a few light flecks. */
const seaGrid = (): PixelGrid =>
  Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => ((x + (y % 4) * 3) % 8 < 2 && y % 4 === 1 ? "f" : (x * 5 + y * 3) % 13 === 0 ? "d" : "b")).join(""),
  );

/** Warm sand with darker and lighter speckles. */
const sandGrid = (): PixelGrid =>
  Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => ((x * 7 + y * 11) % 17 === 0 ? "d" : (x * 3 + y * 5) % 19 === 0 ? "l" : "s")).join(""),
  );

export const SPRITES: Record<SpriteId, SpriteDef> = {
  "explorer-down": {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", s: "#f1c27d", e: "#0b1020", c: "#334155", C: "#1e293b" },
    frames: [
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhHHHHhho...",
        "..ohhHssssHhho..",
        "..ohHsessesHho..",
        "..ohHssssssHho..",
        "...oHHssssHHo...",
        "..occHHHHHHcco..",
        ".occchhhhhhccco.",
        ".osccccccccccso.",
        "..occcccccccco..",
        "..occCCCCCCcco..",
        "...occoooocco...",
        "....oo....oo....",
      ],
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhHHHHhho...",
        "..ohhHssssHhho..",
        "..ohHsessesHho..",
        "..ohHssssssHho..",
        "...oHHssssHHo...",
        "..occHHHHHHcco..",
        ".occchhhhhhccco.",
        ".osccccccccccso.",
        "..occcccccccco..",
        "..occCCCCCCcco..",
        "...occooooooo...",
        "....oo..........",
      ],
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhHHHHhho...",
        "..ohhHssssHhho..",
        "..ohHsessesHho..",
        "..ohHssssssHho..",
        "...oHHssssHHo...",
        "..occHHHHHHcco..",
        ".occchhhhhhccco.",
        ".osccccccccccso.",
        "..occcccccccco..",
        "..occCCCCCCcco..",
        "...ooooooocco...",
        "..........oo....",
      ],
    ],
  },
  "explorer-up": {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", s: "#f1c27d", e: "#0b1020", c: "#334155", C: "#1e293b" },
    frames: [
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhhhhhhho...",
        "..ohhhhhhhhhho..",
        "..ohhHHHHHHhho..",
        "..ohHHHHHHHHho..",
        "...oHHHHHHHHo...",
        "..occHHHHHHcco..",
        ".occcchhhhcccco.",
        ".osccccccccccso.",
        "..occcccccccco..",
        "..occCCCCCCcco..",
        "...occoooocco...",
        "....oo....oo....",
      ],
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhhhhhhho...",
        "..ohhhhhhhhhho..",
        "..ohhHHHHHHhho..",
        "..ohHHHHHHHHho..",
        "...oHHHHHHHHo...",
        "..occHHHHHHcco..",
        ".occcchhhhcccco.",
        ".osccccccccccso.",
        "..occcccccccco..",
        "..occCCCCCCcco..",
        "...occooooooo...",
        "....oo..........",
      ],
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhhhhhhho...",
        "..ohhhhhhhhhho..",
        "..ohhHHHHHHhho..",
        "..ohHHHHHHHHho..",
        "...oHHHHHHHHo...",
        "..occHHHHHHcco..",
        ".occcchhhhcccco.",
        ".osccccccccccso.",
        "..occcccccccco..",
        "..occCCCCCCcco..",
        "...ooooooocco...",
        "..........oo....",
      ],
    ],
  },
  "explorer-right": {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", s: "#f1c27d", e: "#0b1020", c: "#334155", C: "#1e293b" },
    frames: [
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhhhhHHho...",
        "..ohhhhHsssso...",
        "..ohhhhHsseso...",
        "..ohhhhHsssso...",
        "...ohhHHssso....",
        "...ocHHHHccoo...",
        "..occchhhcccco..",
        "..occccccccso...",
        "...occcccccco...",
        "...occCCCCcco...",
        "....occoocco....",
        ".....oo..oo.....",
      ],
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhhhhHHho...",
        "..ohhhhHsssso...",
        "..ohhhhHsseso...",
        "..ohhhhHsssso...",
        "...ohhHHssso....",
        "...ocHHHHccoo...",
        "..occchhhcccco..",
        "..occccccccso...",
        "...occcccccco...",
        "...occCCCCcco...",
        "...occoooocco...",
        "....oo....oo....",
      ],
      [
        "......oooo......",
        ".....ohhhho.....",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "...ohhhhhHHho...",
        "..ohhhhHsssso...",
        "..ohhhhHsseso...",
        "..ohhhhHsssso...",
        "...ohhHHssso....",
        "...ocHHHHccoo...",
        "..occchhhcccco..",
        "..occccccccso...",
        "...occcccccco...",
        "...occCCCCcco...",
        "....ooccccoo....",
        "......oooo......",
      ],
    ],
  },
  drone: {
    w: 12,
    h: 12,
    anchor: "hover",
    palette: { o: "#0b1020", p: "#cbd5e1", m: "#64748b", b: "#38bdf8", l: "#e0f2fe", k: "#0b1020" },
    frames: [
      [
        ".oooo..oooo.",
        "oppppooppppo",
        ".ommoooommo.",
        "..ooommooo..",
        "...obbbbo...",
        "..obbbbbbo..",
        ".obbllllbbo.",
        ".obblkklbbo.",
        ".obbllllbbo.",
        "..obbbbbbo..",
        "...oboobo...",
        "....o..o....",
      ],
      [
        "...oo..oo...",
        "..oppooppo..",
        ".ommoooommo.",
        "..ooommooo..",
        "...obbbbo...",
        "..obbbbbbo..",
        ".obbllllbbo.",
        ".obblkklbbo.",
        ".obbllllbbo.",
        "..obbbbbbo..",
        "...oboobo...",
        "....o..o....",
      ],
    ],
  },
  tower: {
    w: 16,
    h: 32,
    anchor: "bottom",
    palette: { m: "#94a3b8", M: "#475569", L: "#1e293b", k: "#64748b", K: "#334155" },
    frames: [
      [
        "................",
        "......MMMM......",
        "......MLLM......",
        "......MMMM......",
        ".......mm.......",
        ".......mm.......",
        "......mMMm......",
        "......m..m......",
        "......mmmm......",
        "......m..m......",
        ".....mMmmMm.....",
        ".....m....m.....",
        ".....mmmmmm.....",
        ".....m.mm.m.....",
        "....mMm..mMm....",
        "....m......m....",
        "....mmmmmmmm....",
        "....m.m..m.m....",
        "...mMm....mMm...",
        "...m........m...",
        "...mmmmmmmmmm...",
        "...m.m....m.m...",
        "..mMm......mMm..",
        "..m..........m..",
        "..mmmmmmmmmmmm..",
        "..m.m......m.m..",
        ".mMm........mMm.",
        ".m............m.",
        ".kkkkkkkkkkkkkk.",
        ".kKkkkkkkkkkkKk.",
        ".KKKKKKKKKKKKKK.",
        "................",
      ],
    ],
  },
  "chest-closed": {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", w: "#7c4a1e", W: "#9a5f2b", y: "#f59e0b", Y: "#fbbf24", d: "#1c1917" },
    frames: [
      [
        "................",
        "................",
        "................",
        "...oooooooooo...",
        "..owwwwwwwwwwo..",
        ".owWWWWWWWWWWwo.",
        ".owWyyyyyyyyWwo.",
        ".owwwwwwwwwwwwo.",
        ".owwwwwYYwwwwwo.",
        ".owWWWWYYWWWWwo.",
        ".owWWWWWWWWWWwo.",
        ".owyWWWWWWWWywo.",
        ".owWWWWWWWWWWwo.",
        ".owwwwwwwwwwwwo.",
        "..oooooooooooo..",
        "................",
      ],
    ],
  },
  "chest-open": {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", w: "#7c4a1e", W: "#9a5f2b", y: "#f59e0b", Y: "#fbbf24", d: "#1c1917" },
    frames: [
      [
        "...oooooooooo...",
        "..owwwwwwwwwwo..",
        ".owWWWWWWWWWWwo.",
        ".owWyyyyyyyyWwo.",
        ".owwwwwwwwwwwwo.",
        ".owddddddddddwo.",
        ".owddddddddddwo.",
        ".owwwwwwwwwwwwo.",
        ".owwwwwYYwwwwwo.",
        ".owWWWWYYWWWWwo.",
        ".owWWWWWWWWWWwo.",
        ".owyWWWWWWWWywo.",
        ".owWWWWWWWWWWwo.",
        ".owwwwwwwwwwwwo.",
        "..oooooooooooo..",
        "................",
      ],
    ],
  },
  gate: {
    w: 32,
    h: 16,
    anchor: "bottom",
    palette: { S: "#475569", s: "#94a3b8", t: "#1e293b", g: "#22c55e", G: "#4ade80", K: "#334155", c: "#e2e8f0", w: "#64748b", b: "#1e293b" },
    // Frame 0: open archway. Frame 1: locked, iron bars across the opening. Columns 0 and 31 carry
    // the wall's brick pattern on (art x 144 and 175 are the wall sprite's columns 0 and 15).
    frames: [
      [
        "................................",
        ".SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.",
        ".SssssssssssssssssssssssssssssS.",
        ".SsSSSSSSSSSSSSSSSSSSSSSSSSSSsS.",
        ".SssS....................SssssS.",
        "cSssS....................SttttSc",
        "sSssS....................StgGtSs",
        "wSsSS....................StggtSS",
        "wSssS....................SttttSS",
        "SSssS....................SssssSS",
        "wSsSS....................SSsssSw",
        "wSssS....................SssssSw",
        "SSssS....................SssssSS",
        "wSSSS....................SSSSSSS",
        "KKKKK....................KKKKKKK",
        "................................",
      ],
      [
        "................................",
        ".SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.",
        ".SssssssssssssssssssssssssssssS.",
        ".SsSSSSSSSSSSSSSSSSSSSSSSSSSSsS.",
        ".SssSwb.wb.wb.wb.wb.wb.wbSssssS.",
        "cSssSwb.wb.wb.wb.wb.wb.wbSttttSc",
        "sSssSwb.wb.wb.wb.wb.wb.wbStgGtSs",
        "wSsSSwb.wb.wb.wb.wb.wb.wbStggtSS",
        "wSssSbbbbbbbbbbbbbbbbbbbbSttttSS",
        "SSssSwb.wb.wb.wb.wb.wb.wbSssssSS",
        "wSsSSwb.wb.wb.wb.wb.wb.wbSSsssSw",
        "wSssSwb.wb.wb.wb.wb.wb.wbSssssSw",
        "SSssSwb.wb.wb.wb.wb.wb.wbSssssSS",
        "wSSSSwb.wb.wb.wb.wb.wb.wbSSSSSSS",
        "KKKKK....................KKKKKKK",
        "................................",
      ],
    ],
  },
  wall: {
    w: 16,
    h: 10,
    anchor: "bottom",
    palette: { c: "#e2e8f0", h: "#94a3b8", S: "#64748b", m: "#475569", K: "#334155" },
    frames: [
      [
        "cccccccccccccccc",
        "hhhhhhhhhhhhhhhh",
        "SSSSSSSmSSSSSSSm",
        "SSSSSSSmSSSSSSSm",
        "mmmmmmmmmmmmmmmm",
        "SSSmSSSSSSSmSSSS",
        "SSSmSSSSSSSmSSSS",
        "mmmmmmmmmmmmmmmm",
        "SSSSSSSmSSSSSSSm",
        "KKKKKKKKKKKKKKKK",
      ],
    ],
  },
  "x-mark": {
    w: 8,
    h: 8,
    anchor: "centre",
    palette: { o: "#0b1020", r: "#dc2626" },
    frames: [
      [
        ".oo..oo.",
        "orroorro",
        ".orrrro.",
        "..orro..",
        ".orrrro.",
        "orroorro",
        ".oo..oo.",
        "........",
      ],
    ],
  },
  semicolon: {
    w: 8,
    h: 12,
    anchor: "bottom",
    palette: { o: "#0b1020", y: "#f59e0b", Y: "#fde68a" },
    frames: [
      [
        "...oo...",
        "..oyyo..",
        ".oyYYyo.",
        ".oyYYyo.",
        "..oyyo..",
        "...oo...",
        "..oyyo..",
        ".oyYYyo.",
        ".oyYYyo.",
        "..oyyo..",
        ".oyyo...",
        "..oo....",
      ],
    ],
  },
  pine: {
    w: 16,
    h: 20,
    anchor: "bottom",
    palette: { o: "#0b1020", n: "#f1f5f9", N: "#ffffff", g: "#166534", G: "#14532d", t: "#6b4423", T: "#4a2f18" },
    frames: [
      [
        ".......oo.......",
        "......onno......",
        ".....onNNno.....",
        "....onNNNNno....",
        ".....oggggo.....",
        "....ogGggGgo....",
        "...ogGGggGGgo...",
        "....onnnnnno....",
        "...oggggggggo...",
        "..ogGggggggGgo..",
        ".ogGGGggggGGGgo.",
        "..onnnnnnnnnno..",
        "..oggggggggggo..",
        ".ogGggggggggggo.",
        "ogGGgggggggggGgo",
        ".onnnnnnnnnnnno.",
        "..oooottttoooo..",
        ".....otTTto.....",
        ".....otttto.....",
        "......oooo......",
      ],
    ],
  },
  tree: {
    w: 16,
    h: 18,
    anchor: "bottom",
    palette: { o: "#0b1020", g: "#1f7a3a", G: "#14532d", L: "#2f9e4f", t: "#6b4423", T: "#4a2f18" },
    frames: [
      [
        ".....oooooo.....",
        "....oggggggo....",
        "...ogGggggGgo...",
        "..ogGggLLggGgo..",
        ".ogGgLLLLgggggo.",
        ".oggLLLgggggggo.",
        "ogggggggggggGggo",
        "ogGgggggggggGGgo",
        "ogGGgggggggGGggo",
        ".ogGGgggggGGggo.",
        ".oggGGGGGGGgggo.",
        "..ogggggggggggo.",
        "...oggggggggoo..",
        "....oottttoo....",
        ".....otTTto.....",
        ".....otttto.....",
        "....otttttto....",
        ".....oooooo.....",
      ],
    ],
  },
  rock: {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", r: "#64748b", R: "#94a3b8", D: "#475569" },
    frames: [
      [
        "................",
        "................",
        "................",
        "................",
        "......oooo......",
        "....oorrrroo....",
        "...orrRRRRrro...",
        "..orRRRrrrRRro..",
        ".orRRrrrrrrRRro.",
        ".orRrrrrrrrrRro.",
        ".orrrrrrrrrrDro.",
        ".orrrrrrrrrDDro.",
        "..orrrrrrDDDro..",
        "...orrrrrrrro...",
        "....oooooooo....",
        "................",
      ],
    ],
  },
  bush: {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", g: "#2f7d3a", G: "#1e5a2a", L: "#4caf50" },
    frames: [
      [
        "................",
        "................",
        "................",
        "................",
        "................",
        ".....oo..oo.....",
        "....oggooggo....",
        "...ogLLggLLgo...",
        "..ogLLggggLLgo..",
        ".oggLgggggggggo.",
        ".ogggggggggGggo.",
        ".oggggggggGGggo.",
        "..ogggggGGGggo..",
        "...oggggggggo...",
        "....oooooooo....",
        "................",
      ],
    ],
  },
  "snow-rock": {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", r: "#64748b", R: "#94a3b8", D: "#475569", n: "#e2e8f0", N: "#ffffff" },
    frames: [
      [
        "................",
        "................",
        "................",
        "................",
        "......oooo......",
        "....oonnnnoo....",
        "...onnNNNNnno...",
        "..onNNNnnnNNno..",
        ".ornnnnnnnnnnro.",
        ".orRrrrrrrrrRro.",
        ".orrrrrrrrrrDro.",
        ".orrrrrrrrrDDro.",
        "..orrrrrrDDDro..",
        "...orrrrrrrro...",
        "....oooooooo....",
        "................",
      ],
    ],
  },
  plank: {
    w: 26,
    h: 3,
    anchor: "bottom",
    palette: { p: "#4a2f18", w: "#b07a45", W: "#8f5f33", d: "#3a2412" },
    frames: [
      [
        "pwwwwwwwwwwwwwwwwwwwwwwwwp",
        "pWWWWWWWWWWWWWWWWWWWWWWWWp",
        "pddddddddddddddddddddddddp",
      ],
    ],
  },
  hut: {
    w: 32,
    h: 24,
    anchor: "bottom",
    palette: { o: "#0b1020", R: "#c2410c", r: "#9a3412", w: "#d6b98c", W: "#b08d5e", d: "#5b3a1e", D: "#fbbf24", g: "#fde68a", k: "#64748b" },
    frames: [
      [
        "..............oooo..............",
        "............ooRRRRoo............",
        "..........ooRRrrrrRRoo..........",
        "........ooRRrrrrrrrrRRoo........",
        "......ooRRrrrrrrrrrrrrRRoo......",
        "....ooRRrrrrrrrrrrrrrrrrRRoo....",
        "..ooRRrrrrrrrrrrrrrrrrrrrrRRoo..",
        "ooRRrrrrrrrrrrrrrrrrrrrrrrrrRRoo",
        "oooooooooooooooooooooooooooooooo",
        "..owwwwwwwwwwwwwwwwwwwwwwwwwwo..",
        "..owwoooowwwwoooooowwwwoooowwo..",
        "..owwoggowwwwoddddowwwwoggowwo..",
        "..owwoggowwwwoddddowwwwoggowwo..",
        "..owwoooowwwwodddDowwwwoooowwo..",
        "..owwwwwwwwwwoddddowwwwwwwwwwo..",
        "..oWWWWWWWWWWoddddoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoddddoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoddddoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoddddoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoddddoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoddddoWWWWWWWWWWo..",
        ".okkkkkkkkkkkkkkkkkkkkkkkkkkkko.",
        ".okkkkkkkkkkkkkkkkkkkkkkkkkkkko.",
        "..oooooooooooooooooooooooooooo..",
      ],
    ],
  },
  "code-chest": {
    w: 16,
    h: 16,
    anchor: "bottom",
    // Teal and deep blue, so it never reads as the amber Supply Cache.
    palette: { o: "#0b1020", t: "#2dd4bf", b: "#1e3a8a", s: "#94a3b8", l: "#99f6e4" },
    frames: [
      [
        "................",
        "................",
        "................",
        "................",
        "....oooooooo....",
        "...otttttttto...",
        "..otttttttttto..",
        "..obbbbbbbbbbo..",
        ".oooooooooooooo.",
        ".obbbbbssbbbbbo.",
        ".obbbbsoosbbbbo.",
        ".otttttssttttto.",
        ".obbbbbbbbbbbbo.",
        ".osbbbbbbbbbbso.",
        ".obbbbbbbbbbbbo.",
        ".oooooooooooooo.",
      ],
      [
        "................",
        "...oooooooooo...",
        "..obbbbbbbbbbo..",
        "..otttttttttto..",
        "..otttttttttto..",
        "..oooooooooooo..",
        ".oooooooooooooo.",
        ".ollllllllllllo.",
        ".ollllllllllllo.",
        ".oooooooooooooo.",
        ".obbbbbssbbbbbo.",
        ".otttttssttttto.",
        ".obbbbbbbbbbbbo.",
        ".osbbbbbbbbbbso.",
        ".obbbbbbbbbbbbo.",
        ".oooooooooooooo.",
      ],
    ],
  },
  "syntax-terminal": {
    w: 16,
    h: 24,
    anchor: "bottom",
    // Red screen until the Matcher is solved, green after.
    palette: { o: "#0b1020", k: "#334155", s: "#94a3b8", d: "#0b1020", r: "#ef4444", g: "#22c55e" },
    frames: [
      [
        "................",
        ".oooooooooooooo.",
        "okkkkkkkkkkkkkko",
        "okrrrrrrrrrrrrko",
        "okrrrdrrrrdrrrko",
        "okrrrrdrrdrrrrko",
        "okrrrrrddrrrrrko",
        "okrrrrrddrrrrrko",
        "okrrrrdrrdrrrrko",
        "okrrrdrrrrdrrrko",
        "okrrrrrrrrrrrrko",
        "okkkkkkkkkkkkkko",
        ".oooooooooooooo.",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "...osssssssso...",
        "...oooooooooo...",
      ],
      [
        "................",
        ".oooooooooooooo.",
        "okkkkkkkkkkkkkko",
        "okggggggggggggko",
        "okggggggggggdgko",
        "okgggggggggdggko",
        "okggggggggdgggko",
        "okgdgggggdggggko",
        "okggdgggdgggggko",
        "okgggdgdggggggko",
        "okggggdgggggggko",
        "okkkkkkkkkkkkkko",
        ".oooooooooooooo.",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "......osso......",
        "...osssssssso...",
        "...oooooooooo...",
      ],
    ],
  },
  archive: {
    w: 32,
    h: 24,
    anchor: "bottom",
    // The hut, its door chained with a padlock (sealed) or a dark open doorway.
    palette: { o: "#0b1020", R: "#c2410c", r: "#9a3412", w: "#d6b98c", W: "#b08d5e", d: "#5b3a1e", D: "#fbbf24", g: "#fde68a", k: "#64748b", c: "#94a3b8", L: "#e2e8f0", x: "#111827" },
    frames: [
      [
        "..............oooo..............",
        "............ooRRRRoo............",
        "..........ooRRrrrrRRoo..........",
        "........ooRRrrrrrrrrRRoo........",
        "......ooRRrrrrrrrrrrrrRRoo......",
        "....ooRRrrrrrrrrrrrrrrrrRRoo....",
        "..ooRRrrrrrrrrrrrrrrrrrrrrRRoo..",
        "ooRRrrrrrrrrrrrrrrrrrrrrrrrrRRoo",
        "oooooooooooooooooooooooooooooooo",
        "..owwwwwwwwwwwwwwwwwwwwwwwwwwo..",
        "..owwoooowwwwoooooowwwwoooowwo..",
        "..owwoggowwwwoddddowwwwoggowwo..",
        "..owwoggowwwwocddcowwwwoggowwo..",
        "..owwoooowwwwodccdowwwwoooowwo..",
        "..owwwwwwwwwwodLLdowwwwwwwwwwo..",
        "..oWWWWWWWWWWoLLLLoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoLkkLoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoLLLLoWWWWWWWWWWo..",
        "..oWWWWWWWWWWodccdoWWWWWWWWWWo..",
        "..oWWWWWWWWWWocddcoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoddddoWWWWWWWWWWo..",
        ".okkkkkkkkkkkkkkkkkkkkkkkkkkkko.",
        ".okkkkkkkkkkkkkkkkkkkkkkkkkkkko.",
        "..oooooooooooooooooooooooooooo..",
      ],
      [
        "..............oooo..............",
        "............ooRRRRoo............",
        "..........ooRRrrrrRRoo..........",
        "........ooRRrrrrrrrrRRoo........",
        "......ooRRrrrrrrrrrrrrRRoo......",
        "....ooRRrrrrrrrrrrrrrrrrRRoo....",
        "..ooRRrrrrrrrrrrrrrrrrrrrrRRoo..",
        "ooRRrrrrrrrrrrrrrrrrrrrrrrrrRRoo",
        "oooooooooooooooooooooooooooooooo",
        "..owwwwwwwwwwwwwwwwwwwwwwwwwwo..",
        "..owwoooowwwwoooooowwwwoooowwo..",
        "..owwoggowwwwoxxxxowwwwoggowwo..",
        "..owwoggowwwwoxxxxowwwwoggowwo..",
        "..owwoooowwwwoxxxxowwwwoooowwo..",
        "..owwwwwwwwwwoxxxxowwwwwwwwwwo..",
        "..oWWWWWWWWWWoxxxxoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoxxxxoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoxxxxoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoxxxxoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoxxxxoWWWWWWWWWWo..",
        "..oWWWWWWWWWWoxxxxoWWWWWWWWWWo..",
        ".okkkkkkkkkkkkkkkkkkkkkkkkkkkko.",
        ".okkkkkkkkkkkkkkkkkkkkkkkkkkkko.",
        "..oooooooooooooooooooooooooooo..",
      ],
    ],
  },
  well: {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", T: "#9a5f2b", t: "#7c4a1e", s: "#94a3b8", S: "#64748b", b: "#38bdf8", B: "#0369a1" },
    frames: [
      [
        "................",
        "...oooooooooo...",
        "..oTTTTTTTTTTo..",
        ".oTTTTTTTTTTTTo.",
        ".oooooooooooooo.",
        "...ot......to...",
        "...ot......to...",
        "...ot..oo..to...",
        "...ot..oo..to...",
        "..oooooooooooo..",
        ".oBbbbbbbbbbbBo.",
        ".osssssssssssso.",
        ".oSsSsSsSsSsSso.",
        ".osssssssssssso.",
        ".oSSSSSSSSSSSSo.",
        "..oooooooooooo..",
      ],
    ],
  },
  fence: {
    w: 16,
    h: 8,
    anchor: "bottom",
    palette: { o: "#0b1020", f: "#b07a45", F: "#8f5f33" },
    frames: [
      [
        "...oo......oo...",
        "..offo....offo..",
        "oooffooooooffooo",
        "fffFFffffffFFfff",
        "oooffooooooffooo",
        "..offo....offo..",
        "..oFFo....oFFo..",
        "..oooo....oooo..",
      ],
    ],
  },
  signpost: {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", b: "#d6b98c", B: "#b08d5e", a: "#334155", p: "#7c4a1e", P: "#9a5f2b" },
    frames: [
      [
        "................",
        "................",
        ".oooooooooooo...",
        ".obbbbbbbbbbbo..",
        ".obbbbbbbbabbbo.",
        ".obaaaaaaaaabbbo",
        ".obbbbbbbbabbbo.",
        ".oBBBBBBBBBBBo..",
        ".oooooooooooo...",
        "......opo.......",
        "......oPo.......",
        "......opo.......",
        "......oPo.......",
        "......opo.......",
        "......oPo.......",
        ".....ooooo......",
      ],
    ],
  },
  campfire: {
    w: 12,
    h: 14,
    anchor: "bottom",
    palette: { o: "#0b1020", r: "#451a03", b: "#78350f", f: "#ea580c", y: "#fbbf24", w: "#fde68a" },
    frames: [
      [
        "............",
        ".....o......",
        "....ofo.....",
        "....offo....",
        "...ofyfo....",
        "...ofyyfo...",
        "..ofyyyyfo..",
        "..ofyywyfo..",
        "..ofyywyfo..",
        "...offyffo..",
        "..oobbbbboo.",
        ".obbrbbrbbbo",
        "obbrrbbrrbbo",
        ".oooooooooo.",
      ],
      [
        "............",
        "......o.....",
        ".....ofo....",
        "....offo....",
        "....ofyfo...",
        "...ofyyfo...",
        "..ofyyyyfo..",
        "..ofywyyfo..",
        "..ofywyyfo..",
        "..offyyffo..",
        "..oobbbbboo.",
        ".obbrbbrbbbo",
        "obbrrbbrrbbo",
        ".oooooooooo.",
      ],
    ],
  },
  "old-oak": {
    w: 40,
    h: 48,
    anchor: "bottom",
    palette: { o: "#0b1020", g: "#14532d", l: "#166534", L: "#22c55e", t: "#92400e", T: "#78350f" },
    frames: [oakGrid()],
  },
  dock: {
    w: 24,
    h: 14,
    anchor: "bottom",
    palette: { o: "#0b1020", p: "#a16207", P: "#854d0e", l: "#ca8a04", t: "#713f12" },
    frames: [dockGrid()],
  },
  pond: {
    w: 48,
    h: 24,
    anchor: "bottom",
    palette: { o: "#0b1020", b: "#38bdf8", B: "#0ea5e9", l: "#bae6fd", p: "#9a5f2b", P: "#7c4a1e", e: "#4ade80" },
    frames: [pondGrid()],
  },
  bench: { w: 12, h: 8, anchor: "bottom", palette: { o: "#0b1020", p: "#b07a45", P: "#8f5f33", k: "#475569" }, frames: [benchGrid()] },
  fountain: {
    w: 16,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", s: "#cbd5e1", S: "#94a3b8", b: "#38bdf8", l: "#e0f2fe" },
    frames: [fountainGrid(0), fountainGrid(1)],
  },
  windmill: {
    w: 40,
    h: 48,
    anchor: "bottom",
    palette: { o: "#0b1020", R: "#b91c1c", w: "#d6b98c", W: "#b08d5e", d: "#5b3a1e", g: "#fde68a", c: "#e2e8f0", C: "#94a3b8" },
    frames: [windmillGrid(0), windmillGrid(1)],
  },
  "fruit-tree": {
    w: 16,
    h: 24,
    anchor: "bottom",
    palette: { o: "#0b1020", g: "#1f7a3a", G: "#14532d", L: "#2f9e4f", a: "#ef4444", t: "#6b4423", T: "#4a2f18" },
    frames: [fruitTreeGrid()],
  },
  lantern: {
    w: 6,
    h: 12,
    anchor: "bottom",
    palette: { o: "#0b1020", p: "#7c4a1e", P: "#9a5f2b", Y: "#fbbf24", y: "#fde68a" },
    frames: [
      [
        "..oo..",
        ".oYYo.",
        "oYyyYo",
        "oYyyYo",
        ".oYYo.",
        "..oo..",
        "..oPo.",
        "..oPo.",
        "..oPo.",
        "..oPo.",
        ".oPPPo",
        ".oooo.",
      ],
    ],
  },
  chicken: {
    w: 8,
    h: 8,
    anchor: "bottom",
    palette: { o: "#0b1020", w: "#f1f5f9", W: "#cbd5e1", b: "#f59e0b", r: "#dc2626" },
    frames: [
      [
        "....oo..",
        "...orwo.",
        "..owwwbo",
        ".owwwwwo",
        ".oWwwwWo",
        "..ooooo.",
        "...o.o..",
        "...o.o..",
      ],
      [
        "........",
        "........",
        "....oo..",
        "..oorwo.",
        ".owwwwbo",
        ".oWwwwWo",
        "..ooooo.",
        "...o.o..",
      ],
    ],
  },
  garden: { w: 24, h: 10, anchor: "bottom", palette: { o: "#0b1020", s: "#7c4a1e", S: "#5b3a1e", g: "#4ade80", G: "#16a34a" }, frames: [gardenGrid()] },
  stall: {
    w: 24,
    h: 20,
    anchor: "bottom",
    palette: { o: "#0b1020", R: "#dc2626", w: "#f1f5f9", p: "#9a5f2b", P: "#c08a52", t: "#7c4a1e", a: "#ef4444" },
    frames: [stallGrid()],
  },
  lighthouse: {
    w: 22,
    h: 44,
    anchor: "bottom",
    palette: { o: "#0b1020", c: "#475569", k: "#1e293b", g: "#94a3b8", w: "#e2e8f0", W: "#b6c2d4", r: "#b91c1c", R: "#7f1d1d", d: "#5b3a1e", y: "#fde047" },
    frames: [lighthouseGrid(), lighthouseGrid(true)],
  },
  ruins: {
    w: 22,
    h: 16,
    anchor: "bottom",
    palette: { o: "#0b1020", s: "#94a3b8", S: "#64748b", m: "#4f7942" },
    frames: [ruinsGrid()],
  },
};

export const TEXTURES: Record<TextureId, { grid: PixelGrid; palette: Palette }> = {
  meadow: {
    palette: { g: "#3f7d3a", l: "#4f9a45", d: "#356b31" },
    grid: [
      "gggldgggggggglgg",
      "gggggggggggggdgg",
      "gggdglgglggggggg",
      "glggglgggglggdgg",
      "dggggggggdgggggg",
      "lggggdgggggggggg",
      "gggdggggggdggggl",
      "gggggglggggggggg",
      "gddggggggggggggg",
      "ggggglgdggggglgd",
      "gglgggggggggggdd",
      "ggggggggdggggggg",
      "dgdllgglgggldggg",
      "gggggggggggggggg",
      "ggggggggggglgggg",
      "gggggglgggggglgl",
    ],
  },
  forest: {
    palette: { f: "#24452a", l: "#2d5634", d: "#1b3520" },
    grid: [
      "ffffffdfflffffff",
      "flffffflffffffff",
      "fffffffffffffffl",
      "dlfffffdlfffffff",
      "fffffffffdfdfdff",
      "fffdfffffllflffd",
      "ffdlfffffffffflf",
      "ffffffdffflfdfdf",
      "ffffffffffffffff",
      "dffffffffffffflf",
      "fffffdfffffdlffd",
      "fdffffffflffffff",
      "dffflffffffffffl",
      "dfdffffdffffdfff",
      "fffdlffffldfdflf",
      "fflfdflfffffdddf",
    ],
  },
  snow: {
    palette: { n: "#e2e8f0", w: "#f8fafc", s: "#cbd5e1" },
    grid: [
      "nnnwsnnsnnnsnnnn",
      "nssnwwnwwnnnwswn",
      "nnnnnnnwnnnnwnnn",
      "nwnnnnnwnwwnnnns",
      "snnnnnwnnwnsnnsn",
      "nnnnnnwnnnnnnnnn",
      "nnnnnnwnsnnnnnnw",
      "nnswnnnnnnnnnnnn",
      "nnnswnnnnwnnnnnn",
      "nnnnnwnsnnnnnnnn",
      "nnwnnnwnsnnwnswn",
      "nwnwnnnnnnnnwnnn",
      "nnnnnnwnnnnsnsnn",
      "nnnnnnnnnnnnnnnw",
      "nnnnnnnnnnnsnnwn",
      "nnnsnnwnnnnnnnnn",
    ],
  },
  ice: {
    palette: { i: "#7cc4e8", l: "#b9e3f5", c: "#4f9cc7" },
    grid: [
      "iiiiiiiiiiiiiiii",
      "iilliiiiiiiiiiii",
      "iiilliiiiiiciiii",
      "iiiiiiiiiiciiiii",
      "iiiiiiiiicciiiii",
      "iiiiiiiiciiiilli",
      "iiiiiiiiciiiiill",
      "iiiiiiicciiiiiii",
      "iiliiiiiiciiiiii",
      "illiiiiiiicciiii",
      "iiiiiiiiiiiciiii",
      "iiiiiiiiiiiiiiii",
      "iiiiiillliiiiiii",
      "iiiiiiiilliiiiii",
      "iiiiiiiiiiiiiiil",
      "iiiiiiiiiiiiiill",
    ],
  },
  mountains: {
    palette: { r: "#64748b", l: "#7c8ba1", d: "#475569" },
    grid: [
      "rrrrrrlrrrrrrrrd",
      "rrlrrlrrdrrrrrrr",
      "rrrrrlrdrrrrldrr",
      "rrrrrrrrdrrrrrrr",
      "rrrrrlrrlrrdrlrl",
      "rrrrrrrlrlddrrrl",
      "rldrrrrrrrrlrrrr",
      "rrrlrrdrlldrdllr",
      "lrrrdrrrrrrrrrrr",
      "rrrrrrrrrrrrdrrr",
      "drrlrrlrrrrrldld",
      "rlrrdrrrrrrlrdrr",
      "lrlrrlrrddldrrdr",
      "lrdrrrrdrrlrdrrd",
      "rrrrrrlrrddrrrdr",
      "rrrdrrrrrrrlrdrd",
    ],
  },
  path: {
    palette: { p: "#8b6b46", l: "#9c7a50", d: "#735738" },
    grid: [
      "pdpppplpppplpppp",
      "ppdlppppplppplpp",
      "pppppdpldppppppp",
      "pdpppppppppppppp",
      "lppplpllplpppppp",
      "pppdppppldlppppp",
      "pddppppppppdpppp",
      "lplpppppddlppppp",
      "pdppplppppppdplp",
      "pdppppppppppdppp",
      "pplpdppppppllppp",
      "pdppplpppdppplpl",
      "ppplppdppldldplp",
      "lplpppplpppppppp",
      "pppplpdpppppplpp",
      "ppppppdppplppdpp",
    ],
  },
  bank: {
    palette: { b: "#3b5b73" },
    grid: [
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbb",
    ],
  },
  sea: { palette: { b: "#1e5aa8", d: "#194a8c", f: "#5aa0e0" }, grid: seaGrid() },
  sand: { palette: { s: "#e7c98a", d: "#d2b06e", l: "#f1dba6" }, grid: sandGrid() },
};

/** A player's explorer colours: the hood in their colour with a darker shade; a class recolours the cloak. */
export const explorerPalette = (hood: string, cls?: ClassId): Palette => ({
  ...SPRITES["explorer-down"].palette,
  ...(cls ? { c: CLASSES[cls].outfit, C: CLASSES[cls].trim } : {}),
  h: hood,
  H: shade(hood, -0.3),
});

export type ItemFacing = "down" | "up" | "right";
/** A 16 × 16 item layer from its non-empty rows only (row number → 16 characters). */
const layer = (rows: Record<number, string>): PixelGrid => Array.from({ length: 16 }, (_, y) => rows[y] ?? ".".repeat(16));
const ITEM_OUTLINE = "#0b1020";

/**
 * What each class carries, drawn over the explorer: "i" is the item's main colour, "j" its accent, "o" the outline.
 * An item stays on the cloak and the empty sides (at most 6 hood pixels, never an eye) so the team-coloured hood still
 * tells players apart. The scene mirrors "right" for left.
 */
const WARRIOR_BACK = layer({ 0: "......jjjj......", 1: ".......jj.......", 9: "..iii......iii..", 10: "..jjj......jjj.." });
const ARCHER_SIDE = layer({
  3: ".i..............",
  4: "i...............",
  5: "ij............jj",
  6: "ij............jj",
  7: "ij............ji",
  8: "i.............ii",
  9: ".i...........iii",
});
const MAGE_HAT = { 0: ".......ii.......", 1: "......ijji......" };
const HEALER_STAFF_BACK = layer({
  1: ".............jjj",
  2: ".............jjj",
  ...Object.fromEntries(Array.from({ length: 12 }, (_, k) => [k + 3, "...............i"])),
});

export const CLASS_ITEMS: Record<ClassId, { palette: Palette; down: PixelGrid; up: PixelGrid; right: PixelGrid }> = {
  warrior: {
    palette: { o: ITEM_OUTLINE, i: "#cbd5e1", j: "#dc2626" },
    down: WARRIOR_BACK,
    up: WARRIOR_BACK,
    right: layer({ 0: "......jjjj......", 1: ".......jj.......", 10: "....iiii........", 11: "....jjjj........" }),
  },
  archer: {
    palette: { o: ITEM_OUTLINE, i: "#92400e", j: "#e5e7eb" },
    down: ARCHER_SIDE,
    up: ARCHER_SIDE,
    right: layer({ 4: ".i..............", 5: "ij..............", 6: "ij..............", 7: "ij..............", 8: "ij..............", 9: ".i..............", 10: "..i............." }),
  },
  mage: {
    palette: { o: ITEM_OUTLINE, i: "#1e40af", j: "#fde047" },
    down: layer({ ...MAGE_HAT, 13: "...jjjjjjjjjj..." }),
    up: layer({ ...MAGE_HAT, 13: "...jjjjjjjjjj..." }),
    right: layer({ ...MAGE_HAT, 13: "....jjjjjjjj...." }),
  },
  assassin: {
    palette: { o: ITEM_OUTLINE, i: "#111827", j: "#9ca3af" },
    down: layer({ 7: ".....iiiiii.....", 8: "......iiii......", 12: "...ji......ij...", 13: "...ji......ij..." }),
    up: layer({ 12: "...ji......ij...", 13: "...ji......ij..." }),
    right: layer({ 7: "........iiii....", 8: "........iii.....", 12: "....ji..........", 13: "....ji.........." }),
  },
  tank: {
    palette: { o: ITEM_OUTLINE, i: "#9ca3af", j: "#facc15" },
    down: layer({ 9: ".oiii...........", 10: "oiiji...........", 11: "oijjji..........", 12: "oiijii..........", 13: ".oiii..........." }),
    up: layer({ 11: "....oiiiiiio....", 12: "....oijjjjio....", 13: "....oiiiiiio...." }),
    right: layer({ 11: "....oiiio.......", 12: "....ojjjo.......", 13: "....oiiio......." }),
  },
  healer: {
    palette: { o: ITEM_OUTLINE, i: "#a16207", j: "#fef08a" },
    down: layer({ 1: ".............jjj", 2: ".............jjj", ...Object.fromEntries(Array.from({ length: 12 }, (_, k) => [k + 3, "...............i"])), 11: ".......jj......i", 12: "......jjjj.....i" }),
    up: HEALER_STAFF_BACK,
    right: layer({ 1: "............jjj.", 2: "............jjj.", ...Object.fromEntries(Array.from({ length: 12 }, (_, k) => [k + 3, ".............i.."])) }),
  },
};

/** The art pixels a sprite covers when placed on an art point (see SpriteDef.anchor). */
export function spriteBox(id: SpriteId, at: ArtPoint): Rect {
  const { w, h, anchor } = SPRITES[id];
  const x = at.x - Math.floor(w / 2);
  if (anchor === "bottom") return { x, y: at.y - h + 1, w, h };
  const cy = anchor === "hover" ? at.y - 12 : at.y;
  return { x, y: cy - Math.floor(h / 2), w, h };
}

/** Light sources, in absolute art pixels: the tower's lamp, the gate's terminal cursor and the forest campfire's flame. */
export const LIGHTS: { towerLamp: ArtPoint; gateTerminal: ArtPoint; campfire: ArtPoint } = {
  towerLamp: { x: 45, y: 3 },
  gateTerminal: { x: 172, y: 81 },
  campfire: { x: 147, y: 112 },
};
