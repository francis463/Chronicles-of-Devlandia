import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NO_FLAGS, type PresenceMeta, type TeamMessage } from "../game/team";
import { createBroadcastTransport, HEARTBEAT_MS, PRESENCE_EXPIRY_MS } from "./broadcastTransport";

const meta = (id: string, joinedAt: number): PresenceMeta => ({ id, name: `P-${id}`, joinedAt, startedAt: null, flags: NO_FLAGS, x: 28, y: 72, zone: "peaks" });

type FakeChannel = { name: string; onmessage: ((e: { data: unknown }) => void) | null; postMessage(d: unknown): void; close(): void; closed: boolean };

/** Same-process stand-in for BroadcastChannel: delivers to every other open channel with the same name. */
function makeBus() {
  const all: FakeChannel[] = [];
  const channel = (name: string): FakeChannel => {
    const ch: FakeChannel = {
      name,
      onmessage: null,
      closed: false,
      postMessage(d) {
        if (ch.closed) return;
        for (const other of all) if (other !== ch && !other.closed && other.name === name) other.onmessage?.({ data: structuredClone(d) });
      },
      close() {
        ch.closed = true;
      },
    };
    all.push(ch);
    return ch;
  };
  return { channel, all };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("broadcast (Same computer) transport", () => {
  it("uses the devlandia-<CODE> channel and sees peers right away", async () => {
    const bus = makeBus();
    const a = createBroadcastTransport({ channel: bus.channel });
    const b = createBroadcastTransport({ channel: bus.channel });
    let seenByA: string[] = [];
    a.onPresence((m) => (seenByA = m.map((x) => x.id).sort()));
    await a.join("KQZM", meta("a", 1));
    await b.join("KQZM", meta("b", 2));
    expect(bus.all.map((c) => c.name)).toEqual(["devlandia-KQZM", "devlandia-KQZM"]);
    expect(seenByA).toEqual(["a", "b"]);
  });

  it("delivers messages to the other window only, validated", async () => {
    const bus = makeBus();
    const a = createBroadcastTransport({ channel: bus.channel });
    const b = createBroadcastTransport({ channel: bus.channel });
    const got: { a: TeamMessage[]; b: TeamMessage[] } = { a: [], b: [] };
    a.onMessage((m) => got.a.push(m));
    b.onMessage((m) => got.b.push(m));
    await a.join("KQZM", meta("a", 1));
    await b.join("KQZM", meta("b", 2));
    a.send({ type: "pos", id: "a", x: 30, y: 70, zone: "peaks" });
    bus.all[0].postMessage({ kind: "msg", msg: { type: "pos", id: "a", x: 999, y: 70, zone: "peaks" } });
    expect(got.b).toEqual([{ type: "pos", id: "a", x: 30, y: 70, zone: "peaks" }]);
    expect(got.a).toEqual([]);
  });

  it("forgets a window that stops sending heartbeats, and removes one that leaves", async () => {
    const bus = makeBus();
    const a = createBroadcastTransport({ channel: bus.channel });
    const b = createBroadcastTransport({ channel: bus.channel });
    const c = createBroadcastTransport({ channel: bus.channel });
    let seenByA: string[] = [];
    a.onPresence((m) => (seenByA = m.map((x) => x.id).sort()));
    await a.join("KQZM", meta("a", 1));
    await b.join("KQZM", meta("b", 2));
    await c.join("KQZM", meta("c", 3));
    expect(seenByA).toEqual(["a", "b", "c"]);
    await c.leave();
    expect(seenByA).toEqual(["a", "b"]);
    bus.all[1].close(); // b's window crashes: no goodbye
    vi.advanceTimersByTime(HEARTBEAT_MS + PRESENCE_EXPIRY_MS);
    expect(seenByA).toEqual(["a"]);
  });

  it("reports online on join", async () => {
    const bus = makeBus();
    const a = createBroadcastTransport({ channel: bus.channel });
    const statuses: string[] = [];
    a.onStatus((s) => statuses.push(s));
    await a.join("KQZM", meta("a", 1));
    expect(statuses.at(-1)).toBe("online");
  });
});
