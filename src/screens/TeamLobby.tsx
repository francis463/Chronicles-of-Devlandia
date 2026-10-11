import { useLayoutEffect, useRef, useState } from "react";
import { lobbyContext } from "../chat/context";
import { maskRude } from "../chat/filter";
import { displayNames, nameKey } from "../chat/names";
import { normalizeNickname, normalizeRoomCode } from "../game/team";
import type { ChatFeed } from "../hooks/useChat";
import type { TeamErrorKind, TeamSession } from "../hooks/useTeamSession";
import type { TeamMode } from "../net/transport";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { Announcer } from "./chat/Announcer";
import { ChatPanel } from "./chat/ChatPanel";

const ERROR_COPY: Record<TeamErrorKind, string> = {
  unreachable: "Can't reach the team server. Check your internet connection, or switch to Same computer mode.",
  "no-room": "No room with that code.",
  full: "This room is full.",
};
const NICKNAME_ERROR = "Enter a nickname (1–12 letters, digits, spaces, - or _).";
const RUDE_NICKNAME_ERROR = "Pick a different nickname.";
const MODES: Array<{ mode: TeamMode; label: string }> = [
  { mode: "online", label: "Online" },
  { mode: "local", label: "Same computer" },
];

/**
 * [ Leave Room ] appears right where [ Create Room ] was, so the second click of a double-click
 * (or double-tap) on Create would leave the room at once; it is ignored this long after the room appears.
 */
export const ROOM_VIEW_GUARD_MS = 500;

const fieldClass =
  "w-full rounded border-2 border-[var(--panel-border)] bg-[var(--editor-bg)] px-3 py-2 font-mono text-sm text-[var(--text)] outline-none focus:border-[var(--primary-border)]";

export function TeamLobby({ session, onBack, chat }: { session: TeamSession; onBack: () => void; chat?: ChatFeed }) {
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<TeamMode>("online");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const connecting = session.phase === "connecting";
  const inRoom = session.phase === "lobby" || session.phase === "playing";
  const roomShownAt = useRef(0);
  useLayoutEffect(() => {
    if (inRoom) roomShownAt.current = Date.now();
  }, [inRoom]);
  const leaveRoom = () => {
    if (Date.now() - roomShownAt.current >= ROOM_VIEW_GUARD_MS) onBack();
  };

  const withName = (go: (name: string) => void) => {
    const name = normalizeNickname(nickname);
    // A nickname the chat filter would mask is refused, so nobody can post as a rude word.
    setNicknameError(!name ? NICKNAME_ERROR : maskRude(name) !== name ? RUDE_NICKNAME_ERROR : null);
    if (name && maskRude(name) === name) go(name);
  };

  if (inRoom) {
    const isHost = session.me?.isHost ?? false;
    const shown = displayNames(session.players);
    return (
      <Panel className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8 sm:px-6">
        <h1 className="text-center text-lg font-bold tracking-widest">TEAM LOBBY</h1>
        <h2 className="text-center font-mono text-2xl font-bold tracking-[0.3em] text-[var(--accent)]">{`ROOM ${session.room}`}</h2>
        <ul aria-label="Players" className="flex flex-col gap-2">
          {session.players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded border border-[var(--panel-border)] bg-[var(--bg)] px-3 py-2 text-sm">
              <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: p.color }} />
              <span>
                {shown.get(p.id)}
                {p.id === session.me?.id ? " (you)" : ""}
                {p.isHost ? " (host)" : ""}
                {chat && p.id !== session.me?.id && chat.muted.includes(nameKey(p.name)) ? " (muted)" : ""}
              </span>
              {chat && p.id !== session.me?.id && (
                <button
                  type="button"
                  aria-label={`${chat.muted.includes(nameKey(p.name)) ? "Unmute" : "Mute"} ${shown.get(p.id)}`}
                  onClick={() => (chat.muted.includes(nameKey(p.name)) ? chat.unmute(p.name) : chat.mute(p.name))}
                  className="ml-auto cursor-pointer border-2 border-[var(--panel-border)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide hover:bg-[var(--panel-border)] focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:min-h-11"
                >
                  {chat.muted.includes(nameKey(p.name)) ? "[ Unmute ]" : "[ Mute ]"}
                </button>
              )}
            </li>
          ))}
        </ul>
        {chat && (
          <section aria-label="Team chat" className="flex flex-col gap-2">
            <ChatPanel feed={chat} where="lobby" getContext={() => lobbyContext(session, chat.muted)} />
            <Announcer lines={chat.lines} />
          </section>
        )}
        {isHost ? (
          <Button variant="success" disabled={session.players.length < 2} onClick={session.start} className="py-3">
            [ Start Expedition ]
          </Button>
        ) : (
          <p className="text-center text-sm text-[var(--text-muted)]">Waiting for the host to start…</p>
        )}
        <Button variant="ghost" onClick={leaveRoom}>
          [ Leave Room ]
        </Button>
      </Panel>
    );
  }

  return (
    <Panel className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8 sm:px-6">
      <h1 className="text-center text-lg font-bold tracking-widest">TEAM LOBBY</h1>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">
        Nickname
        <input
          aria-label="Nickname"
          value={nickname}
          maxLength={12}
          autoComplete="nickname"
          onChange={(e) => setNickname(e.target.value)}
          className={fieldClass}
        />
      </label>
      {nicknameError && (
        <p role="alert" className="text-xs text-[var(--danger-border)]">
          {nicknameError}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <span id="connection-label" className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Connection
        </span>
        <div role="radiogroup" aria-labelledby="connection-label" className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={mode === m.mode}
              onClick={() => setMode(m.mode)}
              className={`cursor-pointer rounded border-2 px-3 py-2 text-xs font-bold uppercase tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${
                mode === m.mode
                  ? "border-[var(--accent-border)] bg-[var(--accent)] text-[var(--bg)]"
                  : "border-[var(--panel-border)] bg-[var(--bg)] text-[var(--text)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <Button disabled={connecting} onClick={() => withName((name) => session.create(name, mode))} className="py-3">
        [ Create Room ]
      </Button>

      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Room code
          <input
            aria-label="Room code"
            value={code}
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`${fieldClass} uppercase tracking-[0.3em]`}
          />
        </label>
        <Button
          disabled={connecting || !normalizeRoomCode(code)}
          onClick={() => withName((name) => session.join(name, normalizeRoomCode(code)!, mode))}
          className="py-3"
        >
          [ Join ]
        </Button>
      </div>

      {connecting && <p className="text-center text-sm text-[var(--text-muted)]">Connecting…</p>}
      {session.phase === "error" && session.error && (
        <div role="alert" className="flex flex-col items-center gap-2 text-center text-sm text-[var(--danger-border)]">
          <p>{ERROR_COPY[session.error]}</p>
          {session.error === "unreachable" && (
            <Button variant="ghost" onClick={session.retry}>
              [ Retry ]
            </Button>
          )}
        </div>
      )}

      <Button variant="ghost" onClick={onBack}>
        [ Back to Menu ]
      </Button>
    </Panel>
  );
}
