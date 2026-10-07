import { greyscale, gridRuns, mirror, rotate90, type Palette } from "./pixels";
import type { Scene } from "./scene";
import { SPRITES, TEXTURES, explorerPalette, spriteBox, type SpriteId, type TextureId } from "./sprites";
import { ICE_RECT, decorations, onPath, terrainAt } from "./terrain";
import { REACHABLE_RECT, intersects, type Rect, type WorldRect } from "./world";

/** The slice of CanvasRenderingContext2D the map uses (no paths, arcs or gradients: pixels only). */
export type Ctx2D = {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  drawImage(image: CanvasImageSource, x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  imageSmoothingEnabled: boolean;
};
export type MakeCanvas = (w: number, h: number) => { image: CanvasImageSource; ctx: Ctx2D } | null;
export type SpriteCache = { get(sprite: SpriteId, frame: number, variant: string, flip: boolean, rotate: boolean): CanvasImageSource | null };
export type GroundCache = { get(world: WorldRect): { image: CanvasImageSource; x: number; y: number } | null };

const DOWNED_HOOD = "#94a3b8";
const mod = (n: number, m: number) => ((n % m) + m) % m;

function paletteFor(sprite: SpriteId, variant: string): Palette {
  if (!sprite.startsWith("explorer")) return SPRITES[sprite].palette;
  return variant === "grey" ? greyscale(explorerPalette(DOWNED_HOOD)) : explorerPalette(variant);
}

/** One small canvas per sprite, frame and colour, built the first time it is needed. */
export function createSpriteCache(make: MakeCanvas): SpriteCache {
  const cache = new Map<string, CanvasImageSource | null>();
  return {
    get(sprite, frame, variant, flip, rotate) {
      const key = `${sprite}|${frame}|${variant}|${flip}|${rotate}`;
      if (cache.has(key)) return cache.get(key)!;
      let grid = SPRITES[sprite].frames[frame] ?? SPRITES[sprite].frames[0];
      if (flip) grid = mirror(grid);
      if (rotate) grid = rotate90(grid);
      const canvas = make(grid[0].length, grid.length);
      if (canvas) {
        for (const run of gridRuns(grid, paletteFor(sprite, variant))) {
          canvas.ctx.fillStyle = run.color;
          canvas.ctx.fillRect(run.x, run.y, run.w, 1);
        }
      }
      const image = canvas?.image ?? null;
      cache.set(key, image);
      return image;
    },
  };
}

/** The art pixels the canvas shows for this world rect, scenery around the world included. */
export function visibleArt(world: WorldRect): Rect {
  const x = Math.floor(-world.ox / world.s);
  const y = Math.floor(-world.oy / world.s);
  return { x, y, w: Math.ceil((world.backingWidth - world.ox) / world.s) - x, h: Math.ceil((world.backingHeight - world.oy) / world.s) - y };
}

const ICE_BANK: Rect = { x: ICE_RECT.x - 1, y: ICE_RECT.y - 1, w: ICE_RECT.w + 2, h: ICE_RECT.h + 2 };
const inRect = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

function groundTexture(x: number, y: number): TextureId {
  const kind = terrainAt(x, y);
  if (kind === "ice") return "ice";
  if (inRect(x, y, ICE_BANK)) return "bank";
  if (onPath(x, y)) return "path";
  return kind;
}

/** Static terrain, the path and the decorations outside the walkable area, at art resolution. */
export function createGroundCache(make: MakeCanvas, sprites: SpriteCache): GroundCache {
  let key = "";
  let cached: ReturnType<GroundCache["get"]> = null;
  return {
    get(world) {
      const next = `${world.backingWidth},${world.backingHeight},${world.s},${world.ox},${world.oy}`;
      if (next === key) return cached;
      key = next;
      const area = visibleArt(world);
      const canvas = make(area.w, area.h);
      cached = null;
      if (!canvas) return null;
      const { ctx } = canvas;
      for (let y = area.y; y < area.y + area.h; y++) {
        let runStart = area.x;
        let runColor = "";
        const flush = (end: number) => {
          if (runColor) {
            ctx.fillStyle = runColor;
            ctx.fillRect(runStart - area.x, y - area.y, end - runStart, 1);
          }
        };
        for (let x = area.x; x < area.x + area.w; x++) {
          const tex = TEXTURES[groundTexture(x, y)];
          const color = tex.palette[tex.grid[mod(y, 16)][mod(x, 16)]];
          if (color !== runColor) {
            flush(x);
            runStart = x;
            runColor = color;
          }
        }
        flush(area.x + area.w);
      }
      const baked = decorations(area)
        .filter((d) => !intersects(spriteBox(d.sprite, d.at), REACHABLE_RECT))
        .sort((a, b) => a.at.y - b.at.y);
      for (const d of baked) {
        const image = sprites.get(d.sprite, 0, "base", false, false);
        const box = spriteBox(d.sprite, d.at);
        if (image) ctx.drawImage(image, box.x - area.x, box.y - area.y);
      }
      cached = { image: canvas.image, x: area.x, y: area.y };
      return cached;
    },
  };
}

/** Paints one frame. Every call restores the context state a canvas resize resets. */
export function paintScene(ctx: Ctx2D, scene: Scene, world: WorldRect, sprites: SpriteCache, ground: GroundCache): void {
  const { s, ox, oy, backingWidth, backingHeight } = world;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, backingWidth, backingHeight);
  ctx.setTransform(s, 0, 0, s, ox, oy);

  const g = ground.get(world);
  if (g) ctx.drawImage(g.image, g.x, g.y);
  const pixels = (list: Scene["light"]) => {
    for (const p of list) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 1, 1);
    }
    ctx.globalAlpha = 1;
  };
  pixels(scene.glints);
  for (const d of [...scene.flat, ...scene.upright, scene.drone]) {
    const image = sprites.get(d.sprite, d.frame, d.variant, d.flip, d.rotate);
    if (image) ctx.drawImage(image, d.x, d.y);
  }
  if (scene.tint !== "transparent") {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = scene.tint;
    ctx.fillRect(0, 0, backingWidth, backingHeight);
    ctx.setTransform(s, 0, 0, s, ox, oy);
  }
  pixels(scene.light);
}
