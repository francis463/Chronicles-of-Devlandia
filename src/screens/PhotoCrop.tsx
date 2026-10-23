import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cropRect, MAX_ZOOM, type Crop } from "../leaderboard/avatar";
import { Button } from "../ui/Button";
import { TerminalDialog } from "../ui/TerminalDialog";

/** The round frame is this many screen pixels across (15rem). */
const FRAME_PX = 240;
const ZOOM_STEP = 0.25;
/** An arrow key moves the picture by this share of the square. */
const KEY_STEP = 0.05;

/**
 * Lets you choose which part of a picture becomes your leaderboard photo: drag the picture (or use the arrow keys)
 * under a round frame, and zoom with the slider (or + and -). Nothing is cut here; Save hands back the chosen square.
 */
export function PhotoCrop({ file, onSave, onCancel }: { file: File; onSave: (crop: Crop) => void; onCancel: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [crop, setCrop] = useState<Crop>({ zoom: 1, cx: 0, cy: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Whatever is asked for, the square is kept inside the picture and the centre is stored as that square has it.
  const view = (next: Crop): Crop => {
    if (!dims) return next;
    const r = cropRect(dims.w, dims.h, next);
    return { zoom: Math.min(MAX_ZOOM, Math.max(1, next.zoom)), cx: r.sx + r.side / 2, cy: r.sy + r.side / 2 };
  };
  const rect = dims ? cropRect(dims.w, dims.h, crop) : null;
  const scale = rect ? FRAME_PX / rect.side : 1;
  const move = (dx: number, dy: number) => setCrop((c) => view({ ...c, cx: c.cx + dx, cy: c.cy + dy }));
  const zoomTo = (zoom: number) => setCrop((c) => view({ ...c, zoom }));

  const onKeyDown = (e: KeyboardEvent) => {
    if (!rect) return;
    const step = rect.side * KEY_STEP;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key in moves) move(...moves[e.key]);
    else if (e.key === "+" || e.key === "=") zoomTo(crop.zoom + ZOOM_STEP);
    else if (e.key === "-" || e.key === "_") zoomTo(crop.zoom - ZOOM_STEP);
    else return;
    e.preventDefault();
  };
  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current) return;
    // Dragging the picture left shows more of its right side, so the square's centre moves the other way.
    move(-(e.clientX - drag.current.x) / scale, -(e.clientY - drag.current.y) / scale);
    drag.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <TerminalDialog title="< CROP YOUR PHOTO >" onClose={onCancel}>
      <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 text-sm">
        <p className="text-center text-[var(--text-muted)]">Drag the picture, or use the arrow keys, to put your face in the circle. Zoom with the slider or + and -.</p>
        <div
          role="group"
          aria-label="Crop area. Arrow keys move the picture; plus and minus zoom."
          tabIndex={0}
          data-autofocus
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          style={{ width: FRAME_PX, height: FRAME_PX, touchAction: "none" }}
          className="relative shrink-0 cursor-grab overflow-hidden rounded-full border-2 border-[var(--accent)] bg-[var(--bg)] outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--accent)] active:cursor-grabbing"
        >
          <img
            src={url}
            alt="Your picture"
            draggable={false}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
              if (!w || !h) return setUnreadable(true);
              setDims({ w, h });
              setCrop({ zoom: 1, cx: w / 2, cy: h / 2 });
            }}
            onError={() => setUnreadable(true)}
            style={
              dims && rect
                ? { position: "absolute", maxWidth: "none", width: dims.w * scale, height: dims.h * scale, left: -rect.sx * scale, top: -rect.sy * scale }
                : { opacity: 0 }
            }
            className="select-none"
          />
        </div>
        <label className="flex w-full items-center gap-3">
          <span className="shrink-0 text-xs uppercase tracking-widest">Zoom</span>
          <input
            type="range"
            aria-label="Zoom"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            disabled={!dims}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="w-full cursor-pointer pointer-coarse:min-h-11"
          />
        </label>
        {unreadable && <p role="alert" className="text-[var(--danger-border)]">Can't read that picture. Try another one.</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" disabled={!dims} onClick={() => onSave(view(crop))}>
            [ Save photo ]
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            [ Cancel ]
          </Button>
        </div>
      </div>
    </TerminalDialog>
  );
}
