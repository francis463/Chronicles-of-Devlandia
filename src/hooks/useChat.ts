import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { runCommand, type CommandContext, type CommandEffect } from "../chat/commands";
import { clampChat, cleanChat, maskRude } from "../chat/filter";
import { displayNames, nameKey } from "../chat/names";
import { pingLine } from "../chat/places";
import type { TeamSession } from "./useTeamSession";

export type ChatLine = {
  seq: number;
  kind: "mine" | "teammate" | "ping" | "note";
  senderId: string | null;
  /** The sender's `nameKey`; null for your own lines and notes. */
  key: string | null;
  name: string;
  color: string;
  text: string;
  silent?: true;
};
export type PostResult = { status: "sent" | "refused" | "command"; effect: CommandEffect | null };
export type ChatFeed = {
  /** Muted players' messages and ping lines are filtered out; your own never are. */
  lines: ChatLine[];
  draft: string;
  setDraft(draft: string): void;
  /** Nickname keys. */
  muted: readonly string[];
  mute(name: string): void;
  unmute(name: string): void;
  post(text: string, context: CommandContext): PostResult;
};

const MAX_LINES = 50;
const MESSAGE_GAP_MS = 1000;
const PING_GAP_MS = 5000;
const SLOW = "Slow down: one message a second.";
const PING_WAIT = "Wait a moment before pinging again.";
const OFFLINE = "Not sent: reconnecting.";
const SOLO_PLAIN = "Solo game: start a command with /, for example /help.";
const TEAM_WELCOME = "Chat with your team here. Type /help for commands.";
const SOLO_WELCOME = "Type /help for commands.";

type NewLine = Omit<ChatLine, "seq">;
type State = { lines: ChatLine[]; draft: string; muted: string[]; seq: number };
type Action =
  | { type: "add"; lines: NewLine[]; replaceSame?: boolean }
  | { type: "draft"; draft: string }
  | { type: "mute"; key: string }
  | { type: "unmute"; key: string }
  | { type: "reset" };

const note = (text: string, silent?: true): NewLine => ({ kind: "note", senderId: null, key: null, name: "", color: "", text, ...(silent && { silent }) });
const empty: State = { lines: [], draft: "", muted: [], seq: 0 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      let lines = state.lines;
      let seq = state.seq;
      for (const line of action.lines) {
        const newest = lines.at(-1);
        // An identical refusal replaces the one before it, and counts as new.
        if (action.replaceSame && newest?.kind === "note" && newest.text === line.text) lines = lines.slice(0, -1);
        lines = [...lines, { ...line, seq: ++seq }].slice(-MAX_LINES);
      }
      return { ...state, lines, seq };
    }
    case "draft":
      return state.draft === action.draft ? state : { ...state, draft: action.draft };
    case "mute":
      return state.muted.includes(action.key) ? state : { ...state, muted: [...state.muted, action.key] };
    case "unmute":
      return state.muted.includes(action.key) ? { ...state, muted: state.muted.filter((k) => k !== action.key) } : state;
    case "reset":
      return state.lines.length || state.draft || state.muted.length ? { ...empty, seq: state.seq } : state;
  }
}

const init = (session: TeamSession | null): State => (session ? empty : reducer(empty, { type: "add", lines: [note(SOLO_WELCOME, true)] }));

/** The last `seq` in the feed; 0 when there are no lines. */
export const lastSeq = (lines: readonly ChatLine[]): number => lines.at(-1)?.seq ?? 0;
/** Teammate and ping lines above `seenSeq`. */
export const countUnread = (lines: readonly ChatLine[], seenSeq: number): number =>
  lines.filter((l) => l.seq > seenSeq && (l.kind === "teammate" || l.kind === "ping")).length;

/**
 * One conversation: the last 50 lines, the draft, the mute list (nickname keys) and your send rates.
 * Pass the team session for a team feed, or null for a solo game's own.
 */
export function useChat(session: TeamSession | null): ChatFeed {
  const [state, dispatch] = useReducer(reducer, session, init);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const lastSent = useRef(-Infinity);
  const lastPingSent = useRef(-Infinity);
  const welcomed = useRef(false);

  const phase = session?.phase;
  useEffect(() => {
    if (phase === undefined) return;
    if (phase === "lobby" || phase === "playing") {
      if (!welcomed.current) {
        welcomed.current = true;
        dispatch({ type: "add", lines: [note(TEAM_WELCOME, true)] });
      }
    } else if (phase === "idle" || phase === "error") {
      welcomed.current = false;
      lastSent.current = -Infinity;
      lastPingSent.current = -Infinity;
      dispatch({ type: "reset" });
    }
  }, [phase]);

  const onChat = session?.onChat;
  const onPing = session?.onPing;
  useEffect(() => {
    if (!onChat || !onPing) return;
    const shown = (id: string, raw: string) => displayNames(sessionRef.current?.players ?? []).get(id) ?? maskRude(raw);
    const offChat = onChat((from, text) => {
      const key = nameKey(from.name);
      if (stateRef.current.muted.includes(key)) return;
      dispatch({ type: "add", lines: [{ kind: "teammate", senderId: from.id, key, name: shown(from.id, from.name), color: from.color, text }] });
    });
    const offPing = onPing((from, ping) => {
      const key = nameKey(from.name);
      if (stateRef.current.muted.includes(key)) return;
      const name = shown(from.id, from.name);
      dispatch({ type: "add", lines: [{ kind: "ping", senderId: from.id, key, name, color: from.color, text: pingLine(name, ping) }] });
    });
    return () => {
      offChat();
      offPing();
    };
  }, [onChat, onPing]);

  const setDraft = useCallback((draft: string) => dispatch({ type: "draft", draft }), []);
  const mute = useCallback((name: string) => dispatch({ type: "mute", key: nameKey(name) }), []);
  const unmute = useCallback((name: string) => dispatch({ type: "unmute", key: nameKey(name) }), []);

  const refuse = (text: string) => dispatch({ type: "add", lines: [note(text)], replaceSame: true });

  const post = useCallback((text: string, context: CommandContext): PostResult => {
    const clean = cleanChat(text);
    if (!clean) return { status: "refused", effect: null };
    const team = sessionRef.current;

    if (clean.startsWith("/")) {
      const { notes, effect } = runCommand(clean, context);
      if (effect?.kind === "ping") {
        const at = Date.now();
        if (at - lastPingSent.current < PING_GAP_MS) {
          refuse(PING_WAIT);
          return { status: "command", effect: null };
        }
        if (!team || team.sendPing({ zone: effect.zone, x: effect.x, y: effect.y, place: effect.place }) === "offline") {
          refuse(OFFLINE);
          return { status: "command", effect: null };
        }
        lastPingSent.current = at;
      } else if (effect?.kind === "mute") dispatch({ type: "mute", key: effect.key });
      else if (effect?.kind === "unmute") dispatch({ type: "unmute", key: effect.key });
      dispatch({ type: "add", lines: notes.map((n) => note(n)) });
      return { status: "command", effect };
    }

    if (!team || context.where === "solo") {
      refuse(SOLO_PLAIN);
      return { status: "command", effect: null };
    }
    const at = Date.now();
    if (at - lastSent.current < MESSAGE_GAP_MS) {
      refuse(SLOW);
      return { status: "refused", effect: null };
    }
    const body = clampChat(maskRude(clean));
    if (team.sendChat(body) === "offline") {
      refuse(OFFLINE);
      return { status: "refused", effect: null };
    }
    lastSent.current = at;
    const me = team.me;
    dispatch({
      type: "add",
      lines: [{ kind: "mine", senderId: me?.id ?? null, key: null, name: me ? maskRude(me.name) : "You", color: me?.color ?? "", text: body }],
    });
    return { status: "sent", effect: null };
  }, []);

  const lines = useMemo(
    () => state.lines.filter((l) => (l.kind !== "teammate" && l.kind !== "ping") || l.key === null || !state.muted.includes(l.key)),
    [state.lines, state.muted],
  );

  return { lines, draft: state.draft, setDraft, muted: state.muted, mute, unmute, post };
}
