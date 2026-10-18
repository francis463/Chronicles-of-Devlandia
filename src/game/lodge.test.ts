import { describe, expect, it } from "vitest";
import { distance } from "./geometry";
import { gameReducer, initialState } from "./reducer";
import { ZONES, arrival, doorAt, type ZoneId } from "./zones";
import { ZONE_ORDER } from "../learn/codexModel";
import { CHESTS, chestById } from "../learn/chests";
import { cardFor } from "./cards";
import { promptText } from "./geometry";
import { KEEPER, SOUP, keeperLine } from "./lodge";
import { MAX_HP } from "./constants";
import { REMEDY_HEAL } from "./remedies";
import { loadGame } from "./resume";

const at = (zone: ZoneId, x: number, y: number) => ({ ...initialState, zone, player: { x, y } });

describe("the Ski Lodge zone", () => {
  it("is an indoor zone: no wall, gate, river or edge exits", () => {
    expect(ZONES.lodge).toMatchObject({ id: "lodge", name: "Ski Lodge", exits: [], wall: false, gate: false, river: false });
    expect(ZONE_ORDER.slice(0, 2)).toEqual(["lodge", "peaks"]);
  });

  it("only the Peaks and the lodge have doors", () => {
    for (const zone of Object.keys(ZONES) as ZoneId[]) expect(Array.isArray(ZONES[zone].doors), zone).toBe(true);
    expect((Object.keys(ZONES) as ZoneId[]).filter((z) => ZONES[z].doors.length > 0).sort()).toEqual(["lodge", "peaks"]);
    expect(ZONES.peaks.doors[0]).toMatchObject({ at: { x: 19.4, y: 88 }, radius: 3, to: "lodge", arrive: { x: 50, y: 78 } });
    expect(ZONES.lodge.doors[0]).toMatchObject({ at: { x: 50, y: 88 }, radius: 3, to: "peaks", arrive: { x: 26, y: 88 } });
  });

  it("walking onto the Peaks door goes inside, arriving in the room", () => {
    const s = gameReducer(at("peaks", 22, 88), { type: "move", dir: "left" });
    expect(s.zone).toBe("lodge");
    expect(s.player).toEqual({ x: 50, y: 78 });
    expect(s.logs.at(-1)).toBe("Entered the Ski Lodge.");
    expect(s.inspected).toBeNull();
  });

  it("walking onto the mat goes back outside, in front of the door", () => {
    const s = gameReducer(at("lodge", 50, 84), { type: "move", dir: "down" });
    expect(s.zone).toBe("peaks");
    expect(s.player).toEqual({ x: 26, y: 88 });
    expect(s.logs.at(-1)).toBe("Entered C++ Peaks.");
  });

  it("an arrival never lands on a door, so nobody bounces straight back", () => {
    for (const zone of Object.keys(ZONES) as ZoneId[])
      for (const door of ZONES[zone].doors) {
        const dest = ZONES[door.to];
        for (const d of dest.doors) expect(distance(door.arrive, d.at), `${zone} -> ${door.to}`).toBeGreaterThan(d.radius);
        expect(doorAt(door.to, door.arrive), `${zone} -> ${door.to}`).toBeNull();
      }
    for (const zone of Object.keys(ZONES) as ZoneId[])
      for (const exit of ZONES[zone].exits)
        for (const along of [exit.min, exit.max]) {
          // A west or east exit spans rows, a north or south one columns.
          const from = exit.edge === "west" || exit.edge === "east" ? { x: 50, y: along } : { x: along, y: 50 };
          expect(doorAt(exit.to, arrival(exit, from).player), `${zone} exit to ${exit.to}`).toBeNull();
        }
  });

  it("the Peaks door can be reached from either parity of the 4-percent lattice, on the bottom row or the one above", () => {
    for (const y of [84, 86, 88, 90]) for (const x of [18, 20, 22, 24]) {
      const near = doorAt("peaks", { x, y });
      // Every lattice point within one step of the door's row and column is on the door.
      if (Math.abs(x - 19.4) <= 1.4 && Math.abs(y - 88) <= 2) expect(near, `${x},${y}`).not.toBeNull();
    }
    expect(doorAt("peaks", { x: 18, y: 90 })).not.toBeNull();
    expect(doorAt("peaks", { x: 20, y: 90 })).not.toBeNull();
    expect(doorAt("peaks", { x: 26, y: 88 })).toBeNull();
  });

  it("a downed player or an open window cannot use a door", () => {
    expect(gameReducer({ ...at("peaks", 22, 88), hp: 0 }, { type: "move", dir: "left" }).zone).toBe("peaks");
    expect(gameReducer({ ...at("peaks", 22, 88), codexOpen: true }, { type: "move", dir: "left" }).zone).toBe("peaks");
  });

  it("respawning, from the Peaks or from inside the lodge, puts you inside the lodge by the fire, away from the mat", () => {
    for (const from of [at("lodge", 50, 50), at("peaks", 60, 40), at("forest", 30, 30)]) {
      const s = gameReducer({ ...from, hp: 0 }, { type: "respawn" });
      expect([s.zone, s.player, s.drone, s.hp]).toEqual(["lodge", { x: 50, y: 78 }, { x: 48, y: 80 }, 5]);
      expect(doorAt("lodge", s.player), "not on the mat").toBeNull();
    }
  });

  it("a fresh game has not had the soup", () => {
    expect(initialState.soupTaken).toBe(false);
  });
});

describe("the lodge's places and the HTML chest", () => {
  it("the Peaks have the lodge door as a place and the lodge the fireplace and the shelf chest", () => {
    expect(ZONES.peaks.places.find((p) => p.id === "lodge-door")).toMatchObject({ label: "Ski Lodge", x: 19.4, y: 89.4 });
    expect(ZONES.peaks.places.some((p) => p.id === "chest-html")).toBe(false);
    expect(ZONES.lodge.places.map((p) => p.id)).toEqual(["lodge-keeper", "lodge-fireplace", "chest-html"]);
  });

  it("the HTML chest is on the lodge's shelf, and the chest count is still 11", () => {
    expect(chestById("chest-html")).toMatchObject({ zone: "lodge", host: "Shelf", at: { x: 66, y: 46 } });
    expect(CHESTS).toHaveLength(11);
  });

  it("interacting beside the shelf opens the HTML terminal; the door and fireplace only show cards", () => {
    expect(gameReducer(at("lodge", 66, 44), { type: "interact", poi: "chest-html" }).challenge?.target).toBe("chest-html");
    const door = gameReducer(at("peaks", 22, 84), { type: "interact", poi: "lodge-door" });
    expect([door.inspected, door.challenge, door.zone]).toEqual(["lodge-door", null, "peaks"]);
    expect(cardFor(door)?.text).toBe("The Ski Lodge. Walk into its door to go inside.");
    const fire = gameReducer(at("lodge", 20, 36), { type: "interact", poi: "lodge-fireplace" });
    expect(cardFor(fire)?.title).toBe("Fireplace");
  });

  it("the prompts read Inspect for the door and fireplace and Search for the shelf", () => {
    expect(promptText(initialState, ZONES.peaks.places.find((p) => p.id === "lodge-door")!)).toBe("[E] Inspect Ski Lodge");
    expect(promptText(initialState, ZONES.lodge.places.find((p) => p.id === "chest-html")!)).toBe("[E] Search Shelf");
  });
});

describe("the lodge keeper and her soup", () => {
  const beside = (over: Partial<typeof initialState> = {}) => ({ ...initialState, zone: "lodge" as const, player: { x: 38, y: 56 }, ...over });
  const talk = (s: typeof initialState) => gameReducer(s, { type: "interact", poi: "lodge-keeper" });

  it("is a place in the lodge at (38, 52) that you talk to", () => {
    expect(KEEPER).toMatchObject({ id: "lodge-keeper", label: "Keeper", x: 38, y: 52 });
    expect(ZONES.lodge.places.map((p) => p.id)).toEqual(["lodge-keeper", "lodge-fireplace", "chest-html"]);
    expect(promptText(initialState, KEEPER)).toBe("[E] Talk to Keeper");
  });

  it("her hint names the first thing you have not done, and every line ends with a full stop", () => {
    const base = { gateUnlocked: false, hasLoot: false, clueDecoded: false, artifactFound: false, badges: [] };
    const lines = [
      keeperLine(base),
      keeperLine({ ...base, gateUnlocked: true }),
      keeperLine({ ...base, gateUnlocked: true, hasLoot: true }),
      keeperLine({ ...base, gateUnlocked: true, hasLoot: true, clueDecoded: true }),
      keeperLine({ ...base, gateUnlocked: true, hasLoot: true, clueDecoded: true, artifactFound: true, badges: ["chest-html"] }),
    ];
    expect(new Set(lines).size).toBe(5);
    for (const l of lines) expect(l.endsWith(".")).toBe(true);
    expect(lines[0]).toContain("shelf");
    expect(lines[4]).not.toContain("shelf");
  });

  it("a hurt player beside her gets the soup once: +2 hearts, logged, and not again", () => {
    const s = talk(beside({ hp: 2 }));
    expect(s.hp).toBe(2 + REMEDY_HEAL);
    expect(s.soupTaken).toBe(true);
    expect(s.logs.at(-1)).toBe(SOUP.served);
    const again = talk({ ...s, hp: 1 });
    expect(again.hp).toBe(1);
    expect(again.logs.at(-1)).toMatch(/^Keeper: /);
  });

  it("at full health she only says to come back, and the soup is not used up", () => {
    const s = talk(beside({ hp: MAX_HP }));
    expect(s.soupTaken).toBe(false);
    expect(s.hp).toBe(MAX_HP);
    expect(s.logs.at(-1)).toBe(SOUP.fine);
    expect(talk({ ...s, hp: 1 }).hp).toBe(1 + REMEDY_HEAL);
  });

  it("never in hard mode, and from far away she only talks", () => {
    expect(talk(beside({ hp: 2, hard: true })).hp).toBe(2);
    expect(talk(beside({ hp: 2, hard: true })).soupTaken).toBe(false);
    const far = talk(beside({ hp: 2, player: { x: 80, y: 20 } }));
    expect([far.hp, far.soupTaken, far.inspected]).toEqual([2, false, "lodge-keeper"]);
    expect(far.logs.at(-1)).toMatch(/^Keeper: /);
  });

  it("her card is the line she says", () => {
    expect(cardFor({ ...initialState, zone: "lodge", inspected: "lodge-keeper" })?.text).toContain("shelf");
  });

  it("an old save without soupTaken loads with false", () => {
    const { soupTaken: _gone, ...old } = initialState;
    localStorage.setItem("devlandia.savedGame", JSON.stringify({ v: 2, owner: "guest", game: { playerClass: "warrior", hard: false, state: old } }));
    expect(loadGame(null)?.state.soupTaken).toBe(false);
    localStorage.setItem("devlandia.savedGame", JSON.stringify({ v: 2, owner: "guest", game: { playerClass: "warrior", hard: false, state: { ...old, zone: "lodge", soupTaken: true } } }));
    expect(loadGame(null)?.state).toMatchObject({ zone: "lodge", soupTaken: true });
  });
});

