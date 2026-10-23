import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { TOUCH_REPEAT_MS } from "../../game/constants";
import type { Direction, Poi } from "../../game/types";
import { Button } from "../../ui/Button";
import { STICK_RING, knobOffset, stickDirection } from "./stick";

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
const MODE_KEY = "devlandia.touchControls";
type Mode = "arrows" | "stick";
/** Arrow pad (the default) or joystick; blocked storage or an odd value is the arrows. */
function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "stick" ? "stick" : "arrows";
  } catch {
    return "arrows";
  }
}
function saveMode(mode: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
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
  const [mode, setMode] = useState<Mode>(loadMode);
  const [awake, setAwake] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const ring = useRef<HTMLDivElement>(null);
  const leaning = useRef<Direction | null>(null);
  const held = useRef(false);
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
    if (disabled) {
      stop();
      leaning.current = null;
    }
  }, [disabled]);

  useEffect(() => stop, []);

  /** Steps the way the thumb leans: a new way restarts the repeat, the middle stops it. */
  const lean = (event: PointerEvent) => {
    const box = ring.current?.getBoundingClientRect();
    const dx = event.clientX - (box ? box.left + box.width / 2 : 0);
    const dy = event.clientY - (box ? box.top + box.height / 2 : 0);
    setKnob(knobOffset(dx, dy));
    const dir = disabled ? null : stickDirection(dx, dy);
    if (dir === leaning.current) return;
    leaning.current = dir;
    if (dir) start(dir);
    else stop();
  };
  const release = () => {
    held.current = false;
    leaning.current = null;
    setKnob({ x: 0, y: 0 });
    stop();
  };
  const grab = (event: PointerEvent) => {
    held.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    lean(event);
  };

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
      <div data-part="pad" className={`${floating && swapped ? "order-3" : ""}`}>
        {mode === "stick" && (
          <div
            ref={ring}
            role="group"
            aria-label="Joystick"
            onPointerDown={grab}
            onPointerMove={(event) => held.current && lean(event)}
            onPointerUp={release}
            onPointerCancel={release}
            style={{ width: STICK_RING * 2, height: STICK_RING * 2 }}
            className={`relative rounded-full border-[1.5px] border-[var(--primary-border)] ${bar} touch-none`}
          >
            <div
              data-testid="stick-knob"
              aria-hidden="true"
              style={{ width: 40, height: 40, left: STICK_RING - 20, top: STICK_RING - 20, transform: `translate(${knob.x}px, ${knob.y}px)` }}
              className="pointer-events-none absolute rounded-full border-[1.5px] border-[var(--primary-border)] bg-[rgba(56,189,248,0.35)]"
            />
          </div>
        )}
        <div className={mode === "stick" ? "sr-only" : "grid grid-cols-3 grid-rows-3 gap-1"}>
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
      </div>
      <div className={`${swapped && floating ? "order-2" : ""} mb-1 flex flex-col items-center gap-1`}>
        <button
          type="button"
          aria-label="Joystick"
          aria-pressed={mode === "stick"}
          onClick={() => {
            const next: Mode = mode === "stick" ? "arrows" : "stick";
            release();
            setMode(next);
            saveMode(next);
            wake();
          }}
          className={`min-h-8 min-w-8 rounded border border-[var(--panel-border)] ${floating ? "bg-[rgba(15,23,42,0.45)]" : "bg-[var(--panel)]"} px-2 text-xs text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary-border)]`}
        >
          <span aria-hidden="true">{mode === "stick" ? "Pad" : "Stick"}</span>
        </button>
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
            className="min-h-8 min-w-8 rounded border border-[var(--panel-border)] bg-[rgba(15,23,42,0.45)] px-2 text-xs text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary-border)]"
          >
            ⇄
          </button>
        )}
      </div>
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
