import { PLAYER_START } from "../game/constants";
import type { TeamSession } from "../hooks/useTeamSession";
import type { CommandContext } from "./commands";

type SessionView = Pick<TeamSession, "me" | "players" | "teammates">;

/** Everyone in the room in join order, with live zones for teammates and your own presence zone for you. */
export function chatRoster(session: SessionView): CommandContext["roster"] {
  const live = new Map(session.teammates.map((t) => [t.id, t.zone]));
  return session.players.map((p) => ({ id: p.id, name: p.name, zone: p.id === session.me?.id ? p.zone : (live.get(p.id) ?? null) }));
}

/** What commands know in the lobby: no clock, no badges, you at the start. */
export function lobbyContext(session: SessionView, muted: readonly string[]): CommandContext {
  return {
    where: "lobby",
    minutes: 0,
    badges: [],
    me: { id: session.me?.id ?? null, name: session.me?.name ?? null, zone: "peaks", x: PLAYER_START.x, y: PLAYER_START.y },
    roster: chatRoster(session),
    known: {},
    muted,
  };
}
