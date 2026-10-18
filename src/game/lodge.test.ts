import { describe, expect, it } from "vitest";
import { DRONE_START, PLAYER_START } from "./constants";
import { distance } from "./geometry";
import { gameReducer, initialState } from "./reducer";
import { ZONES, arrival, doorAt, type ZoneId } from "./zones";
import { ZONE_ORDER } from "../learn/codexModel";
import { CHESTS, chestById } from "../learn/chests";
import { cardFor } from "./cards";
import { promptText } from "./geometry";

const at = (zone: ZoneId, x: number, y: number) => ({ ...initialState, zone, player: { x, y } });

describe("the Ski Lodge zone", () => {
  it("is an indoor zone: no wall, gate, river or edge exits", () => {
    expect(ZONES.lodge).toMatchObject({ id: "lodge", name: "Ski Lodge", exits: [], wall: false, gate: false, river: false });
    expect(ZONE_ORDER.slice(0, 2)).toEqual(["lodge", "peaks"]);
  });

  it("only the Peaks and the lodge have doors", () => {
    for (const zone of Object.keys(ZONES) as ZoneId[]) expect(Array.isArray(ZONES[zone].doors), zone).toBe(true);
    expect((Object.keys(ZONES) as ZoneId[]).filter((z) => ZONES[z].doors.length > 0).sort()).toEqual(["lodge", "peaks"]);
    expect(ZONES.peaks.doors[0]).toMatchObject({ at: { x: 19.4, y: 88 }, radius: 2.5, to: "lodge", arrive: { x: 50, y: 78 } });
    expect(ZONES.lodge.doors[0]).toMatchObject({ at: { x: 50, y: 88 }, radius: 2.5, to: "peaks", arrive: { x: 26, y: 88 } });
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
      for (const exit of ZONES[zone].exits) for (const y of [exit.min, exit.max]) {
        const land = arrival(exit, { x: 50, y }).player;
        expect(doorAt(exit.to, land), `${zone} exit to ${exit.to}`).toBeNull();
      }
  });

  it("a downed player or an open window cannot use a door", () => {
    expect(gameReducer({ ...at("peaks", 22, 88), hp: 0 }, { type: "move", dir: "left" }).zone).toBe("peaks");
    expect(gameReducer({ ...at("peaks", 22, 88), codexOpen: true }, { type: "move", dir: "left" }).zone).toBe("peaks");
  });

  it("respawning from the lodge returns to the Peaks start", () => {
    const s = gameReducer({ ...at("lodge", 50, 50), hp: 0 }, { type: "respawn" });
    expect([s.zone, s.player, s.drone]).toEqual(["peaks", PLAYER_START, DRONE_START]);
  });

  it("a fresh game has not had the soup", () => {
    expect(initialState.soupTaken).toBe(false);
  });
});

describe("the lodge's places and the HTML chest", () => {
  it("the Peaks have the lodge door as a place and the lodge the fireplace and the shelf chest", () => {
    expect(ZONES.peaks.places.find((p) => p.id === "lodge-door")).toMatchObject({ label: "Ski Lodge", x: 19.4, y: 89.4 });
    expect(ZONES.peaks.places.some((p) => p.id === "chest-html")).toBe(false);
    expect(ZONES.lodge.places.map((p) => p.id)).toEqual(["lodge-fireplace", "chest-html"]);
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

