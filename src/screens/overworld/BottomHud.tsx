import { Button } from "../../ui/Button";

export function BottomHud({
  hasLoot,
  clueDecoded,
  artifactFound,
  onDecodeScroll,
  className = "",
}: {
  hasLoot: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  onDecodeScroll: () => void;
  className?: string;
}) {
  const slots = ["Key", "Food", hasLoot ? "Patch" : "—", artifactFound ? "Semicolon" : hasLoot ? "Scroll" : "—"];
  return (
    <footer className={`flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--panel-border)] bg-[var(--bg)] px-3 py-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-[var(--text)]">Inventory:</span>
        {slots.map((item, i) => (
          <span
            key={i}
            className="min-w-12 rounded border border-[var(--panel-border)] bg-[var(--panel)] px-2 py-1 text-center text-[10px] uppercase tracking-widest"
          >
            {item}
          </span>
        ))}
        {hasLoot && !clueDecoded && (
          <Button variant="ghost" className="px-2 py-1 text-[10px] text-[var(--accent)]" onClick={onDecodeScroll}>
            [ Decode Scroll ]
          </Button>
        )}
      </div>
    </footer>
  );
}
