import type { Point } from "../../game/types";

export type LabelSide = "right" | "left" | "above" | "below";
export type LabelPlacement = { side: LabelSide; shift: number };
export type MapSize = { width: number; height: number };
/** Another round map marker the labels should stay off (e.g. the found artifact), radius in px. */
export type Obstacle = Point & { radius: number };

type Box = { left: number; right: number; top: number; bottom: number };
type MarkerKind = "player" | "drone";

const GAP = 8; // ml-2 / mr-2 between a dot and a side label
const VGAP = 8; // mb-2 / mt-2: a drone label above/below clears the player dot even when they coincide
const EDGE = 2; // keep shifted labels this far inside the map

// Label sizes are the rendered 10px uppercase JetBrains Mono widths ("[PLAYER]" 56px,
// "[AI DRONE]" 70px) plus slack for the fallback monospace font.
const MARKERS: Record<MarkerKind, { radius: number; hitRadius: number; width: number; height: number }> = {
  player: { radius: 10, hitRadius: 12, width: 62, height: 15 },
  drone: { radius: 6, hitRadius: 6, width: 76, height: 15 },
};

// Earlier entries are preferred; the defaults (right) win whenever nothing collides.
const PREFERENCES: Record<MarkerKind, LabelSide[]> = {
  player: ["right", "left", "below", "above"],
  drone: ["right", "left", "above", "below"],
};

type Candidate = { side: LabelSide; align: number };

/** Side labels as-is; above/below labels centred, then hanging left or right of the dot. */
function candidates(kind: MarkerKind): Candidate[] {
  const { width, radius } = MARKERS[kind];
  const hang = width / 2 - radius;
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

const toPx = (p: Point, map: MapSize) => ({ x: (p.x / 100) * map.width, y: (p.y / 100) * map.height });

const dotBox = (p: Point, kind: MarkerKind, map: MapSize): Box => {
  const c = toPx(p, map);
  const r = MARKERS[kind].hitRadius;
  return { left: c.x - r, right: c.x + r, top: c.y - r, bottom: c.y + r };
};

function placeLabel(
  p: Point,
  kind: MarkerKind,
  side: LabelSide,
  map: MapSize,
  desiredShift = 0,
): { box: Box; shift: number } {
  const c = toPx(p, map);
  const { radius, width, height } = MARKERS[kind];
  if (side === "right" || side === "left") {
    const left = side === "right" ? c.x + radius + GAP : c.x - radius - GAP - width;
    return { box: { left, right: left + width, top: c.y - height / 2, bottom: c.y + height / 2 }, shift: 0 };
  }
  const wantedLeft = c.x - width / 2 + desiredShift;
  const clamp =
    wantedLeft < EDGE ? EDGE - wantedLeft : wantedLeft + width > map.width - EDGE ? map.width - EDGE - (wantedLeft + width) : 0;
  const shift = desiredShift + clamp;
  const centredLeft = c.x - width / 2;
  const top = side === "above" ? c.y - radius - VGAP - height : c.y + radius + VGAP;
  return { box: { left: centredLeft + shift, right: centredLeft + shift + width, top, bottom: top + height }, shift };
}

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const offMap = (a: Box, map: MapSize) => a.left < 0 || a.top < 0 || a.right > map.width || a.bottom > map.height;

/** Pixel boxes for both dots and both labels under a given layout (used by tests and the chooser). */
export function labelBoxes(
  player: Point,
  drone: Point,
  map: MapSize,
  layout: { player: LabelPlacement; drone: LabelPlacement },
) {
  return {
    playerDot: dotBox(player, "player", map),
    droneDot: dotBox(drone, "drone", map),
    playerLabel: placeLabel(player, "player", layout.player.side, map, layout.player.shift).box,
    droneLabel: placeLabel(drone, "drone", layout.drone.side, map, layout.drone.shift).box,
  };
}

const obstacleBox = (o: Obstacle, map: MapSize): Box => {
  const c = toPx(o, map);
  return { left: c.x - o.radius, right: c.x + o.radius, top: c.y - o.radius, bottom: c.y + o.radius };
};

/** Picks label sides so neither label covers the other marker or an obstacle, or leaves the map. */
export function labelLayout(player: Point, drone: Point, map: MapSize, obstacles: Obstacle[] = []) {
  const blocked = obstacles.map((o) => obstacleBox(o, map));
  let best: { cost: number; player: LabelPlacement; drone: LabelPlacement } | null = null;
  candidates("player").forEach((pc, pi) => {
    candidates("drone").forEach((dc, di) => {
      const playerSide = pc.side;
      const droneSide = dc.side;
      const pl = placeLabel(player, "player", playerSide, map, pc.align);
      const dl = placeLabel(drone, "drone", droneSide, map, dc.align);
      const collisions =
        Number(overlaps(pl.box, dl.box)) +
        Number(overlaps(pl.box, dotBox(drone, "drone", map))) +
        Number(overlaps(dl.box, dotBox(player, "player", map))) +
        blocked.filter((b) => overlaps(pl.box, b) || overlaps(dl.box, b)).length;
      const cost = 1000 * (Number(offMap(pl.box, map)) + Number(offMap(dl.box, map))) + 100 * collisions + pi + di;
      if (!best || cost < best.cost) {
        best = { cost, player: { side: playerSide, shift: pl.shift }, drone: { side: droneSide, shift: dl.shift } };
      }
    });
  });
  const { player: p, drone: d } = best!;
  return { player: p, drone: d };
}
