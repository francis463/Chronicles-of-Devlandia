import { parseMessage, parsePresence, type PresenceMeta, type TeamMessage } from "../game/team";
import { emitter, roomChannel, TeamError, type TeamStatus, type TeamTransport } from "./transport";

type ChannelLike = {
  topic: string;
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
  getChannels(): ChannelLike[];
};

/** Every message type is subscribed: a record keyed by the type, so a new type that isn't listed fails to compile. */
const SUBSCRIBED: Record<TeamMessage["type"], true> = { pos: true, progress: true, start: true, badge: true, chat: true, ping: true };
const FAILURE = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

/**
 * Supabase closes a client's channel after 5 presence updates in 30 s, so we send at most 4 in any
 * 31 s window and coalesce the rest into one trailing update with the latest meta.
 */
export const PRESENCE_LIMIT = { tracks: 4, windowMs: 31_000 };

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
  // Bumped by leave(), so a join still waiting for supabase-js knows it was abandoned.
  let generation = 0;
  let recentTracks: number[] = [];
  let trailing: ReturnType<typeof setTimeout> | undefined;

  const track = () => {
    if (!channel || !me || !subscribed) return;
    const now = Date.now();
    recentTracks = recentTracks.filter((at) => now - at < PRESENCE_LIMIT.windowMs);
    if (recentTracks.length >= PRESENCE_LIMIT.tracks) {
      trailing ??= setTimeout(() => {
        trailing = undefined;
        track();
      }, recentTracks[0] + PRESENCE_LIMIT.windowMs - now);
      return;
    }
    recentTracks.push(now);
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
      const mine = ++generation;
      try {
        client = await loadClient();
      } catch {
        throw new TeamError("unreachable");
      }
      // realtime-js hands back an existing channel for the same topic, and subscribe() on a channel
      // that isn't closed never calls back: drop any leftover from an earlier attempt first.
      const topic = `realtime:${roomChannel(room)}`;
      await Promise.all(
        client
          .getChannels()
          .filter((c) => c.topic === topic)
          .map((c) => client!.removeChannel(c).catch(() => {})),
      );
      if (mine !== generation) throw new TeamError("unreachable");
      const ch = client.channel(roomChannel(room), { config: { presence: { key: meta.id }, broadcast: { self: false } } });
      channel = ch;
      ch.on("presence", { event: "sync" }, emitPresence);
      for (const type of Object.keys(SUBSCRIBED)) {
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
      generation++;
      clearTimeout(trailing);
      trailing = undefined;
      const ch = channel;
      channel = null;
      subscribed = false;
      me = null;
      // Removing the channel leaves it, which drops our presence; untrack() would wait out a 10 s
      // timeout while the socket is down and keep the channel registered meanwhile.
      if (ch && client) await client.removeChannel(ch).catch(() => {});
    },
    updatePresence(meta) {
      me = meta;
      if (!trailing) track();
    },
    send(msg) {
      // While not subscribed realtime-js would fall back to a REST request per message.
      if (channel && subscribed) void channel.send({ type: "broadcast", event: msg.type, payload: msg });
    },
    onPresence: presence.on,
    onMessage: messages.on,
    onStatus: status.on,
  };
}
