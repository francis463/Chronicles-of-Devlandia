export function Meter({
  label,
  value,
  max = 100,
  tone,
}: {
  label: string;
  value: number;
  max?: number;
  tone: "accent" | "primary";
}) {
  const color = tone === "accent" ? "var(--accent)" : "var(--primary-border)";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color }}>
        {label} {value}
      </span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2 w-16 rounded-sm border border-[var(--panel-border)] sm:w-20"
      >
        <div
          className="h-full transition-all"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}
