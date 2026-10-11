import { formatTime, phaseOf } from "../game/clock";
import { ZONES, type ZoneId } from "../game/zones";
import { CHESTS } from "../learn/chests";
import type { ChestId } from "../learn/types";
import { maskRude } from "./filter";
import { displayNames, nameKey } from "./names";
import { PING_PLACE_NAMES, placeCopy, placeSpot, type PingPlace } from "./places";

export type CommandContext = {
  where: "solo" | "lobby" | "game";
  minutes: number;
  badges: readonly ChestId[];
  me: { id: string | null; name: string | null; zone: ZoneId; x: number; y: number };
  /** Everyone in join order, including you; names are RAW nicknames. */
  roster: readonly { id: string; name: string; zone: ZoneId | null }[];
  /** Teammate id → badges you know of. */
  known: Readonly<Record<string, readonly ChestId[]>>;
  /** Nickname keys. */
  muted: readonly string[];
};

export type CommandEffect =
  | { kind: "ping"; zone: ZoneId; x: number; y: number; place: PingPlace | null }
  | { kind: "weather"; snow: boolean }
  | { kind: "light"; light: "auto" | "day" | "night" }
  | { kind: "mute" | "unmute"; key: string; name: string };

type Result = { notes: string[]; effect: CommandEffect | null };
type Handler = (arg: string, c: CommandContext) => Result;

const say = (...notes: string[]): Result => ({ notes, effect: null });
const SOLO_NONE = say("Solo game: no teammates.");
const GAME_ONLY = say("Available once the expedition starts.");
const MUTE_LINE = "/mute name, /unmute name — hide or show a teammate's messages";

const teammates = (c: CommandContext) => c.roster.filter((p) => p.id !== c.me.id);
const badgeNames = (ids: readonly ChestId[]) => CHESTS.filter((ch) => ids.includes(ch.id)).map((ch) => ch.badge);
const unknownName = (arg: string) => say(`No teammate called "${arg}".`);

function help(_arg: string, c: CommandContext): Result {
  if (c.where === "lobby") return say("Commands:", MUTE_LINE, "More commands once the expedition starts.");
  if (c.where === "solo") {
    return say(
      "Commands:",
      "/time — the game clock",
      "/badges — your badges",
      "/weather snow|clear — snowfall on your map",
      "/light day|night|auto — your map's lighting",
    );
  }
  return say(
    "Commands:",
    "/where — where your teammates are",
    "/time — the game clock",
    "/badges [name] — your badges, or what you know of a teammate's",
    "/ping [place] — mark your spot, or a place, for your team",
    "/weather snow|clear — snowfall on your map",
    "/light day|night|auto — your map's lighting",
    MUTE_LINE,
  );
}

function where(_arg: string, c: CommandContext): Result {
  if (c.where === "solo") return SOLO_NONE;
  const others = teammates(c);
  if (others.length === 0) return say("No teammates here right now.");
  const shown = displayNames(c.roster);
  return say(others.map((p) => `${shown.get(p.id)}: ${p.zone ? ZONES[p.zone].name : "somewhere new"}`).join(" · "));
}

const time = (_arg: string, c: CommandContext): Result => say(`${phaseOf(c.minutes)}, ${formatTime(c.minutes)}.`);

function badges(arg: string, c: CommandContext): Result {
  const mine = () => {
    const own = badgeNames(c.badges);
    return say(own.length ? `Your badges: ${own.length}/${CHESTS.length} (${own.join(", ")}).` : `Your badges: 0/${CHESTS.length}.`);
  };
  if (!arg) return mine();
  if (c.where === "solo") return SOLO_NONE;
  const key = nameKey(arg);
  const matches = teammates(c).filter((p) => nameKey(p.name) === key);
  if (matches.length === 0) return c.me.name !== null && nameKey(c.me.name) === key ? mine() : unknownName(arg);
  const shown = displayNames(c.roster);
  return say(
    ...matches.map((p) => {
      const got = badgeNames(c.known[p.id] ?? []);
      return got.length ? `${shown.get(p.id)} has earned ${got.length} that you know of: ${got.join(", ")}.` : `${shown.get(p.id)} hasn't earned any that you know of.`;
    }),
  );
}

function ping(arg: string, c: CommandContext): Result {
  if (c.where === "solo") return say("Pings are for team games.");
  if (!arg) {
    const { zone, x, y } = c.me;
    return { notes: [`Ping sent: your spot in ${ZONES[zone].name}.`], effect: { kind: "ping", zone, x, y, place: null } };
  }
  const place = PING_PLACE_NAMES.find((n) => n === nameKey(arg));
  if (!place) {
    const [first, chests] = [
      [...PING_PLACE_NAMES.slice(0, 8), ...FOREST_PLACES],
      PING_PLACE_NAMES.filter((n, i) => i >= 8 && !FOREST_PLACES.includes(n)),
    ];
    return say(`No place called "${arg}". Try: ${first.join(", ")}, or a chest: ${chests.join(", ")}.`);
  }
  return { notes: [`Ping sent: ${placeCopy(place)}.`], effect: { kind: "ping", ...placeSpot(place), place } };
}

/** The forest places chat can ping, listed with the landmarks rather than the chests. */
const FOREST_PLACES: readonly PingPlace[] = ["ranger", "campfire"];

function weather(arg: string): Result {
  const word = nameKey(arg);
  if (word === "snow") return { notes: ["Snow is falling on your map."], effect: { kind: "weather", snow: true } };
  if (word === "clear") return { notes: ["Your map is clear."], effect: { kind: "weather", snow: false } };
  return say("Try /weather snow or /weather clear.");
}

const LIGHT_COPY = { day: "Your map shows daylight.", night: "Your map shows night.", auto: "Your map follows the clock." } as const;
function light(arg: string): Result {
  const word = nameKey(arg);
  if (word !== "day" && word !== "night" && word !== "auto") return say("Try /light day, /light night or /light auto.");
  return { notes: [LIGHT_COPY[word]], effect: { kind: "light", light: word } };
}

function mute(arg: string, c: CommandContext): Result {
  if (c.where === "solo") return say("No teammates to mute.");
  if (!arg) return say("Type /mute and a teammate's name.");
  const key = nameKey(arg);
  const match = teammates(c).find((p) => nameKey(p.name) === key);
  if (!match) return c.me.name !== null && nameKey(c.me.name) === key ? say("You can't mute yourself.") : unknownName(arg);
  const shown = maskRude(match.name);
  if (c.muted.includes(key)) return say(`${shown} is already muted.`);
  return { notes: [`${shown} is muted. /unmute ${shown} to see their messages again.`], effect: { kind: "mute", key, name: match.name } };
}

function unmute(arg: string, c: CommandContext): Result {
  if (c.where === "solo") return say("No teammates to mute.");
  if (!arg) return say("Type /unmute and a teammate's name.");
  const key = nameKey(arg);
  const match = teammates(c).find((p) => nameKey(p.name) === key);
  const name = match?.name ?? arg;
  if (c.muted.includes(key)) return { notes: [`${maskRude(name)} is unmuted.`], effect: { kind: "unmute", key, name } };
  if (match || (c.me.name !== null && nameKey(c.me.name) === key)) return say(`${maskRude(name)} isn't muted.`);
  return unknownName(arg);
}

const HANDLERS: Record<string, { run: Handler; lobby?: true }> = {
  help: { run: help, lobby: true },
  where: { run: where },
  time: { run: time },
  badges: { run: badges },
  ping: { run: ping },
  weather: { run: weather },
  light: { run: light },
  mute: { run: mute, lobby: true },
  unmute: { run: unmute, lobby: true },
};

/** Runs one command line (already cleaned, starting with `/`): the notes only you see, and the one effect it asks for. */
export function runCommand(text: string, context: CommandContext): Result {
  const line = text.slice(1);
  if (line === "" || /^\s/.test(line)) return say("Type /help for commands.");
  const space = line.search(/\s/);
  const word = (space < 0 ? line : line.slice(0, space)).toLowerCase();
  const arg = space < 0 ? "" : line.slice(space).trim();
  const handler = Object.hasOwn(HANDLERS, word) ? HANDLERS[word] : undefined;
  if (!handler) return say(`Unknown command /${word}. Type /help.`);
  if (context.where === "lobby" && !handler.lobby) return GAME_ONLY;
  return handler.run(arg, context);
}
