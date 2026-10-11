import { describe, expect, it } from "vitest";
import { runCommand, type CommandContext } from "./commands";

const GAME: CommandContext = {
  where: "game",
  minutes: 19 * 60 + 34,
  badges: ["chest-html", "chest-css", "chest-sql"],
  me: { id: "p1", name: "Ana", zone: "peaks", x: 30, y: 40 },
  roster: [
    { id: "p1", name: "Ana", zone: "peaks" },
    { id: "p2", name: "Kai", zone: "village" },
    { id: "p3", name: "Mia", zone: "peaks" },
  ],
  known: { p2: ["chest-sql", "chest-html"] },
  muted: [],
};
const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({ ...GAME, ...over });
const SOLO = ctx({ where: "solo", me: { id: null, name: null, zone: "peaks", x: 30, y: 40 }, roster: [], known: {} });
const LOBBY = ctx({ where: "lobby", minutes: 0, badges: [], known: {} });
const notes = (text: string, c: CommandContext = GAME) => runCommand(text, c).notes;
const effect = (text: string, c: CommandContext = GAME) => runCommand(text, c).effect;

const PLACES = 'No place called "%". Try: gate, tower, cache, river, ada, signpost, terminal, archive, ranger, campfire, or a chest: html, css, java, cpp1, cpp2, py1, php, sql, py2, cs.';

describe("/help", () => {
  it("in a game lists the eight lines", () => {
    expect(notes("/help")).toEqual([
      "Commands:",
      "/where — where your teammates are",
      "/time — the game clock",
      "/badges [name] — your badges, or what you know of a teammate's",
      "/ping [place] — mark your spot, or a place, for your team",
      "/weather snow|clear — snowfall on your map",
      "/light day|night|auto — your map's lighting",
      "/mute name, /unmute name — hide or show a teammate's messages",
    ]);
  });
  it("in solo lists the four", () => {
    expect(notes("/help", SOLO)).toEqual([
      "Commands:",
      "/time — the game clock",
      "/badges — your badges",
      "/weather snow|clear — snowfall on your map",
      "/light day|night|auto — your map's lighting",
    ]);
  });
  it("in the lobby lists mute and unmute", () => {
    expect(notes("/help", LOBBY)).toEqual([
      "Commands:",
      "/mute name, /unmute name — hide or show a teammate's messages",
      "More commands once the expedition starts.",
    ]);
  });
  it("ignores an argument, as do /where and /time", () => {
    expect(notes("/help now")).toEqual(notes("/help"));
    expect(notes("/where kai")).toEqual(notes("/where"));
    expect(notes("/time x")).toEqual(notes("/time"));
  });
  it("has no effect", () => {
    expect(effect("/help")).toBeNull();
  });
});

describe("/where", () => {
  it("lists teammates in rank order with their zones", () => {
    expect(notes("/where")).toEqual(["Kai: Dev Village · Mia: C++ Peaks"]);
  });
  it("calls an unknown zone somewhere new", () => {
    expect(notes("/where", ctx({ roster: [GAME.roster[0], { id: "p2", name: "Kai", zone: null }] }))).toEqual(["Kai: somewhere new"]);
  });
  it("answers when alone, in solo and in the lobby", () => {
    expect(notes("/where", ctx({ roster: [GAME.roster[0]] }))).toEqual(["No teammates here right now."]);
    expect(notes("/where", SOLO)).toEqual(["Solo game: no teammates."]);
    expect(notes("/where", LOBBY)).toEqual(["Available once the expedition starts."]);
  });
  it("tells two Kais apart", () => {
    const c = ctx({ roster: [GAME.roster[0], { id: "p2", name: "Kai", zone: "village" }, { id: "p3", name: "kai", zone: "peaks" }] });
    expect(notes("/where", c)).toEqual(["Kai: Dev Village · kai (2): C++ Peaks"]);
  });
});

describe("/time", () => {
  it("reads the phase and the clock", () => {
    expect(notes("/time")).toEqual(["Dusk, 19:34."]);
    expect(notes("/time", SOLO)).toEqual(["Dusk, 19:34."]);
    expect(notes("/time", LOBBY)).toEqual(["Available once the expedition starts."]);
  });
});

describe("/badges", () => {
  it("lists yours in chest-table order", () => {
    expect(notes("/badges")).toEqual(["Your badges: 3/10 (HTML, CSS, SQL)."]);
    expect(notes("/badges", SOLO)).toEqual(["Your badges: 3/10 (HTML, CSS, SQL)."]);
  });
  it("says 0/10 with none", () => {
    expect(notes("/badges", ctx({ badges: [] }))).toEqual(["Your badges: 0/10."]);
  });
  it("reports what you know of a teammate", () => {
    expect(notes("/badges Kai")).toEqual(["Kai has earned 2 that you know of: HTML, SQL."]);
    expect(notes("/badges mia")).toEqual(["Mia hasn't earned any that you know of."]);
  });
  it("gives one line per teammate sharing a name", () => {
    const c = ctx({ roster: [GAME.roster[0], { id: "p2", name: "Kai", zone: null }, { id: "p3", name: "kai", zone: null }], known: { p2: ["chest-sql"] } });
    expect(notes("/badges KAI", c)).toEqual(["Kai has earned 1 that you know of: SQL.", "kai (2) hasn't earned any that you know of."]);
  });
  it("answers unknown names, yourself and solo", () => {
    expect(notes("/badges Zed")).toEqual(['No teammate called "Zed".']);
    expect(notes("/badges ana")).toEqual(["Your badges: 3/10 (HTML, CSS, SQL)."]);
    expect(notes("/badges Kai", SOLO)).toEqual(["Solo game: no teammates."]);
  });
  it("is available in the lobby only as a refusal", () => {
    expect(notes("/badges", LOBBY)).toEqual(["Available once the expedition starts."]);
  });
});

describe("/ping", () => {
  it("marks your spot", () => {
    const r = runCommand("/ping", GAME);
    expect(r.notes).toEqual(["Ping sent: your spot in C++ Peaks."]);
    expect(r.effect).toEqual({ kind: "ping", zone: "peaks", x: 30, y: 40, place: null });
  });
  it("marks a place", () => {
    const r = runCommand("/ping gate", GAME);
    expect(r.notes).toEqual(["Ping sent: the Terminal Gate."]);
    expect(r.effect).toEqual({ kind: "ping", zone: "peaks", x: 50, y: 50, place: "gate" });
    expect(effect("/ping CS")).toMatchObject({ place: "cs", zone: "village" });
  });
  it("refuses unknown places, whole-argument", () => {
    expect(notes("/ping gate now")).toEqual([PLACES.replace("%", "gate now")]);
    expect(notes("/ping zzz")).toEqual([PLACES.replace("%", "zzz")]);
    expect(effect("/ping zzz")).toBeNull();
  });
  it("is for team games", () => {
    expect(notes("/ping", SOLO)).toEqual(["Pings are for team games."]);
    expect(effect("/ping", SOLO)).toBeNull();
    expect(notes("/ping", LOBBY)).toEqual(["Available once the expedition starts."]);
  });
});

describe("/weather and /light", () => {
  it("sets the snow", () => {
    expect(runCommand("/weather snow", GAME)).toEqual({ notes: ["Snow is falling on your map."], effect: { kind: "weather", snow: true } });
    expect(runCommand("/weather clear", SOLO)).toEqual({ notes: ["Your map is clear."], effect: { kind: "weather", snow: false } });
  });
  it("hints on anything else", () => {
    for (const t of ["/weather rain", "/weather", "/weather snow now"]) {
      expect(notes(t)).toEqual(["Try /weather snow or /weather clear."]);
      expect(effect(t)).toBeNull();
    }
  });
  it("sets the light", () => {
    expect(runCommand("/light day", GAME)).toEqual({ notes: ["Your map shows daylight."], effect: { kind: "light", light: "day" } });
    expect(runCommand("/light night", GAME)).toEqual({ notes: ["Your map shows night."], effect: { kind: "light", light: "night" } });
    expect(runCommand("/light AUTO", SOLO)).toEqual({ notes: ["Your map follows the clock."], effect: { kind: "light", light: "auto" } });
  });
  it("hints on anything else for light", () => {
    for (const t of ["/light dusk", "/light"]) {
      expect(notes(t)).toEqual(["Try /light day, /light night or /light auto."]);
      expect(effect(t)).toBeNull();
    }
  });
  it("are refused in the lobby", () => {
    expect(notes("/weather snow", LOBBY)).toEqual(["Available once the expedition starts."]);
    expect(notes("/light day", LOBBY)).toEqual(["Available once the expedition starts."]);
  });
});

describe("/mute and /unmute", () => {
  it("mutes by nickname key and names the roster nickname", () => {
    const c = ctx({ roster: [GAME.roster[0], { id: "p2", name: "Big  Kai", zone: null }] });
    expect(runCommand("/mute big kai", c)).toEqual({
      notes: ["Big  Kai is muted. /unmute Big  Kai to see their messages again."],
      effect: { kind: "mute", key: "big kai", name: "Big  Kai" },
    });
  });
  it("works in the lobby", () => {
    expect(effect("/mute Kai", LOBBY)).toEqual({ kind: "mute", key: "kai", name: "Kai" });
  });
  it("asks for a name", () => {
    expect(notes("/mute")).toEqual(["Type /mute and a teammate's name."]);
    expect(notes("/unmute")).toEqual(["Type /unmute and a teammate's name."]);
  });
  it("won't mute you, but will mute a teammate sharing your name", () => {
    expect(notes("/mute ana")).toEqual(["You can't mute yourself."]);
    expect(effect("/mute ana")).toBeNull();
    const c = ctx({ roster: [GAME.roster[0], { id: "p2", name: "ANA", zone: null }] });
    expect(effect("/mute ana", c)).toEqual({ kind: "mute", key: "ana", name: "ANA" });
  });
  it("says when already muted or unknown", () => {
    expect(notes("/mute Kai", ctx({ muted: ["kai"] }))).toEqual(["Kai is already muted."]);
    expect(effect("/mute Kai", ctx({ muted: ["kai"] }))).toBeNull();
    expect(notes("/mute Zed")).toEqual(['No teammate called "Zed".']);
  });
  it("unmutes, even a player who has left", () => {
    expect(runCommand("/unmute Kai", ctx({ muted: ["kai"] }))).toEqual({ notes: ["Kai is unmuted."], effect: { kind: "unmute", key: "kai", name: "Kai" } });
    expect(runCommand("/unmute Zed", ctx({ muted: ["zed"] }))).toEqual({ notes: ["Zed is unmuted."], effect: { kind: "unmute", key: "zed", name: "Zed" } });
  });
  it("says when not muted or unknown", () => {
    expect(notes("/unmute Kai")).toEqual(["Kai isn't muted."]);
    expect(notes("/unmute Zed")).toEqual(['No teammate called "Zed".']);
  });
  it("masks a rude nickname in the confirmation", () => {
    const c = ctx({ roster: [GAME.roster[0], { id: "p2", name: "fuck you", zone: null }] });
    expect(notes("/mute fuck you", c)).toEqual(["*** you is muted. /unmute *** you to see their messages again."]);
  });
  it("has no teammates in solo", () => {
    for (const t of ["/mute", "/mute Kai", "/unmute", "/unmute Kai"]) expect(notes(t, SOLO)).toEqual(["No teammates to mute."]);
  });
});

describe("other input", () => {
  it("answers a bare slash", () => {
    expect(notes("/")).toEqual(["Type /help for commands."]);
    expect(notes("/ hi")).toEqual(["Type /help for commands."]);
  });
  it("answers an unknown command, even in the lobby", () => {
    expect(notes("/Foo bar")).toEqual(["Unknown command /foo. Type /help."]);
    expect(notes("/Foo", LOBBY)).toEqual(["Unknown command /foo. Type /help."]);
  });
  it("takes the word in any case", () => {
    expect(notes("/TIME")).toEqual(["Dusk, 19:34."]);
  });
});
