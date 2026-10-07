export function EventLog({ logs, logCount }: { logs: string[]; logCount: number }) {
  const firstId = logCount - logs.length;
  return (
    <aside className="border-t-2 border-dashed border-[var(--panel-border)] bg-[var(--bg)] p-3 md:w-52 md:flex-shrink-0 md:border-t-0 md:border-l-2">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Event Log / Live
      </h3>
      <ol role="log" aria-label="Event log" className="mt-3 flex flex-col gap-2">
        {logs.map((entry, index) => (
          <li key={firstId + index} className="flex gap-2 text-[10px] leading-4">
            <span aria-hidden="true" className="text-[var(--text-muted)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{entry}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
