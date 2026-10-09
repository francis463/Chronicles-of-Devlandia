import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_FLAGS, type PresenceMeta, type TeamMessage } from "../game/team";
import { createSupabaseTransport, PRESENCE_LIMIT, type RealtimeClientLike } from "./supabaseTransport";
import { TeamError, type TeamStatus } from "./transport";

const meta = (id: string, joinedAt: number): PresenceMeta => ({ id, name: `P-${id}`, joinedAt, startedAt: null, flags: NO_FLAGS, x: 28, y: 72, zone: "peaks" });

/**
 * Records what the transport asks of the Supabase client and lets the test play the server's part.
 * Like realtime-js 2.117, channel() hands back the registered channel for a topic until it is removed,
 * and subscribe() only registers its callback on a closed channel.
 */
function fakeClient({ untrackHangs = false } = {}) {
  const registry = new Map<string, ReturnType<typeof makeChannel>>();
  const created: Array<ReturnType<typeof makeChannel>> = [];
  let state: Record<string, unknown[]> = {};
  function makeChannel(topic: string) {
    const handlers = new Map<string, Array<(arg: unknown) => void>>();
    const ch = {
      topic,
      state: "closed" as "closed" | "joining" | "joined" | "errored",
      subscriber: null as ((status: string) => void) | null,
      on(type: string, filter: { event: string }, cb: (arg: unknown) => void) {
        const key = `${type}:${filter.event}`;
        handlers.set(key, [...(handlers.get(key) ?? []), cb]);
        return ch;
      },
      subscribe(cb: (status: string) => void) {
        if (ch.state === "closed") {
          ch.state = "joining";
          ch.subscriber = cb;
        }
        return ch;
      },
      track: vi.fn(async () => "ok"),
      untrack: vi.fn(() => (untrackHangs ? new Promise<string>(() => {}) : Promise.resolve("ok"))),
      send: vi.fn(async () => "ok"),
      presenceState: () => state,
      handlers,
    };
    return ch;
  }
  const client = {
    channel: vi.fn((name: string) => {
      const topic = `realtime:${name}`;
      const existing = registry.get(topic);
      if (existing) return existing;
      const ch = makeChannel(topic);
      registry.set(topic, ch);
      created.push(ch);
      return ch;
    }),
    getChannels: vi.fn(() => [...registry.values()]),
    removeChannel: vi.fn(async (ch: ReturnType<typeof makeChannel>) => {
      if (registry.get(ch.topic) === ch) registry.delete(ch.topic);
      ch.state = "closed";
      return "ok";
    }),
  };
  const latest = () => created[created.length - 1];
  return {
    client: client as unknown as RealtimeClientLike,
    raw: client,
    created,
    get channel() {
      return latest();
    },
    status: (s: string) => {
      const ch = latest();
      ch.state = s === "SUBSCRIBED" ? "joined" : s === "CLOSED" ? "closed" : "errored";
      ch.subscriber?.(s);
    },
    fire: (type: string, event: string, arg: unknown) => latest().handlers.get(`${type}:${event}`)?.forEach((cb) => cb(arg)),
    setPresence: (s: Record<string, unknown[]>) => (state = s),
  };
}

/** Settles to "hung" if the promise hasn't settled within a few event-loop turns. */
const settlesSoon = <T,>(p: Promise<T>) =>
  Promise.race([p.then(() => "settled", () => "settled"), new Promise((r) => setTimeout(() => r("hung"), 30))]);

afterEach(() => vi.useRealTimers());

describe("Supabase transport", () => {
  it("joins the devlandia-<CODE> channel with presence keyed by player id and resolves once subscribed", async () => {
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    const statuses: TeamStatus[] = [];
    t.onStatus((s) => statuses.push(s));
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    expect(f.raw.channel).toHaveBeenCalledWith("devlandia-KQZM", {
      config: { presence: { key: "a" }, broadcast: { self: false } },
    });
    f.status("SUBSCRIBED");
    await joining;
    expect(f.channel.track).toHaveBeenCalledWith(meta("a", 1));
    expect(statuses).toEqual(["connecting", "online"]);
  });

  it("rejects as unreachable if the channel fails before subscribing, then reports reconnecting after", async () => {
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("CHANNEL_ERROR");
    await expect(joining).rejects.toEqual(new TeamError("unreachable"));

    const g = fakeClient();
    const u = createSupabaseTransport(async () => g.client);
    const statuses: TeamStatus[] = [];
    u.onStatus((s) => statuses.push(s));
    const ok = u.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(g.raw.channel).toHaveBeenCalled());
    g.status("SUBSCRIBED");
    await ok;
    g.status("TIMED_OUT");
    g.status("SUBSCRIBED");
    expect(statuses).toEqual(["connecting", "online", "reconnecting", "online"]);
  });

  it("rejects as unreachable when the client cannot be loaded", async () => {
    const t = createSupabaseTransport(async () => {
      throw new Error("blocked");
    });
    await expect(t.join("KQZM", meta("a", 1))).rejects.toEqual(new TeamError("unreachable"));
  });

  it("emits validated presence on sync and drops invalid metas", async () => {
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    let seen: string[] = [];
    t.onPresence((m) => (seen = m.map((x) => x.id).sort()));
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("SUBSCRIBED");
    await joining;
    f.setPresence({
      a: [{ ...meta("a", 1), presence_ref: "r1" }],
      b: [{ ...meta("b", 2), presence_ref: "r2" }],
      x: [{ ...meta("x", 3), x: 999, presence_ref: "r3" }],
    });
    f.fire("presence", "sync", {});
    expect(seen).toEqual(["a", "b"]);
  });

  it("delivers validated broadcasts and sends messages as broadcast events", async () => {
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    const got: TeamMessage[] = [];
    t.onMessage((m) => got.push(m));
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("SUBSCRIBED");
    await joining;
    f.fire("broadcast", "pos", { payload: { type: "pos", id: "b", x: 40, y: 50, zone: "peaks" } });
    f.fire("broadcast", "pos", { payload: { type: "pos", id: "b", x: 400, y: 50, zone: "peaks" } });
    f.fire("broadcast", "start", { payload: { type: "start", startedAt: Date.now() } });
    expect(got.map((m) => m.type)).toEqual(["pos", "start"]);
    t.send({ type: "pos", id: "a", x: 30, y: 70, zone: "peaks" });
    expect(f.channel.send).toHaveBeenCalledWith({ type: "broadcast", event: "pos", payload: { type: "pos", id: "a", x: 30, y: 70, zone: "peaks" } });
  });

  it("sends at most 4 presence updates per 31 s (Supabase closes a client's channel after 5 in 30 s), then the latest", async () => {
    vi.useFakeTimers();
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("SUBSCRIBED");
    await joining;
    expect(f.channel.track).toHaveBeenCalledTimes(1);
    for (let x = 30; x < 40; x++) {
      vi.advanceTimersByTime(1000);
      t.updatePresence({ ...meta("a", 1), x });
    }
    expect(PRESENCE_LIMIT).toEqual({ tracks: 4, windowMs: 31_000 });
    expect(f.channel.track).toHaveBeenCalledTimes(4);
    expect(f.channel.track).toHaveBeenLastCalledWith({ ...meta("a", 1), x: 32 });
    vi.advanceTimersByTime(PRESENCE_LIMIT.windowMs - 10_000);
    expect(f.channel.track).toHaveBeenCalledTimes(5);
    expect(f.channel.track).toHaveBeenLastCalledWith({ ...meta("a", 1), x: 39 });
  });

  it("sends broadcasts only while subscribed (no REST fallback while connecting or reconnecting)", async () => {
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    t.send({ type: "pos", id: "a", x: 30, y: 70, zone: "peaks" });
    expect(f.channel.send).not.toHaveBeenCalled();
    f.status("SUBSCRIBED");
    await joining;
    t.send({ type: "pos", id: "a", x: 31, y: 70, zone: "peaks" });
    expect(f.channel.send).toHaveBeenCalledTimes(1);
    f.status("TIMED_OUT");
    t.send({ type: "pos", id: "a", x: 32, y: 70, zone: "peaks" });
    expect(f.channel.send).toHaveBeenCalledTimes(1);
  });

  it("leave removes the channel without waiting for untrack (which hangs while the socket is down)", async () => {
    const f = fakeClient({ untrackHangs: true });
    const t = createSupabaseTransport(async () => f.client);
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("SUBSCRIBED");
    await joining;
    expect(await settlesSoon(t.leave())).toBe("settled");
    expect(f.raw.removeChannel).toHaveBeenCalledWith(f.channel);
  });

  it("[ Retry ] right after a failed join gets a fresh channel and connects (Review: Retry hung on Connecting…)", async () => {
    const f = fakeClient({ untrackHangs: true });
    const first = createSupabaseTransport(async () => f.client);
    const failing = first.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("CHANNEL_ERROR");
    await expect(failing).rejects.toEqual(new TeamError("unreachable"));
    void first.leave();
    const retry = createSupabaseTransport(async () => f.client);
    const joining = retry.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalledTimes(2));
    expect(f.created).toHaveLength(2);
    f.status("SUBSCRIBED");
    expect(await settlesSoon(joining)).toBe("settled");
  });

  it("a stale channel for the same room is removed before joining", async () => {
    const f = fakeClient();
    const stale = f.raw.channel("devlandia-KQZM");
    stale.subscribe(() => {});
    stale.state = "errored";
    const t = createSupabaseTransport(async () => f.client);
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.created).toHaveLength(2));
    expect(f.raw.removeChannel).toHaveBeenCalledWith(stale);
    f.status("SUBSCRIBED");
    expect(await settlesSoon(joining)).toBe("settled");
  });

  it("leaving while supabase-js is still loading never subscribes a channel", async () => {
    const f = fakeClient();
    let release!: () => void;
    const loaded = new Promise<void>((r) => (release = r));
    const t = createSupabaseTransport(async () => {
      await loaded;
      return f.client;
    });
    const joining = t.join("KQZM", meta("a", 1)).catch(() => "left");
    await t.leave();
    release();
    await joining;
    expect(f.raw.channel).not.toHaveBeenCalled();
  });
});
