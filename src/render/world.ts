import type { Point } from "../game/types";

/** The map's art resolution: one art pixel is drawn as a whole number of device pixels. */
export const WORLD = { width: 320, height: 180 } as const;

/** Covers columns x … x+w−1 and rows y … y+h−1, in art pixels. */
export type Rect = { x: number; y: number; w: number; h: number };
export type ArtPoint = { x: number; y: number };

/** Where the player can stand: the game's BOUNDS (x 6–94 %, y 10–90 %) in art pixels. */
export const REACHABLE_RECT: Rect = { x: 19, y: 18, w: 283, h: 145 };

export const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/** A game point (percent of the world) as an art pixel. */
export const toArt = (p: Point): ArtPoint => ({
  x: Math.round((p.x / 100) * WORLD.width),
  y: Math.round((p.y / 100) * WORLD.height),
});

export type ViewSize = { width: number; height: number; dpr: number };

/**
 * Where the world sits in the map area. `s` device px per art px (a whole number, so pixels stay
 * square and sharp); `scale` CSS px per art px; `ox`/`oy` the world's offset in device px;
 * `left`/`top`/`width`/`height` the world in CSS px; backing = the canvas size in device px.
 */
export type WorldRect = {
  s: number;
  scale: number;
  ox: number;
  oy: number;
  left: number;
  top: number;
  width: number;
  height: number;
  backingWidth: number;
  backingHeight: number;
};

export function fitWorld({ width, height, dpr }: ViewSize): WorldRect {
  const s = Math.max(1, Math.floor(Math.min(width / WORLD.width, height / WORLD.height) * dpr));
  const scale = s / dpr;
  const ox = Math.round(((width - WORLD.width * scale) / 2) * dpr);
  const oy = Math.round(((height - WORLD.height * scale) / 2) * dpr);
  return {
    s,
    scale,
    ox,
    oy,
    left: ox / dpr,
    top: oy / dpr,
    width: WORLD.width * scale,
    height: WORLD.height * scale,
    backingWidth: Math.round(width * dpr),
    backingHeight: Math.round(height * dpr),
  };
}
