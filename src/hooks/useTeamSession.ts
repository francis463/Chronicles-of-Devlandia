import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { PLAYER_START } from "../game/constants";
import {
  makeRoomCode,
  mergeFlags,
  newlySet,
  NO_FLAGS,
  NO_ROOM_TIMEOUT_MS,
  POS_INTERVAL_MS,
  PRESENCE_THROTTLE_MS,
  rankPlayers,
  TEAM_MAX,
  teamStartedAt,
  type PresenceMeta,
  type RankedPlayer,
  type TeamFlags,
  type TeamMessage,
} from "../game/team";
import type { TeamMode, TeamStatus, TeamTransport } from "../net/transport";

export type TeamErrorKind = "unreachable" | "no-room" | "full";
export type TeamPhase = "idle" | "connecting" | "lobby" | "playing" | "error";
export type Teammate = { id: string; name: string; color: string; x: number; y: number };

export type TeamSession = {
  phase: TeamPhase;
  status: TeamStatus | null;
  error: TeamErrorKind | null;
  room: string | null;
  me: RankedPlayer | null;
  players: RankedPlayer[];
  startedAt: number | null;
  teammates: Teammate[];
  create(name: string, mode: TeamMode): void;
  join(name: string, code: string, mode: TeamMode): void;
  start(): void;
  leave(): void;
  retry(): void;
  publishPosition(x: number, y: number): void;
  publishFlags(flags: TeamFlags): void;
  onProgress(cb: (flags: TeamFlags, by: string) => void): () => void;
  onRoster(cb: (joined: string[], left: string[]) => void): () => void;
};

type State = {
  phase: TeamPhase;
  status: TeamStatus | null;
  error: TeamErrorKind | null;
  room: string | null;
  myId: string | null;
  metas: PresenceMeta[];
  positions: Record<string, { x: number; y: number }>;
  startedAt: number | null;
};
type Action =
  | { type: "connect"; room: string; myId: string }
  | { type: "joined" }
  | { type: "presence"; metas: PresenceMeta[] }
  | { type: "status"; status: TeamStatus }
  | { type: "pos"; id: string; x: number; y: number }
  | { type: "started"; startedAt: number }
  | { type: "fail"; error: TeamErrorKind }
  | { type: "reset" };

const idle: State = { phase: "idle", status: null, error: null, room: null, myId: null, metas: [], positions: {}, startedAt: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "connect":
      return { ...idle, phase: "connecting", room: action.room, myId: action.myId };
    case "joined":
      return state.phase === "connecting" ? { ...state, phase: state.startedAt !== null ? "playing" : "lobby" } : state;
    case "presence": {
      const startedAt = state.startedAt ?? teamStartedAt(action.metas);
      return { ...state, metas: action.metas, startedAt, phase: state.phase === "lobby" && startedAt !== null ? "playing" : state.phase };
    }
    case "started":
      return { ...state, startedAt: state.startedAt ?? action.startedAt, phase: state.phase === "lobby" ? "playing" : state.phase };
    case "status":
      return { ...state, status: action.status };
    case "pos":
      return { ...state, positions: { ...state.positions, [action.id]: { x: action.x, y: action.y } } };
    case "fail":
      return { ...idle, phase: "error", error: action.error, room: state.room };
    case "reset":
      return idle;
  }
}

type Request = { name: string; mode: TeamMode; room: string; creating: boolean };

/**
 * The player's connection to a team room: lobby membership, start, teammates' positions and
 * shared progress. One instance lives in App so the session survives lobby → overworld.
 */
export function useTeamSession(makeTransport: (mode: TeamMode) => TeamTransport, now: () => number = Date.now): TeamSession {
  const [state, dispatch] = useReducer(reducer, idle);
  const stateRef = useRef(state);
  stateRef.current = state;

  const transport = useRef<TeamTransport | null>(null);
  const offs = useRef<Array<() => void>>([]);
  const me = useRef<PresenceMeta | null>(null);
  const request = useRef<Request | null>(null);
  const progressCbs = useRef(new Set<(flags: TeamFlags, by: string) => void>());
  const rosterCbs = useRef(new Set<(joined: string[], left: string[]) => void>());
  // What we know of each teammate's progress; replayed to listeners that subscribe later.
  const lastFlags = useRef(new Map<string, { name: string; flags: TeamFlags }>());
  const knownNames = useRef<Map<string, string> | null>(null);
  const seenOthers = useRef(false);
  const timers = useRef<{ noRoom?: ReturnType<typeof setTimeout>; pos?: ReturnType<typeof setTimeout>; presence?: ReturnType<typeof setTimeout> }>({});
  const lastSent = useRef({ pos: 0, presence: 0 });

  const teardown = useCallback(() => {
    offs.current.forEach((off) => off());
    offs.current = [];
    Object.values(timers.current).forEach((t) => clearTimeout(t));
    timers.current = {};
    const t = transport.current;
    transport.current = null;
    me.current = null;
    lastFlags.current.clear();
    knownNames.current = null;
    seenOthers.current = false;
    return t;
  }, []);

  const fail = useCallback(
    (error: TeamErrorKind) => {
      void teardown()?.leave();
      dispatch({ type: "fail", error });
    },
    [teardown],
  );

  /** Fires onProgress once per teammate flag the first time we learn about it. */
  const noteFlags = useCallback((id: string, name: string, flags: TeamFlags) => {
    const before = lastFlags.current.get(id)?.flags ?? NO_FLAGS;
    const after = mergeFlags(before, flags);
    if (newlySet(before, after).length === 0) return;
    lastFlags.current.set(id, { name, flags: after });
    progressCbs.current.forEach((cb) => cb(after, name));
  }, []);

  const adoptStart = useCallback((startedAt: number) => {
    if (!me.current || me.current.startedAt !== null) return;
    me.current = { ...me.current, startedAt };
    transport.current?.updatePresence(me.current);
  }, []);

  const connect = useCallback(
    (req: Request) => {
      void teardown()?.leave();
      const t = makeTransport(req.mode);
      transport.current = t;
      request.current = req;
      const myId = crypto.randomUUID();
      me.current = { id: myId, name: req.name, joinedAt: now(), startedAt: null, flags: NO_FLAGS, x: PLAYER_START.x, y: PLAYER_START.y };
      dispatch({ type: "connect", room: req.room, myId });

      offs.current.push(t.onStatus((status) => dispatch({ type: "status", status })));

      offs.current.push(
        t.onMessage((msg: TeamMessage) => {
          if (msg.type === "pos") {
            if (msg.id !== myId) dispatch({ type: "pos", id: msg.id, x: msg.x, y: msg.y });
          } else if (msg.type === "progress") {
            if (msg.id !== myId) noteFlags(msg.id, msg.name, msg.flags);
          } else {
            adoptStart(msg.startedAt);
            dispatch({ type: "started", startedAt: msg.startedAt });
          }
        }),
      );

      offs.current.push(
        t.onPresence((metas) => {
          if (!me.current || transport.current !== t) return;
          const ranked = rankPlayers(metas);
          const mine = ranked.find((p) => p.id === myId);
          if (mine && mine.rank >= TEAM_MAX) return fail("full");
          const others = ranked.filter((p) => p.id !== myId);
          if (others.length > 0) {
            seenOthers.current = true;
            clearTimeout(timers.current.noRoom);
          }
          const names = new Map(others.map((p) => [p.id, p.name]));
          if (knownNames.current) {
            const joined = [...names].filter(([id]) => !knownNames.current!.has(id)).map(([, n]) => n);
            const left = [...knownNames.current].filter(([id]) => !names.has(id)).map(([, n]) => n);
            if (joined.length || left.length) rosterCbs.current.forEach((cb) => cb(joined, left));
          }
          // The roster baseline is the room as we first find it, so existing members aren't "joined".
          if (knownNames.current || req.creating || others.length > 0) knownNames.current = names;
          others.forEach((p) => noteFlags(p.id, p.name, p.flags));
          const startedAt = teamStartedAt(metas);
          if (startedAt !== null) adoptStart(startedAt);
          dispatch({ type: "presence", metas });
        }),
      );

      t.join(req.room, me.current).then(
        () => {
          if (transport.current !== t) return;
          dispatch({ type: "joined" });
          if (!req.creating && !seenOthers.current) {
            timers.current.noRoom = setTimeout(() => {
              if (transport.current === t && !seenOthers.current) fail("no-room");
            }, NO_ROOM_TIMEOUT_MS);
          }
        },
        () => {
          if (transport.current === t) fail("unreachable");
        },
      );
    },
    [adoptStart, fail, makeTransport, noteFlags, now, teardown],
  );

  const busy = () => stateRef.current.phase === "connecting";

  const create = useCallback(
    (name: string, mode: TeamMode) => {
      if (!busy()) connect({ name, mode, room: makeRoomCode(), creating: true });
    },
    [connect],
  );

  const join = useCallback(
    (name: string, code: string, mode: TeamMode) => {
      if (!busy()) connect({ name, mode, room: code, creating: false });
    },
    [connect],
  );

  const start = useCallback(() => {
    const t = transport.current;
    const current = me.current;
    const ranked = rankPlayers(stateRef.current.metas);
    if (!t || !current || stateRef.current.phase !== "lobby") return;
    if (ranked.length < 2 || ranked[0].id !== current.id) return;
    const startedAt = now();
    adoptStart(startedAt);
    t.send({ type: "start", startedAt });
    dispatch({ type: "started", startedAt });
  }, [adoptStart, now]);

  const leave = useCallback(() => {
    void teardown()?.leave();
    dispatch({ type: "reset" });
  }, [teardown]);

  const retry = useCallback(() => {
    if (request.current) connect(request.current);
  }, [connect]);

  const publishPosition = useCallback(
    (x: number, y: number) => {
      const t = transport.current;
      if (!t || !me.current) return;
      me.current = { ...me.current, x, y };
      const sendPos = () => {
        if (!me.current || transport.current !== t) return;
        lastSent.current.pos = now();
        t.send({ type: "pos", id: me.current.id, x: me.current.x, y: me.current.y });
      };
      const sendPresence = () => {
        if (!me.current || transport.current !== t) return;
        lastSent.current.presence = now();
        t.updatePresence(me.current);
      };
      const throttle = (key: "pos" | "presence", interval: number, fire: () => void) => {
        const wait = lastSent.current[key] + interval - now();
        if (wait <= 0) fire();
        else if (!timers.current[key]) {
          timers.current[key] = setTimeout(() => {
            timers.current[key] = undefined;
            fire();
          }, wait);
        }
      };
      throttle("pos", POS_INTERVAL_MS, sendPos);
      throttle("presence", PRESENCE_THROTTLE_MS, sendPresence);
    },
    [now],
  );

  const publishFlags = useCallback((flags: TeamFlags) => {
    const t = transport.current;
    const current = me.current;
    if (!t || !current) return;
    const merged = mergeFlags(current.flags, flags);
    if (newlySet(current.flags, merged).length === 0) return;
    me.current = { ...current, flags: merged };
    t.updatePresence(me.current);
    t.send({ type: "progress", id: current.id, name: current.name, flags: merged });
  }, []);

  const onProgress = useCallback((cb: (flags: TeamFlags, by: string) => void) => {
    progressCbs.current.add(cb);
    // A listener that arrives late (the map mounting after a mid-game join) still learns the team's progress.
    lastFlags.current.forEach(({ name, flags }) => cb(flags, name));
    return () => void progressCbs.current.delete(cb);
  }, []);

  const onRoster = useCallback((cb: (joined: string[], left: string[]) => void) => {
    rosterCbs.current.add(cb);
    return () => void rosterCbs.current.delete(cb);
  }, []);

  useEffect(() => () => void teardown()?.leave(), [teardown]);

  const players = useMemo(() => rankPlayers(state.metas), [state.metas]);
  const mePlayer = players.find((p) => p.id === state.myId) ?? null;
  const teammates = useMemo(
    () =>
      players
        .filter((p) => p.id !== state.myId)
        .map((p) => ({ id: p.id, name: p.name, color: p.color, ...(state.positions[p.id] ?? { x: p.x, y: p.y }) })),
    [players, state.myId, state.positions],
  );

  return {
    phase: state.phase,
    status: state.status,
    error: state.error,
    room: state.room,
    me: mePlayer,
    players,
    startedAt: state.startedAt,
    teammates,
    create,
    join,
    start,
    leave,
    retry,
    publishPosition,
    publishFlags,
    onProgress,
    onRoster,
  };
}
