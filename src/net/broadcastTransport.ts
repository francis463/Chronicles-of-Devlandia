import { parseMessage, parsePresence, type PresenceMeta, type TeamMessage } from "../game/team";
import { emitter, roomChannel, type TeamStatus, type TeamTransport } from "./transport";

export const HEARTBEAT_MS = 1000;
export const PRESENCE_EXPIRY_MS = 3500;

type Channel = { postMessage(data: unknown): void; onmessage: ((e: { data: unknown }) => void) | null; close(): void };
type Packet = { kind: "hb"; meta: unknown } | { kind: "bye"; id: unknown } | { kind: "msg"; msg: unknown };

/**
 * Same computer mode: browser windows on one device talk over a BroadcastChannel.
 * Presence is a heartbeat; a window that goes quiet for PRESENCE_EXPIRY_MS is dropped.
 */
export function createBroadcastTransport({
  channel = (name: string) => new BroadcastChannel(name) as unknown as Channel,
  now = () => Date.now(),
}: { channel?: (name: string) => Channel; now?: () => number } = {}): TeamTransport {
  const presence = emitter<PresenceMeta[]>();
  const messages = emitter<TeamMessage>();
  const status = emitter<TeamStatus>();
  const peers = new Map<string, { meta: PresenceMeta; lastSeen: number }>();
  let ch: Channel | null = null;
  let me: PresenceMeta | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;

  const publish = () => {
    if (me) presence.emit([me, ...[...peers.values()].map((p) => p.meta)]);
  };
  const post = (packet: Packet) => ch?.postMessage(packet);
  const heartbeat = () => me && post({ kind: "hb", meta: me });

  function onPacket(data: unknown) {
    if (typeof data !== "object" || data === null) return;
    const packet = data as Packet;
    if (packet.kind === "hb") {
      const meta = parsePresence(packet.meta, now());
      if (!meta || meta.id === me?.id) return;
      const isNew = !peers.has(meta.id);
      peers.set(meta.id, { meta, lastSeen: now() });
      if (isNew) heartbeat(); // introduce ourselves to the newcomer straight away
      publish();
    } else if (packet.kind === "bye") {
      if (typeof packet.id === "string" && peers.delete(packet.id)) publish();
    } else if (packet.kind === "msg") {
      const msg = parseMessage(packet.msg, now());
      if (msg) messages.emit(msg);
    }
  }

  return {
    async join(room, meta) {
      status.emit("connecting");
      me = meta;
      ch = channel(roomChannel(room));
      ch.onmessage = (e) => onPacket(e.data);
      timer = setInterval(() => {
        heartbeat();
        const cutoff = now() - PRESENCE_EXPIRY_MS;
        let changed = false;
        for (const [id, p] of peers) if (p.lastSeen < cutoff) changed = peers.delete(id) || changed;
        if (changed) publish();
      }, HEARTBEAT_MS);
      status.emit("online");
      publish();
      heartbeat();
    },
    async leave() {
      if (me) post({ kind: "bye", id: me.id });
      clearInterval(timer);
      ch?.close();
      ch = null;
      me = null;
      peers.clear();
    },
    updatePresence(meta) {
      me = meta;
      heartbeat();
      publish();
    },
    send(msg) {
      post({ kind: "msg", msg });
    },
    onPresence: presence.on,
    onMessage: messages.on,
    onStatus: status.on,
  };
}
