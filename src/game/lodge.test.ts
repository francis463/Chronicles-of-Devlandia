import { describe, expect, it } from "vitest";
import { DRONE_START, PLAYER_START } from "./constants";
import { distance } from "./geometry";
import { gameReducer, initialState } from "./reducer";
import { ZONES, arrival, doorAt, type ZoneId } from "./zones";
import { ZONE_ORDER } from "../learn/codexModel";

const at = (zone: ZoneId, x: number, y: number) => ({ ...initialState, zone, player: { x, y } });

describe("the Ski Lodge zone", () => {
  it("is an indoor zone: no wall, gate, river or edge exits", () => {
    expect(ZONES.lodge).toMatchObject({ id: "lodge", name: "Ski Lodge", exits: [], wall: false, gate: false, river: false });
    expect(ZONE_ORDER.at(-1)).toBe("lodge");
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
