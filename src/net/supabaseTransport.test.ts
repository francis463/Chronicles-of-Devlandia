import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_FLAGS, PRESENCE_THROTTLE_MS, type PresenceMeta, type TeamMessage } from "../game/team";
import { createSupabaseTransport, type RealtimeClientLike } from "./supabaseTransport";
import { TeamError, type TeamStatus } from "./transport";

const meta = (id: string, joinedAt: number): PresenceMeta => ({ id, name: `P-${id}`, joinedAt, startedAt: null, flags: NO_FLAGS, x: 28, y: 72 });

/** Records what the transport asks of the Supabase client and lets the test play the server's part. */
function fakeClient() {
  const handlers = new Map<string, Array<(arg: unknown) => void>>();
  let subscribe: ((status: string) => void) | null = null;
  let state: Record<string, unknown[]> = {};
  const channel = {
    on(type: string, filter: { event: string }, cb: (arg: unknown) => void) {
      const key = `${type}:${filter.event}`;
      handlers.set(key, [...(handlers.get(key) ?? []), cb]);
      return channel;
    },
    subscribe(cb: (status: string) => void) {
      subscribe = cb;
      return channel;
    },
    track: vi.fn(async () => "ok"),
    untrack: vi.fn(async () => "ok"),
    send: vi.fn(async () => "ok"),
    presenceState: () => state,
  };
  const client = { channel: vi.fn(() => channel), removeChannel: vi.fn(async () => "ok") };
  return {
    client: client as unknown as RealtimeClientLike,
    raw: client,
    channel,
    status: (s: string) => subscribe?.(s),
    fire: (type: string, event: string, arg: unknown) => handlers.get(`${type}:${event}`)?.forEach((cb) => cb(arg)),
    setPresence: (s: Record<string, unknown[]>) => (state = s),
  };
}

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
    f.fire("broadcast", "pos", { payload: { type: "pos", id: "b", x: 40, y: 50 } });
    f.fire("broadcast", "pos", { payload: { type: "pos", id: "b", x: 400, y: 50 } });
    f.fire("broadcast", "start", { payload: { type: "start", startedAt: Date.now() } });
    expect(got.map((m) => m.type)).toEqual(["pos", "start"]);
    t.send({ type: "pos", id: "a", x: 30, y: 70 });
    expect(f.channel.send).toHaveBeenCalledWith({ type: "broadcast", event: "pos", payload: { type: "pos", id: "a", x: 30, y: 70 } });
  });

  it("throttles presence updates, keeping the latest", async () => {
    vi.useFakeTimers();
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("SUBSCRIBED");
    await joining;
    f.channel.track.mockClear();
    vi.advanceTimersByTime(PRESENCE_THROTTLE_MS);
    t.updatePresence({ ...meta("a", 1), x: 30 });
    t.updatePresence({ ...meta("a", 1), x: 31 });
    t.updatePresence({ ...meta("a", 1), x: 32 });
    expect(f.channel.track).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PRESENCE_THROTTLE_MS);
    expect(f.channel.track).toHaveBeenCalledTimes(2);
    expect(f.channel.track).toHaveBeenLastCalledWith({ ...meta("a", 1), x: 32 });
  });

  it("leave untracks and removes the channel", async () => {
    const f = fakeClient();
    const t = createSupabaseTransport(async () => f.client);
    const joining = t.join("KQZM", meta("a", 1));
    await vi.waitFor(() => expect(f.raw.channel).toHaveBeenCalled());
    f.status("SUBSCRIBED");
    await joining;
    await t.leave();
    expect(f.channel.untrack).toHaveBeenCalled();
    expect(f.raw.removeChannel).toHaveBeenCalledWith(f.channel);
  });
});
