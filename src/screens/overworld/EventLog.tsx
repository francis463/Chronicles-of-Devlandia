import { useLayoutEffect, useRef } from "react";

/** At md the log fills the rest of the sidebar and scrolls; a new entry scrolls it into view. */
export function EventLog({ logs, logCount, className = "" }: { logs: string[]; logCount: number; className?: string }) {
  const firstId = logCount - logs.length;
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logCount]);
  return (
    <aside className={`border-t-2 border-dashed border-[var(--panel-border)] bg-[var(--bg)] p-3 md:relative md:min-h-34 md:border-t-0 md:border-r-2 ${className}`}>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Event Log / Live
      </h3>
      <div ref={scroller} data-testid="event-log-scroller" className="md:absolute md:inset-x-3 md:top-10 md:bottom-3 md:overflow-y-auto">
        <ol role="log" aria-label="Event log" className="mt-3 flex flex-col gap-2 md:mt-0">
          {logs.map((entry, index) => (
            <li key={firstId + index} className="flex gap-2 text-[10px] leading-4">
              <span aria-hidden="true" className="text-[var(--text-muted)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{entry}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
