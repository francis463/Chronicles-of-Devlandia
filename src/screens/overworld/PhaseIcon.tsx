import type { Phase } from "../../game/types";

// 10 × 10 pixel art, one string per row. "." is empty; the letters are the phase's colours.
const ICONS: Record<Phase, { palette: Record<string, string>; rows: readonly string[] }> = {
  Day: {
    palette: { y: "#fde047", o: "#f59e0b" },
    rows: ["....o.....", ".o..o..o..", "..oyyyy...", "...yyyyy..", "ooyyyyyyoo", "..yyyyyy..", "...yyyy...", "..o.oo.o..", ".o..o..o..", "....o....."],
  },
  Dusk: {
    palette: { y: "#fb923c", o: "#ea580c", r: "#ef4444" },
    rows: ["..........", "...oooo...", "..oyyyyo..", ".oyyyyyyo.", "oyyyyyyyyo", "rrrrrrrrrr", "..........", "..rrrrrr..", "..........", "....rr...."],
  },
  Night: {
    palette: { m: "#e2e8f0", d: "#94a3b8", s: "#fde047" },
    rows: ["..mmm....s", ".mmd......", "mmd....s..", "mm........", "mm........", "mmd.......", ".mmd...s..", "..mmmmm...", "s.........", ".......s.."],
  },
};

/** A small pixel sun, sunset or moon: decoration only (the time text beside it says the same). */
export function PhaseIcon({ phase }: { phase: Phase }) {
  const { palette, rows } = ICONS[phase];
  return (
    <svg data-phase={phase} aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 10 10" width="24" height="24" className="inline-block shrink-0">
      {rows.flatMap((row, y) =>
        [...row].flatMap((ch, x) => (ch === "." ? [] : [<rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={palette[ch]} />])),
      )}
    </svg>
  );
}
