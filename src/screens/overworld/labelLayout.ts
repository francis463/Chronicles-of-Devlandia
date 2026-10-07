import type { Point } from "../../game/types";

export type LabelSide = "right" | "left" | "above" | "below";
/** shift: sideways offset of an above/below label; drop: how far it steps past the other sprite. */
export type LabelPlacement = { side: LabelSide; shift: number; drop?: number };
export type MapSize = { width: number; height: number };
/** A sprite's drawing relative to its anchor (the game point), in art px. */
export type MarkerBox = { left: number; right: number; top: number; bottom: number };
/** Another sprite the labels should stay off (the found semicolon, a teammate). */
export type Obstacle = Point & { box: MarkerBox };

/**
 * Edges of each sprite's drawing around its anchor. Explorers stand on their point (bottom-centre:
 * the feet row ay is drawn from ay to ay + 1, so the box ends one art px below the anchor); the
 * drone hovers centred 12 px above it.
 */
export const EXPLORER_BOX: MarkerBox = { left: -8, right: 8, top: -15, bottom: 1 };
export const DRONE_BOX: MarkerBox = { left: -6, right: 6, top: -18, bottom: -6 };
export const SEMICOLON_BOX: MarkerBox = { left: -4, right: 4, top: -11, bottom: 1 };

/** Edges in the world layer's CSS px. */
export type Box = { left: number; right: number; top: number; bottom: number };
type MarkerKind = "player" | "drone";

/** CSS px between a sprite's box and its label (ml-2 / mr-2 / mt-2 / mb-2). */
export const LABEL_GAP = 8;
const EDGE = 2; // keep shifted labels this far inside the world

// Label sizes are the rendered 10px uppercase JetBrains Mono widths ("[PLAYER]" 56px,
// "[AI DRONE]" 70px) plus slack for the fallback monospace font.
const MARKERS: Record<MarkerKind, { box: MarkerBox; width: number; height: number }> = {
  player: { box: EXPLORER_BOX, width: 62, height: 15 },
  drone: { box: DRONE_BOX, width: 76, height: 15 },
};

// Earlier entries are preferred; the defaults (right) win whenever nothing collides.
const PREFERENCES: Record<MarkerKind, LabelSide[]> = {
  player: ["right", "left", "below", "above"],
  drone: ["right", "left", "above", "below"],
};

type Candidate = { side: LabelSide; align: number };

/** Side labels as-is; above/below labels centred, then hanging left or right of the sprite. */
function candidates(kind: MarkerKind, scale: number): Candidate[] {
  const { width, box } = MARKERS[kind];
  const hang = width / 2 - ((box.right - box.left) * scale) / 2;
  const sides = PREFERENCES[kind];
  const vertical = sides.filter((s) => s === "above" || s === "below");
  return [
    ...sides.map((side) => ({ side, align: 0 })),
    ...vertical.flatMap((side) => [
      { side, align: -hang },
      { side, align: hang },
    ]),
  ];
}

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const toPx = (p: Point, map: MapSize) => ({ x: (p.x / 100) * map.width, y: (p.y / 100) * map.height });

const spriteBoxAt = (p: Point, box: MarkerBox, map: MapSize, scale: number): Box => {
  const c = toPx(p, map);
  return { left: c.x + box.left * scale, right: c.x + box.right * scale, top: c.y + box.top * scale, bottom: c.y + box.bottom * scale };
};

function placeLabel(
  p: Point,
  kind: MarkerKind,
  side: LabelSide,
  map: MapSize,
  scale: number,
  desiredShift = 0,
  avoid?: Box,
  fixedDrop?: number,
): { box: Box; shift: number; drop: number } {
  const { box, width, height } = MARKERS[kind];
  const s = spriteBoxAt(p, box, map, scale);
  const midX = (s.left + s.right) / 2;
  const midY = (s.top + s.bottom) / 2;
  if (side === "right" || side === "left") {
    const left = side === "right" ? s.right + LABEL_GAP : s.left - LABEL_GAP - width;
    // Centred on the sprite, but slid down or up to stay inside the world (the drone hovers at the top edge).
    const top = Math.min(Math.max(midY - height / 2, 0), map.height - height);
    return { box: { left, right: left + width, top, bottom: top + height }, shift: 0, drop: 0 };
  }
  const wantedLeft = midX - width / 2 + desiredShift;
  const clamp =
    wantedLeft < EDGE ? EDGE - wantedLeft : wantedLeft + width > map.width - EDGE ? map.width - EDGE - (wantedLeft + width) : 0;
  const shift = desiredShift + clamp;
  const centredLeft = midX - width / 2;
  const top = side === "above" ? s.top - LABEL_GAP - height : s.bottom + LABEL_GAP;
  const left = centredLeft + shift;
  let drop = fixedDrop ?? 0;
  // When the other sprite is in the way (the drone hovers over the player's head), step past it.
  if (fixedDrop === undefined && avoid && overlaps({ left, right: left + width, top, bottom: top + height }, avoid)) {
    drop = side === "above" ? avoid.top - LABEL_GAP - height - top : avoid.bottom + LABEL_GAP - top;
  }
  return { box: { left, right: left + width, top: top + drop, bottom: top + drop + height }, shift, drop };
}

const offMap = (a: Box, map: MapSize) => a.left < 0 || a.top < 0 || a.right > map.width || a.bottom > map.height;

/** CSS-px boxes for both sprites and both labels under a given layout (used by tests and the chooser). */
export function labelBoxes(
  player: Point,
  drone: Point,
  map: MapSize,
  layout: { player: LabelPlacement; drone: LabelPlacement },
  scale = 1,
) {
  return {
    playerDot: spriteBoxAt(player, EXPLORER_BOX, map, scale),
    droneDot: spriteBoxAt(drone, DRONE_BOX, map, scale),
    playerLabel: placeLabel(player, "player", layout.player.side, map, scale, layout.player.shift, undefined, layout.player.drop ?? 0).box,
    droneLabel: placeLabel(drone, "drone", layout.drone.side, map, scale, layout.drone.shift, undefined, layout.drone.drop ?? 0).box,
  };
}

/**
 * Picks label sides so neither label covers the other sprite or an obstacle, or leaves the world.
 * `map` is the world layer's CSS size and `scale` its CSS px per art px; `fixed` are boxes that
 * don't move with a game point, such as the landmark captions.
 */
export function labelLayout(player: Point, drone: Point, map: MapSize, obstacles: Obstacle[] = [], scale = 1, fixed: Box[] = []) {
  const blocked = [...obstacles.map((o) => spriteBoxAt(o, o.box, map, scale)), ...fixed];
  const playerDot = spriteBoxAt(player, EXPLORER_BOX, map, scale);
  const droneDot = spriteBoxAt(drone, DRONE_BOX, map, scale);
  let best: { cost: number; player: LabelPlacement; drone: LabelPlacement } | null = null;
  candidates("player", scale).forEach((pc, pi) => {
    candidates("drone", scale).forEach((dc, di) => {
      const pl = placeLabel(player, "player", pc.side, map, scale, pc.align, droneDot);
      const dl = placeLabel(drone, "drone", dc.side, map, scale, dc.align, playerDot);
      // Leaving the world is worst, then your two labels covering each other or the other sprite,
      // then covering a fixed box: near a landmark, labels give way to its caption only if they
      // can do so without landing on each other.
      const mutual = Number(overlaps(pl.box, dl.box)) + Number(overlaps(pl.box, droneDot)) + Number(overlaps(dl.box, playerDot));
      const hits = blocked.filter((b) => overlaps(pl.box, b) || overlaps(dl.box, b)).length;
      const cost = 100000 * (Number(offMap(pl.box, map)) + Number(offMap(dl.box, map))) + 1000 * mutual + 100 * hits + pi + di;
      if (!best || cost < best.cost) {
        best = { cost, player: { side: pc.side, shift: pl.shift, drop: pl.drop }, drone: { side: dc.side, shift: dl.shift, drop: dl.drop } };
      }
    });
  });
  const { player: p, drone: d } = best!;
  return { player: p, drone: d };
}

/** Teammates' names sit to the right of them, or to the left near the world's right edge. */
export const teammateLabelSide = (x: number): "right" | "left" => (x > 80 ? "left" : "right");
