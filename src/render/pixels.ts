import type { ArtPoint } from "./world";

/** Rows of palette characters; "." is transparent. */
export type PixelGrid = readonly string[];
export type Palette = Readonly<Record<string, string>>;
export type Run = { x: number; y: number; w: number; color: string };

/** Horizontal runs of one colour, row by row: one fillRect each when drawing. */
export function gridRuns(grid: PixelGrid, palette: Palette): Run[] {
  const runs: Run[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== ".") runs.push({ x, y, w: end - x, color: palette[ch] });
      x = end;
    }
  });
  return runs;
}

export const mirror = (grid: PixelGrid): PixelGrid => grid.map((row) => [...row].reverse().join(""));

/** Clockwise: the bottom-left pixel becomes the top-left. */
export const rotate90 = (grid: PixelGrid): PixelGrid =>
  [...grid[0]].map((_, x) => grid.map((row) => row[x]).reverse().join(""));

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

export function greyscale(palette: Palette): Palette {
  return Object.fromEntries(
    Object.entries(palette).map(([k, hex]) => {
      const [r, g, b] = channels(hex);
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return [k, toHex([l, l, l])];
    }),
  );
}

/** amount −1 … 0 mixes toward black, 0 … 1 toward white. */
export function shade(hex: string, amount: number): string {
  return toHex(channels(hex).map((c) => (amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
}

/** Offsets of the midpoint-circle pixels for radius r, each once. */
export function circlePixels(r: number): ArtPoint[] {
  const seen = new Map<string, ArtPoint>();
  const add = (x: number, y: number) => seen.set(`${x},${y}`, { x, y });
  let x = r;
  let y = 0;
  let d = 1 - r;
  while (x >= y) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) add(a, b);
    y++;
    if (d < 0) d += 2 * y + 1;
    else {
      x--;
      d += 2 * (y - x) + 1;
    }
  }
  return [...seen.values()];
}

/** Offsets with |dx| + |dy| ≤ r. */
export function diamondPixels(r: number): ArtPoint[] {
  const out: ArtPoint[] = [];
  for (let y = 0 - r; y <= r; y++) for (let x = Math.abs(y) - r; x <= r - Math.abs(y); x++) out.push({ x, y });
  return out;
}
