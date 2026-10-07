export function BottomHud({ hasLoot, questComplete }: { hasLoot: boolean; questComplete: boolean }) {
  const slots = ["Key", "Food", hasLoot ? "Patch" : "—", "—"];
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
      </div>
      <span className={`text-[10px] uppercase tracking-widest text-[var(--accent)] ${questComplete ? "font-bold" : ""}`}>
        {`Quest: Survey Frozen River (${questComplete ? "1/1 Complete" : "0/1"})`}
      </span>
    </footer>
  );
}
