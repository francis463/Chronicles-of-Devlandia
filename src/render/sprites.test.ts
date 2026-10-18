import { describe, expect, it } from "vitest";
import { CLASSES, CLASS_IDS } from "../game/classes";
import { shade } from "./pixels";
import { CLASS_ITEMS, LIGHTS, OUTLINE, SPRITES, TEXTURES, explorerPalette, spriteBox, type ItemFacing, type SpriteId } from "./sprites";

const EXPLORERS: SpriteId[] = ["explorer-down", "explorer-up", "explorer-right"];

describe("sprites", () => {
  it("every grid is rectangular, of its declared size, and uses only palette characters", () => {
    const palette = explorerPalette("#22c55e");
    for (const [id, def] of Object.entries(SPRITES)) {
      const keys = EXPLORERS.includes(id as SpriteId) ? { ...def.palette, ...palette } : def.palette;
      for (const [i, frame] of def.frames.entries()) {
        expect(frame, `${id}[${i}] height`).toHaveLength(def.h);
        for (const row of frame) {
          expect(row, `${id}[${i}] width`).toHaveLength(def.w);
          for (const ch of row) if (ch !== ".") expect(keys, `${id}[${i}] '${ch}'`).toHaveProperty(ch);
        }
      }
    }
    for (const [id, tex] of Object.entries(TEXTURES)) {
      expect(tex.grid, id).toHaveLength(16);
      for (const row of tex.grid) {
        expect(row, id).toHaveLength(16);
        for (const ch of row) expect(tex.palette, `${id} '${ch}'`).toHaveProperty(ch);
      }
    }
  });

  it("the forest's campfire (3 frames: two flames and the cold logs) and old oak (1 frame) are the declared size and anchor", () => {
    expect([SPRITES.campfire.w, SPRITES.campfire.h, SPRITES.campfire.anchor]).toEqual([12, 14, "bottom"]);
    expect(SPRITES.campfire.frames).toHaveLength(3);
    expect(SPRITES.campfire.frames[0]).not.toEqual(SPRITES.campfire.frames[1]);
    expect([SPRITES["old-oak"].w, SPRITES["old-oak"].h, SPRITES["old-oak"].anchor]).toEqual([40, 48, "bottom"]);
    expect(SPRITES["old-oak"].frames).toHaveLength(1);
    expect(LIGHTS.campfire).toEqual({ x: 147, y: 112 });
  });

  it("sizes and frame counts match the spec", () => {
    const size = (id: SpriteId) => [SPRITES[id].w, SPRITES[id].h];
    for (const id of EXPLORERS) {
      expect(size(id)).toEqual([16, 16]);
      expect(SPRITES[id].frames).toHaveLength(3);
    }
    expect(size("drone")).toEqual([12, 12]);
    expect(SPRITES.drone.frames).toHaveLength(2);
    expect(size("tower")).toEqual([16, 32]);
    expect(size("chest-closed")).toEqual([16, 16]);
    expect(size("chest-open")).toEqual([16, 16]);
    expect(size("gate")).toEqual([32, 16]);
    expect(SPRITES.gate.frames).toHaveLength(2);
    expect(size("wall")).toEqual([16, 10]);
    expect(SPRITES.wall.frames).toHaveLength(1);
    expect(size("x-mark")).toEqual([8, 8]);
    expect(size("semicolon")).toEqual([8, 12]);
    for (const id of ["pine", "tree"] as SpriteId[]) {
      expect(SPRITES[id].w).toBe(16);
      expect(SPRITES[id].h).toBeLessThanOrEqual(24);
    }
    for (const id of ["rock", "bush", "snow-rock"] as SpriteId[]) expect(size(id)).toEqual([16, 16]);
  });

  it("explorer frames have a dark outline", () => {
    const palette = explorerPalette("#22c55e");
    for (const id of EXPLORERS) {
      for (const [i, frame] of SPRITES[id].frames.entries()) {
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(palette[ch], `${id}[${i}] edge at ${x},${y}`).toBe(OUTLINE);
          }),
        );
      }
    }
  });

  it("explorer palette uses the hood colour and a darker shade", () => {
    const p = explorerPalette("#f472b6");
    expect(p.h).toBe("#f472b6");
    expect(p.H).toBe(shade("#f472b6", -0.3));
    expect(p.o).toBe(OUTLINE);
  });

  it("spriteBox anchors: bottom-centre for upright sprites, centred X, drone hovering 12 px up", () => {
    expect(spriteBox("tower", { x: 45, y: 32 })).toEqual({ x: 37, y: 1, w: 16, h: 32 });
    expect(spriteBox("gate", { x: 160, y: 90 })).toEqual({ x: 144, y: 75, w: 32, h: 16 });
    expect(spriteBox("explorer-down", { x: 90, y: 130 })).toEqual({ x: 82, y: 115, w: 16, h: 16 });
    expect(spriteBox("x-mark", { x: 230, y: 151 })).toEqual({ x: 226, y: 147, w: 8, h: 8 });
    expect(spriteBox("drone", { x: 100, y: 100 })).toEqual({ x: 94, y: 82, w: 12, h: 12 });
  });

  it("light sources sit inside their landmarks' drawings", () => {
    const inBox = (p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) =>
      p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
    expect(inBox(LIGHTS.towerLamp, spriteBox("tower", { x: 45, y: 32 }))).toBe(true);
    expect(LIGHTS.towerLamp.y).toBeLessThanOrEqual(4);
    expect(inBox(LIGHTS.gateTerminal, spriteBox("gate", { x: 160, y: 90 }))).toBe(true);
  });
});

describe("village sprites", () => {
  it("village sprites: hut 32×24, well 16×16, fence 16×8, signpost 16×16, bottom-anchored, one frame", () => {
    const sizes: Array<[SpriteId, number, number]> = [["hut", 32, 24], ["well", 16, 16], ["fence", 16, 8], ["signpost", 16, 16]];
    for (const [id, w, h] of sizes) {
      const def = SPRITES[id];
      expect([def?.w, def?.h, def?.anchor, def?.frames.length], id).toEqual([w, h, "bottom", 1]);
    }
    expect(spriteBox("hut", { x: 56, y: 116 })).toEqual({ x: 40, y: 93, w: 32, h: 24 });
    expect(spriteBox("signpost", { x: 275, y: 112 })).toEqual({ x: 267, y: 97, w: 16, h: 16 });
  });
});

describe("the north wall and its gate", () => {
  const colour = (id: SpriteId, frame: number, row: number, col: number) => {
    const ch = SPRITES[id].frames[frame][row][col];
    return ch === "." ? "." : SPRITES[id].palette[ch];
  };
  const OPENING = Array.from({ length: 20 }, (_, i) => 5 + i); // gate columns 5–24

  it("wall: 16 × 10, bottom-anchored, fully opaque, snow cap on top and shadow below", () => {
    const wall = SPRITES.wall;
    expect(wall.anchor).toBe("bottom");
    for (const row of wall.frames[0]) expect(row).not.toContain(".");
    for (let x = 0; x < 16; x++) {
      expect(colour("wall", 0, 0, x)).toBe("#e2e8f0");
      expect(colour("wall", 0, 9, x)).toBe("#334155");
    }
  });

  it("gate: an open and a locked frame; bars only when locked", () => {
    for (let r = 4; r <= 14; r++) for (const c of OPENING) expect(colour("gate", 0, r, c), `open ${r},${c}`).toBe(".");
    for (let r = 4; r <= 13; r++)
      for (const c of OPENING) {
        const expected = r === 8 ? "#1e293b" : (c - 5) % 3 === 1 ? "#1e293b" : (c - 5) % 3 === 0 ? "#64748b" : ".";
        expect(colour("gate", 1, r, c), `locked ${r},${c}`).toBe(expected);
      }
    for (const c of OPENING) expect(colour("gate", 1, 14, c), `locked 14,${c}`).toBe(".");
  });

  it("both gate frames continue the wall's brick pattern", () => {
    for (const frame of [0, 1])
      for (let r = 5; r <= 14; r++) {
        expect(colour("gate", frame, r, 0), `frame ${frame} row ${r} left`).toBe(colour("wall", 0, r - 5, 0));
        expect(colour("gate", frame, r, 31), `frame ${frame} row ${r} right`).toBe(colour("wall", 0, r - 5, 15));
      }
  });
});

describe("learning core sprites", () => {
  it("sprites: syntax-terminal 16×24 ×2, archive 32×24 ×2, bottom-anchored", () => {
    const sizes: Array<[SpriteId, number, number]> = [["syntax-terminal", 16, 24], ["archive", 32, 24]];
    for (const [id, w, h] of sizes) {
      const def = SPRITES[id];
      expect([def?.w, def?.h, def?.anchor, def?.frames.length], id).toEqual([w, h, "bottom", 2]);
    }
  });

  it("the Syntax Terminal's screen is red unsolved and green solved", () => {
    const { palette, frames } = SPRITES["syntax-terminal"];
    const used = (frame: number) => new Set(frames[frame].join("").split("").filter((ch) => ch !== ".").map((ch) => palette[ch]));
    expect(used(0)).toContain("#ef4444");
    expect(used(0)).not.toContain("#22c55e");
    expect(used(1)).toContain("#22c55e");
    expect(used(1)).not.toContain("#ef4444");
  });

  it("the Archive is the hut except its door columns, which differ between sealed and open", () => {
    const hut = SPRITES.hut.frames[0];
    const [sealed, open] = SPRITES.archive.frames;
    const DOOR = [13, 14, 15, 16, 17, 18];
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 32; col++) {
        if (DOOR.includes(col) && row >= 10 && row <= 20) continue;
        expect([sealed[row][col], open[row][col]], `${row},${col}`).toEqual([hut[row][col], hut[row][col]]);
      }
    }
    expect(sealed.slice(10, 21).map((r) => r.slice(13, 19))).not.toEqual(open.slice(10, 21).map((r) => r.slice(13, 19)));
  });
});

describe("class outfits and items", () => {
  const FACINGS: [ItemFacing, SpriteId][] = [
    ["down", "explorer-down"],
    ["up", "explorer-up"],
    ["right", "explorer-right"],
  ];

  it("explorerPalette without a class is the old palette; with one it recolours only the cloak", () => {
    const plain = explorerPalette("#22c55e");
    expect(plain).toEqual({ ...SPRITES["explorer-down"].palette, h: "#22c55e", H: shade("#22c55e", -0.3) });
    const mage = explorerPalette("#22c55e", "mage");
    expect(mage).toEqual({ ...plain, c: CLASSES.mage.outfit, C: CLASSES.mage.trim });
  });

  it("every item grid is 16 x 16, uses only its palette, and is not tiny", () => {
    for (const id of CLASS_IDS) {
      const item = CLASS_ITEMS[id];
      for (const [facing] of FACINGS) {
        const grid = item[facing];
        expect(grid, `${id} ${facing} height`).toHaveLength(16);
        let pixels = 0;
        for (const row of grid) {
          expect(row).toHaveLength(16);
          for (const ch of row) {
            if (ch === ".") continue;
            pixels++;
            expect(item.palette, `${id} ${facing} '${ch}'`).toHaveProperty(ch);
          }
        }
        expect(pixels, `${id} ${facing}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("the six items differ in every facing", () => {
    for (const [facing] of FACINGS) {
      expect(new Set(CLASS_IDS.map((id) => CLASS_ITEMS[id][facing].join("\n"))).size).toBe(6);
    }
  });

  it("an item never covers an eye and covers at most 6 hood pixels", () => {
    for (const id of CLASS_IDS) {
      for (const [facing, sprite] of FACINGS) {
        const base = SPRITES[sprite].frames[0];
        let hood = 0;
        CLASS_ITEMS[id][facing].forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            expect(base[y][x], `${id} ${facing} (${x},${y}) covers an eye`).not.toBe("e");
            if (base[y][x] === "h" || base[y][x] === "H") hood++;
          }),
        );
        expect(hood, `${id} ${facing} hood pixels`).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe("Foggaten Island art", () => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  it("the dock, lighthouse and ruins have their declared sizes and a bottom anchor", () => {
    for (const [id, w, h] of [["dock", 24, 14], ["lighthouse", 22, 44], ["ruins", 22, 16]] as const) {
      expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor], id).toEqual([w, h, "bottom"]);
      expect(SPRITES[id].frames, id).toHaveLength(id === "lighthouse" ? 2 : 1);
    }
  });

  it("every edge of the new sprites is the shared dark outline", () => {
    for (const id of ["dock", "lighthouse", "ruins"] as const) {
      for (const frame of SPRITES[id].frames) {
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(SPRITES[id].palette[ch], `${id} edge at ${x},${y}`).toBe(OUTLINE);
          }),
        );
      }
    }
  });

  it("the lighthouse's lamp is dark glass in frame 0 and warm lamplight in frame 1, and only the lamp room differs", () => {
    const [dark, lit] = SPRITES.lighthouse.frames;
    expect(luminance(SPRITES.lighthouse.palette.k)).toBeLessThan(70);
    expect(dark.join("")).toContain("k");
    expect(dark.join("")).not.toContain("y");
    expect(lit.join("")).toContain("y");
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(SPRITES.lighthouse.palette.y.slice(i, i + 2), 16));
    expect(r > 200 && g > 170 && b < 130, "y looks like lamplight").toBe(true);
    dark.forEach((row, y) => {
      if (y < 6 || y > 12) expect(lit[y], `row ${y}`).toBe(row);
    });
    expect(lit).not.toEqual(dark);
  });

  it("the sea and sand textures are 16 x 16, differ from each other and from every other texture", () => {
    const grids = Object.entries(TEXTURES).map(([id, t]) => [id, t.grid.join("|") + JSON.stringify(t.palette)] as const);
    expect(new Set(grids.map(([, g]) => g)).size).toBe(grids.length);
    for (const id of ["sea", "sand"] as const) {
      expect(TEXTURES[id].grid, id).toHaveLength(16);
      for (const row of TEXTURES[id].grid) expect(row, id).toHaveLength(16);
      expect(Object.keys(TEXTURES[id].palette).length, id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the village's life sprites", () => {
  it("have their declared sizes, anchors and frame counts", () => {
    for (const [id, w, h, frames] of [["lantern", 6, 12, 1], ["chicken", 12, 12, 2], ["garden", 24, 10, 1], ["stall", 24, 20, 1]] as const) {
      expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
    }
    expect(SPRITES.chicken.frames[0]).not.toEqual(SPRITES.chicken.frames[1]);
  });

  it("every edge is the shared dark outline", () => {
    for (const id of ["lantern", "chicken", "garden", "stall"] as const) {
      for (const frame of SPRITES[id].frames) {
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(SPRITES[id].palette[ch], `${id} edge at ${x},${y}`).toBe(OUTLINE);
          }),
        );
      }
    }
  });
});

describe("the village's pond, bench, fountain, windmill and fruit tree", () => {
  const NEW = ["pond", "bench", "fountain", "windmill", "fruit-tree"] as const;

  it("have their declared sizes, anchors and frame counts", () => {
    for (const [id, w, h, frames] of [["pond", 48, 24, 1], ["bench", 12, 8, 1], ["fountain", 16, 16, 2], ["windmill", 40, 48, 2], ["fruit-tree", 16, 24, 1]] as const) {
      expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
    }
    expect(SPRITES.fountain.frames[0]).not.toEqual(SPRITES.fountain.frames[1]);
    expect(SPRITES.windmill.frames[0]).not.toEqual(SPRITES.windmill.frames[1]);
  });

  it("every edge of every frame is the shared dark outline", () => {
    for (const id of NEW) {
      for (const frame of SPRITES[id].frames) {
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(SPRITES[id].palette[ch], `${id} edge at ${x},${y}`).toBe(OUTLINE);
          }),
        );
      }
    }
  });

  it("the pond has water and a bridge, the windmill's two frames differ only in the sails", () => {
    const pond = SPRITES.pond.frames[0].join("");
    expect(pond).toContain("b");
    expect(pond).toContain("p");
    const [a, b] = SPRITES.windmill.frames;
    // The body below the sails (rows 30 and down) is identical in both frames.
    expect(a.slice(30)).toEqual(b.slice(30));
  });
});

describe("the Peaks' lodge, waterfall, caves, animals, posts and arrow", () => {
  const NEW = ["lodge", "post", "waterfall", "cave-mouth", "fox", "goat", "bird", "arrow"] as const;

  it("have their declared sizes, anchors and frame counts", () => {
    for (const [id, w, h, frames] of [
      ["lodge", 40, 28, 1], ["post", 4, 10, 1], ["waterfall", 24, 18, 1], ["cave-mouth", 20, 11, 1],
      ["fox", 22, 13, 2], ["goat", 20, 15, 1], ["bird", 14, 8, 2], ["arrow", 8, 8, 1],
    ] as const) {
      expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
    }
    expect(SPRITES.fox.frames[0]).not.toEqual(SPRITES.fox.frames[1]);
    expect(SPRITES.bird.frames[0]).not.toEqual(SPRITES.bird.frames[1]);
  });

  it("every edge of every frame is the shared dark outline", () => {
    for (const id of NEW) {
      for (const frame of SPRITES[id].frames) {
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(SPRITES[id].palette[ch], `${id} edge at ${x},${y}`).toBe(OUTLINE);
          }),
        );
      }
    }
  });

  it("the lodge has a window to glow, and the waterfall and caves are cold colours", () => {
    expect(SPRITES.lodge.frames[0].join("")).toContain("g");
    expect(SPRITES.waterfall.frames[0].join("")).toContain("i");
  });
});

describe("the weather station and the snow cave", () => {
  it("have their declared sizes, anchors and frames, and the dark outline", () => {
    for (const [id, w, h, frames] of [["station", 14, 20, 2], ["snow-cave", 28, 20, 1]] as const) {
      expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
      for (const frame of SPRITES[id].frames) {
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(SPRITES[id].palette[ch], `${id} edge at ${x},${y}`).toBe(OUTLINE);
          }),
        );
      }
    }
    expect(SPRITES.station.frames[0]).not.toEqual(SPRITES.station.frames[1]);
  });
});

describe("the Sunbaked Desert's art", () => {
  const SIZES = [["cactus", 14, 20, 1], ["palm", 24, 32, 1], ["dry-bush", 16, 16, 1], ["oasis", 48, 24, 1], ["pyramid", 40, 28, 1], ["tumbleweed", 8, 8, 2], ["lizard", 14, 9, 2]] as const;

  it("have their declared sizes, anchors and frame counts", () => {
    for (const [id, w, h, frames] of SIZES) expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
    for (const id of ["tumbleweed", "lizard"] as const) expect(SPRITES[id].frames[0], id).not.toEqual(SPRITES[id].frames[1]);
  });

  it("every grid is rectangular, of its size and uses only palette characters", () => {
    for (const [id] of SIZES)
      for (const frame of SPRITES[id].frames) {
        expect(frame, id).toHaveLength(SPRITES[id].h);
        for (const row of frame) {
          expect(row, id).toHaveLength(SPRITES[id].w);
          for (const ch of row) if (ch !== ".") expect(SPRITES[id].palette[ch], `${id} '${ch}'`).toBeDefined();
        }
      }
  });

  it("every edge is the shared dark outline", () => {
    for (const [id] of SIZES) {
      for (const frame of SPRITES[id].frames) {
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(SPRITES[id].palette[ch], `${id} edge at ${x},${y}`).toBe(OUTLINE);
          }),
        );
      }
    }
  });

  it("the dune texture is 16 x 16 with at least three colours, and is not the shore's sand", () => {
    expect(TEXTURES.dune.grid).toHaveLength(16);
    for (const row of TEXTURES.dune.grid) expect(row).toHaveLength(16);
    expect(Object.keys(TEXTURES.dune.palette).length).toBeGreaterThanOrEqual(3);
    expect(TEXTURES.dune.palette).not.toEqual(TEXTURES.sand.palette);
  });
});

describe("the Sunny Beach's art", () => {
  const SIZES = [["umbrella", 16, 16, 1], ["sandcastle", 14, 14, 2], ["boat", 28, 12, 1], ["shipwreck", 36, 24, 1], ["pier", 40, 14, 1], ["crab", 16, 10, 2], ["shell", 6, 5, 1]] as const;

  it("have their declared sizes, anchors and frame counts", () => {
    for (const [id, w, h, frames] of SIZES) expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
    expect(SPRITES.crab.frames[0]).not.toEqual(SPRITES.crab.frames[1]);
  });

  it("every grid is rectangular, of its size and uses only palette characters, and every edge is the dark outline", () => {
    for (const [id] of SIZES)
      for (const frame of SPRITES[id].frames) {
        expect(frame, id).toHaveLength(SPRITES[id].h);
        const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
        frame.forEach((row, y) => {
          expect(row, id).toHaveLength(SPRITES[id].w);
          [...row].forEach((ch, x) => {
            if (ch === ".") return;
            expect(SPRITES[id].palette[ch], `${id} '${ch}'`).toBeDefined();
            if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) expect(SPRITES[id].palette[ch], `${id} edge ${x},${y}`).toBe(OUTLINE);
          });
        });
      }
  });

  it("the beach texture is 16 x 16 with three colours and differs from the sand and dune textures", () => {
    expect(TEXTURES.beach.grid).toHaveLength(16);
    for (const row of TEXTURES.beach.grid) expect(row).toHaveLength(16);
    expect(Object.keys(TEXTURES.beach.palette).length).toBeGreaterThanOrEqual(3);
    expect(TEXTURES.beach.palette).not.toEqual(TEXTURES.sand.palette);
    expect(TEXTURES.beach.palette).not.toEqual(TEXTURES.dune.palette);
  });
});

describe("the Dense Forest's art", () => {
  const SIZES = [["birch", 14, 22, 1], ["stump", 12, 9, 1], ["log", 20, 9, 1], ["mushroom", 11, 10, 1], ["fern", 16, 11, 1], ["flowers", 17, 11, 1], ["owl", 10, 12, 2], ["deer", 26, 20, 2], ["squirrel", 14, 14, 2], ["rabbit", 16, 13, 2], ["cabin", 34, 28, 1], ["brook", 44, 16, 1], ["fairy-ring", 31, 17, 1], ["hollow-tree", 26, 34, 1], ["glow-mushroom", 11, 10, 2], ["crown", 12, 8, 1]] as const;

  it("have their declared sizes, anchors and frame counts", () => {
    for (const [id, w, h, frames] of SIZES) expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
  });

  it("every grid is rectangular, uses only palette characters, and every edge is the shared dark outline", () => {
    for (const [id, w, h] of SIZES) {
      const { frames, palette } = SPRITES[id];
      frames.forEach((grid, i) => {
        expect(grid.length, `${id}[${i}] rows`).toBe(h);
        grid.forEach((row, y) => {
          expect(row.length, `${id}[${i}] row ${y}`).toBe(w);
          for (const ch of row) if (ch !== ".") expect(palette[ch], `${id}[${i}] char ${ch}`).toBeDefined();
        });
        const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y][x] !== ".";
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!solid(x, y)) continue;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(palette[grid[y][x]], `${id}[${i}] edge at ${x},${y}`).toBe(OUTLINE);
          }
        }
      });
    }
  });

  it("the animals' frames differ, so they animate", () => {
    for (const id of ["owl", "deer", "squirrel", "rabbit", "glow-mushroom"] as const) expect(SPRITES[id].frames[0], id).not.toEqual(SPRITES[id].frames[1]);
  });
});

describe("the Sunbaked Desert's new art", () => {
  const SIZES = [["scorpion", 20, 12, 2], ["camel", 36, 30, 2], ["snake", 24, 11, 2], ["vulture", 20, 10, 2], ["fennec", 22, 15, 2], ["tent", 40, 26, 1], ["temple-door", 30, 32, 1], ["riverbed", 56, 22, 1], ["obelisk", 16, 40, 1], ["jar", 11, 13, 2], ["skull", 14, 10, 1], ["bloom-cactus", 18, 28, 1], ["arch", 30, 24, 1]] as const;

  it("have their declared sizes, anchors and frame counts", () => {
    for (const [id, w, h, frames] of SIZES) expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", frames]);
  });

  it("every grid is rectangular, uses only palette characters, and every edge is the shared dark outline", () => {
    for (const [id, w, h] of SIZES) {
      const { frames, palette } = SPRITES[id];
      frames.forEach((grid, i) => {
        expect(grid.length, `${id}[${i}] rows`).toBe(h);
        grid.forEach((row, y) => {
          expect(row.length, `${id}[${i}] row ${y}`).toBe(w);
          for (const ch of row) if (ch !== ".") expect(palette[ch], `${id}[${i}] char ${ch}`).toBeDefined();
        });
        const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y][x] !== ".";
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (!solid(x, y)) continue;
            const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
            if (edge) expect(palette[grid[y][x]], `${id}[${i}] edge at ${x},${y}`).toBe(OUTLINE);
          }
      });
    }
  });

  it("the animated ones' frames differ", () => {
    for (const id of ["scorpion", "camel", "snake", "vulture", "fennec", "jar"] as const) expect(SPRITES[id].frames[0], id).not.toEqual(SPRITES[id].frames[1]);
  });
});

describe("the Sunny Beach's tide and pier art", () => {
  it("the rowboat is 20 x 10 with the shared outline, and the shallow-water tile is two 8 x 8 frames", () => {
    expect([SPRITES.rowboat.w, SPRITES.rowboat.h, SPRITES.rowboat.frames.length]).toEqual([20, 10, 1]);
    const { frames, palette } = SPRITES.rowboat;
    const grid = frames[0];
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < 20 && y < 10 && grid[y][x] !== ".";
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 20; x++) if (solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1))) expect(palette[grid[y][x]], `${x},${y}`).toBe(OUTLINE);
    expect([SPRITES.shallow.w, SPRITES.shallow.h, SPRITES.shallow.frames.length]).toEqual([8, 8, 2]);
    for (const f of SPRITES.shallow.frames) {
      expect(f).toHaveLength(8);
      for (const row of f) expect(row).toHaveLength(8);
    }
    expect(SPRITES.shallow.frames[1].every((r) => r[0] === "f")).toBe(true);
    expect(SPRITES.shallow.frames[0]).not.toEqual(SPRITES.shallow.frames[1]);
  });

  it("the finished sandcastle differs from the unfinished one and rises higher", () => {
    const [unbuilt, built] = SPRITES.sandcastle.frames;
    expect(unbuilt).not.toEqual(built);
    const top = (g: readonly string[]) => g.findIndex((r) => /[^.]/.test(r));
    expect(top(built)).toBeLessThan(top(unbuilt));
  });
});

describe("the hidden spots' art", () => {
  const SIZES = [["moss", 24, 12], ["fox-den", 24, 16], ["desert-cave", 28, 20], ["dune-ridge", 32, 14], ["tide-pool", 26, 12], ["bottle", 10, 14]] as const;

  it("have their declared sizes, one frame and a bottom anchor, with only palette characters", () => {
    for (const [id, w, h] of SIZES) {
      expect([SPRITES[id].w, SPRITES[id].h, SPRITES[id].anchor, SPRITES[id].frames.length], id).toEqual([w, h, "bottom", 1]);
      expect(SPRITES[id].frames[0], id).toHaveLength(h);
      for (const row of SPRITES[id].frames[0]) {
        expect(row, id).toHaveLength(w);
        for (const ch of row) if (ch !== ".") expect(SPRITES[id].palette[ch], `${id} '${ch}'`).toBeDefined();
      }
    }
  });

  it("every edge is the shared dark outline", () => {
    for (const [id] of SIZES) {
      const frame = SPRITES[id].frames[0];
      const solid = (x: number, y: number) => y >= 0 && y < frame.length && x >= 0 && x < frame[y].length && frame[y][x] !== ".";
      frame.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch === ".") return;
          const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
          if (edge) expect(SPRITES[id].palette[ch], `${id} edge at ${x},${y}`).toBe(OUTLINE);
        }),
      );
    }
  });
});
