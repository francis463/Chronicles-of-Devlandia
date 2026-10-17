import { useRef, useState } from "react";
import { CLASSES, CLASS_IDS, classOrDefault, type ClassId } from "../game/classes";
import { gridRuns } from "../render/pixels";
import { CLASS_ITEMS, SPRITES, explorerPalette } from "../render/sprites";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { MenuBackdrop } from "./MenuBackdrop";

const PREVIEW_HOOD = "#22c55e";

/** The class's hero facing down, as 1-pixel rects: the explorer, then the class item. */
function Preview({ id }: { id: ClassId }) {
  const layers = [
    { grid: SPRITES["explorer-down"].frames[0], palette: explorerPalette(PREVIEW_HOOD, id) },
    { grid: CLASS_ITEMS[id].down, palette: CLASS_ITEMS[id].palette },
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" shapeRendering="crispEdges" className="h-16 w-16 shrink-0">
      {layers.flatMap((layer, l) => gridRuns(layer.grid, layer.palette).map((r) => <rect key={`${l}-${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />))}
    </svg>
  );
}

/** Choose your class: a look for your hero, before Solo Quest or a team game. */
export function ClassPicker({
  initial,
  mode,
  onContinue,
  onBack,
}: {
  initial: ClassId;
  mode: "solo" | "team";
  onContinue(cls: ClassId): void;
  onBack(): void;
}) {
  const [selected, setSelected] = useState<ClassId>(classOrDefault(initial));
  const cards = useRef(new Map<ClassId, HTMLButtonElement>());

  const move = (by: number) => {
    const next = CLASS_IDS[(CLASS_IDS.indexOf(selected) + by + CLASS_IDS.length) % CLASS_IDS.length];
    setSelected(next);
    cards.current.get(next)?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(-1);
    else if (e.key === "Enter") onContinue(selected);
    else return;
    e.preventDefault();
  };

  return (
    <>
      <MenuBackdrop />
      <Panel className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-8 sm:px-6">
        <h1 className="text-center text-lg font-bold tracking-widest text-[var(--text)] sm:text-xl">CHOOSE YOUR CLASS</h1>
        <div role="radiogroup" aria-label="Choose your class" onKeyDown={onKeyDown} className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {CLASS_IDS.map((id) => (
            <button
              key={id}
              ref={(el) => {
                if (el) cards.current.set(id, el);
              }}
              type="button"
              role="radio"
              aria-checked={selected === id}
              aria-label={CLASSES[id].name}
              tabIndex={selected === id ? 0 : -1}
              onClick={() => setSelected(id)}
              className={`flex cursor-pointer items-center gap-3 rounded border-2 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:min-h-11 ${
                selected === id ? "border-[var(--primary-border)] bg-[var(--bg)]" : "border-[var(--panel-border)] hover:bg-[var(--bg)]"
              }`}
            >
              <Preview id={id} />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-bold tracking-widest text-[var(--text)]">{CLASSES[id].name}</span>
                <span className="text-xs text-[var(--text-muted)]">{CLASSES[id].blurb}</span>
              </span>
            </button>
          ))}
        </div>
        <Button variant="accent" onClick={() => onContinue(selected)} className="w-full max-w-xs">
          {mode === "solo" ? "[ Start ]" : "[ Continue ]"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full max-w-xs">
          [ Back ]
        </Button>
      </Panel>
    </>
  );
}
