import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"], [data-autofocus]';

/**
 * The amber terminal frame shared by every in-game puzzle: a modal dialog over a dim
 * backdrop, titled header with [X] CLOSE, Tab kept inside, and the first input (or the
 * control marked data-autofocus) focused on open.
 */
export function TerminalDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // While open, everything else on the page is inert: siblings at every level up to <body>.
  // Uses the attribute (not the property, which jsdom doesn't reflect) and restores only what it set.
  useEffect(() => {
    const changed: Element[] = [];
    for (let node = outerRef.current as Element | null; node?.parentElement && node !== document.body; node = node.parentElement) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling !== node && !sibling.hasAttribute("inert")) {
          sibling.setAttribute("inert", "");
          changed.push(sibling);
        }
      }
    }
    return () => changed.forEach((el) => el.removeAttribute("inert"));
  }, []);

  useEffect(() => {
    // The first text box (its text selected so typing replaces it), else the control marked data-autofocus.
    // With neither, [X] CLOSE (an empty Codex).
    const target = dialogRef.current?.querySelector<HTMLElement>("input, [data-autofocus]") ?? closeRef.current;
    target?.focus();
    if (target instanceof HTMLInputElement) target.select();
  }, []);

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={outerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,23,42,0.7)] p-4"
      // A click on the dim backdrop would otherwise move focus to the page behind the dialog.
      onMouseDown={(event) => event.target === event.currentTarget && event.preventDefault()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
        className="max-h-full w-full max-w-4xl overflow-auto rounded-md border-2 border-[var(--accent)] bg-[var(--panel)]"
      >
        <header className="flex items-center justify-between gap-2 bg-[var(--accent)] px-3 py-2 text-[var(--bg)]">
          <h2 id={titleId} className="text-sm font-bold tracking-widest">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-2 py-1 text-sm font-bold tracking-widest whitespace-nowrap hover:bg-[var(--accent-border)] focus-visible:outline-2 focus-visible:outline-[var(--bg)]"
          >
            [X] CLOSE
          </button>
        </header>
        <div className="flex flex-col gap-5 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
