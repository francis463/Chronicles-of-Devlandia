export type MapPoint = { x: number; y: number };
export type MapBox = { width: number; height: number };

/** How far inside the map's edge an off-screen arrow sits, in CSS px. */
export const ARROW_INSET = 12;

/**
 * Where an arrow for something off the map goes: on the line from the map's centre to the point, at the edge of the map
 * (pulled in by ARROW_INSET), with the angle in degrees (0 = right, 90 = down) to point along that line. Null while the
 * point is on the map. `point` is in map CSS px, from the map's top-left.
 */
export function pingArrow(point: MapPoint, map: MapBox): { left: number; top: number; angle: number } | null {
  if (point.x >= 0 && point.x <= map.width && point.y >= 0 && point.y <= map.height) return null;
  const cx = map.width / 2;
  const cy = map.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const halfW = cx - ARROW_INSET;
  const halfH = cy - ARROW_INSET;
  // Shrink the line to the first edge it reaches.
  const k = Math.min(dx === 0 ? Infinity : halfW / Math.abs(dx), dy === 0 ? Infinity : halfH / Math.abs(dy));
  return { left: cx + dx * k, top: cy + dy * k, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}
