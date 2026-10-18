import { describe, expect, it } from "vitest";
import { distance } from "./geometry";
import { LODGE_START, gameReducer, initialState } from "./reducer";
import { ZONES, arrival, doorAt, type ZoneId } from "./zones";
import { ZONE_ORDER } from "../learn/codexModel";
import { CHESTS, chestById } from "../learn/chests";
import { cardFor } from "./cards";
import { promptText } from "./geometry";
import { KEEPER, LODGE_BOOK, SOUP, keeperLine } from "./lodge";
import { MAX_HP } from "./constants";
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
      expect([s.zone, s.player, s.drone, s.hp]).toEqual(["lodge", { x: 50, y: 78 }, { x: 48, y: 80 }, 1]);
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
    expect(ZONES.lodge.places.map((p) => p.id)).toEqual(["lodge-keeper", "lodge-fireplace", "lodge-book", "chest-html"]);
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
    expect(ZONES.lodge.places.map((p) => p.id)).toEqual(["lodge-keeper", "lodge-fireplace", "lodge-book", "chest-html"]);
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

  it("beside her you get a bowl of soup once, packed as food, hurt or not", () => {
    for (const hp of [2, MAX_HP]) {
      const s = talk(beside({ hp }));
      expect([s.hp, s.food, s.soupTaken]).toEqual([hp, 1, true]);
      expect(s.logs.at(-1)).toBe(SOUP.served);
      const again = talk({ ...s, hp: 1 });
      expect(again.food).toBe(1);
      expect(again.logs.at(-1)).toMatch(/^Keeper: /);
    }
  });

  it("never in hard mode, and from far away she only talks", () => {
    expect(talk(beside({ hp: 2, hard: true })).food).toBe(0);
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

describe("where a new game begins", () => {
  it("is just inside the Ski Lodge by the fire, the same place a respawn puts you, off the mat", () => {
    expect(LODGE_START).toEqual({ zone: "lodge", player: { x: 50, y: 78 }, drone: { x: 48, y: 80 } });
    const respawned = gameReducer({ ...initialState, hp: 0 }, { type: "respawn" });
    expect({ zone: respawned.zone, player: respawned.player, drone: respawned.drone }).toEqual(LODGE_START);
    expect(doorAt(LODGE_START.zone, LODGE_START.player)).toBeNull();
  });
});

describe("the review book on the lodge table", () => {
  const nearBook = (over: Partial<typeof initialState> = {}) => ({ ...initialState, zone: "lodge" as const, player: { x: LODGE_BOOK.x, y: LODGE_BOOK.y + 4 }, ...over });
  const press = (s: typeof initialState) => gameReducer(s, { type: "interact", poi: "lodge-book" });

  it("is a place in the lodge, inspected with a card", () => {
    expect(LODGE_BOOK).toMatchObject({ id: "lodge-book", label: "Review Book" });
    expect(ZONES.lodge.places.map((p) => p.id)).toContain("lodge-book");
    expect(promptText(initialState, LODGE_BOOK)).toBe("[E] Inspect Review Book");
    expect(cardFor({ ...initialState, zone: "lodge", inspected: "lodge-book" })?.text).toMatch(/every language/i);
  });

  it("pressing E beside it opens the book; from far away it only shows the card", () => {
    const near = press(nearBook());
    expect([near.bookOpen, near.inspected]).toEqual([true, "lodge-book"]);
    const far = press(nearBook({ player: { x: 90, y: 20 } }));
    expect([far.bookOpen, far.inspected]).toEqual([false, "lodge-book"]);
  });

  it("an open book is a window: you cannot walk, and toggling closes it", () => {
    const open = press(nearBook());
    expect(gameReducer(open, { type: "move", dir: "left" })).toBe(open);
    expect(gameReducer(open, { type: "toggleBook" }).bookOpen).toBe(false);
    expect(gameReducer(initialState, { type: "toggleBook" }).bookOpen).toBe(false);
  });

  it("the Codex and the book never open together, and no other window lets the book open", () => {
    expect(gameReducer({ ...initialState, codexOpen: true }, { type: "toggleBook" }).bookOpen).toBe(false);
    const book = press(nearBook());
    expect(gameReducer(book, { type: "toggleCodex" }).codexOpen).toBe(false);
    expect(press(nearBook({ challenge: { target: "chest-html", error: null, wrongTries: 0, solved: false, lastWrong: null } })).bookOpen).toBe(false);
  });

  it("is in a fresh game closed and a resumed game never comes back inside it", () => {
    expect(initialState.bookOpen).toBe(false);
    localStorage.setItem("devlandia.savedGame", JSON.stringify({ v: 2, owner: "guest", game: { playerClass: "warrior", hard: false, state: { ...initialState, bookOpen: true } } }));
    expect(loadGame(null)?.state.bookOpen).toBe(false);
  });
});

