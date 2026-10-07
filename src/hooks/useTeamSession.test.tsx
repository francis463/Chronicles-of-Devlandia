import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_FLAGS, NO_ROOM_TIMEOUT_MS, POS_INTERVAL_MS, TEAM_COLORS } from "../game/team";
import { createBroadcastTransport } from "../net/broadcastTransport";
import { createMemoryHub } from "../net/memoryTransport";
import { useTeamSession } from "./useTeamSession";

afterEach(() => {
  vi.useRealTimers();
});

function world() {
  const hub = createMemoryHub();
  // A shared clock that always moves forward, so join order is deterministic (no same-millisecond ties).
  let t = Date.now();
  const now = () => (t += 10);
  const player = () => renderHook(() => useTeamSession(() => hub.transport(), now));
  return { hub, player };
}
const settle = () => act(async () => {});

describe("useTeamSession: lobby", () => {
  it("create goes connecting → lobby with a 4-letter room code", async () => {
    const { player } = world();
    const ana = player();
    act(() => ana.result.current.create("Ana", "local"));
    expect(ana.result.current.phase).toBe("connecting");
    await settle();
    expect(ana.result.current.phase).toBe("lobby");
    expect(ana.result.current.room).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(ana.result.current.me?.isHost).toBe(true);
  });

  it("join puts both players in the room with host and colors by join order", async () => {
    const { player } = world();
    const ana = player();
    const kai = player();
    act(() => ana.result.current.create("Ana", "local"));
    await settle();
    act(() => kai.result.current.join("Kai", ana.result.current.room!, "local"));
    await settle();
    for (const p of [ana, kai]) {
      expect(p.result.current.players.map((x) => x.name)).toEqual(["Ana", "Kai"]);
      expect(p.result.current.players.map((x) => x.color)).toEqual([TEAM_COLORS[0], TEAM_COLORS[1]]);
      expect(p.result.current.players[0].isHost).toBe(true);
    }
    expect(kai.result.current.me?.name).toBe("Kai");
    expect(kai.result.current.me?.isHost).toBe(false);
  });

  it("joining a code nobody is in fails with no-room after the timeout", async () => {
    vi.useFakeTimers();
    const { player } = world();
    const kai = player();
    act(() => kai.result.current.join("Kai", "ZZZZ", "local"));
    await settle();
    expect(kai.result.current.phase).toBe("lobby");
    act(() => vi.advanceTimersByTime(NO_ROOM_TIMEOUT_MS));
    await settle();
    expect(kai.result.current.phase).toBe("error");
    expect(kai.result.current.error).toBe("no-room");
  });

  it("a fifth player gets room-full and the others still see four", async () => {
    const { player } = world();
    const ps = [player(), player(), player(), player(), player()];
    act(() => ps[0].result.current.create("P0", "local"));
    await settle();
    const code = ps[0].result.current.room!;
    for (let i = 1; i < 5; i++) {
      act(() => ps[i].result.current.join(`P${i}`, code, "local"));
      await settle();
    }
    expect(ps[4].result.current.error).toBe("full");
    expect(ps[0].result.current.players).toHaveLength(4);
  });

  it("an unreachable server fails, and retry succeeds once it is back", async () => {
    const { hub, player } = world();
    const ana = player();
    hub.setReachable(false);
    act(() => ana.result.current.create("Ana", "online"));
    await settle();
    expect(ana.result.current.error).toBe("unreachable");
    hub.setReachable(true);
    act(() => ana.result.current.retry());
    await settle();
    expect(ana.result.current.phase).toBe("lobby");
  });

  it("when the host leaves the lobby, the next player becomes host (Review Focus 1)", async () => {
    const { player } = world();
    const ana = player();
    const kai = player();
    act(() => ana.result.current.create("Ana", "local"));
    await settle();
    act(() => kai.result.current.join("Kai", ana.result.current.room!, "local"));
    await settle();
    act(() => ana.result.current.leave());
    await settle();
    expect(ana.result.current.phase).toBe("idle");
    expect(kai.result.current.players.map((p) => p.name)).toEqual(["Kai"]);
    expect(kai.result.current.me?.isHost).toBe(true);
  });

  it("only the host can start, with at least two players; then everyone plays with the same start time", async () => {
    const { player } = world();
    const ana = player();
    const kai = player();
    act(() => ana.result.current.create("Ana", "local"));
    await settle();
    act(() => ana.result.current.start());
    expect(ana.result.current.phase).toBe("lobby");
    act(() => kai.result.current.join("Kai", ana.result.current.room!, "local"));
    await settle();
    act(() => kai.result.current.start());
    expect(kai.result.current.phase).toBe("lobby");
    act(() => ana.result.current.start());
    await settle();
    expect(ana.result.current.phase).toBe("playing");
    expect(kai.result.current.phase).toBe("playing");
    expect(kai.result.current.startedAt).toBe(ana.result.current.startedAt);
  });
});

describe("useTeamSession: in game", () => {
  async function startedPair() {
    const w = world();
    const ana = w.player();
    const kai = w.player();
    act(() => ana.result.current.create("Ana", "local"));
    await settle();
    act(() => kai.result.current.join("Kai", ana.result.current.room!, "local"));
    await settle();
    act(() => ana.result.current.start());
    await settle();
    return { ...w, ana, kai };
  }

  it("publishFlags reaches teammates as progress with the sender's name", async () => {
    const { ana, kai } = await startedPair();
    const got = vi.fn();
    kai.result.current.onProgress(got);
    act(() => ana.result.current.publishFlags({ ...NO_FLAGS, towerPowered: true }));
    await settle();
    expect(got).toHaveBeenCalledWith({ ...NO_FLAGS, towerPowered: true }, "Ana");
    expect(got).toHaveBeenCalledTimes(1);
  });

  it("publishPosition moves the teammate for the others", async () => {
    vi.useFakeTimers();
    const { ana, kai } = await startedPair();
    act(() => {
      vi.advanceTimersByTime(POS_INTERVAL_MS);
      ana.result.current.publishPosition(40, 60);
    });
    act(() => vi.advanceTimersByTime(POS_INTERVAL_MS));
    expect(kai.result.current.teammates).toEqual([
      // Fake timers freeze Date.now, so both joined at the same instant: assert the color matches Ana's own.
      { id: ana.result.current.me!.id, name: "Ana", color: ana.result.current.me!.color, x: 40, y: 60 },
    ]);
  });

  it("onRoster reports who joined and left", async () => {
    const { player, ana } = await startedPair();
    const roster = vi.fn();
    ana.result.current.onRoster(roster);
    const zed = player();
    act(() => zed.result.current.join("Zed", ana.result.current.room!, "local"));
    await settle();
    expect(roster).toHaveBeenCalledWith(["Zed"], []);
    expect(zed.result.current.phase).toBe("playing");
    act(() => zed.result.current.leave());
    await settle();
    expect(roster).toHaveBeenLastCalledWith([], ["Zed"]);
  });
});

describe("useTeamSession: roster baseline", () => {
  it("does not announce players who were already in the room when you arrive", async () => {
    // Same computer mode first shows only you, then the others: they must not count as "joined".
    type Ch = { name: string; onmessage: ((e: { data: unknown }) => void) | null; postMessage(d: unknown): void; close(): void };
    const all: Ch[] = [];
    const channel = (name: string): Ch => {
      const ch: Ch = {
        name,
        onmessage: null,
        postMessage(d) {
          for (const o of all) if (o !== ch && o.name === name) o.onmessage?.({ data: structuredClone(d) });
        },
        close() {},
      };
      all.push(ch);
      return ch;
    };
    let t = Date.now();
    const now = () => (t += 10);
    const ana = renderHook(() => useTeamSession(() => createBroadcastTransport({ channel }), now));
    const kai = renderHook(() => useTeamSession(() => createBroadcastTransport({ channel }), now));
    act(() => ana.result.current.create("Ana", "local"));
    await settle();
    const kaiRoster = vi.fn();
    kai.result.current.onRoster(kaiRoster);
    act(() => kai.result.current.join("Kai", ana.result.current.room!, "local"));
    await settle();
    expect(kai.result.current.players.map((p) => p.name)).toEqual(["Ana", "Kai"]);
    expect(kaiRoster).not.toHaveBeenCalled();
    act(() => ana.result.current.leave());
    kai.unmount();
    ana.unmount();
  });
});
