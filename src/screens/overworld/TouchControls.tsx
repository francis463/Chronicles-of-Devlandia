import { useEffect, useRef, useState, type MouseEvent } from "react";
import { TOUCH_REPEAT_MS } from "../../game/constants";
import type { Direction, Poi } from "../../game/types";
import { Button } from "../../ui/Button";

const SWAP_KEY = "devlandia.swapHands";
/** Whether the player chose the D-pad on the right and [E] on the left; blocked storage or an odd value is the default. */
function loadSwapped(): boolean {
  try {
    return localStorage.getItem(SWAP_KEY) === "1";
  } catch {
    return false;
  }
}
function saveSwapped(on: boolean): void {
  try {
    localStorage.setItem(SWAP_KEY, on ? "1" : "0");
  } catch {
    // Blocked storage just forgets the choice.
  }
}
/** Over the map the controls are see-through until a touch, and fade again after this long. */
const IDLE_MS = 2000;

const PAD: Array<{ dir: Direction; glyph: string; area: string }> = [
  { dir: "up", glyph: "▲", area: "col-start-2 row-start-1" },
  { dir: "left", glyph: "◀", area: "col-start-1 row-start-2" },
  { dir: "right", glyph: "▶", area: "col-start-3 row-start-2" },
  { dir: "down", glyph: "▼", area: "col-start-2 row-start-3" },
];

export function TouchControls({
  disabled,
  inRange,
  label,
  onMove,
  onInteract,
  floating = false,
}: {
  disabled: boolean;
  inRange: Poi | null;
  /** What [E] does at the place in reach. */
  label: string | null;
  onMove: (dir: Direction) => void;
  onInteract: (poi: Poi["id"]) => void;
  /** Laid over the bottom of the map (a phone held sideways) instead of in a bar under it. */
  floating?: boolean;
}) {
  const repeat = useRef<number | undefined>(undefined);
  const [swapped, setSwapped] = useState(loadSwapped);
  const [awake, setAwake] = useState(false);
  const sleep = useRef<number | undefined>(undefined);
  /** A touch wakes the controls; they go back to see-through a moment after the last one. */
  const wake = () => {
    setAwake(true);
    window.clearTimeout(sleep.current);
    sleep.current = window.setTimeout(() => setAwake(false), IDLE_MS);
  };
  useEffect(() => () => window.clearTimeout(sleep.current), []);

  const stop = () => {
    window.clearInterval(repeat.current);
    repeat.current = undefined;
  };

  const start = (dir: Direction) => {
    wake();
    stop();
    onMove(dir);
    repeat.current = window.setInterval(() => onMove(dir), TOUCH_REPEAT_MS);
  };

  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  useEffect(() => stop, []);

  // Pointer presses are handled on pointerdown (so holding repeats); a click with
  // detail 0 comes from the keyboard (Enter/Space on a focused button).
  const keyboardStep = (dir: Direction) => (event: MouseEvent) => {
    if (event.detail === 0) onMove(dir);
  };

  const bar = floating ? "bg-[rgba(15,23,42,0.45)]" : "bg-[var(--panel)]";
  return (
    <div
      role="group"
      aria-label="Touch controls"
      data-awake={floating ? String(awake) : undefined}
      onPointerDown={floating ? wake : undefined}
      className={
        floating
          ? `safe-controls pointer-events-none absolute inset-x-0 bottom-0 z-30 hidden touch-none items-end justify-between gap-4 select-none transition-opacity duration-300 pointer-coarse:flex [&>*]:pointer-events-auto ${awake ? "opacity-100" : "opacity-60"}`
          : "hidden touch-none items-center justify-between gap-4 border-t-2 border-dashed border-[var(--panel-border)] bg-[var(--bg)] px-4 py-3 select-none pointer-coarse:flex"
      }
      onContextMenu={(event) => event.preventDefault()}
    >
      <div data-part="pad" className={`grid grid-cols-3 grid-rows-3 gap-1 ${floating && swapped ? "order-3" : ""}`}>
        {PAD.map(({ dir, glyph, area }) => (
          <button
            key={dir}
            type="button"
            aria-label={`Move ${dir}`}
            disabled={disabled}
            onPointerDown={() => start(dir)}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onClick={keyboardStep(dir)}
            className={`${area} flex ${floating ? "h-10 w-10" : "h-12 w-12"} items-center justify-center rounded border-[1.5px] border-[var(--primary-border)] ${bar} text-lg text-[var(--primary-border)] active:bg-[var(--primary)] active:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] disabled:opacity-40`}
          >
            {glyph}
          </button>
        ))}
      </div>
      {floating && (
        <button
          type="button"
          aria-label="Swap sides"
          aria-pressed={swapped}
          onClick={() => {
            setSwapped((on) => {
              saveSwapped(!on);
              return !on;
            });
            wake();
          }}
          className={`${swapped ? "order-2" : ""} mb-1 min-h-8 min-w-8 rounded border border-[var(--panel-border)] bg-[rgba(15,23,42,0.45)] px-2 text-xs text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary-border)]`}
        >
          ⇄
        </button>
      )}
      <div data-part="act" className={floating && swapped ? "order-1" : ""}>
        <Button
          variant="accent"
          disabled={disabled || !inRange}
          onClick={() => inRange && onInteract(inRange.id)}
          className={`${floating ? "min-h-11 px-3 py-2 text-sm" : "min-h-12 px-4 py-3"} max-w-[50vw]`}
        >
          {inRange && label ? `[E] ${label}` : "[E] Interact"}
        </Button>
      </div>
    </div>
  );
}
