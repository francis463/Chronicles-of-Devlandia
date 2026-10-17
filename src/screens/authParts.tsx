import type { ReactNode } from "react";
import { Panel } from "../ui/Panel";
import { MenuBackdrop } from "./MenuBackdrop";

const fieldClass =
  "w-full rounded border-2 border-[var(--panel-border)] bg-[var(--editor-bg)] px-3 py-2 font-mono text-sm text-[var(--text)] outline-none focus:border-[var(--primary-border)]";

/** The backdrop and the panel every account screen sits in. */
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <MenuBackdrop />
      <Panel className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-8 sm:px-6">
        <h1 className="text-center text-lg font-bold tracking-widest text-[var(--text)] sm:text-xl">{title}</h1>
        {children}
      </Panel>
    </>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "password";
  autoComplete: string;
  maxLength?: number;
}) {
  return (
    <label className="flex w-full flex-col gap-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">
      {label}
      <input
        value={value}
        type={type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        spellCheck={false}
        autoCapitalize="none"
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

export function Problem({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="w-full text-xs text-[var(--danger-border)]">
      {text}
    </p>
  ) : null;
}
