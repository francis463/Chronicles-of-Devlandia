import type { ReactNode } from "react";

export function Panel({
  label,
  dashed,
  className = "",
  children,
}: {
  label?: string;
  dashed?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative rounded-md border-2 bg-[var(--panel)] border-[var(--panel-border)] ${dashed ? "border-dashed" : "border-solid"} ${className}`}
    >
      {label && (
        <span className="absolute -top-2.5 left-2 bg-[var(--panel)] px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
