import type { Point } from "../../game/types";
import type { ZoneId } from "../../game/zones";
import { VILLAGE_POINTS } from "../../render/areas/village";
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

/**
 * Each zone's landmark buttons: the tower and cache captions sit above them when they fit (off the
 * ice), as do Ada's and the signpost's.
 */
export const LANDMARK_CAPTIONS = [
  { id: "tower", zone: "peaks", sprite: "tower", point: LANDMARK_POINTS.tower, texts: ["[T] Tower", "[T] Tower ✓"], prefer: "above" },
  { id: "chest", zone: "peaks", sprite: "chest-closed", point: LANDMARK_POINTS.chest, texts: ["[X] Supply Cache", "[X] Empty Cache"], prefer: "above" },
  { id: "gate", zone: "peaks", sprite: "gate", point: LANDMARK_POINTS.gate, texts: ["[G] Gate"], prefer: "below" },
  { id: "villager", zone: "village", sprite: "explorer-down", point: VILLAGE_POINTS.villager, texts: ["[V] Ada"], prefer: "above" },
  { id: "signpost", zone: "village", sprite: "signpost", point: VILLAGE_POINTS.signpost, texts: ["[P] Signpost"], prefer: "above" },
] as const satisfies ReadonlyArray<{ id: string; zone: ZoneId; sprite: SpriteId; point: ArtPoint; texts: readonly string[]; prefer: "above" | "below" }>;

type Edges = { left: number; right: number; top: number; bottom: number };

const toEdges = (r: CssRect, world: WorldRect): Edges => ({
  left: r.left - world.left,
  right: r.left - world.left + r.width,
  top: r.top - world.top,
  bottom: r.top - world.top + r.height,
});

/** A zone's current caption chips and landmark drawings, as world-layer edges for labelLayout to avoid. */
export function landmarkCaptions(world: WorldRect, map: MapArea, state: { hasLoot: boolean; towerPowered: boolean }, zone: ZoneId = "peaks"): Edges[] {
  return LANDMARK_CAPTIONS.filter((l) => l.zone === zone).flatMap((l) => {
    const sprite = l.id === "chest" && state.hasLoot ? "chest-open" : l.sprite;
    const box = spriteBox(sprite, l.point);
    const text = l.id === "tower" ? l.texts[state.towerPowered ? 1 : 0] : l.id === "chest" ? l.texts[state.hasLoot ? 1 : 0] : l.texts[0];
    return [toEdges(captionRect(text, hitArea(box, world), map, l.prefer), world), toEdges(spriteCss(box, world), world)];
  });
}

/** Place names and exit signs, positioned in world percentages so they clear the landmarks and the dig spot. */
export const MAP_CAPTIONS = [
  { id: "peaks", zone: "peaks", at: { x: 40, y: 4 }, align: "centre" },
  { id: "river", zone: "peaks", at: { x: 42, y: 22 }, align: "centre" },
  { id: "forest", zone: "peaks", at: { x: 97, y: 98 }, align: "right-bottom" },
  { id: "village", zone: "village", at: { x: 40, y: 4 }, align: "centre" },
  { id: "west-exit", zone: "peaks", at: { x: 1, y: 88 }, align: "left-centre" },
  { id: "east-exit", zone: "village", at: { x: 99, y: 88 }, align: "right-centre" },
] as const satisfies ReadonlyArray<{ id: string; zone: ZoneId; at: Point; align: "centre" | "right-bottom" | "left-centre" | "right-centre" }>;
export type MapCaptionId = (typeof MAP_CAPTIONS)[number]["id"];

export function mapCaptionRect(id: MapCaptionId, text: string, world: WorldRect): CssRect {
  const caption = MAP_CAPTIONS.find((c) => c.id === id)!;
  const x = world.left + (caption.at.x / 100) * world.width;
  const y = world.top + (caption.at.y / 100) * world.height;
  const width = textWidth(text);
  switch (caption.align) {
    case "centre":
      return { left: x - width / 2, top: y - LINE_H / 2, width, height: LINE_H };
    case "left-centre":
      return { left: x, top: y - LINE_H / 2, width, height: LINE_H };
    case "right-centre":
      return { left: x - width, top: y - LINE_H / 2, width, height: LINE_H };
    case "right-bottom":
      return { left: x - width, top: y - LINE_H, width, height: LINE_H };
  }
}

/** Each zone's exit sign: which caption it is and what it says. */
export const EXIT_SIGNS: Record<ZoneId, { id: MapCaptionId; text: string }> = {
  peaks: { id: "west-exit", text: "← Dev Village" },
  village: { id: "east-exit", text: "C++ Peaks →" },
};

/** A zone's exit sign as world-layer edges, for labelLayout to avoid. */
export const exitSignBox = (world: WorldRect, zone: ZoneId): Edges => {
  const sign = EXIT_SIGNS[zone];
  return toEdges(mapCaptionRect(sign.id, sign.text, world), world);
};

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
