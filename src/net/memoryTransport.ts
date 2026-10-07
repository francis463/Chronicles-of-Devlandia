import { parseMessage, parsePresence, type PresenceMeta, type TeamMessage } from "../game/team";
import { emitter, TeamError, type TeamStatus, type TeamTransport } from "./transport";

type Member = {
  transport: TeamTransport;
  room: string | null;
  meta: PresenceMeta | null;
  dropped: boolean;
  presence: ReturnType<typeof emitter<PresenceMeta[]>>;
  messages: ReturnType<typeof emitter<TeamMessage>>;
  status: ReturnType<typeof emitter<TeamStatus>>;
};

/** In-process rooms for tests: several transports share one hub as if they were separate players. */
export function createMemoryHub(now: () => number = () => Date.now()) {
  const members: Member[] = [];
  let reachable = true;

  const live = (room: string) => members.filter((m) => m.room === room && m.meta && !m.dropped);

  function publishPresence(room: string) {
    const metas = live(room)
      .map((m) => parsePresence(m.meta, now()))
      .filter((m): m is PresenceMeta => m !== null);
    for (const m of live(room)) m.presence.emit(metas);
  }

  function deliver(room: string, raw: unknown, from?: Member) {
    const msg = parseMessage(raw, now());
    if (!msg) return;
    for (const m of live(room)) if (m !== from) m.messages.emit(msg);
  }

  const memberOf = (t: TeamTransport) => members.find((m) => m.transport === t)!;

  function transport(): TeamTransport {
    const presence = emitter<PresenceMeta[]>();
    const messages = emitter<TeamMessage>();
    const status = emitter<TeamStatus>();
    const t: TeamTransport = {
      async join(room, me) {
        status.emit("connecting");
        if (!reachable) throw new TeamError("unreachable");
        Object.assign(member, { room, meta: me, dropped: false });
        status.emit("online");
        publishPresence(room);
      },
      async leave() {
        const room = member.room;
        Object.assign(member, { room: null, meta: null });
        if (room) publishPresence(room);
      },
      updatePresence(meta) {
        member.meta = meta;
        if (member.room && !member.dropped) publishPresence(member.room);
      },
      send(msg) {
        if (member.room && !member.dropped) deliver(member.room, msg, member);
      },
      onPresence: presence.on,
      onMessage: messages.on,
      onStatus: status.on,
    };
    const member: Member = { transport: t, room: null, meta: null, dropped: false, presence, messages, status };
    members.push(member);
    return t;
  }

  return {
    transport,
    setReachable(ok: boolean) {
      reachable = ok;
    },
    /** Simulates a lost connection: the others stop seeing this player and nothing is delivered either way. */
    drop(t: TeamTransport) {
      const m = memberOf(t);
      m.dropped = true;
      m.status.emit("reconnecting");
      if (m.room) publishPresence(m.room);
    },
    restore(t: TeamTransport) {
      const m = memberOf(t);
      m.dropped = false;
      m.status.emit("online");
      if (m.room) publishPresence(m.room);
    },
    /** Delivers a raw (possibly invalid) message to everyone in the room, as a misbehaving client would. */
    inject(room: string, raw: unknown) {
      deliver(room, raw);
    },
  };
}
