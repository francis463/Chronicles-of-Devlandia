import { useEffect, useRef, type MouseEvent } from "react";
import { TOUCH_REPEAT_MS } from "../../game/constants";
import { interactLabel } from "../../game/geometry";
import type { Direction, Poi } from "../../game/types";
import { Button } from "../../ui/Button";

const PAD: Array<{ dir: Direction; glyph: string; area: string }> = [
  { dir: "up", glyph: "▲", area: "col-start-2 row-start-1" },
  { dir: "left", glyph: "◀", area: "col-start-1 row-start-2" },
  { dir: "right", glyph: "▶", area: "col-start-3 row-start-2" },
  { dir: "down", glyph: "▼", area: "col-start-2 row-start-3" },
];

export function TouchControls({
  disabled,
  inRange,
  onMove,
  onInteract,
}: {
  disabled: boolean;
  inRange: Poi | null;
  onMove: (dir: Direction) => void;
  onInteract: (poi: Poi["id"]) => void;
}) {
  const repeat = useRef<number | undefined>(undefined);

  const stop = () => {
    window.clearInterval(repeat.current);
    repeat.current = undefined;
  };

  const start = (dir: Direction) => {
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

  return (
    <div
      role="group"
      aria-label="Touch controls"
      className="hidden touch-none items-center justify-between gap-4 border-t-2 border-dashed border-[var(--panel-border)] bg-[var(--bg)] px-4 py-3 select-none pointer-coarse:flex"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
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
            className={`${area} flex h-12 w-12 items-center justify-center rounded border-[1.5px] border-[var(--primary-border)] bg-[var(--panel)] text-lg text-[var(--primary-border)] active:bg-[var(--primary)] active:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] disabled:opacity-40`}
          >
            {glyph}
          </button>
        ))}
      </div>
      <Button
        variant="accent"
        disabled={disabled || !inRange}
        onClick={() => inRange && onInteract(inRange.id)}
        className="min-h-12 max-w-[50%] px-4 py-3"
      >
        {inRange ? `[E] ${interactLabel(inRange)}` : "[E] Interact"}
      </Button>
    </div>
  );
}
