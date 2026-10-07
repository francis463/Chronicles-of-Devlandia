import { parseMessage, parsePresence, PRESENCE_THROTTLE_MS, type PresenceMeta, type TeamMessage } from "../game/team";
import { emitter, roomChannel, TeamError, type TeamStatus, type TeamTransport } from "./transport";

type ChannelLike = {
  on(type: string, filter: { event: string }, cb: (arg: unknown) => void): ChannelLike;
  subscribe(cb: (status: string) => void): ChannelLike;
  track(payload: Record<string, unknown>): Promise<unknown>;
  untrack(): Promise<unknown>;
  send(args: { type: "broadcast"; event: string; payload: unknown }): Promise<unknown>;
  presenceState(): Record<string, unknown[]>;
};
/** The slice of SupabaseClient this transport uses (kept narrow so tests can fake it). */
export type RealtimeClientLike = {
  channel(name: string, opts: { config: { presence: { key: string }; broadcast: { self: boolean } } }): ChannelLike;
  removeChannel(channel: ChannelLike): Promise<unknown>;
};

const MESSAGE_TYPES: TeamMessage["type"][] = ["pos", "progress", "start"];
const FAILURE = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

/**
 * Online mode: one Supabase Realtime channel per room. Presence (keyed by player id) carries
 * each player's meta; broadcasts carry positions, progress and the start signal.
 * `loadClient` is called on join, so solo play never loads supabase-js.
 */
export function createSupabaseTransport(loadClient: () => Promise<RealtimeClientLike>): TeamTransport {
  const presence = emitter<PresenceMeta[]>();
  const messages = emitter<TeamMessage>();
  const status = emitter<TeamStatus>();
  let client: RealtimeClientLike | null = null;
  let channel: ChannelLike | null = null;
  let me: PresenceMeta | null = null;
  let subscribed = false;
  let lastTrack = 0;
  let trailing: ReturnType<typeof setTimeout> | undefined;

  const track = () => {
    if (!channel || !me || !subscribed) return;
    lastTrack = Date.now();
    void channel.track(me as unknown as Record<string, unknown>);
  };

  const emitPresence = () => {
    if (!channel) return;
    const metas = Object.values(channel.presenceState())
      .map((entries) => parsePresence(entries[entries.length - 1], Date.now()))
      .filter((m): m is PresenceMeta => m !== null);
    presence.emit(metas);
  };

  return {
    async join(room, meta) {
      status.emit("connecting");
      me = meta;
      try {
        client = await loadClient();
      } catch {
        throw new TeamError("unreachable");
      }
      const ch = client.channel(roomChannel(room), { config: { presence: { key: meta.id }, broadcast: { self: false } } });
      channel = ch;
      ch.on("presence", { event: "sync" }, emitPresence);
      for (const type of MESSAGE_TYPES) {
        ch.on("broadcast", { event: type }, (arg) => {
          const msg = parseMessage((arg as { payload?: unknown })?.payload, Date.now());
          if (msg) messages.emit(msg);
        });
      }
      await new Promise<void>((resolve, reject) => {
        let joined = false;
        ch.subscribe((s) => {
          if (channel !== ch) return;
          if (s === "SUBSCRIBED") {
            subscribed = true;
            track();
            status.emit("online");
            if (!joined) {
              joined = true;
              resolve();
            }
          } else if (FAILURE.has(s)) {
            subscribed = false;
            if (!joined) {
              joined = true;
              reject(new TeamError("unreachable"));
            } else {
              status.emit("reconnecting");
            }
          }
        });
      });
    },
    async leave() {
      clearTimeout(trailing);
      const ch = channel;
      channel = null;
      subscribed = false;
      me = null;
      if (ch && client) {
        await ch.untrack().catch(() => {});
        await client.removeChannel(ch).catch(() => {});
      }
    },
    updatePresence(meta) {
      me = meta;
      const wait = lastTrack + PRESENCE_THROTTLE_MS - Date.now();
      if (wait <= 0) track();
      else if (!trailing) {
        trailing = setTimeout(() => {
          trailing = undefined;
          track();
        }, wait);
      }
    },
    send(msg) {
      void channel?.send({ type: "broadcast", event: msg.type, payload: msg });
    },
    onPresence: presence.on,
    onMessage: messages.on,
    onStatus: status.on,
  };
}
