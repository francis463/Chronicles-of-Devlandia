import { BOUNDS } from "../game/constants";
import type { Point } from "../game/types";
import { ZONE_SCALE } from "../game/zoneSize";
import type { ZoneId } from "../game/zones";

/** The map's art resolution: one art pixel is drawn as a whole number of device pixels. */
export const WORLD = { width: 320, height: 180 } as const;

/** Covers columns x … x+w−1 and rows y … y+h−1, in art pixels. */
export type Rect = { x: number; y: number; w: number; h: number };
export type ArtPoint = { x: number; y: number };

/** A zone's world in art pixels. */
export type WorldSize = { width: number; height: number };

/** One screen: the 320 × 180 unit the art and the effects are authored in. */
export const SCREEN: WorldSize = WORLD;

/** How many screens wide a world is (2 for a 640-wide world). */
export const worldScale = (world: WorldSize): number => world.width / SCREEN.width;

/** The top-left corner of every screen a world is made of, row by row. */
export function screenOffsets(world: WorldSize): ArtPoint[] {
  const k = worldScale(world);
  return Array.from({ length: k * (world.height / SCREEN.height) }, (_, n) => ({ x: (n % k) * SCREEN.width, y: Math.floor(n / k) * SCREEN.height }));
}

/** A zone's world: the 320 × 180 screen times the zone's scale (`ZONE_SCALE`). */
export const zoneWorld = (zone: ZoneId): WorldSize => ({ width: WORLD.width * ZONE_SCALE[zone], height: WORLD.height * ZONE_SCALE[zone] });

/** Where the player can stand: the game's BOUNDS (x 6–94 %, y 10–90 %) in art pixels, in a world of any size. */
export function reachableRect(world: WorldSize = WORLD): Rect {
  const lo = toArt({ x: BOUNDS.minX, y: BOUNDS.minY }, world);
  const hi = toArt({ x: BOUNDS.maxX, y: BOUNDS.maxY }, world);
  return { x: lo.x, y: lo.y, w: hi.x - lo.x + 1, h: hi.y - lo.y + 1 };
}

export const REACHABLE_RECT: Rect = reachableRect();

export const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/** A game point (percent of a zone) as an art pixel of that zone's world. */
export const zoneToArt = (p: Point, zone: ZoneId): ArtPoint => toArt(p, zoneWorld(zone));

/** A game point (percent of the zone) as an art pixel of that zone's world (the 320 × 180 screen unless told otherwise). */
export function toArt(p: Point, world: WorldSize = WORLD): ArtPoint {
  return { x: Math.round((p.x / 100) * world.width), y: Math.round((p.y / 100) * world.height) };
}

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

/** The largest whole number of device pixels per art pixel at which `world` (one screen unless told otherwise) fits the view; at least 1. */
export const fitStep = ({ width, height, dpr }: ViewSize, world: WorldSize = SCREEN): number =>
  Math.max(1, Math.floor(Math.min(width / world.width, height / world.height) * dpr));

/** How many zoom steps (one more device pixel per art pixel each) the controls offer past the screen's fit. */
export const MAX_ZOOM = 3;

/**
 * The zoom steps a world allows, relative to the scale a one-screen world gets: never below 0 for one screen, and
 * for a bigger world down to the scale at which the whole of it fits ("Whole map").
 */
export function zoomRange(size: ViewSize, world: WorldSize): { min: number; max: number } {
  return { min: Math.min(0, fitStep(size, world) - fitStep(size)), max: MAX_ZOOM };
}

/**
 * The zoom a map starts at. Whole-pixel scaling can leave wide empty bands round the world (a 900×600 view fits it at
 * 2×, using 71% of the width); when the bands are that big, one step up fills the view and the camera follows the player.
 */
export function autoZoom(size: ViewSize): number {
  const s = fitStep(size);
  const room = Math.min(size.width / (SCREEN.width * (s / size.dpr)), size.height / (SCREEN.height * (s / size.dpr)));
  return room >= 1.25 ? 1 : 0;
}

/** The zoom as a multiple of the screen's fit, for its label: 1×, 1.5×, 2×…; "Whole map" at a big world's lowest zoom. */
export function zoomLabel(size: ViewSize, zoom: number, world: WorldSize = SCREEN): string {
  const { min } = zoomRange(size, world);
  if (min < 0 && zoom <= min) return "Whole map";
  return `${Math.round(((fitStep(size) + zoom) / fitStep(size)) * 10) / 10}×`;
}

/**
 * `world` placed in the map area at `zoom` steps past a one-screen world's fit (clamped to `zoomRange`). Where the world is
 * larger than the area in a direction it scrolls so `focus` (the player, in art pixels) stays in the middle, never showing
 * beyond the world's edges; where it is smaller it is centred.
 */
export function fitWorld(size: ViewSize, zoom = 0, focus: ArtPoint = { x: SCREEN.width / 2, y: SCREEN.height / 2 }, world: WorldSize = SCREEN): WorldRect {
  const { width, height, dpr } = size;
  const { min } = zoomRange(size, world);
  const s = Math.max(1, fitStep(size) + Math.max(min, Math.round(zoom)));
  const scale = s / dpr;
  const backingWidth = Math.round(width * dpr);
  const backingHeight = Math.round(height * dpr);
  const place = (backing: number, extent: number, at: number, css: number) =>
    extent * s <= backing ? Math.round(((css - extent * scale) / 2) * dpr) : Math.min(0, Math.max(backing - extent * s, Math.round(backing / 2 - (at + 0.5) * s)));
  const ox = place(backingWidth, world.width, focus.x, width);
  const oy = place(backingHeight, world.height, focus.y, height);
  return {
    s,
    scale,
    ox,
    oy,
    left: ox / dpr,
    top: oy / dpr,
    width: world.width * scale,
    height: world.height * scale,
    backingWidth,
    backingHeight,
  };
}
