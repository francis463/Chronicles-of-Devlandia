import type { PoiId, Point } from "../../game/types";
import type { ZoneId } from "../../game/zones";
import { CHESTS } from "../../learn/chests";
import type { ChestId } from "../../learn/types";
import { VILLAGE_POINTS } from "../../render/areas/village";
import { ARCHIVE_POINT, TERMINAL_POINT } from "../../render/learnPoints";
import { spriteBox, type SpriteId } from "../../render/sprites";
import { LANDMARK_POINTS } from "../../render/terrain";
import { toArt, type ArtPoint, type Rect, type WorldRect } from "../../render/world";

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
 * Two places' hit areas that would overlap are each cut back at the midline between their drawings
 * (across the wider gap), so a tap lands on the nearer place; an area never shrinks below its drawing.
 */
export function hitAreas(boxes: ReadonlyArray<{ id: string; box: Rect }>, world: WorldRect): Record<string, CssRect> {
  const drawn = boxes.map((b) => spriteCss(b.box, world));
  const edges = boxes.map((b) => {
    const r = hitArea(b.box, world);
    return { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height };
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = edges[i];
      const b = edges[j];
      if (!(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)) continue;
      const [w, e] = drawn[i].left <= drawn[j].left ? [i, j] : [j, i];
      const [n, s] = drawn[i].top <= drawn[j].top ? [i, j] : [j, i];
      const gapX = drawn[e].left - (drawn[w].left + drawn[w].width);
      const gapY = drawn[s].top - (drawn[n].top + drawn[n].height);
      // Drawings that overlap on both axes leave no fair line to cut along.
      if (gapX < 0 && gapY < 0) continue;
      if (gapX >= gapY) {
        const mid = drawn[w].left + drawn[w].width + gapX / 2;
        edges[w].right = Math.min(edges[w].right, mid);
        edges[e].left = Math.max(edges[e].left, mid);
      } else {
        const mid = drawn[n].top + drawn[n].height + gapY / 2;
        edges[n].bottom = Math.min(edges[n].bottom, mid);
        edges[s].top = Math.max(edges[s].top, mid);
      }
    }
  }
  return Object.fromEntries(boxes.map((b, k) => [b.id, { left: edges[k].left, top: edges[k].top, width: edges[k].right - edges[k].left, height: edges[k].bottom - edges[k].top }]));
}

export type LandmarkCaption = {
  id: PoiId;
  zone: ZoneId;
  sprite: SpriteId;
  point: ArtPoint;
  texts: readonly string[];
  prefer: "above" | "below";
  /** An outdoor chest: on a 1× map its caption shows only on hover, focus or while it is in reach. */
  chest?: ChestId;
};

/**
 * Each zone's buttons: the tower and cache captions sit above them when they fit (off the ice), as
 * do Ada's, the signpost's and the Archive's; chest captions take the chest table's side.
 */
export const LANDMARK_CAPTIONS: readonly LandmarkCaption[] = [
  { id: "tower", zone: "peaks", sprite: "tower", point: LANDMARK_POINTS.tower, texts: ["[T] Tower", "[T] Tower ✓"], prefer: "above" },
  { id: "chest", zone: "peaks", sprite: "chest-closed", point: LANDMARK_POINTS.chest, texts: ["[X] Supply Cache", "[X] Empty Cache"], prefer: "above" },
  { id: "gate", zone: "peaks", sprite: "gate", point: LANDMARK_POINTS.gate, texts: ["[G] Gate"], prefer: "below" },
  { id: "villager", zone: "village", sprite: "explorer-down", point: VILLAGE_POINTS.villager, texts: ["[V] Ada"], prefer: "above" },
  { id: "signpost", zone: "village", sprite: "signpost", point: VILLAGE_POINTS.signpost, texts: ["[P] Signpost"], prefer: "above" },
  { id: "terminal", zone: "village", sprite: "syntax-terminal", point: TERMINAL_POINT, texts: ["Terminal"], prefer: "below" },
  { id: "archive", zone: "village", sprite: "archive", point: ARCHIVE_POINT, texts: ["Archive", "C#", "C# ✓"], prefer: "above" },
  ...CHESTS.flatMap((c): LandmarkCaption[] =>
    c.at && c.caption ? [{ id: c.id as PoiId, zone: c.zone, sprite: "code-chest", point: toArt(c.at), texts: [c.badge, `${c.badge} ✓`], prefer: c.caption, chest: c.id }] : [],
  ),
];

/** What the map captions depend on. `reach` is the place in reach, whose chest caption shows at 1×. */
export type MapState = { hasLoot: boolean; towerPowered: boolean; badges?: readonly ChestId[]; archiveOpen?: boolean; reach?: PoiId | null };

/** Chest captions always show on maps at this scale and larger. */
export const CHEST_CAPTION_SCALE = 2;

/** A button's caption in the current state. */
export function captionText(l: LandmarkCaption, state: MapState): string {
  const earned = (id: ChestId) => !!state.badges?.includes(id);
  if (l.id === "tower") return l.texts[state.towerPowered ? 1 : 0];
  if (l.id === "chest") return l.texts[state.hasLoot ? 1 : 0];
  if (l.id === "archive") return l.texts[!state.archiveOpen ? 0 : earned("chest-cs") ? 2 : 1];
  if (l.chest) return l.texts[earned(l.chest) ? 1 : 0];
  return l.texts[0];
}

const spriteOf = (l: LandmarkCaption, state: MapState): SpriteId => (l.id === "chest" && state.hasLoot ? "chest-open" : l.sprite);

/** A zone's button hit areas, by place id, after the midline cuts. */
export const zoneHitAreas = (world: WorldRect, zone: ZoneId): Record<string, CssRect> =>
  hitAreas(LANDMARK_CAPTIONS.filter((l) => l.zone === zone).map((l) => ({ id: l.id, box: spriteBox(l.sprite, l.point) })), world);

type Edges = { left: number; right: number; top: number; bottom: number };

const toEdges = (r: CssRect, world: WorldRect): Edges => ({
  left: r.left - world.left,
  right: r.left - world.left + r.width,
  top: r.top - world.top,
  bottom: r.top - world.top + r.height,
});

/** A zone's showing caption chips and its drawings, as world-layer edges for labelLayout to avoid. */
export function landmarkCaptions(world: WorldRect, map: MapArea, state: MapState, zone: ZoneId = "peaks"): Edges[] {
  const hits = zoneHitAreas(world, zone);
  return LANDMARK_CAPTIONS.filter((l) => l.zone === zone).flatMap((l) => {
    const drawing = toEdges(spriteCss(spriteBox(spriteOf(l, state), l.point), world), world);
    if (l.chest && world.scale < CHEST_CAPTION_SCALE && state.reach !== l.id) return [drawing];
    return [toEdges(captionRect(captionText(l, state), hits[l.id], map, l.prefer), world), drawing];
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
