import { describe, expect, it } from "vitest";
import { cardFor } from "./cards";
import { nomadSays } from "./desert";
import { DESERT_JARS, DESERT_LORE, JAR_TIPS, waterLine } from "./desertLore";
import { INTERACT_RADIUS, MAX_HP } from "./constants";
import { promptText } from "./geometry";
import { gameReducer, initialState, reachPlaces } from "./reducer";
import type { GameState, JarId } from "./types";
import { ZONES } from "./zones";

const desert: GameState = { ...initialState, zone: "desert", player: { x: 50, y: 70 }, gateUnlocked: true };
const beside = (id: JarId): GameState => {
  const j = DESERT_JARS.find((p) => p.id === id)!;
  return { ...desert, player: { x: j.x + 2, y: j.y } };
};
const pickAll = (s: GameState) => DESERT_JARS.reduce((acc, j) => gameReducer({ ...acc, player: { x: j.x + 2, y: j.y } }, { type: "interact", poi: j.id }), s);

describe("the desert's lore landmarks", () => {
  it("are five places in the desert, each inspected with a card that names a coding idea", () => {
    expect(DESERT_LORE.map((l) => l.id)).toEqual(["caravan-camp", "desert-well", "temple-door", "dry-riverbed", "obelisk"]);
    for (const l of DESERT_LORE) {
      expect(ZONES.desert.places.map((p) => p.id), l.id).toContain(l.id);
      const s = gameReducer(desert, { type: "interact", poi: l.id });
      expect(s.inspected).toBe(l.id);
      expect(cardFor(s)).toMatchObject({ title: l.label, text: l.text });
      expect(l.text.length).toBeGreaterThan(60);
      expect(promptText(desert, l)).toBe(`[E] Inspect ${l.label}`);
      expect({ ...s, inspected: null }).toEqual({ ...desert, inspected: null });
    }
  });
});

describe("the nomad's water jars", () => {
  it("are three places in the desert, picked up with [E] one at a time, each log line teaching a string method", () => {
    expect(DESERT_JARS).toHaveLength(3);
    expect(JAR_TIPS).toHaveLength(3);
    let s = desert;
    DESERT_JARS.forEach((j, i) => {
      s = gameReducer({ ...s, player: { x: j.x + 2, y: j.y } }, { type: "interact", poi: j.id });
      expect(s.jars, j.id).toHaveLength(i + 1);
      expect(s.logs[s.logs.length - 1]).toBe(JAR_TIPS[i]);
    });
  });

  it("show Pick up Water Jar as their prompt and leave reach once picked up", () => {
    expect(promptText(desert, DESERT_JARS[0])).toBe("[E] Pick up Water Jar");
    const s = gameReducer(beside("jar-1"), { type: "interact", poi: "jar-1" });
    expect(reachPlaces(s).map((p) => p.id)).not.toContain("jar-1");
    expect(reachPlaces(desert).map((p) => p.id)).toContain("jar-1");
    expect(ZONES.desert.places.map((p) => p.id)).toContain("jar-1");
  });

  it("are not picked up from a distance, and only once", () => {
    const j = DESERT_JARS[0];
    const far = gameReducer({ ...desert, player: { x: j.x + INTERACT_RADIUS + 5, y: j.y } }, { type: "interact", poi: "jar-1" });
    expect(far.jars).toEqual([]);
    expect(cardFor(far)?.text).toMatch(/walk up/i);
    const once = gameReducer(beside("jar-2"), { type: "interact", poi: "jar-2" });
    const twice = gameReducer(once, { type: "interact", poi: "jar-2" });
    expect(twice.jars).toEqual(["jar-2"]);
    expect(twice.logCount).toBe(once.logCount);
    expect(cardFor(twice)?.text).toMatch(/already took/i);
  });
});

describe("the nomad's water", () => {
  it("asks for three jars after her directions, counting the ones you have", () => {
    expect(nomadSays(desert)).toMatch(/\(0 of 3\)\.$/);
    expect(nomadSays(gameReducer(beside("jar-1"), { type: "interact", poi: "jar-1" }))).toMatch(/\(1 of 3\)\.$/);
  });

  it("with all three jars, she shares the water once: HP is restored in full", () => {
    const hurt = { ...pickAll(desert), hp: 20 };
    expect(hurt.jars).toHaveLength(3);
    const served = gameReducer({ ...hurt, player: { x: 60, y: 70 } }, { type: "interact", poi: "nomad" });
    expect(served.hp).toBe(MAX_HP);
    expect(served.nomadServed).toBe(true);
    expect(served.logs[served.logs.length - 1]).toBe("The nomad shares the water. It restores your strength.");
    expect(cardFor(served)?.text).toMatch(/Thank you again/);
    expect(gameReducer({ ...served, hp: 30 }, { type: "interact", poi: "nomad" }).hp).toBe(30);
  });

  it("does not serve you with fewer than three jars", () => {
    const s = gameReducer({ ...beside("jar-1"), hp: 20 }, { type: "interact", poi: "jar-1" });
    const talked = gameReducer(s, { type: "interact", poi: "nomad" });
    expect([talked.hp, talked.nomadServed]).toEqual([20, false]);
    expect(waterLine({ jars: ["jar-1", "jar-2", "jar-3"], nomadServed: false })).toMatch(/all three/);
  });
});
