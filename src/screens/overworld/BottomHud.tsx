import { Button } from "../../ui/Button";

export function BottomHud({
  hasLoot,
  questComplete,
  clueDecoded,
  artifactFound,
  towerPowered,
  onDecodeScroll,
}: {
  hasLoot: boolean;
  questComplete: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  towerPowered: boolean;
  onDecodeScroll: () => void;
}) {
  const slots = ["Key", "Food", hasLoot ? "Patch" : "—", artifactFound ? "Semicolon" : hasLoot ? "Scroll" : "—"];
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--panel-border)] bg-[var(--bg)] px-3 py-2">
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
      <div className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-widest text-[var(--accent)]">
        <span className={questComplete ? "font-bold" : ""}>
          {`Quest: Survey Frozen River (${questComplete ? "1/1 Complete" : "0/1"})`}
        </span>
        <span className={artifactFound ? "font-bold" : ""}>
          {`Treasure: Golden Semicolon (${artifactFound ? "1/1 Found" : "0/1"})`}
        </span>
        <span className={towerPowered ? "font-bold" : ""}>
          {`Tower: Power the signal tower (${towerPowered ? "1/1 Online" : "0/1"})`}
        </span>
      </div>
    </footer>
  );
}
