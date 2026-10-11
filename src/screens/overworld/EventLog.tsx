import { useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import type { ChatLine } from "../../hooks/useChat";
import { Announcer } from "../chat/Announcer";
import { speak } from "../speak";

export type SideTab = "log" | "chat";
export type SideChat = {
  tab: SideTab;
  onTab(tab: SideTab): void;
  label: "CHAT" | "COMMANDS";
  unread: number;
  lines: ChatLine[];
  panel: ReactNode;
};

const TABS: SideTab[] = ["log", "chat"];
const PANEL = "md:absolute md:inset-x-3 md:top-10 md:bottom-3 pointer-coarse:md:top-16";

/**
 * At md the log fills the rest of the sidebar and scrolls; a new entry scrolls it into view. With `chat`
 * the panel gains LOG | CHAT tabs (ARIA tabs, automatic activation); both panels stay mounted.
 */
export function EventLog({ logs, logCount, className = "", chat }: { logs: string[]; logCount: number; className?: string; chat?: SideChat }) {
  const firstId = logCount - logs.length;
  const scroller = useRef<HTMLDivElement>(null);
  const ids = useId();
  const tabRefs = useRef<Record<SideTab, HTMLButtonElement | null>>({ log: null, chat: null });
  const tab = chat?.tab;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logCount, tab]);

  const id = (kind: "tab" | "panel", t: SideTab) => `${ids}-${kind}-${t}`;
  const move = (e: KeyboardEvent<HTMLElement>) => {
    if (!chat) return;
    const at = TABS.indexOf(chat.tab);
    const next =
      e.key === "ArrowRight" ? TABS[(at + 1) % TABS.length]
      : e.key === "ArrowLeft" ? TABS[(at + TABS.length - 1) % TABS.length]
      : e.key === "Home" ? TABS[0]
      : e.key === "End" ? TABS[TABS.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    e.stopPropagation();
    chat.onTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <aside className={`border-t-2 border-dashed border-[var(--panel-border)] bg-[var(--bg)] p-3 md:relative md:min-h-34 md:border-t-0 md:border-r-2 ${className}`}>
      {chat ? (
        <div role="tablist" aria-label="Side panel" onKeyDown={move} className="flex gap-1">
          {TABS.map((t) => {
            const selected = chat.tab === t;
            const label = t === "log" ? "LOG" : chat.label;
            const unread = t === "chat" ? chat.unread : 0;
            return (
              <button
                key={t}
                ref={(el) => void (tabRefs.current[t] = el)}
                type="button"
                role="tab"
                id={id("tab", t)}
                aria-selected={selected}
                aria-controls={id("panel", t)}
                aria-label={unread > 0 ? `${label}, ${unread} new` : undefined}
                tabIndex={selected ? 0 : -1}
                onClick={(e) => {
                  chat.onTab(t);
                  if (e.detail > 0) e.currentTarget.blur();
                }}
                className={`border-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:min-h-11 ${selected ? "border-[var(--panel-border)] bg-[var(--panel)]" : "border-transparent text-[var(--text-muted)]"}`}
              >
                {unread > 0 ? `${label} (${unread})` : label}
              </button>
            );
          })}
        </div>
      ) : (
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Event Log / Live
        </h3>
      )}
      <div
        ref={scroller}
        data-testid="event-log-scroller"
        {...(chat && { role: "tabpanel", id: id("panel", "log"), "aria-labelledby": id("tab", "log"), hidden: chat.tab !== "log" })}
        className={`${chat ? `mt-2 ${PANEL}` : "md:absolute md:inset-x-3 md:top-10 md:bottom-3"} md:overflow-y-auto`}
      >
        <ol role="log" aria-label="Event log" className="mt-3 flex flex-col gap-2 md:mt-0">
          {logs.map((entry, index) => (
            <li key={firstId + index} className="flex gap-2 text-[10px] leading-4">
              <span aria-hidden="true" className="text-[var(--text-muted)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{speak(entry)}</span>
            </li>
          ))}
        </ol>
      </div>
      {chat && (
        <>
          <div role="tabpanel" id={id("panel", "chat")} aria-labelledby={id("tab", "chat")} hidden={chat.tab !== "chat"} className={`mt-2 ${PANEL}`}>
            {chat.panel}
          </div>
          <Announcer lines={chat.lines} log={chat.tab === "chat" ? { entries: logs, count: logCount } : null} />
        </>
      )}
    </aside>
  );
}
