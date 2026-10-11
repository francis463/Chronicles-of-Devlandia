import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../chat/commands";
import { NO_FLAGS, rankPlayers, type PresenceMeta } from "../game/team";
import { countUnread, lastSeq, useChat } from "./useChat";
import type { ChatSender, PingNote, TeamSession } from "./useTeamSession";

beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }));
afterEach(() => vi.useRealTimers());

const meta = (id: string, name: string, joinedAt: number): PresenceMeta => ({ id, name, joinedAt, startedAt: null, flags: NO_FLAGS, x: 1, y: 2, zone: "peaks" });

function setup(names: string[] = ["Ana", "Kai", "Mia"], phase: TeamSession["phase"] = "playing") {
  const players = rankPlayers(names.map((n, i) => meta(`id${i}`, n, i + 1)));
  const handlers: { chat: ((f: ChatSender, t: string) => void) | null; ping: ((f: ChatSender, p: PingNote) => void) | null } = { chat: null, ping: null };
  const base = {
    phase,
    status: "online",
    me: players[0],
    players,
    teammates: [],
    sendChat: vi.fn((): "sent" | "offline" => "sent"),
    sendPing: vi.fn((): "sent" | "offline" => "sent"),
    onChat: vi.fn((cb) => {
      handlers.chat = cb;
      return () => {};
    }),
    onPing: vi.fn((cb) => {
      handlers.ping = cb;
      return () => {};
    }),
  };
  const session = (over: Record<string, unknown> = {}) => ({ ...base, ...over }) as unknown as TeamSession;
  const hook = renderHook(({ s }: { s: TeamSession | null }) => useChat(s), { initialProps: { s: session() as TeamSession | null } });
  const from = (i: number): ChatSender => ({ id: players[i].id, name: players[i].name, color: players[i].color });
  return {
    base,
    session,
    hook,
    players,
    from,
    chat: (i: number, text: string) => act(() => handlers.chat!(from(i), text)),
    ping: (i: number, p: Partial<PingNote> = {}) => act(() => handlers.ping!(from(i), { zone: "peaks", x: 50, y: 50, place: "gate", ...p })),
  };
}

const CTX: CommandContext = {
  where: "game",
  minutes: 600,
  badges: [],
  me: { id: "id0", name: "Ana", zone: "peaks", x: 30, y: 40 },
  roster: [
    { id: "id0", name: "Ana", zone: "peaks" },
    { id: "id1", name: "Kai", zone: "peaks" },
  ],
  known: {},
  muted: [],
};
const SOLO: CommandContext = { ...CTX, where: "solo", me: { ...CTX.me, id: null, name: null }, roster: [] };
const texts = (t: ReturnType<typeof setup>) => t.hook.result.current.lines.map((l) => l.text);
const post = (t: ReturnType<typeof setup>, text: string, ctx = CTX) => {
  let r!: ReturnType<(typeof t.hook.result.current)["post"]>;
  act(() => {
    r = t.hook.result.current.post(text, ctx);
  });
  return r;
};
const ZWSP = String.fromCharCode(0x200b);
const FILLER = String.fromCharCode(0x3164);
const SLOW = "Slow down: one message a second.";

describe("sending", () => {
  it("adds a mine line and sends the masked, clamped text", () => {
    const t = setup();
    expect(post(t, "hello team").status).toBe("sent");
    expect(t.base.sendChat).toHaveBeenCalledWith("hello team");
    const line = t.hook.result.current.lines.at(-1)!;
    expect(line).toMatchObject({ kind: "mine", name: "Ana", color: t.players[0].color, text: "hello team" });
    vi.advanceTimersByTime(1000);
    post(t, "fu" + ZWSP + "ck");
    expect(t.base.sendChat).toHaveBeenLastCalledWith("***");
    vi.advanceTimersByTime(1000);
    post(t, "x".repeat(130));
    expect(t.base.sendChat).toHaveBeenLastCalledWith("x".repeat(120));
  });

  it("sends nothing for a blank or filler-only message", () => {
    const t = setup();
    const before = t.hook.result.current.lines.length;
    expect(post(t, FILLER).status).toBe("refused");
    expect(post(t, "   ").status).toBe("refused");
    expect(t.base.sendChat).not.toHaveBeenCalled();
    expect(t.hook.result.current.lines).toHaveLength(before);
  });

  it("refuses a second message within a second and leaves the draft", () => {
    const t = setup();
    act(() => t.hook.result.current.setDraft("again"));
    post(t, "one");
    const r = post(t, "two");
    expect(r).toEqual({ status: "refused", effect: null });
    expect(texts(t).at(-1)).toBe(SLOW);
    expect(t.hook.result.current.draft).toBe("again");
    vi.advanceTimersByTime(1000);
    expect(post(t, "three").status).toBe("sent");
  });

  it("five rapid sends leave one slow-down note, taking the newest seq", () => {
    const t = setup();
    post(t, "one");
    post(t, "two");
    const first = t.hook.result.current.lines.at(-1)!.seq;
    for (let i = 0; i < 3; i++) post(t, "more");
    const notes = t.hook.result.current.lines.filter((l) => l.text === SLOW);
    expect(notes).toHaveLength(1);
    expect(notes[0].seq).toBeGreaterThan(first);
  });

  it("does not refuse a message right after a command", () => {
    const t = setup();
    post(t, "/help");
    expect(post(t, "hi").status).toBe("sent");
    expect(post(t, "/time").status).toBe("command");
  });

  it("answers offline and does not start the timer", () => {
    const t = setup();
    t.base.sendChat.mockReturnValueOnce("offline");
    expect(post(t, "one").status).toBe("refused");
    expect(texts(t).at(-1)).toBe("Not sent: reconnecting.");
    expect(post(t, "two").status).toBe("sent");
  });

  it("a mine line shows your masked name without a suffix, even when a teammate shares it", () => {
    const t = setup(["Kai", "Kai"]);
    post(t, "hi");
    expect(t.hook.result.current.lines.at(-1)!.name).toBe("Kai");
  });
});

describe("commands and pings", () => {
  it("runs a command and adds its notes", () => {
    const t = setup();
    expect(post(t, "/time").status).toBe("command");
    expect(texts(t).at(-1)).toBe("Day, 10:00.");
    expect(t.hook.result.current.lines.at(-1)!.kind).toBe("note");
  });

  it("answers plain text in solo with a hint", () => {
    const hook = renderHook(() => useChat(null));
    let r!: ReturnType<(typeof hook.result.current)["post"]>;
    act(() => {
      r = hook.result.current.post("hello", SOLO);
    });
    expect(r.status).toBe("command");
    expect(hook.result.current.lines.at(-1)!.text).toBe("Solo game: start a command with /, for example /help.");
  });

  it("sends a ping once and refuses a second within 5 s", () => {
    const t = setup();
    const r = post(t, "/ping gate");
    expect(r.status).toBe("command");
    expect(r.effect).toMatchObject({ kind: "ping", place: "gate" });
    expect(t.base.sendPing).toHaveBeenCalledWith({ zone: "peaks", x: 50, y: 50, place: "gate" });
    const r2 = post(t, "/ping gate");
    expect(r2).toEqual({ status: "command", effect: null });
    expect(t.base.sendPing).toHaveBeenCalledTimes(1);
    expect(texts(t).at(-1)).toBe("Wait a moment before pinging again.");
    vi.advanceTimersByTime(5000);
    expect(post(t, "/ping").effect).toMatchObject({ kind: "ping", place: null });
    expect(t.base.sendPing).toHaveBeenCalledTimes(2);
  });

  it("a ping refused offline replaces the notes, drops the effect and does not start the timer", () => {
    const t = setup();
    t.base.sendPing.mockReturnValueOnce("offline");
    expect(post(t, "/ping gate")).toEqual({ status: "command", effect: null });
    expect(texts(t).at(-1)).toBe("Not sent: reconnecting.");
    expect(texts(t)).not.toContain("Ping sent: the Terminal Gate.");
    expect(post(t, "/ping gate").effect).not.toBeNull();
  });

  it("mute and unmute effects update the list", () => {
    const t = setup();
    post(t, "/mute Kai");
    expect(t.hook.result.current.muted).toEqual(["kai"]);
    post(t, "/unmute Kai", { ...CTX, muted: ["kai"] });
    expect(t.hook.result.current.muted).toEqual([]);
  });
});

describe("receiving", () => {
  it("adds a teammate line with their colour and key", () => {
    const t = setup();
    t.chat(1, "meet at the gate");
    expect(t.hook.result.current.lines.at(-1)).toMatchObject({ kind: "teammate", senderId: "id1", key: "kai", name: "Kai", color: t.players[1].color, text: "meet at the gate" });
  });

  it("tells two Kais apart and keeps yours plain", () => {
    const t = setup(["Kai", "Mia", "Kai"]);
    t.chat(2, "hi");
    expect(t.hook.result.current.lines.at(-1)!.name).toBe("Kai (2)");
    post(t, "me");
    expect(t.hook.result.current.lines.at(-1)!.name).toBe("Kai");
  });

  it("renders a ping line", () => {
    const t = setup();
    t.ping(1);
    expect(t.hook.result.current.lines.at(-1)).toMatchObject({ kind: "ping", text: "Kai pinged the Terminal Gate.", key: "kai" });
    t.ping(2, { place: null, zone: "village" });
    expect(t.hook.result.current.lines.at(-1)!.text).toBe("Mia pinged their spot in Dev Village.");
  });

  it("a line keeps the colour it arrived with", () => {
    const t = setup();
    t.chat(1, "first");
    const color = t.hook.result.current.lines.at(-1)!.color;
    t.hook.rerender({ s: t.session({ players: [...t.players].reverse().map((p) => ({ ...p, color: "#000000" })) }) });
    expect(t.hook.result.current.lines.at(-1)!.color).toBe(color);
  });
});

describe("muting", () => {
  it("hides earlier lines and drops new ones; unmute restores only the earlier", () => {
    const t = setup();
    t.chat(1, "before");
    act(() => t.hook.result.current.mute("Kai"));
    expect(texts(t)).not.toContain("before");
    t.chat(1, "during");
    act(() => t.hook.result.current.unmute("kai"));
    expect(texts(t)).toContain("before");
    expect(texts(t)).not.toContain("during");
  });

  it("a muted sender's ping adds no line", () => {
    const t = setup();
    act(() => t.hook.result.current.mute("Kai"));
    const n = t.hook.result.current.lines.length;
    t.ping(1);
    act(() => t.hook.result.current.unmute("Kai"));
    expect(t.hook.result.current.lines).toHaveLength(n);
  });

  it("the key survives the sender leaving and rejoining under a new id", () => {
    const t = setup();
    act(() => t.hook.result.current.mute("Kai"));
    const rejoined = rankPlayers([meta("id0", "Ana", 1), meta("new1", "Kai", 5)]);
    t.hook.rerender({ s: t.session({ players: rejoined }) });
    act(() => {
      (t.base.onChat.mock.calls.at(-1)![0] as (f: ChatSender, s: string) => void)({ id: "new1", name: "Kai", color: "#fff" }, "back");
    });
    expect(texts(t)).not.toContain("back");
  });

  it("matches a name with odd spacing or case", () => {
    const t = setup();
    act(() => t.hook.result.current.mute("Big  Kai"));
    expect(t.hook.result.current.muted).toEqual(["big kai"]);
    act(() => t.hook.result.current.mute("big kai"));
    expect(t.hook.result.current.muted).toEqual(["big kai"]);
  });

  it("never hides your own lines", () => {
    const t = setup(["Kai", "Kai"]);
    post(t, "mine");
    act(() => t.hook.result.current.mute("kai"));
    expect(texts(t)).toContain("mine");
  });
});

describe("cap and counts", () => {
  it("keeps the last 50 lines with rising seq", () => {
    const t = setup();
    for (let i = 0; i < 60; i++) t.chat(1, `m${i}`);
    const { lines } = t.hook.result.current;
    expect(lines).toHaveLength(50);
    expect(lines.at(-1)!.text).toBe("m59");
    expect(lines.map((l) => l.seq)).toEqual([...lines.map((l) => l.seq)].sort((a, b) => a - b));
    expect(new Set(lines.map((l) => l.seq)).size).toBe(50);
  });

  it("counts unread teammate and ping lines only", () => {
    const t = setup();
    t.chat(1, "a");
    const seen = lastSeq(t.hook.result.current.lines);
    t.chat(1, "b");
    t.ping(2);
    post(t, "mine");
    post(t, "/time");
    expect(countUnread(t.hook.result.current.lines, seen)).toBe(2);
    expect(countUnread(t.hook.result.current.lines, lastSeq(t.hook.result.current.lines))).toBe(0);
    expect(lastSeq([])).toBe(0);
  });
});

describe("the feed's life", () => {
  it("a solo feed starts with a silent welcome", () => {
    const hook = renderHook(() => useChat(null));
    expect(hook.result.current.lines).toMatchObject([{ kind: "note", text: "Type /help for commands.", silent: true }]);
  });

  it("a team feed starts empty and welcomes silently when the lobby opens", () => {
    const t = setup(undefined, "connecting");
    expect(t.hook.result.current.lines).toEqual([]);
    t.hook.rerender({ s: t.session({ phase: "lobby" }) });
    expect(t.hook.result.current.lines).toMatchObject([{ kind: "note", text: "Chat with your team here. Type /help for commands.", silent: true }]);
    t.hook.rerender({ s: t.session({ phase: "playing" }) });
    expect(t.hook.result.current.lines).toHaveLength(1);
  });

  it("keeps the draft and mutes through playing and a reconnect", () => {
    const t = setup(undefined, "lobby");
    act(() => {
      t.hook.result.current.setDraft("half");
      t.hook.result.current.mute("Kai");
    });
    t.hook.rerender({ s: t.session({ phase: "playing" }) });
    t.hook.rerender({ s: t.session({ phase: "playing", status: "reconnecting" }) });
    t.hook.rerender({ s: t.session({ phase: "playing", status: "online" }) });
    expect(t.hook.result.current.draft).toBe("half");
    expect(t.hook.result.current.muted).toEqual(["kai"]);
  });

  it.each(["idle", "error"] as const)("clears everything on %s", (phase) => {
    const t = setup();
    t.chat(1, "hi");
    post(t, "mine");
    act(() => {
      t.hook.result.current.setDraft("half");
      t.hook.result.current.mute("Kai");
    });
    t.hook.rerender({ s: t.session({ phase }) });
    expect(t.hook.result.current.lines).toEqual([]);
    expect(t.hook.result.current.draft).toBe("");
    expect(t.hook.result.current.muted).toEqual([]);
    // rates reset too
    t.hook.rerender({ s: t.session({ phase: "playing" }) });
    expect(post(t, "again").status).toBe("sent");
  });
});
