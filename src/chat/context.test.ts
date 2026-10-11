import { describe, expect, it } from "vitest";
import { PLAYER_START } from "../game/constants";
import { NO_FLAGS, rankPlayers, type PresenceMeta } from "../game/team";
import { chatRoster, lobbyContext } from "./context";

const meta = (id: string, name: string, joinedAt: number, zone: PresenceMeta["zone"]): PresenceMeta => ({
  id, name, joinedAt, startedAt: null, flags: NO_FLAGS, x: 1, y: 2, zone,
});
const players = rankPlayers([meta("b", "Mia", 2, "peaks"), meta("a", "Ana", 1, "peaks"), meta("c", "Kai", 3, "peaks")]);
const session = {
  me: players[0],
  players,
  teammates: [
    { id: "b", name: "Mia", color: "#fff", x: 0, y: 0, zone: "village" as const },
    { id: "c", name: "Kai", color: "#fff", x: 0, y: 0, zone: null },
  ],
};

describe("chatRoster", () => {
  it("lists players in rank order, live zones for others and your presence zone for you", () => {
    expect(chatRoster(session)).toEqual([
      { id: "a", name: "Ana", zone: "peaks" },
      { id: "b", name: "Mia", zone: "village" },
      { id: "c", name: "Kai", zone: null },
    ]);
  });
});

describe("lobbyContext", () => {
  it("is the lobby: no clock, no badges, you at the start", () => {
    expect(lobbyContext(session, ["kai"])).toEqual({
      where: "lobby",
      minutes: 0,
      badges: [],
      me: { id: "a", name: "Ana", zone: "peaks", x: PLAYER_START.x, y: PLAYER_START.y },
      roster: chatRoster(session),
      known: {},
      muted: ["kai"],
    });
  });
  it("copes with no session yet", () => {
    const c = lobbyContext({ me: null, players: [], teammates: [] }, []);
    expect(c.me.id).toBeNull();
    expect(c.roster).toEqual([]);
  });
});
