import { LOW_HP } from "../game/constants";

/** One pixel heart, 7 by 6 art pixels. */
const HEART_ROWS = [".xx.xx.", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."];

const FULL = "#ef4444";
const SHINE = "#fecaca";
const EMPTY = "#334155";

/** HP per heart: a full bar of 100 is ten hearts, and a heart can be half full. */
export const HP_PER_HEART = 10;

function Heart({ fill }: { fill: "full" | "half" | "empty" }) {
  return (
    <svg viewBox="0 0 7 6" width="14" height="12" shapeRendering="crispEdges" aria-hidden="true">
      {HEART_ROWS.flatMap((row, y) =>
        [...row].flatMap((c, x) => {
          if (c !== "x") return [];
          const on = fill === "full" || (fill === "half" && x < 3.5);
          const color = !on ? EMPTY : x === 1 && y === 1 ? SHINE : FULL;
          return [<rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={color} />];
        }),
      )}
    </svg>
  );
}

/**
 * Health as pixel hearts (half hearts included), with the exact number beside them for screen readers and anyone who wants it.
 * Under LOW_HP the hearts pulse (unless the device asks for reduced motion).
 */
export function Hearts({ value, max = 100 }: { value: number; max?: number }) {
  const count = Math.ceil(max / HP_PER_HEART);
  const low = value > 0 && value <= LOW_HP;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--accent)]">HP {value}</span>
      <div
        role="meter"
        aria-label="HP"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        data-low={low || undefined}
        className={`flex gap-0.5 ${low ? "motion-safe:animate-pulse" : ""}`}
      >
        {Array.from({ length: count }, (_, i) => {
          const into = value - i * HP_PER_HEART;
          return <Heart key={i} fill={into >= HP_PER_HEART ? "full" : into >= HP_PER_HEART / 2 ? "half" : "empty"} />;
        })}
      </div>
    </div>
  );
}
