import { describe, expect, it } from "vitest";
import { shade } from "./pixels";
import { LIGHTS, OUTLINE, SPRITES, TEXTURES, explorerPalette, spriteBox, type SpriteId } from "./sprites";

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
