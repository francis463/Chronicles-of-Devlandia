import { useId, useLayoutEffect, useRef, useState, type FormEvent, type MouseEvent, type Ref } from "react";
import type { CommandContext, CommandEffect } from "../../chat/commands";
import { CHAT_MAX, chatLength } from "../../chat/filter";
import type { ChatFeed, ChatLine } from "../../hooks/useChat";
import { speak } from "../speak";

type Where = "solo" | "lobby" | "game";

const GAME_REPLIES = ["On my way", "Need help", "Meet at the gate", "Found it!", "Wait for me", "Good job!"];
const LOBBY_REPLIES = ["Ready!", "Wait for me", "Hi!"];

const TOUCH = "pointer-coarse:min-h-11";
const BUTTON = `border-2 border-[var(--panel-border)] bg-[var(--panel)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide hover:bg-[var(--panel-border)] focus-visible:outline-2 focus-visible:outline-offset-2 ${TOUCH}`;
/** Within this many pixels of the end counts as "at the bottom". */
const BOTTOM_SLACK = 4;

const keepFocus = (e: MouseEvent) => e.preventDefault();
/** A pointer click leaves the button unfocused so the arrow keys move the explorer again; keyboard activation keeps it. */
const afterPointer = (e: MouseEvent<HTMLElement>) => {
  if (e.detail > 0) e.currentTarget.blur();
};

function Line({ line }: { line: ChatLine }) {
  const wrap = "overflow-hidden text-[10px] leading-4 [overflow-wrap:anywhere]";
  if (line.kind === "teammate" || line.kind === "mine") {
    return (
      <li className={wrap}>
        <span className="font-bold" style={{ color: line.color }}>
          {line.name}
        </span>
        : <bdi>{line.text}</bdi>
      </li>
    );
  }
  if (line.kind === "ping") return <li className={`${wrap} text-[var(--text-muted)]`}>{speak(line.text)}</li>;
  return (
    <li className={`${wrap} text-[var(--text-muted)]`}>
      <span aria-hidden="true">&gt; </span>
      {speak(line.text)}
    </li>
  );
}

/**
 * The conversation and its input line, for the lobby and the game. The visible list is not a live region:
 * the Announcer speaks for it.
 */
export function ChatPanel({
  feed,
  where,
  getContext,
  onEffect,
  inputRef,
  active = true,
  className = "",
}: {
  feed: ChatFeed;
  where: Where;
  getContext: () => CommandContext;
  onEffect?: (effect: CommandEffect) => void;
  inputRef?: Ref<HTMLInputElement>;
  /** False while its tab is hidden. */
  active?: boolean;
  className?: string;
}) {
  const counterId = useId();
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLOListElement>(null);
  /** The scroller's height after the last time we placed it, to tell whether it was at the bottom before new lines grew it. */
  const placed = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const atBottom = placed.current === null || placed.current - el.scrollTop - el.clientHeight <= BOTTOM_SLACK;
    if (atBottom) el.scrollTop = el.scrollHeight;
    placed.current = el.scrollHeight;
  }, [feed.lines]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !active) return;
    el.scrollTop = el.scrollHeight;
    placed.current = el.scrollHeight;
  }, [active]);

  const game = where === "game";
  /** A game's panel (team or solo) fills the sidebar slot; the lobby's list is bounded instead. */
  const fill = where !== "lobby";
  const length = chatLength(feed.draft);
  const showCounter = length > CHAT_MAX - 20;
  const status = length === CHAT_MAX ? `Limit reached: ${CHAT_MAX} characters` : length === CHAT_MAX - 10 ? "10 characters left" : "";
  const replies = where === "game" ? GAME_REPLIES : where === "lobby" ? LOBBY_REPLIES : [];

  const send = (text: string) => {
    const result = feed.post(text, getContext());
    if (result.effect) onEffect?.(result.effect);
    return result;
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (feed.draft.trim() === "") return;
    if (send(feed.draft).status !== "refused") feed.setDraft("");
  };

  const listClass = fill
    ? "flex-1 min-h-0 overflow-y-auto max-h-36 md:max-h-none"
    : "h-36 max-h-36 md:h-64 md:max-h-64 overflow-y-auto";

  return (
    <div className={`${fill ? "flex h-full min-h-0 flex-col" : "flex flex-col"} gap-1 ${className}`}>
      <ol ref={scroller} aria-label="Team chat" className={`${listClass} flex flex-col gap-1 md:gap-0.5`}>
        {feed.lines.map((line) => (
          <Line key={line.seq} line={line} />
        ))}
      </ol>

      {replies.length > 0 && (
        <>
          {game && (
            <button type="button" aria-expanded={open} onMouseDown={keepFocus} onClick={() => setOpen((v) => !v)} className={`hidden md:inline-flex ${BUTTON} md:self-start md:border-0 md:bg-transparent md:px-0 md:py-0 md:underline`}>
              [ Quick replies ]
            </button>
          )}
          <div role="group" aria-label="Quick replies" className={`flex flex-wrap gap-1 ${game && !open ? "md:hidden" : ""}`}>
            {replies.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onMouseDown={keepFocus}
                onClick={(e) => {
                  send(phrase);
                  afterPointer(e);
                }}
                className={BUTTON}
              >
                {phrase}
              </button>
            ))}
          </div>
        </>
      )}

      <form onSubmit={submit} className={`flex gap-2 ${fill ? "md:flex-col" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          aria-label="Message"
          aria-describedby={showCounter ? counterId : undefined}
          autoComplete="off"
          enterKeyHint="send"
          maxLength={CHAT_MAX}
          placeholder={where === "solo" ? "Command, or /help" : "Chat, or /help"}
          value={feed.draft}
          onChange={(e) => feed.setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
          className={`min-w-0 flex-1 border-2 border-[var(--panel-border)] bg-[var(--bg)] px-2 py-1 text-[11px] md:py-0.5 pointer-coarse:text-base ${TOUCH}`}
        />
        <button type="submit" onMouseDown={keepFocus} className={`${BUTTON} md:py-0.5`}>
          [ SEND ]
        </button>
      </form>
      {showCounter && (
        <span id={counterId} className="text-right text-[10px] text-[var(--text-muted)]">
          {length}/{CHAT_MAX}
        </span>
      )}
      <div role="status" aria-label="Message length" className="sr-only">
        {status}
      </div>
    </div>
  );
}
