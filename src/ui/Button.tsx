import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "danger" | "accent" | "success" | "neutral" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary-strong)] border-[var(--primary-border)] text-[var(--text)] hover:brightness-90",
  danger: "bg-[var(--danger)] border-[var(--danger-border)] text-[var(--bg)] hover:brightness-110",
  accent: "bg-[var(--accent)] border-[var(--accent-border)] text-[var(--bg)] hover:brightness-110",
  success: "bg-[var(--success)] border-[var(--success-border)] text-[var(--bg)] hover:brightness-110",
  neutral: "bg-[var(--neutral)] border-[var(--neutral-border)] text-[var(--text)] hover:brightness-90",
  ghost: "bg-transparent border-dashed border-[var(--panel-border)] text-[var(--text)] hover:border-[var(--primary-border)]",
};

export function Button({
  variant = "primary",
  disabled,
  autoFocus,
  onClick,
  className = "",
  children,
}: {
  variant?: ButtonVariant;
  disabled?: boolean;
  autoFocus?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={onClick}
      className={`rounded border-[1.5px] px-4 py-2 text-xs font-bold uppercase tracking-widest transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
