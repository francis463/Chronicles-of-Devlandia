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
  | "syntax-terminal"
  | "archive"
  | "campfire"
  | "old-oak"
  | "dock"
  | "lantern"
  | "station"
  | "snow-cave"
  | "lodge"
  | "post"
  | "waterfall"
  | "cave-mouth"
  | "fox"
  | "goat"
  | "bird"
  | "arrow"
  | "pond"
  | "bench"
  | "fountain"
  | "windmill"
  | "fruit-tree"
  | "chicken"
  | "garden"
  | "stall"
  | "lighthouse"
  | "ruins"
  | "cactus"
  | "palm"
  | "dry-bush"
  | "oasis"
  | "pyramid"
  | "tumbleweed"
  | "lizard"
  | "umbrella"
  | "sandcastle"
  | "boat"
  | "shipwreck"
  | "pier"
  | "crab"
  | "shell"
  | "birch"
  | "stump"
  | "log"
  | "mushroom"
  | "fern"
  | "flowers"
  | "owl"
  | "deer"
  | "squirrel"
  | "rabbit"
  | "cabin"
  | "brook"
  | "fairy-ring"
  | "hollow-tree"
  | "glow-mushroom"
  | "crown"
  | "rowboat"
  | "shallow"
  | "scorpion"
  | "camel"
  | "snake"
  | "vulture"
  | "fennec"
  | "tent"
  | "temple-door"
  | "riverbed"
  | "obelisk"
  | "jar"
  | "herb"
  | "cactus-fruit"
  | "cold-drink"
  | "skull"
  | "bloom-cactus"
  | "arch"
  | "moss"
  | "fox-den"
  | "desert-cave"
  | "dune-ridge"
  | "tide-pool"
  | "bottle"
  | "fireplace"
  | "bunk"
  | "table"
  | "rug"
  | "shelf"
  | "door-mat"
  | "lodge-wall"
  | "book";
/** bottom: bottom-centre on the art point; centre: centred on it; hover: centred 12 px above it. */
export type SpriteDef = { w: number; h: number; frames: PixelGrid[]; palette: Palette; anchor: "bottom" | "centre" | "hover" };
export type TextureId = "ice" | "mountains" | "snow" | "forest" | "meadow" | "path" | "bank" | "sand" | "sea" | "dune" | "beach" | "floor";

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

/** Layered shape painters for the animals: the last painter to cover a cell wins, then the whole is outlined. */
type Paint = (x: number, y: number) => string | null;
const ell = (cx: number, cy: number, rx: number, ry: number, c: string): Paint => (x, y) => (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 ? c : null);
const rect = (x0: number, y0: number, x1: number, y1: number, c: string): Paint => (x, y) => (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? c : null);
const poly = (pts: Array<[number, number]>, c: string): Paint => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? c : null;
};
function creature(w: number, h: number, layers: Paint[]): PixelGrid {
  return outlined(w, h, (x, y) => layers.reduce<string | null>((acc, paint) => paint(x, y) ?? acc, null));
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

/** The ski lodge: a snow-capped log cabin with a brick chimney, two lit-able windows and a door. */
function lodgeGrid(): PixelGrid {
  return outlined(40, 28, (x, y) => {
    const roofHalf = 8 + Math.floor(y * 1.2);
    if (y >= 1 && y <= 6 && x >= 28 && x <= 31) return "b";
    if (y <= 9 && Math.abs(x - 19.5) <= roofHalf) return y <= 2 ? "w" : y <= 5 ? "W" : y % 2 === 0 ? "r" : "R";
    if (y < 10 || x < 4 || x > 35) return null;
    if (y >= 13 && y <= 20 && ((x >= 7 && x <= 13) || (x >= 26 && x <= 32))) return y === 13 || y === 20 || x === 7 || x === 13 || x === 26 || x === 32 ? "k" : "g";
    if (y >= 18 && x >= 17 && x <= 22) return "d";
    return Math.floor((y - 10) / 3) % 2 === 0 ? "l" : "L";
  });
}

/** A trail marker: a wooden post with a cap of snow. */
function postGrid(): PixelGrid {
  return outlined(4, 10, (_x, y) => (y === 0 ? "w" : "p"));
}

/** The frozen waterfall: a wall of pale ice in streaks, snow on top. */
function waterfallGrid(): PixelGrid {
  return outlined(24, 18, (x, y) => {
    if (y < 3 && (x < 2 || x > 21)) return null;
    if (y < 3) return "w";
    return x % 5 === 2 ? "I" : y > 14 && x % 3 === 0 ? "c" : "i";
  });
}

/** A cave mouth: a rock dome with a dark opening and snow on top. */
function caveMouthGrid(): PixelGrid {
  const dome = (x: number, y: number, rx: number, ry: number) => ((x - 9.5) / rx) ** 2 + ((y - 10) / ry) ** 2 <= 1;
  return outlined(20, 11, (x, y) => {
    if (!dome(x, y, 9.5, 10)) return null;
    if (dome(x, y, 6.2, 6.5)) return "k";
    return y <= 2 ? "w" : "c";
  });
}

/** A fox trotting right: pointed ears, a white muzzle and chest, a bushy white-tipped tail, the legs swapping between frames. */
function foxGrid(frame: 0 | 1): PixelGrid {
  const [a, b] = frame === 0 ? [5, 14] : [7, 12];
  return creature(22, 13, [
    poly([[0, 3], [7, 6], [8, 10], [3, 9]], "f"),
    ell(1.8, 4.6, 1.8, 1.8, "w"),
    rect(a, 9, a + 1, 12, "F"),
    rect(a + 5, 9, a + 6, 12, "F"),
    rect(b, 9, b + 1, 12, "F"),
    rect(b - 5, 9, b - 4, 12, "F"),
    ell(11, 7, 6.8, 3.4, "f"),
    ell(11.5, 9, 5, 1.2, "w"),
    poly([[14, 4], [15, 0], [17, 4]], "F"),
    poly([[17, 4], [19, 0], [20, 4]], "F"),
    ell(17, 6, 3.5, 3, "f"),
    ell(20, 7, 2, 1.4, "w"),
    rect(18, 5, 18, 5, "k"),
  ]);
}

/** A mountain goat standing: off-white with a beard, grey legs and horns curving back from its head. */
function goatGrid(): PixelGrid {
  return creature(20, 15, [
    poly([[0, 4], [4, 5], [3, 8]], "g"),
    rect(4, 10, 5, 14, "G"),
    rect(7, 10, 8, 14, "G"),
    rect(11, 10, 12, 14, "G"),
    rect(14, 10, 15, 14, "G"),
    ell(9.5, 7, 7, 3.8, "g"),
    ell(9.5, 9.4, 5.5, 1.3, "G"),
    poly([[13, 5], [15, 2], [18, 3], [17, 8], [14, 9]], "g"),
    ell(16.5, 4.8, 2.8, 2.6, "g"),
    ell(18.2, 6.2, 1.6, 1.5, "g"),
    ell(13.5, 1.6, 1.4, 1.7, "h"),
    ell(15.4, 1.2, 1.2, 1.5, "h"),
    rect(18, 8, 18, 10, "g"),
    rect(17, 5, 17, 5, "k"),
  ]);
}

/** A distant gull: a pale body under wings that flap up in one frame and down in the next. */
function birdGrid(frame: 0 | 1): PixelGrid {
  const up: Array<Array<[number, number]>> = [[[0, 0], [7, 4], [2, 5]], [[13, 0], [6, 4], [11, 5]]];
  const down: Array<Array<[number, number]>> = [[[0, 7], [6, 4], [2, 3]], [[13, 7], [7, 4], [11, 3]]];
  return creature(14, 8, [
    ...(frame === 0 ? up : down).map((w) => poly(w, "k")),
    ell(6.5, 4.8, 2.8, 2, "w"),
    ell(9, 3.6, 1.4, 1.3, "w"),
  ]);
}

/** A bright down-pointing arrow over the first chest. */
function arrowGrid(): PixelGrid {
  return outlined(8, 8, (x, y) => {
    if (y <= 3) return x >= 2 && x <= 5 ? "y" : null;
    const half = 4 - (y - 4);
    return x >= 4 - half && x <= 3 + half ? "y" : null;
  });
}

/** The weather station: a white instrument shelter on a mast, with an anemometer whose cups spin between two frames. */
function stationGrid(frame: 0 | 1): PixelGrid {
  return outlined(14, 20, (x, y) => {
    const spin = frame === 0 ? y >= 1 && y <= 3 && x >= 1 && x <= 12 : x >= 5 && x <= 8 && y <= 5;
    if (spin) return "c";
    if (y >= 9 && y <= 14 && x >= 2 && x <= 11) return y % 2 === 0 ? "W" : "w";
    return y >= 4 && x >= 5 && x <= 8 ? "p" : null;
  });
}

/** The hidden snow cave: a big rock dome with snow on top, a dark mouth and an ice-blue glow on its floor. */
function snowCaveGrid(): PixelGrid {
  const dome = (x: number, y: number, rx: number, ry: number) => ((x - 13.5) / rx) ** 2 + ((y - 19) / ry) ** 2 <= 1;
  return outlined(28, 20, (x, y) => {
    if (!dome(x, y, 13.5, 19)) return null;
    if (dome(x, y, 8.5, 12)) return y >= 15 ? "i" : "k";
    return y <= 3 ? "w" : "c";
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

/** A saguaro: a ribbed trunk with an arm raised on each side. */
function cactusGrid(): PixelGrid {
  return outlined(14, 20, (x, y) => {
    const trunk = x >= 5 && x <= 8 && y >= 1;
    const left = (x >= 1 && x <= 4 && y >= 10 && y <= 12) || (x >= 1 && x <= 3 && y >= 5 && y <= 12);
    const right = (x >= 9 && x <= 12 && y >= 8 && y <= 10) || (x >= 10 && x <= 12 && y >= 4 && y <= 10);
    if (!(trunk || left || right)) return null;
    return x === 6 || x === 2 || x === 11 ? "G" : "c";
  });
}

/** A palm: a curved trunk under a full crown of thick, drooping fronds. */
function palmGrid(): PixelGrid {
  const blades = [-1, -0.7, -0.35, 0.35, 0.7, 1];
  const frond = (x: number, y: number) =>
    blades.some((d) => {
      for (let t = 0; t <= 11; t += 0.5) {
        const reach = Math.abs(d) > 0.5 ? 1 : 0.7;
        const fx = 12 + d * t * reach;
        const fy = 9 - (1 - Math.abs(d)) * 5 + t * t * 0.06 * (Math.abs(d) > 0.5 ? 1.3 : 0.7) - t * 0.2;
        if (Math.abs(x - fx) <= 1.5 && Math.abs(y - fy) <= 1.2) return true;
      }
      return false;
    });
  const bend = (y: number) => Math.round(Math.sin((y - 8) / 8) * 1.5);
  const trunk = (x: number, y: number) => y >= 8 && y <= 31 && x >= 10 + bend(y) && x <= 13 + bend(y);
  return outlined(24, 32, (x, y) => {
    if (frond(x, y)) return (x * 5 + y * 3) % 7 === 0 ? "L" : "g";
    if (trunk(x, y)) return y % 3 === 0 ? "T" : "t";
    return null;
  });
}

/** A dry bush: a tangle of brown twigs. */
function dryBushGrid(): PixelGrid {
  return outlined(16, 16, (x, y) => {
    const inside = ((x - 7.5) / 7.5) ** 2 + ((y - 8.5) / 7.5) ** 2 <= 1;
    if (!inside) return null;
    return (x * 3 + y * 5) % 4 === 0 ? "d" : "b";
  });
}

/** The pyramid: stepped sandstone blocks around a dark doorway, sand drifted against one side. */
function pyramidGrid(): PixelGrid {
  const half = (y: number) => Math.floor(y * 0.7) + 1;
  return outlined(40, 28, (x, y) => {
    const dx = Math.abs(x - 19.5);
    if (dx > half(y)) return null;
    if (x >= 18 && x <= 21 && y >= 22) return "k";
    if (y % 5 === 4) return "S";
    return x < 20 ? ((x + y) % 7 === 0 ? "L" : "s") : (x + y) % 6 === 0 ? "S" : "d";
  });
}

/** A tumbleweed: a ball of twigs that rolls a quarter turn between frames. */
function tumbleweedGrid(frame: 0 | 1): PixelGrid {
  return outlined(8, 8, (x, y) => {
    if (((x - 3.5) / 3.5) ** 2 + ((y - 3.5) / 3.5) ** 2 > 1) return null;
    return (frame === 0 ? x + y : x - y + 8) % 3 === 0 ? "d" : "b";
  });
}

/** A lizard in profile: a green body with a lighter back, four bent legs and a tail that flicks up or down between frames. */
function lizardGrid(frame: 0 | 1): PixelGrid {
  const tip = frame === 0 ? 5 : 1;
  return creature(14, 9, [
    poly([[0, tip], [5, 3], [5, 6], [1, tip + 1]], "z"),
    rect(4, 5, 5, 8, "z"),
    rect(7, 5, 8, 8, "z"),
    rect(9, 5, 10, 8, "z"),
    ell(7.5, 3.8, 4.6, 2.5, "z"),
    ell(7.5, 3, 3.6, 1, "Z"),
    ell(11.5, 3.4, 2.5, 2, "Z"),
    rect(12, 2, 12, 2, "e"),
  ]);
}

/** A hen in profile: white with a red comb and wattle and an orange beak, bobbing down to peck in its second frame. */
function chickenGrid(frame: 0 | 1): PixelGrid {
  const dip = frame === 0 ? 0 : 2;
  return creature(12, 12, [
    rect(4, 9, 4, 11, "b"),
    rect(7, 9, 7, 11, "b"),
    poly([[0, 3], [3, 6], [2, 8]], "W"),
    ell(5, 7, 4.2, 3, "w"),
    ell(4.5, 7.4, 2.4, 1.5, "W"),
    ell(9, 4 + dip, 2, 2.2, "w"),
    rect(8, 1 + dip, 9, 2 + dip, "r"),
    poly([[10, 3 + dip], [12, 4 + dip], [10, 5 + dip]], "b"),
    rect(10, 6 + dip, 10, 6 + dip, "r"),
    rect(9, 4 + dip, 9, 4 + dip, "k"),
  ]);
}

/** A birch: a pale, mottled trunk under a light, rounded crown. */
function birchGrid(): PixelGrid {
  return creature(14, 22, [
    rect(5, 9, 8, 21, "w"),
    ...[[6, 12], [7, 15], [6, 18], [7, 20]].map(([x, y]) => rect(x, y, x, y, "k")),
    ell(6.5, 6, 6.3, 6, "g"),
    ell(4.8, 4.6, 3.2, 3, "L"),
    ell(9, 8.4, 3.2, 2.6, "G"),
  ]);
}

/** A cut stump: pale rings on top of a short bark trunk. */
function stumpGrid(): PixelGrid {
  return creature(12, 9, [
    rect(1, 3, 10, 8, "t"),
    rect(3, 5, 3, 7, "T"),
    rect(8, 4, 8, 7, "T"),
    ell(5.5, 3, 5.5, 2.8, "R"),
    ell(5.5, 3, 3, 1.5, "t"),
  ]);
}

/** A fallen log lying on its side: bark along the top, pale rings at the cut end. */
function logGrid(): PixelGrid {
  return creature(20, 9, [
    rect(1, 2, 16, 7, "t"),
    rect(2, 3, 14, 3, "T"),
    rect(2, 6, 14, 6, "T"),
    ell(16, 4.5, 2.6, 2.8, "R"),
    ell(16, 4.5, 1.2, 1.3, "t"),
  ]);
}

/** A red toadstool: a spotted cap on a pale stem. */
function mushroomGrid(): PixelGrid {
  return creature(11, 10, [
    rect(4, 6, 6, 9, "c"),
    ell(5, 3.6, 5.2, 3.4, "r"),
    rect(3, 3, 3, 3, "w"),
    rect(7, 2, 7, 2, "w"),
    rect(6, 4, 6, 4, "w"),
    rect(4, 2, 4, 2, "w"),
  ]);
}

/** A fern: a clump of broad, pointed fronds. */
function fernGrid(): PixelGrid {
  return creature(16, 11, [
    ell(8, 8.5, 7.4, 2.4, "g"),
    poly([[1, 9], [3, 2], [6, 9]], "G"),
    poly([[10, 9], [13, 2], [15, 9]], "G"),
    poly([[4, 9], [8, 0], [12, 9]], "L"),
    rect(7, 5, 8, 8, "g"),
  ]);
}

/** A tuft of grass with three flowers: yellow, pink and white. */
function flowersGrid(): PixelGrid {
  const head = (x: number, y: number, c: string) => [ell(x + 1.5, y + 1.5, 2.1, 2.1, c)];
  return creature(17, 11, [
    ell(8.5, 9, 8, 2.2, "g"),
    rect(2, 5, 2, 8, "G"),
    rect(8, 4, 8, 8, "G"),
    rect(14, 5, 14, 8, "G"),
    ...head(0, 2, "y"),
    ...head(7, 0, "p"),
    ...head(13, 2, "w"),
  ]);
}

/** A perched owl: brown, ear tufts, big yellow eyes that shut for a blink in the second frame. */
function owlGrid(frame: 0 | 1): PixelGrid {
  return creature(10, 12, [
    rect(3, 10, 3, 11, "a"),
    rect(6, 10, 6, 11, "a"),
    ell(5, 6.5, 4.4, 4.8, "b"),
    poly([[1, 3], [2, 0], [4, 2]], "b"),
    poly([[6, 2], [8, 0], [9, 3]], "b"),
    ell(5, 8.4, 2.4, 2.6, "B"),
    rect(2, 4, 3, 5, frame === 0 ? "y" : "b"),
    rect(6, 4, 7, 5, frame === 0 ? "y" : "b"),
    rect(4, 5, 5, 6, "a"),
  ]);
}

/** A deer walking right: tawny with pale spots and belly, branching antlers, a white tail, the legs swapping between frames. */
function deerGrid(frame: 0 | 1): PixelGrid {
  const [a, b] = frame === 0 ? [5, 16] : [7, 14];
  return creature(26, 20, [
    rect(a, 11, a + 1, 19, "D"),
    rect(a + 4, 11, a + 5, 19, "D"),
    rect(b, 11, b + 1, 19, "D"),
    rect(b - 4, 11, b - 3, 19, "D"),
    ell(2, 8, 1.8, 1.8, "w"),
    ell(11.5, 9, 9, 4, "d"),
    ell(12, 11, 7, 1.6, "B"),
    poly([[17, 8], [19, 3], [23, 4], [21, 10]], "d"),
    ell(22, 5.6, 2.8, 2.4, "d"),
    ell(24.2, 6.8, 1.6, 1.4, "B"),
    poly([[20, 3], [21, 0], [22, 3]], "A"),
    poly([[22, 3], [24, 1], [24, 3]], "A"),
    rect(21, 0, 21, 2, "A"),
    rect(22, 4, 22, 4, "k"),
    ...[[6, 7], [10, 6], [14, 7], [9, 9], [13, 10]].map(([x, y]) => rect(x, y, x, y, "w")),
  ]);
}

/** A squirrel sitting up: a big curling tail behind a rust body, swishing between frames. */
function squirrelGrid(frame: 0 | 1): PixelGrid {
  const lift = frame === 0 ? 0 : 1;
  return creature(14, 14, [
    ell(3, 7 + lift, 2.8, 5, "S"),
    ell(4.4, 2.4 + lift, 2.2, 2, "S"),
    rect(7, 12, 9, 13, "s"),
    ell(8.2, 9, 3, 3.6, "s"),
    ell(8.6, 10.2, 1.5, 2, "B"),
    ell(11, 4.6, 2.6, 2.4, "s"),
    rect(9, 1, 10, 3, "s"),
    rect(12, 4, 12, 4, "k"),
  ]);
}

/** A rabbit hopping right: grey-brown with long ears and a white scut, stretched out in its second frame. */
function rabbitGrid(frame: 0 | 1): PixelGrid {
  const up = frame === 0 ? 0 : 2;
  return creature(16, 13, [
    ell(1.8, 8 - up, 1.9, 1.9, "w"),
    rect(3, 10 - up, 4, 12, "R"),
    rect(8, 10 - up, 9, 12, "R"),
    ell(5.5, 8 - up, 5, 3.3, "r"),
    ell(4, 8.4 - up, 3.2, 2.8, "R"),
    ell(10.6, 6.4 - up, 3.2, 2.7, "r"),
    poly([[8, 5 - up], [8, 0], [11, 0], [11, 5 - up]], "r"),
    poly([[11, 5 - up], [12, 0], [15, 1], [13, 5 - up]], "r"),
    rect(9, 1, 9, 3, "w"),
    rect(12, 6 - up, 12, 6 - up, "k"),
  ]);
}

/** The hunter's cabin: a log wall, a shingled roof, a stone chimney, a door and a lit window. */
function cabinGrid(): PixelGrid {
  return creature(34, 28, [
    rect(24, 2, 27, 9, "S"),
    poly([[0, 12], [17, 1], [33, 12]], "R"),
    rect(2, 12, 31, 27, "t"),
    ...[14, 17, 20, 23, 26].map((y) => rect(3, y, 30, y, "T")),
    rect(14, 17, 19, 27, "D"),
    rect(5, 15, 10, 20, "y"),
    rect(7, 15, 8, 20, "T"),
    rect(5, 17, 10, 17, "T"),
    rect(23, 16, 28, 19, "T"),
  ]);
}

/** A brook flowing across the ground with a log laid over it as a bridge. */
function brookGrid(): PixelGrid {
  const edge = (x: number) => Math.round(1.4 * Math.sin(x / 4));
  const water: Paint = (x, y) => (y >= 4 + edge(x) && y <= 11 + edge(x + 3) ? ((x + y * 2) % 7 === 0 ? "f" : "b") : null);
  return creature(44, 16, [
    water,
    rect(17, 1, 27, 14, "t"),
    ...[3, 6, 9, 12].map((y) => rect(17, y, 27, y, "T")),
    rect(18, 1, 26, 1, "R"),
  ]);
}

/** A fairy ring: eight red toadstools in a circle round a patch of greener grass. */
function fairyRingGrid(): PixelGrid {
  const caps = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return [Math.round(15 + 12 * Math.cos(a)), Math.round(8 + 5 * Math.sin(a))] as const;
  });
  return creature(31, 17, [
    ell(15, 8, 11, 4.4, "g"),
    ...caps.map(([x, y]) => ell(x, y - 1, 2.6, 2.2, "r")),
    ...caps.map(([x, y]) => rect(x, y - 1, x, y - 1, "w")),
  ]);
}

/** A hollow tree: an old broad trunk with a dark hole in it under a leafy crown. */
function hollowTreeGrid(): PixelGrid {
  return creature(26, 34, [
    poly([[5, 33], [9, 14], [17, 14], [21, 33]], "t"),
    rect(8, 18, 8, 32, "T"),
    ell(13, 10, 12, 9, "g"),
    ell(9, 8, 5, 4, "L"),
    ell(18, 13, 5, 3.5, "G"),
    ell(13, 24, 3.6, 5, "H"),
  ]);
}

/** A glow mushroom: a violet cap spotted with cyan, which pulses between its two frames. */
function glowMushroomGrid(frame: 0 | 1): PixelGrid {
  const spot = frame === 0 ? "c" : "w";
  return creature(11, 10, [
    rect(4, 6, 6, 9, "m"),
    ell(5, 3.6, 5.2, 3.4, "v"),
    rect(3, 3, 3, 3, spot),
    rect(7, 2, 7, 2, spot),
    rect(6, 4, 6, 4, spot),
    rect(4, 2, 4, 2, spot),
  ]);
}

/** A scorpion in profile: a rust shell, raised claws and a tail curled over its back, scuttling between frames. */
function scorpionGrid(frame: 0 | 1): PixelGrid {
  const [a, b] = frame === 0 ? [4, 9] : [5, 8];
  return creature(20, 12, [
    rect(a, 9, a, 11, "C"),
    rect(a + 3, 9, a + 3, 11, "C"),
    rect(b, 9, b, 11, "C"),
    rect(b + 3, 9, b + 3, 11, "C"),
    ell(2.6, 5.4, 2.2, 3.2, "c"),
    rect(2, 1, 5, 3, "c"),
    rect(5, 1, 6, 4, "C"),
    ell(9, 7, 5.4, 2.8, "c"),
    ell(14, 7, 2.4, 2.2, "c"),
    ell(17.4, 4, 2.4, 2, "c"),
    rect(14, 6, 14, 6, "e"),
  ]);
}

/** A camel standing, shifting its weight between frames: two humps, a long neck and a striped blanket. */
function camelGrid(frame: 0 | 1): PixelGrid {
  const [a, b] = frame === 0 ? [7, 22] : [9, 20];
  return creature(36, 30, [
    rect(a, 18, a + 1, 29, "M"),
    rect(a + 4, 18, a + 5, 29, "M"),
    rect(b, 18, b + 1, 29, "M"),
    rect(b + 4, 18, b + 5, 29, "M"),
    rect(4, 13, 5, 21, "M"),
    ell(16, 14, 11, 5.4, "m"),
    ell(11.5, 8, 3.6, 3.4, "m"),
    ell(20, 8.4, 3.6, 3.4, "m"),
    rect(9, 9, 22, 12, "b"),
    rect(9, 10, 22, 10, "y"),
    poly([[25, 14], [28, 5], [32, 6], [30, 15]], "m"),
    ell(32, 5, 3.2, 2.4, "m"),
    ell(34, 6.2, 1.6, 1.4, "n"),
    rect(31, 4, 31, 4, "k"),
  ]);
}

/** A snake slithering right in an S: green with a pale belly stripe, its S shifting between frames. */
function snakeGrid(frame: 0 | 1): PixelGrid {
  const phase = frame === 0 ? 0 : Math.PI;
  const body: Paint = (x, y) => (x <= 17 && Math.abs(y - (5 + 2 * Math.sin(x / 2.6 + phase))) <= 1.7 ? (x % 4 < 2 ? "g" : "G") : null);
  return creature(24, 11, [body, ell(19.5, 5 + 2 * Math.sin(17 / 2.6 + phase), 3.4, 2.5, "g"), rect(21, 4, 21, 4, "e"), rect(22, 6, 23, 6, "r")]);
}

/** A vulture soaring: dark broad wings that beat up and down, a pale bald head and a hooked beak. */
function vultureGrid(frame: 0 | 1): PixelGrid {
  const up: Array<Array<[number, number]>> = [[[0, 0], [9, 5], [3, 7]], [[19, 0], [10, 5], [16, 7]]];
  const down: Array<Array<[number, number]>> = [[[0, 9], [8, 5], [2, 3]], [[19, 9], [11, 5], [17, 3]]];
  return creature(20, 10, [
    ...(frame === 0 ? up : down).map((w) => poly(w, "k")),
    ell(9.5, 5.6, 2.8, 2.4, "k"),
    ell(9.5, 2.8, 1.6, 1.6, "p"),
    rect(9, 4, 10, 4, "k"),
  ]);
}

/** A fennec fox trotting right: huge ears, a cream face and chest and a bushy dark-tipped tail. */
function fennecGrid(frame: 0 | 1): PixelGrid {
  const [a, b] = frame === 0 ? [5, 12] : [7, 10];
  return creature(22, 15, [
    ell(2.6, 8, 3, 2.4, "f"),
    rect(0, 7, 1, 9, "F"),
    rect(a, 11, a + 1, 14, "F"),
    rect(a + 4, 11, a + 5, 14, "F"),
    rect(b, 11, b + 1, 14, "F"),
    rect(b + 3, 11, b + 4, 14, "F"),
    ell(10, 9, 6.4, 3, "f"),
    ell(11, 10.6, 4.4, 1.3, "w"),
    poly([[14, 5], [14, 0], [17, 4]], "F"),
    poly([[17, 4], [19, 0], [21, 5]], "F"),
    ell(17, 7, 3.4, 2.8, "f"),
    ell(19.6, 8, 1.8, 1.4, "w"),
    rect(18, 6, 18, 6, "k"),
  ]);
}

/** A caravan camp: two striped canvas tents with dark doorways, leaning together. */
function tentGrid(): PixelGrid {
  return creature(40, 26, [
    poly([[0, 25], [10, 3], [21, 25]], "t"),
    poly([[18, 25], [29, 6], [39, 25]], "T"),
    ...[8, 14, 20].map((y) => rect(2 + (25 - y) / 2.4, y, 20 - (25 - y) / 2.4, y, "r")),
    poly([[8, 25], [10, 13], [13, 25]], "D"),
    poly([[26, 25], [29, 15], [32, 25]], "D"),
    rect(10, 1, 10, 3, "K"),
    rect(11, 1, 13, 2, "r"),
  ]);
}

/** A buried temple door: a stone frame and dark archway sinking into a drift of sand. */
function templeDoorGrid(): PixelGrid {
  return creature(30, 32, [
    rect(4, 8, 25, 28, "S"),
    ell(14.5, 9, 10.5, 7, "S"),
    rect(9, 14, 20, 29, "D"),
    ell(14.5, 15, 5.5, 5, "D"),
    ...[[6, 12], [23, 12], [6, 18], [23, 18], [6, 24], [23, 24]].map(([x, y]) => rect(x, y, x + 1, y + 1, "g")),
    ell(14.5, 31, 14.5, 4.2, "s"),
    ell(21, 30, 7, 1.6, "d"),
  ]);
}

/** A dry riverbed of cracked mud, with a little stone bridge over where the water used to run. */
function riverbedGrid(): PixelGrid {
  const bank = (x: number) => Math.round(1.5 * Math.sin(x / 5));
  const bed: Paint = (x, y) => (y >= 6 + bank(x) && y <= 17 + bank(x + 4) ? ((x * 3 + y * 5) % 11 === 0 || (x + y * 2) % 13 === 0 ? "c" : "b") : null);
  const arch: Paint = (x, y) => (((x - 29.5) / 5.5) ** 2 + ((y - 16) / 7) ** 2 <= 1 ? null : rect(21, 3, 38, 18, "S")(x, y));
  return creature(56, 22, [bed, arch, rect(22, 3, 37, 4, "B")]);
}

/** An obelisk: a tall tapering stone with golden glyphs up its face. */
function obeliskGrid(): PixelGrid {
  return creature(16, 40, [
    rect(2, 35, 13, 39, "B"),
    poly([[3, 36], [4, 8], [8, 0], [12, 8], [13, 36]], "S"),
    ...[11, 16, 21, 26, 31].map((y, i) => rect(i % 2 ? 7 : 6, y, i % 2 ? 9 : 8, y + 1, "g")),
  ]);
}

/** A clay water jar with a bright drop of water glinting in its belly. */
function jarGrid(frame: 0 | 1): PixelGrid {
  return creature(11, 13, [
    ell(5.5, 8.4, 4.8, 4.4, "j"),
    rect(3, 1, 7, 4, "j"),
    rect(2, 0, 8, 1, "J"),
    rect(frame === 0 ? 4 : 6, 7, frame === 0 ? 4 : 6, 8, "b"),
    rect(7, 9, 7, 9, "J"),
  ]);
}

/** A healing herb: a tuft of leaves under a white flower. */
function herbGrid(): PixelGrid {
  return creature(9, 10, [
    rect(4, 4, 4, 9, "G"),
    ell(2, 6.5, 2, 1.4, "g"),
    ell(6, 6.5, 2, 1.4, "g"),
    ell(3, 4, 1.6, 1.2, "g"),
    ell(5, 4, 1.6, 1.2, "g"),
    ell(4, 2.2, 2.3, 2.3, "w"),
    rect(4, 2, 4, 2, "y"),
  ]);
}

/** A prickly pear: green pads with ripe red fruit. */
function cactusFruitGrid(): PixelGrid {
  return creature(10, 11, [
    ell(5, 7.6, 4.2, 3, "g"),
    ell(3.6, 3.8, 2.2, 2.4, "g"),
    rect(4, 7, 4, 8, "G"),
    rect(6, 8, 6, 9, "G"),
    ell(7.4, 3.4, 1.5, 1.8, "r"),
    ell(4.6, 1.6, 1.3, 1.5, "r"),
  ]);
}

/** A tall glass of cold lemonade with a straw and a lemon slice. */
function coldDrinkGrid(): PixelGrid {
  return creature(8, 11, [
    rect(1, 3, 6, 9, "c"),
    rect(2, 5, 5, 8, "b"),
    rect(5, 0, 5, 5, "r"),
    ell(1.5, 3, 1.5, 1.5, "y"),
    rect(0, 10, 7, 10, "c"),
  ]);
}

/** A soft clearing of moss: a green mound with paler tufts and two small stones. */
function mossGrid(): PixelGrid {
  return creature(24, 12, [
    ell(12, 8, 11.5, 3.6, "m"),
    ell(12, 6, 8.5, 3.6, "M"),
    ell(9, 5, 3, 1.6, "l"),
    ell(16, 6, 2.6, 1.4, "l"),
    ell(4.5, 9, 2, 1.5, "s"),
    ell(20, 9.4, 1.8, 1.3, "s"),
  ]);
}

/** A fox's den: an earth mound with a dark round hole and a few roots over it. */
function foxDenGrid(): PixelGrid {
  return creature(24, 16, [
    ell(12, 11, 11.5, 5, "e"),
    ell(12, 8, 9, 6.5, "E"),
    ell(12, 11.4, 4, 3.4, "k"),
    rect(7, 4, 7, 7, "r"),
    rect(16, 3, 16, 6, "r"),
    rect(10, 13, 14, 14, "k"),
  ]);
}

/** A hidden cave: a rock face with a dark opening and a pale mark above it. */
function desertCaveGrid(): PixelGrid {
  return creature(28, 20, [
    ell(14, 13, 13.5, 6.5, "r"),
    ell(14, 9, 11, 8.5, "R"),
    ell(14, 14, 5, 5.2, "k"),
    rect(9, 14, 19, 18, "k"),
    rect(12, 3, 16, 3, "y"),
    rect(3, 15, 6, 17, "r"),
  ]);
}

/** A dune ridge: a long sand crest with a crooked line of stones along it. */
function duneRidgeGrid(): PixelGrid {
  return creature(32, 14, [
    ell(16, 10, 15.5, 3.8, "d"),
    ell(14, 7, 12, 4.5, "D"),
    ell(6, 5, 1.8, 1.5, "s"),
    ell(11, 3.6, 1.8, 1.5, "s"),
    ell(17, 4.4, 1.8, 1.5, "s"),
    ell(23, 3, 1.8, 1.5, "s"),
  ]);
}

/** A tide pool: a rock-ringed oval of water with a starfish. */
function tidePoolGrid(): PixelGrid {
  return creature(26, 12, [
    ell(13, 7, 12.5, 4.8, "s"),
    ell(13, 7, 10, 3.2, "w"),
    ell(10, 7, 3, 1.2, "W"),
    ell(17, 6.4, 1.6, 1.3, "o"),
    rect(2, 3, 4, 4, "s"),
    rect(21, 2, 24, 3, "s"),
  ]);
}

/** A glass bottle half buried in the sand, with a cork and a rolled note inside. */
function bottleGrid(): PixelGrid {
  return creature(10, 14, [
    rect(3, 0, 6, 2, "c"),
    rect(4, 3, 5, 5, "g"),
    ell(4.5, 9, 4, 4, "g"),
    rect(3, 7, 6, 11, "p"),
    rect(1, 12, 8, 13, "y"),
  ]);
}

/** The lodge's stone fireplace: a mantel over a dark opening, with a flame that flickers between two shapes. */
function fireplaceGrid(frame: 0 | 1): PixelGrid {
  const flame = frame === 0
    ? [ell(11.5, 17, 3.2, 3.6, "f"), ell(11.5, 17.6, 1.6, 2.2, "y"), rect(8, 19, 15, 20, "f")]
    : [ell(12.5, 16.4, 3, 4.2, "f"), ell(12.5, 17.4, 1.5, 2.4, "y"), rect(8, 19, 15, 20, "f")];
  return creature(24, 22, [
    rect(8, 0, 15, 4, "s"),
    rect(0, 3, 23, 6, "m"),
    rect(1, 6, 22, 21, "s"),
    rect(5, 9, 18, 21, "k"),
    rect(3, 10, 3, 21, "S"),
    rect(20, 10, 20, 21, "S"),
    ...flame,
  ]);
}

/** A wooden bunk bed: two mattresses with blankets and pillows between two posts. */
function bunkGrid(): PixelGrid {
  return creature(28, 18, [
    rect(0, 0, 1, 17, "d"),
    rect(26, 0, 27, 17, "d"),
    rect(0, 3, 27, 7, "w"),
    rect(2, 3, 25, 6, "b"),
    rect(2, 3, 7, 5, "p"),
    rect(0, 11, 27, 16, "w"),
    rect(2, 11, 25, 15, "B"),
    rect(2, 11, 7, 13, "p"),
  ]);
}

/** A plank table with a bowl and a candle stub on it. */
function tableGrid(): PixelGrid {
  return creature(24, 14, [
    rect(0, 0, 23, 4, "t"),
    rect(0, 4, 23, 5, "d"),
    rect(2, 5, 3, 13, "d"),
    rect(20, 5, 21, 13, "d"),
    ell(7, 1.2, 2.6, 1.2, "c"),
    rect(16, 0, 16, 1, "y"),
  ]);
}

/** A round woven rug with a lighter middle. */
function rugGrid(): PixelGrid {
  return creature(32, 10, [ell(16, 5, 15.5, 4.5, "r"), ell(16, 5, 11, 3, "R"), ell(16, 5, 5, 1.6, "y")]);
}

/** A bookcase: three shelves of books in a plank frame. */
function shelfGrid(): PixelGrid {
  const books = (y: number, colours: string[]) => colours.map((c, i) => rect(2 + i * 4, y, 4 + i * 4, y + 4, c));
  return creature(28, 24, [
    rect(0, 0, 27, 23, "w"),
    rect(1, 1, 26, 22, "d"),
    ...books(2, ["r", "g", "b", "y", "r", "g"]),
    rect(1, 8, 26, 9, "w"),
    ...books(10, ["b", "y", "r", "g", "b", "y"]),
    rect(1, 16, 26, 17, "w"),
    ...books(18, ["g", "r", "y", "b", "g", "r"]),
  ]);
}

/** The door mat: a coarse mat with two stripes. */
function doorMatGrid(): PixelGrid {
  return creature(20, 6, [rect(0, 0, 19, 5, "m"), rect(2, 2, 17, 2, "M"), rect(2, 3, 17, 3, "m")]);
}

/** An open book: two pale pages on a red cover, with lines of writing. */
function bookGrid(): PixelGrid {
  return creature(12, 7, [rect(0, 1, 11, 6, "c"), rect(1, 0, 5, 4, "p"), rect(6, 0, 10, 4, "p"), rect(5, 0, 6, 5, "s"), rect(2, 1, 4, 1, "t"), rect(2, 3, 4, 3, "t"), rect(7, 1, 9, 1, "t"), rect(7, 3, 9, 3, "t")]);
}

/** A log wall tile: stacked logs with a darker line between them. */
function lodgeWallGrid(): PixelGrid {
  return outlined(16, 16, (x, y) => (y % 4 === 3 ? "L" : x % 8 === 0 ? "d" : "l"));
}

/** A bleached cow skull half buried in the sand, horns curling out. */
function skullGrid(): PixelGrid {
  return creature(14, 10, [
    ell(3, 3, 3, 2, "w"),
    ell(11, 3, 3, 2, "w"),
    ell(7, 5.6, 4.6, 3.6, "w"),
    rect(4, 5, 5, 6, "k"),
    rect(9, 5, 10, 6, "k"),
    rect(6, 8, 7, 9, "k"),
  ]);
}

/** A tall saguaro in flower: ribbed green arms and pink blossoms on their tips. */
function bloomCactusGrid(): PixelGrid {
  return creature(18, 28, [
    rect(7, 5, 10, 27, "c"),
    rect(1, 14, 7, 17, "c"),
    rect(1, 9, 4, 17, "c"),
    rect(10, 12, 16, 15, "c"),
    rect(13, 7, 16, 15, "c"),
    ...[8, 2, 14].map((x) => rect(x, x === 8 ? 0 : 4, x + 1, x === 8 ? 5 : 8, "G")),
    ell(8.5, 3, 2.2, 2.2, "p"),
    ell(2.5, 7, 1.8, 1.8, "p"),
    ell(14.5, 5, 1.8, 1.8, "p"),
  ]);
}

/** A natural rock arch weathered out of a sandstone mesa. */
function archGrid(): PixelGrid {
  const mass = poly([[0, 23], [2, 9], [8, 2], [19, 2], [26, 9], [28, 23]], "r");
  const hole = (x: number, y: number) => ((x - 14) / 6) ** 2 + ((y - 22) / 11) ** 2 <= 1;
  return creature(30, 24, [
    (x, y) => (hole(x, y) ? null : mass(x, y)),
    (x, y) => (!hole(x, y) && y > 3 && y < 8 && x > 6 && x < 13 ? "R" : null),
    (x, y) => (!hole(x, y) && y >= 14 && (x < 5 || x > 23) && y % 4 === 1 ? "D" : null),
  ]);
}

/** A golden crown with five points and a red gem, worn by a Master of Devlandia. */
function crownGrid(): PixelGrid {
  return creature(12, 8, [
    poly([[0, 7], [0, 0], [3, 3], [6, 0], [9, 3], [12, 0], [12, 7]], "y"),
    rect(1, 5, 10, 6, "Y"),
    rect(5, 4, 6, 5, "r"),
  ]);
}

/** A striped beach umbrella: a red-and-white canopy over a pole. */
function umbrellaGrid(): PixelGrid {
  return outlined(16, 16, (x, y) => {
    if (y <= 6) {
      const half = 7.5 * Math.sqrt(1 - ((6 - y) / 7) ** 2);
      if (Math.abs(x - 7.5) > half) return null;
      return Math.floor(x / 3) % 2 === 0 ? "r" : "w";
    }
    return (x === 7 || x === 8) && y >= 7 ? "p" : null;
  });
}

/** A sandcastle: two towers either side of a low wall; finished (frame 2) it gains a keep and a flag. */
function sandcastleGrid(built: boolean): PixelGrid {
  return creature(14, 14, [
    (x, y) => (x >= 1 && x <= 12 && y >= 9 ? ((x * 3 + y * 5) % 7 === 0 ? "S" : "s") : null),
    (x, y) => ((x >= 1 && x <= 4) || (x >= 9 && x <= 12)) && y >= (built ? 5 : 6) ? ((x * 3 + y * 5) % 7 === 0 ? "S" : "s") : null,
    ...(built ? [(x: number, y: number) => (x >= 5 && x <= 8 && y >= 3 ? ((x * 3 + y * 5) % 7 === 0 ? "S" : "s") : null), poly([[7, 0], [11, 1], [7, 2.4]], "r")] : []),
  ]);
}

/** A little moored rowboat seen from the side: a brown hull, a pale plank stripe and a seat. */
function rowboatGrid(): PixelGrid {
  return creature(20, 10, [
    poly([[0, 2], [19, 2], [16, 9], [3, 9]], "H"),
    rect(2, 4, 17, 4, "w"),
    rect(8, 0, 11, 3, "h"),
  ]);
}

/** A tile of shallow water for the tide: sea blue with flecks of foam; frame 2 has a foam edge down its left side. */
function shallowGrid(edge: boolean): PixelGrid {
  return Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => (edge && x === 0 ? "f" : (x + y * 3) % 7 === 0 ? "f" : (x * 5 + y) % 11 === 0 ? "d" : "b")).join(""));
}

/** A beached rowing boat: a brown hull with a pale plank stripe. */
function boatGrid(): PixelGrid {
  return outlined(28, 12, (x, y) => {
    const inset = Math.floor(y / 3);
    if (y < 3 || x < 1 + (3 - Math.min(y - 3, 3)) * 0 + (y >= 3 ? inset - 1 : 0) || x > 26 - (y >= 3 ? inset - 1 : 0)) return y < 3 ? (y >= 1 && x >= 2 && x <= 25 ? "H" : null) : null;
    return y === 5 ? "w" : (x + y) % 6 === 0 ? "H" : "h";
  });
}

/** A shipwreck: a listing hull of grey-brown planks with a snapped mast, a torn sail, bare ribs and sand piled around it. */
function shipwreckGrid(): PixelGrid {
  const plank: Paint = (x, y) => (y % 3 === 0 ? "K" : (x + y) % 9 === 0 ? "p" : "k");
  const hull = poly([[3, 9], [20, 11], [34, 14], [31, 22], [8, 22]], "k");
  const planked: Paint = (x, y) => (hull(x, y) ? plank(x, y) : null);
  return creature(36, 24, [
    rect(10, 0, 11, 13, "K"),
    poly([[12, 2], [21, 3], [19, 8], [17, 6], [15, 10], [12, 9]], "w"),
    poly([[0, 6], [5, 9], [6, 14], [3, 14]], "K"),
    planked,
    ...[19, 23, 27, 31].map((x) => rect(x, 6 + (x % 4), x + 1, 13, "K")),
    ell(18, 24, 17.5, 3.2, "s"),
    ell(24, 22.5, 8, 1.2, "S"),
  ]);
}

/** A wooden pier: planks along the top and posts under them. */
function pierGrid(): PixelGrid {
  const posts = [2, 11, 20, 29, 37];
  return outlined(40, 14, (x, y) => {
    if (y <= 3) return y === 0 || x % 5 === 0 ? "P" : "p";
    return posts.some((px) => x >= px && x <= px + 2) ? "k" : null;
  });
}

/** A crab: a red shell on bent legs, eye stalks and two round claws that lift and drop between frames. */
function crabGrid(frame: 0 | 1): PixelGrid {
  const lift = frame === 0 ? 0 : 1;
  const leg = (x: number): Paint => rect(x, 7, x, 9 - ((x + frame) % 2), "c");
  return creature(16, 10, [
    ...[2, 4, 6, 9, 11, 13].map(leg),
    rect(3, 3 + lift, 5, 4 + lift, "c"),
    rect(10, 3 + lift, 12, 4 + lift, "c"),
    ell(2, 2 + lift, 2.3, 2, "c"),
    ell(14, 2 + lift, 2.3, 2, "c"),
    rect(6, 2, 6, 3, "e"),
    rect(9, 2, 9, 3, "e"),
    ell(7.5, 6, 5.5, 3, "c"),
  ]);
}

/** A scallop shell. */
function shellGrid(): PixelGrid {
  return outlined(6, 5, (x, y) => (y >= 1 && x >= 0 + (y === 1 ? 1 : 0) && x <= 5 - (y === 1 ? 1 : 0) ? ((x + y) % 2 === 0 ? "q" : "Q") : null));
}

/** Pale beach sand with the odd darker fleck and a shell-white glint. */
const beachGrid = (): PixelGrid =>
  Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => ((x * 7 + y * 5) % 19 === 0 ? "w" : (x * 3 + y * 13) % 17 === 0 ? "d" : "s")).join(""),
  );

/** Choppy water: two blues and a few light flecks. */
const seaGrid = (): PixelGrid =>
  Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => ((x + (y % 4) * 3) % 8 < 2 && y % 4 === 1 ? "f" : (x * 5 + y * 3) % 13 === 0 ? "d" : "b")).join(""),
  );

/** Golden dunes: wind ripples running across, with darker and lighter flecks. */
const duneGrid = (): PixelGrid =>
  Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => ((x + (y % 8) * 2) % 16 < 3 && y % 4 === 2 ? "r" : (x * 5 + y * 7) % 23 === 0 ? "l" : (x * 3 + y * 11) % 17 === 0 ? "d" : "s")).join(""),
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
    palette: { o: "#0b1020", r: "#451a03", b: "#78350f", f: "#ea580c", y: "#fbbf24", w: "#fde68a", a: "#6b7280" },
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
      // Out (by day): cold logs and a little ash, no flame.
      [
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "..oooooooo..",
        ".obbbaaabbbo",
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
  lodge: {
    w: 40,
    h: 28,
    anchor: "bottom",
    palette: { o: "#0b1020", w: "#f1f5f9", W: "#cbd5e1", r: "#7c2d12", R: "#9a3412", b: "#991b1b", l: "#b07a45", L: "#8f5f33", d: "#5b3a1e", g: "#fde68a", k: "#334155" },
    frames: [lodgeGrid()],
  },
  post: { w: 4, h: 10, anchor: "bottom", palette: { o: "#0b1020", w: "#f1f5f9", p: "#9a5f2b" }, frames: [postGrid()] },
  waterfall: { w: 24, h: 18, anchor: "bottom", palette: { o: "#0b1020", w: "#f1f5f9", i: "#bae6fd", I: "#7dd3fc", c: "#94a3b8" }, frames: [waterfallGrid()] },
  "cave-mouth": { w: 20, h: 11, anchor: "bottom", palette: { o: "#0b1020", w: "#f1f5f9", c: "#64748b", k: "#0f172a" }, frames: [caveMouthGrid()] },
  fox: { w: 22, h: 13, anchor: "bottom", palette: { o: "#0b1020", k: "#0b1020", f: "#f97316", F: "#c2410c", w: "#f8fafc" }, frames: [foxGrid(0), foxGrid(1)] },
  goat: { w: 20, h: 15, anchor: "bottom", palette: { o: "#0b1020", k: "#0b1020", g: "#e2e8f0", G: "#94a3b8", h: "#78716c" }, frames: [goatGrid()] },
  bird: { w: 14, h: 8, anchor: "bottom", palette: { o: "#0b1020", k: "#334155", w: "#f1f5f9" }, frames: [birdGrid(0), birdGrid(1)] },
  arrow: { w: 8, h: 8, anchor: "bottom", palette: { o: "#0b1020", y: "#fde047" }, frames: [arrowGrid()] },
  station: { w: 14, h: 20, anchor: "bottom", palette: { o: "#0b1020", c: "#e2e8f0", w: "#f1f5f9", W: "#cbd5e1", p: "#7c4a1e" }, frames: [stationGrid(0), stationGrid(1)] },
  "snow-cave": { w: 28, h: 20, anchor: "bottom", palette: { o: "#0b1020", w: "#f1f5f9", c: "#64748b", k: "#0f172a", i: "#7dd3fc" }, frames: [snowCaveGrid()] },
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
  chicken: { w: 12, h: 12, anchor: "bottom", palette: { o: "#0b1020", k: "#0b1020", w: "#f1f5f9", W: "#cbd5e1", b: "#f59e0b", r: "#dc2626" }, frames: [chickenGrid(0), chickenGrid(1)] },
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
  cactus: { w: 14, h: 20, anchor: "bottom", palette: { o: "#0b1020", c: "#3f9a4a", G: "#2a7338" }, frames: [cactusGrid()] },
  palm: { w: 24, h: 32, anchor: "bottom", palette: { o: "#0b1020", g: "#3f9a4a", L: "#6ecb63", t: "#9a6b3a", T: "#7a5128" }, frames: [palmGrid()] },
  "dry-bush": { w: 16, h: 16, anchor: "bottom", palette: { o: "#0b1020", b: "#a8814a", d: "#7d5a2e" }, frames: [dryBushGrid()] },
  oasis: {
    w: 48,
    h: 24,
    anchor: "bottom",
    palette: { o: "#0b1020", b: "#2fb5c9", B: "#1c8da6", l: "#c9f3f7", p: "#9a5f2b", P: "#7c4a1e", e: "#4ade80" },
    frames: [pondGrid()],
  },
  pyramid: { w: 40, h: 28, anchor: "bottom", palette: { o: "#0b1020", s: "#d9b26a", L: "#ecd08f", d: "#b98c46", S: "#a47a3a", k: "#2a1d12" }, frames: [pyramidGrid()] },
  tumbleweed: { w: 8, h: 8, anchor: "bottom", palette: { o: "#0b1020", b: "#b8925a", d: "#8a6a3a" }, frames: [tumbleweedGrid(0), tumbleweedGrid(1)] },
  umbrella: { w: 16, h: 16, anchor: "bottom", palette: { o: "#0b1020", r: "#ef4444", w: "#f8fafc", p: "#9a5f2b" }, frames: [umbrellaGrid()] },
  sandcastle: { w: 14, h: 14, anchor: "bottom", palette: { o: "#0b1020", s: "#e8c47a", S: "#c9a357", r: "#dc2626" }, frames: [sandcastleGrid(false), sandcastleGrid(true)] },
  rowboat: { w: 20, h: 10, anchor: "bottom", palette: { o: "#0b1020", H: "#8b5e34", h: "#6b4423", w: "#d9c9a0" }, frames: [rowboatGrid()] },
  shallow: { w: 8, h: 8, anchor: "bottom", palette: { o: "#0b1020", b: "#2f78c4", d: "#2563a8", f: "#9cc9f0" }, frames: [shallowGrid(false), shallowGrid(true)] },
  boat: { w: 28, h: 12, anchor: "bottom", palette: { o: "#0b1020", h: "#9a5f2b", H: "#7c4a1e", w: "#e2d3b0" }, frames: [boatGrid()] },
  shipwreck: { w: 36, h: 24, anchor: "bottom", palette: { o: "#0b1020", k: "#7c4a1e", K: "#5b3a1e", p: "#9a5f2b", w: "#d9d2bd", s: "#e8c47a", S: "#c9a357" }, frames: [shipwreckGrid()] },
  pier: { w: 40, h: 14, anchor: "bottom", palette: { o: "#0b1020", p: "#b07a45", P: "#8f5f33", k: "#5b3a1e" }, frames: [pierGrid()] },
  crab: { w: 16, h: 10, anchor: "bottom", palette: { o: "#0b1020", c: "#e5533d", e: "#f8fafc" }, frames: [crabGrid(0), crabGrid(1)] },
  shell: { w: 6, h: 5, anchor: "bottom", palette: { o: "#0b1020", q: "#f9a8d4", Q: "#f472b6" }, frames: [shellGrid()] },
  birch: { w: 14, h: 22, anchor: "bottom", palette: { o: "#0b1020", g: "#3fa34d", G: "#2f7d3a", L: "#6cc36a", w: "#e7e5e4", k: "#44403c" }, frames: [birchGrid()] },
  stump: { w: 12, h: 9, anchor: "bottom", palette: { o: "#0b1020", t: "#7c4a1e", T: "#5b3a1e", R: "#c08a52" }, frames: [stumpGrid()] },
  log: { w: 20, h: 9, anchor: "bottom", palette: { o: "#0b1020", t: "#7c4a1e", T: "#5b3a1e", R: "#c08a52" }, frames: [logGrid()] },
  mushroom: { w: 11, h: 10, anchor: "bottom", palette: { o: "#0b1020", r: "#dc2626", w: "#f8fafc", c: "#e7d9c4" }, frames: [mushroomGrid()] },
  fern: { w: 16, h: 11, anchor: "bottom", palette: { o: "#0b1020", g: "#2f7d3a", G: "#1e5a2a", L: "#4caf50" }, frames: [fernGrid()] },
  flowers: { w: 17, h: 11, anchor: "bottom", palette: { o: "#0b1020", g: "#3f7d3a", G: "#2d5f2a", y: "#fde047", p: "#f472b6", w: "#f8fafc" }, frames: [flowersGrid()] },
  owl: { w: 10, h: 12, anchor: "bottom", palette: { o: "#0b1020", b: "#8b5e34", B: "#d6b98a", y: "#fde047", a: "#f59e0b" }, frames: [owlGrid(0), owlGrid(1)] },
  deer: { w: 26, h: 20, anchor: "bottom", palette: { o: "#0b1020", d: "#a3643a", D: "#6b4423", B: "#e3c9a0", A: "#d6b98a", w: "#f8e9d0", k: "#0b1020" }, frames: [deerGrid(0), deerGrid(1)] },
  squirrel: { w: 14, h: 14, anchor: "bottom", palette: { o: "#0b1020", s: "#b45a2a", S: "#d9763a", B: "#f1d9b5", k: "#0b1020" }, frames: [squirrelGrid(0), squirrelGrid(1)] },
  rabbit: { w: 16, h: 13, anchor: "bottom", palette: { o: "#0b1020", r: "#a8a29e", R: "#78716c", w: "#f8fafc", k: "#0b1020" }, frames: [rabbitGrid(0), rabbitGrid(1)] },
  cabin: { w: 34, h: 28, anchor: "bottom", palette: { o: "#0b1020", t: "#8b5e34", T: "#6b4423", R: "#7f3b2a", D: "#4a2f18", S: "#94a3b8", y: "#fde68a" }, frames: [cabinGrid()] },
  brook: { w: 44, h: 16, anchor: "bottom", palette: { o: "#0b1020", b: "#38bdf8", f: "#bae6fd", t: "#8b5e34", T: "#6b4423", R: "#a97a4a" }, frames: [brookGrid()] },
  "fairy-ring": { w: 31, h: 17, anchor: "bottom", palette: { o: "#0b1020", g: "#4a9a4a", r: "#dc2626", w: "#f8fafc" }, frames: [fairyRingGrid()] },
  "hollow-tree": { w: 26, h: 34, anchor: "bottom", palette: { o: "#0b1020", t: "#6b4423", T: "#4a2f18", g: "#1f7a3a", G: "#14532d", L: "#2f9e4f", H: "#1c1308" }, frames: [hollowTreeGrid()] },
  "glow-mushroom": { w: 11, h: 10, anchor: "bottom", palette: { o: "#0b1020", v: "#a78bfa", m: "#e9e3f7", c: "#67e8f9", w: "#ffffff" }, frames: [glowMushroomGrid(0), glowMushroomGrid(1)] },
  scorpion: { w: 20, h: 12, anchor: "bottom", palette: { o: "#0b1020", c: "#b45309", C: "#78350f", e: "#fde68a" }, frames: [scorpionGrid(0), scorpionGrid(1)] },
  camel: { w: 36, h: 30, anchor: "bottom", palette: { o: "#0b1020", m: "#c8964f", M: "#8a5f2a", n: "#e3c9a0", b: "#be123c", y: "#fde047", k: "#0b1020" }, frames: [camelGrid(0), camelGrid(1)] },
  snake: { w: 24, h: 11, anchor: "bottom", palette: { o: "#0b1020", g: "#65a30d", G: "#3f6212", e: "#fde047", r: "#dc2626" }, frames: [snakeGrid(0), snakeGrid(1)] },
  vulture: { w: 20, h: 10, anchor: "bottom", palette: { o: "#0b1020", k: "#44403c", p: "#f4a7a7" }, frames: [vultureGrid(0), vultureGrid(1)] },
  fennec: { w: 22, h: 15, anchor: "bottom", palette: { o: "#0b1020", f: "#e8c08c", F: "#b8793a", w: "#fff3dc", k: "#0b1020" }, frames: [fennecGrid(0), fennecGrid(1)] },
  tent: { w: 40, h: 26, anchor: "bottom", palette: { o: "#0b1020", t: "#e7d9bd", T: "#cdb98f", r: "#b4472f", D: "#3b2a1a", K: "#6b4423" }, frames: [tentGrid()] },
  "temple-door": { w: 30, h: 32, anchor: "bottom", palette: { o: "#0b1020", S: "#9a8a6a", D: "#1c1308", g: "#fbbf24", s: "#e2ac4c", d: "#c98f35" }, frames: [templeDoorGrid()] },
  riverbed: { w: 56, h: 22, anchor: "bottom", palette: { o: "#0b1020", b: "#c9a36a", c: "#9a7a48", S: "#9a8a6a", B: "#b8a888" }, frames: [riverbedGrid()] },
  obelisk: { w: 16, h: 40, anchor: "bottom", palette: { o: "#0b1020", S: "#b8a888", B: "#8c7f66", g: "#fbbf24" }, frames: [obeliskGrid()] },
  jar: { w: 11, h: 13, anchor: "bottom", palette: { o: "#0b1020", j: "#c2410c", J: "#9a3412", b: "#7dd3fc" }, frames: [jarGrid(0), jarGrid(1)] },
  herb: { w: 9, h: 10, anchor: "bottom", palette: { o: "#0b1020", g: "#22c55e", G: "#15803d", w: "#f8fafc", y: "#facc15" }, frames: [herbGrid()] },
  "cactus-fruit": { w: 10, h: 11, anchor: "bottom", palette: { o: "#0b1020", g: "#16a34a", G: "#14532d", r: "#ef4444" }, frames: [cactusFruitGrid()] },
  "cold-drink": { w: 8, h: 11, anchor: "bottom", palette: { o: "#0b1020", c: "#e0f2fe", b: "#38bdf8", r: "#ef4444", y: "#fde047" }, frames: [coldDrinkGrid()] },
  moss: { w: 24, h: 12, anchor: "bottom", palette: { o: "#0b1020", m: "#3f8f3a", M: "#4ea84a", l: "#86d06a", s: "#8a8f98" }, frames: [mossGrid()] },
  "fox-den": { w: 24, h: 16, anchor: "bottom", palette: { o: "#0b1020", e: "#6b4a2b", E: "#8a6238", k: "#1a1008", r: "#4a3320" }, frames: [foxDenGrid()] },
  "desert-cave": { w: 28, h: 20, anchor: "bottom", palette: { o: "#0b1020", r: "#a8693a", R: "#c98852", k: "#150d08", y: "#fbbf24" }, frames: [desertCaveGrid()] },
  "dune-ridge": { w: 32, h: 14, anchor: "bottom", palette: { o: "#0b1020", d: "#d9a445", D: "#ecc072", s: "#8c7f66" }, frames: [duneRidgeGrid()] },
  "tide-pool": { w: 26, h: 12, anchor: "bottom", palette: { o: "#0b1020", s: "#7b8794", w: "#38bdf8", W: "#bae6fd", p: "#f97316" }, frames: [tidePoolGrid()] },
  bottle: { w: 10, h: 14, anchor: "bottom", palette: { o: "#0b1020", c: "#b4793a", g: "#7dd3d8", p: "#f8f1d8", y: "#e7c98a" }, frames: [bottleGrid()] },
  fireplace: { w: 24, h: 22, anchor: "bottom", palette: { o: "#0b1020", s: "#8a8f98", S: "#6b7280", m: "#6b4423", k: "#1a1008", f: "#f97316", y: "#fde047" }, frames: [fireplaceGrid(0), fireplaceGrid(1)] },
  bunk: { w: 28, h: 18, anchor: "bottom", palette: { o: "#0b1020", d: "#5b3a1e", w: "#b07a45", b: "#991b1b", B: "#1d4ed8", p: "#f1f5f9" }, frames: [bunkGrid()] },
  table: { w: 24, h: 14, anchor: "bottom", palette: { o: "#0b1020", t: "#c58b4f", d: "#5b3a1e", c: "#e7e5e4", y: "#fde68a" }, frames: [tableGrid()] },
  rug: { w: 32, h: 10, anchor: "bottom", palette: { o: "#0b1020", r: "#7f1d1d", R: "#b91c1c", y: "#fbbf24" }, frames: [rugGrid()] },
  shelf: { w: 28, h: 24, anchor: "bottom", palette: { o: "#0b1020", w: "#b07a45", d: "#5b3a1e", r: "#dc2626", g: "#16a34a", b: "#2563eb", y: "#facc15" }, frames: [shelfGrid()] },
  "door-mat": { w: 20, h: 6, anchor: "bottom", palette: { o: "#0b1020", m: "#a16207", M: "#713f12" }, frames: [doorMatGrid()] },
  book: { w: 12, h: 7, anchor: "bottom", palette: { o: "#0b1020", c: "#991b1b", p: "#f8f1d8", s: "#7f1d1d", t: "#64748b" }, frames: [bookGrid()] },
  "lodge-wall": { w: 16, h: 16, anchor: "bottom", palette: { o: "#0b1020", l: "#b07a45", L: "#8f5f33", d: "#7a4f28" }, frames: [lodgeWallGrid()] },
  skull: { w: 14, h: 10, anchor: "bottom", palette: { o: "#0b1020", w: "#f1ead6", k: "#2b2417" }, frames: [skullGrid()] },
  "bloom-cactus": { w: 18, h: 28, anchor: "bottom", palette: { o: "#0b1020", c: "#4d9e4d", G: "#2f7d3a", p: "#f472b6" }, frames: [bloomCactusGrid()] },
  arch: { w: 30, h: 24, anchor: "bottom", palette: { o: "#0b1020", r: "#c2763a", R: "#d99a5c", D: "#9a5a2a" }, frames: [archGrid()] },
  crown: { w: 12, h: 8, anchor: "bottom", palette: { o: "#0b1020", y: "#fbbf24", Y: "#f59e0b", r: "#dc2626" }, frames: [crownGrid()] },
  lizard: { w: 14, h: 9, anchor: "bottom", palette: { o: "#0b1020", z: "#6b8f3a", Z: "#8fb34a", e: "#f5d547" }, frames: [lizardGrid(0), lizardGrid(1)] },
};

export const TEXTURES: Record<TextureId, { grid: PixelGrid; palette: Palette }> = {
  floor: {
    palette: { a: "#b07a45", b: "#a06c3a", c: "#8a5a2e" },
    grid: [
      "aaaaabaaaaaaabaa",
      "aaabaaaaaabaaaaa",
      "cccccccccccccccc",
      "aaaaaaaabaaaaaba",
      "abaaaaaaaaabaaaa",
      "cccccccccccccccc",
      "aabaaaaaaaaaabaa",
      "aaaaaabaaabaaaaa",
      "cccccccccccccccc",
      "baaaaaaaabaaaaaa",
      "aaaabaaaaaaaaaba",
      "cccccccccccccccc",
      "aaaaaabaaaabaaaa",
      "abaaaaaaaaaaaaba",
      "cccccccccccccccc",
      "aaaabaaaaaaaaaaa",
    ],
  },
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
    palette: { f: "#24452a", l: "#2d5634", d: "#1b3520", m: "#36653a", p: "#4a5d3a" },
    grid: [
      "ffffffdfflffmmff",
      "flffffflfffmmfff",
      "fffffffffffffffl",
      "dlfffffdlfffffff",
      "fffpffffffdfdfdf",
      "fffdfffmmllflffd",
      "ffdlffmmmffffflf",
      "ffffffdfmflfdfdf",
      "ffffffffffffffff",
      "dffffffffffffflf",
      "fffffdfffpffdlfd",
      "fdffffffflffffff",
      "dffflfmmfffffffl",
      "dfdffffmmfffdfff",
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
  beach: { palette: { s: "#f1e0b0", d: "#dcc58a", w: "#fbf3d6" }, grid: beachGrid() },
  dune: { palette: { s: "#e2ac4c", d: "#c98f35", l: "#f0c874", r: "#d39a3d" }, grid: duneGrid() },
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
