import type { Point } from "../../game/types";
import { spriteBox, type SpriteId } from "../../render/sprites";
import { LANDMARK_POINTS } from "../../render/terrain";
import type { ArtPoint, Rect, WorldRect } from "../../render/world";

// Text metrics of the 10 px uppercase tracking-widest JetBrains Mono used on the map:
// 6 px per character plus 1 px of letter spacing, on a 15 px line (preflight's 1.5).
export const CHAR_W = 7;
export const LINE_H = 15;
/** Landmark caption chip: px-1 py-0.5 and a 1 px border. */
export const CHIP = { padX: 4, padY: 2, border: 1 };
/** The [E] prompt: px-2 py-1 and a 1 px border. */
const PROMPT = { padX: 8, padY: 4, border: 1 };
const PROMPT_HALF_WIDTH = 104;
const EDGE = 2;

/** CSS px relative to the map area. */
export type CssRect = { left: number; top: number; width: number; height: number };
type MapArea = { width: number; height: number };

export const textWidth = (text: string): number => [...text].length * CHAR_W;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Where an art-pixel box is drawn, in CSS px. */
export const spriteCss = (box: Rect, world: WorldRect): CssRect => ({
  left: world.left + box.x * world.scale,
  top: world.top + box.y * world.scale,
  width: box.w * world.scale,
  height: box.h * world.scale,
});

/** A landmark's button: centred on its drawing, at least 44 × 44 CSS px. */
export function hitArea(spriteBox: Rect, world: WorldRect): CssRect {
  const drawn = spriteCss(spriteBox, world);
  const width = Math.max(44, drawn.width);
  const height = Math.max(44, drawn.height);
  return { left: drawn.left + drawn.width / 2 - width / 2, top: drawn.top + drawn.height / 2 - height / 2, width, height };
}

/**
 * A landmark's caption chip, 2 px above its hit area when preferred and there is room in the map
 * area, otherwise 2 px under it; shifted sideways only to stay ≥ 2 px inside the map area.
 */
export function captionRect(text: string, hit: CssRect, map: MapArea, prefer: "above" | "below" = "below"): CssRect {
  const width = textWidth(text) + 2 * (CHIP.padX + CHIP.border);
  const height = LINE_H + 2 * (CHIP.padY + CHIP.border);
  const left = clamp(hit.left + hit.width / 2 - width / 2, EDGE, map.width - EDGE - width);
  const above = hit.top - 2 - height;
  return { left, top: prefer === "above" && above >= EDGE ? above : hit.top + hit.height + 2, width, height };
}

/** The three landmark buttons: the tower and cache captions sit above them when they fit (off the ice). */
export const LANDMARK_CAPTIONS = [
  { id: "tower", sprite: "tower", texts: ["[T] Tower", "[T] Tower ✓"], prefer: "above" },
  { id: "chest", sprite: "chest-closed", texts: ["[X] Supply Cache", "[X] Empty Cache"], prefer: "above" },
  { id: "gate", sprite: "gate", texts: ["[G] Gate"], prefer: "below" },
] as const satisfies ReadonlyArray<{ id: keyof typeof LANDMARK_POINTS; sprite: SpriteId; texts: readonly string[]; prefer: "above" | "below" }>;

type Edges = { left: number; right: number; top: number; bottom: number };

/** The current caption chips and landmark drawings, as world-layer edges for labelLayout to avoid. */
export function landmarkCaptions(world: WorldRect, map: MapArea, state: { hasLoot: boolean; towerPowered: boolean }): Edges[] {
  const toEdges = (r: CssRect): Edges => ({
    left: r.left - world.left,
    right: r.left - world.left + r.width,
    top: r.top - world.top,
    bottom: r.top - world.top + r.height,
  });
  return LANDMARK_CAPTIONS.flatMap((l) => {
    const sprite = l.id === "chest" && state.hasLoot ? "chest-open" : l.sprite;
    const box = spriteBox(sprite, LANDMARK_POINTS[l.id]);
    const text = l.id === "tower" ? l.texts[state.towerPowered ? 1 : 0] : l.id === "chest" ? l.texts[state.hasLoot ? 1 : 0] : l.texts[0];
    return [toEdges(captionRect(text, hitArea(box, world), map, l.prefer)), toEdges(spriteCss(box, world))];
  });
}

/** Place names, positioned in world percentages so they clear the landmarks and the dig spot. */
export const MAP_CAPTIONS = [
  { id: "peaks", at: { x: 40, y: 4 }, align: "centre" },
  { id: "river", at: { x: 42, y: 22 }, align: "centre" },
  { id: "forest", at: { x: 97, y: 98 }, align: "right-bottom" },
] as const satisfies ReadonlyArray<{ id: string; at: Point; align: "centre" | "right-bottom" }>;
export type MapCaptionId = (typeof MAP_CAPTIONS)[number]["id"];

export function mapCaptionRect(id: MapCaptionId, text: string, world: WorldRect): CssRect {
  const caption = MAP_CAPTIONS.find((c) => c.id === id)!;
  const x = world.left + (caption.at.x / 100) * world.width;
  const y = world.top + (caption.at.y / 100) * world.height;
  const width = textWidth(text);
  return caption.align === "centre"
    ? { left: x - width / 2, top: y - LINE_H / 2, width, height: LINE_H }
    : { left: x - width, top: y - LINE_H, width, height: LINE_H };
}

/** The [E] prompt: 4 px above your head, or 4 px below your feet when there is no room above. */
export function promptRect(text: string, player: ArtPoint, world: WorldRect, map: MapArea): CssRect & { below: boolean } {
  const width = textWidth(text) + 2 * (PROMPT.padX + PROMPT.border);
  const height = LINE_H + 2 * (PROMPT.padY + PROMPT.border);
  // The feet row ay is drawn from ay·scale to (ay+1)·scale, so a 16 px explorer's head is at ay − 15.
  const feet = world.top + player.y * world.scale;
  const head = world.top + (player.y - 15) * world.scale;
  const centre = clamp(world.left + player.x * world.scale, PROMPT_HALF_WIDTH, map.width - PROMPT_HALF_WIDTH);
  const above = head - 4 - height;
  const below = above < EDGE;
  return { left: centre - width / 2, top: below ? feet + 4 : above, width, height, below };
}
