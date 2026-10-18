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

/** How far down the screen a backdrop puts its focus's feet, so a menu panel at the top leaves it in view. */
const FOCUS_DEPTH = 0.8;

/**
 * The world as a full-screen backdrop. It is scaled up by whole device pixels until it covers the
 * view, so every pixel shown belongs to the world and the ground bake is never larger than the world.
 * `focus` is centred across (as far as the world's edges allow) and its feet sit at least
 * FOCUS_DEPTH down the screen; any rows that exposes above the world are the mountains' band.
 */
export function backdropWorld({ width, height, dpr }: ViewSize, focus: ArtPoint): WorldRect {
  const backingWidth = Math.round(width * dpr);
  const backingHeight = Math.round(height * dpr);
  const s = Math.max(1, Math.ceil(Math.max(backingWidth / WORLD.width, backingHeight / WORLD.height)));
  const scale = s / dpr;
  const ox = Math.min(0, Math.max(backingWidth - WORLD.width * s, Math.round(backingWidth / 2 - (focus.x + 0.5) * s)));
  const oy = Math.max(Math.round((backingHeight - WORLD.height * s) / 2), Math.round(FOCUS_DEPTH * backingHeight - (focus.y + 1) * s));
  return {
    s,
    scale,
    ox,
    oy,
    left: ox / dpr,
    top: oy / dpr,
    width: WORLD.width * scale,
    height: WORLD.height * scale,
    backingWidth,
    backingHeight,
  };
}

/** The largest whole number of device pixels per art pixel at which the whole world fits the view (at least 1). */
export const fitStep = ({ width, height, dpr }: ViewSize): number => Math.max(1, Math.floor(Math.min(width / WORLD.width, height / WORLD.height) * dpr));

/** How many zoom steps (one more device pixel per art pixel each) the controls offer past "fit". */
export const MAX_ZOOM = 3;

/**
 * The zoom a map starts at. Whole-pixel scaling can leave wide empty bands round the world (a 900×600 view fits it at
 * 2×, using 71% of the width); when the bands are that big, one step up fills the view and the camera follows the player.
 */
export function autoZoom(size: ViewSize): number {
  const s = fitStep(size);
  const room = Math.min(size.width / (WORLD.width * (s / size.dpr)), size.height / (WORLD.height * (s / size.dpr)));
  return room >= 1.25 ? 1 : 0;
}

/** The zoom as a multiple of "fit", for its label: 1×, 1.5×, 2×… */
export const zoomLabel = (size: ViewSize, zoom: number): string => `${Math.round(((fitStep(size) + zoom) / fitStep(size)) * 10) / 10}×`;

/**
 * The world centred in the map area at `zoom` steps past fit. Once the world is larger than the area (zoomed in), it
 * scrolls so `focus` (the player, in art pixels) stays in the middle, never showing beyond the world's edges.
 */
export function fitWorld({ width, height, dpr }: ViewSize, zoom = 0, focus: ArtPoint = { x: WORLD.width / 2, y: WORLD.height / 2 }): WorldRect {
  const s = fitStep({ width, height, dpr }) + Math.max(0, Math.round(zoom));
  const scale = s / dpr;
  const backingWidth = Math.round(width * dpr);
  const backingHeight = Math.round(height * dpr);
  const place = (backing: number, size: number, at: number, css: number) =>
    size * s <= backing ? Math.round(((css - size * scale) / 2) * dpr) : Math.min(0, Math.max(backing - size * s, Math.round(backing / 2 - (at + 0.5) * s)));
  const ox = place(backingWidth, WORLD.width, focus.x, width);
  const oy = place(backingHeight, WORLD.height, focus.y, height);
  return {
    s,
    scale,
    ox,
    oy,
    left: ox / dpr,
    top: oy / dpr,
    width: WORLD.width * scale,
    height: WORLD.height * scale,
    backingWidth,
    backingHeight,
  };
}
