import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export const HOLD_MS = 300;
const SLOP_PX = 8;
export const SLOT_ATTR = "data-block-slot";

type Drag = { tile: string; id: number; touch: boolean; active: boolean; x: number; y: number; timer?: number };

/**
 * The Blocks tiles. Tap or press a tile to place it; a mouse or pen can drag it onto the slot. On touch a
 * drag starts only after a 300 ms hold (so swipes still scroll), and a non-passive touchmove listener stops
 * the page from panning while it lasts.
 */
export function BlockTray({ tiles, onPlace }: { tiles: readonly string[]; onPlace: (tile: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const place = useRef(onPlace);
  place.current = onPlace;
  const [dragging, setDragging] = useState<string | null>(null);
  const listeners = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; cancel: () => void } | null>(null);

  const end = () => {
    const d = drag.current;
    if (d?.timer !== undefined) window.clearTimeout(d.timer);
    drag.current = null;
    const l = listeners.current;
    if (l) {
      window.removeEventListener("pointermove", l.move);
      window.removeEventListener("pointerup", l.up);
      window.removeEventListener("pointercancel", l.cancel);
    }
    setDragging(null);
  };

  useEffect(() => {
    const el = root.current!;
    const holdPan = (e: TouchEvent) => {
      if (drag.current?.touch && drag.current.active) e.preventDefault();
    };
    const cancel = () => end();
    el.addEventListener("touchmove", holdPan, { passive: false });
    el.addEventListener("touchcancel", cancel);
    listeners.current = {
      move: (e) => {
        const d = drag.current;
        if (!d || e.pointerId !== d.id || d.active) return;
        if (!d.touch) {
          d.active = true;
          setDragging(d.tile);
        } else if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > SLOP_PX) end();
      },
      up: (e) => {
        const d = drag.current;
        if (!d || e.pointerId !== d.id) return;
        const over = (document.elementFromPoint?.(e.clientX, e.clientY) ?? e.target) as Element | null;
        if (d.active && over?.closest?.(`[${SLOT_ATTR}]`)) place.current(d.tile);
        end();
      },
      cancel,
    };
    return () => {
      el.removeEventListener("touchmove", holdPan);
      el.removeEventListener("touchcancel", cancel);
      end();
    };
  }, []);

  const start = (tile: string) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    end();
    const d: Drag = { tile, id: e.pointerId, touch: e.pointerType === "touch", active: false, x: e.clientX, y: e.clientY };
    if (d.touch) {
      d.timer = window.setTimeout(() => {
        if (drag.current !== d) return;
        d.active = true;
        setDragging(tile);
      }, HOLD_MS);
    }
    drag.current = d;
    const l = listeners.current!;
    window.addEventListener("pointermove", l.move);
    window.addEventListener("pointerup", l.up);
    window.addEventListener("pointercancel", l.cancel);
  };

  return (
    <div ref={root} data-testid="block-tray" role="group" aria-label="Blocks" className="flex flex-wrap gap-2">
      {tiles.map((tile, i) => (
        <button
          key={tile}
          type="button"
          data-autofocus={i === 0 ? true : undefined}
          onClick={() => onPlace(tile)}
          onPointerDown={start(tile)}
          onContextMenu={(e) => e.preventDefault()}
          className={`min-h-11 cursor-grab rounded border-[1.5px] border-[var(--accent-border)] bg-[var(--editor-bg)] px-3 py-2 font-mono text-sm text-[var(--accent)] select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${
            dragging === tile ? "opacity-50" : ""
          }`}
        >
          {tile}
        </button>
      ))}
    </div>
  );
}
