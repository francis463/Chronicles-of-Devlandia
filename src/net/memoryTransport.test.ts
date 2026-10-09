import { describe, expect, it } from "vitest";
import { NO_FLAGS, type PresenceMeta, type TeamMessage } from "../game/team";
import { createMemoryHub } from "./memoryTransport";
import { TeamError, type TeamStatus } from "./transport";

const meta = (id: string, joinedAt: number): PresenceMeta => ({ id, name: `P-${id}`, joinedAt, startedAt: null, flags: NO_FLAGS, x: 28, y: 72, zone: "peaks" });

function watch(t: ReturnType<ReturnType<typeof createMemoryHub>["transport"]>) {
  const seen = { presence: [] as string[][], messages: [] as TeamMessage[], status: [] as TeamStatus[] };
  t.onPresence((m) => seen.presence.push(m.map((x) => x.id).sort()));
  t.onMessage((m) => seen.messages.push(m));
  t.onStatus((s) => seen.status.push(s));
  return seen;
}

describe("memory transport", () => {
  it("shares presence, delivers messages to others only, and removes leavers", async () => {
    const hub = createMemoryHub();
    const a = hub.transport();
    const b = hub.transport();
    const sa = watch(a);
    const sb = watch(b);
    await a.join("KQZM", meta("a", 1));
    await b.join("KQZM", meta("b", 2));
    expect(sa.presence.at(-1)).toEqual(["a", "b"]);
    expect(sb.presence.at(-1)).toEqual(["a", "b"]);
    expect(sa.status.at(-1)).toBe("online");
    a.send({ type: "pos", id: "a", x: 30, y: 70, zone: "peaks" });
    expect(sb.messages).toEqual([{ type: "pos", id: "a", x: 30, y: 70, zone: "peaks" }]);
    expect(sa.messages).toEqual([]);
    await b.leave();
    expect(sa.presence.at(-1)).toEqual(["a"]);
  });

  it("keeps rooms apart", async () => {
    const hub = createMemoryHub();
    const a = hub.transport();
    const b = hub.transport();
    const sa = watch(a);
    await a.join("KQZM", meta("a", 1));
    await b.join("ABCD", meta("b", 2));
    expect(sa.presence.at(-1)).toEqual(["a"]);
  });

  it("updatePresence republishes the meta", async () => {
    const hub = createMemoryHub();
    const a = hub.transport();
    const b = hub.transport();
    let latest: PresenceMeta[] = [];
    b.onPresence((m) => (latest = m));
    await a.join("KQZM", meta("a", 1));
    await b.join("KQZM", meta("b", 2));
    a.updatePresence({ ...meta("a", 1), flags: { ...NO_FLAGS, hasLoot: true } });
    expect(latest.find((m) => m.id === "a")?.flags.hasLoot).toBe(true);
  });

  it("rejects joins while unreachable", async () => {
    const hub = createMemoryHub();
    hub.setReachable(false);
    await expect(hub.transport().join("KQZM", meta("a", 1))).rejects.toEqual(new TeamError("unreachable"));
  });

  it("drop pauses delivery and reports reconnecting; restore resyncs", async () => {
    const hub = createMemoryHub();
    const a = hub.transport();
    const b = hub.transport();
    const sa = watch(a);
    const sb = watch(b);
    await a.join("KQZM", meta("a", 1));
    await b.join("KQZM", meta("b", 2));
    hub.drop(b);
    expect(sb.status.at(-1)).toBe("reconnecting");
    expect(sa.presence.at(-1)).toEqual(["a"]);
    a.send({ type: "pos", id: "a", x: 30, y: 70, zone: "peaks" });
    expect(sb.messages).toEqual([]);
    b.updatePresence({ ...meta("b", 2), flags: { ...NO_FLAGS, hasLoot: true } });
    hub.restore(b);
    expect(sb.status.at(-1)).toBe("online");
    expect(sa.presence.at(-1)).toEqual(["a", "b"]);
    expect(sb.presence.at(-1)).toEqual(["a", "b"]);
  });

  it("drops invalid input instead of delivering it (Review Focus 3)", async () => {
    const hub = createMemoryHub();
    const a = hub.transport();
    const sa = watch(a);
    await a.join("KQZM", meta("a", 1));
    hub.inject("KQZM", { type: "pos", id: "x", x: 500, y: 50, zone: "peaks" });
    hub.inject("KQZM", { type: "progress", id: "x", name: "Kai", flags: { gateUnlocked: "yes" } });
    expect(sa.messages).toEqual([]);
  });
});
