import { describe, expect, it } from "vitest";
import { cardFor } from "./cards";
import { INTERACT_RADIUS } from "./constants";
import { rangerSays } from "./forest";
import { FOREST_LORE, FOREST_MUSHROOMS, MUSHROOM_TIPS, stewLine } from "./forestLore";
import { promptText } from "./geometry";
import { gameReducer, initialState, reachPlaces } from "./reducer";
import type { GameState, MushroomId } from "./types";
import { ZONES } from "./zones";

const forest: GameState = { ...initialState, zone: "forest", player: { x: 50, y: 70 }, gateUnlocked: true };
const beside = (id: MushroomId): GameState => {
  const m = FOREST_MUSHROOMS.find((p) => p.id === id)!;
  return { ...forest, player: { x: m.x + 2, y: m.y } };
};
const pickAll = (s: GameState) => FOREST_MUSHROOMS.reduce((acc, m) => gameReducer({ ...acc, player: { x: m.x + 2, y: m.y } }, { type: "interact", poi: m.id }), s);

describe("the forest's lore landmarks", () => {
  it("are four places in the forest (the fifth, the hollow tree, hides the Supply Cache), each inspected with a card that names a coding idea", () => {
    expect(FOREST_LORE.map((l) => l.id)).toEqual(["hunter-cabin", "forest-well", "forest-brook", "fairy-ring"]);
    for (const l of FOREST_LORE) {
      expect(ZONES.forest.places.map((p) => p.id), l.id).toContain(l.id);
      const s = gameReducer(forest, { type: "interact", poi: l.id });
      expect(s.inspected).toBe(l.id);
      expect(cardFor(s)).toMatchObject({ title: l.label, text: l.text });
      expect(l.text.length).toBeGreaterThan(60);
      expect(promptText(forest, l)).toBe(`[E] Inspect ${l.label}`);
    }
  });

  it("log nothing and change nothing but what is inspected", () => {
    for (const l of FOREST_LORE) {
      const s = gameReducer(forest, { type: "interact", poi: l.id });
      expect({ ...s, inspected: null }).toEqual({ ...forest, inspected: null });
    }
  });
});

describe("the ranger's glow mushrooms", () => {
  it("are three places in the forest, picked with [E] one at a time, each log line teaching one fact about arrays", () => {
    expect(FOREST_MUSHROOMS).toHaveLength(3);
    expect(MUSHROOM_TIPS).toHaveLength(3);
    let s = forest;
    FOREST_MUSHROOMS.forEach((m, i) => {
      s = gameReducer({ ...s, player: { x: m.x + 2, y: m.y } }, { type: "interact", poi: m.id });
      expect(s.mushrooms, m.id).toHaveLength(i + 1);
      expect(s.logs[s.logs.length - 1]).toBe(MUSHROOM_TIPS[i]);
    });
  });

  it("show Pick Glow Mushroom as their prompt, and leave reach once picked", () => {
    const m = FOREST_MUSHROOMS[0];
    expect(promptText(forest, m)).toBe("[E] Pick Glow Mushroom");
    const s = gameReducer(beside("mushroom-1"), { type: "interact", poi: "mushroom-1" });
    expect(reachPlaces(s).map((p) => p.id)).not.toContain("mushroom-1");
    expect(reachPlaces(forest).map((p) => p.id)).toContain("mushroom-1");
    expect(ZONES.forest.places.map((p) => p.id)).toContain("mushroom-1");
  });

  it("are not picked from a distance: the map's button only shows its card", () => {
    const m = FOREST_MUSHROOMS[0];
    const far = { ...forest, player: { x: m.x + INTERACT_RADIUS + 5, y: m.y } };
    const s = gameReducer(far, { type: "interact", poi: "mushroom-1" });
    expect(s.mushrooms).toEqual([]);
    expect(s.inspected).toBe("mushroom-1");
    expect(cardFor(s)?.text).toMatch(/walk up/i);
  });

  it("are picked once: interacting again changes nothing", () => {
    const once = gameReducer(beside("mushroom-2"), { type: "interact", poi: "mushroom-2" });
    const twice = gameReducer(once, { type: "interact", poi: "mushroom-2" });
    expect(twice.mushrooms).toEqual(["mushroom-2"]);
    expect(twice.logCount).toBe(once.logCount);
    expect(cardFor(twice)?.text).toMatch(/already picked/i);
  });
});

describe("the ranger's stew", () => {
  it("asks for three mushrooms after her hint, counting the ones you have", () => {
    expect(rangerSays(forest)).toMatch(/\(0 of 3\)\.$/);
    expect(rangerSays(gameReducer(beside("mushroom-1"), { type: "interact", poi: "mushroom-1" }))).toMatch(/\(1 of 3\)\.$/);
  });

  it("with all three in hand, she cooks them once: you get a piece of food and she thanks you", () => {
    const hurt = { ...pickAll({ ...forest, hp: 20 }), hp: 20 };
    expect(hurt.mushrooms).toHaveLength(3);
    const fed = gameReducer({ ...hurt, player: { x: 58, y: 62 } }, { type: "interact", poi: "ranger" });
    expect([fed.hp, fed.food]).toEqual([20, 1]);
    expect(fed.rangerFed).toBe(true);
    expect(fed.logs[fed.logs.length - 1]).toBe("The ranger packs you a bowl of stew. Eat it from your inventory when you are hurt.");
    expect(cardFor(fed)?.text).toMatch(/Thanks again for the mushrooms/);
    const hurtAgain = gameReducer({ ...fed, hp: 30 }, { type: "interact", poi: "ranger" });
    expect([hurtAgain.hp, hurtAgain.food]).toEqual([30, 1]);
  });

  it("does not feed you with fewer than three mushrooms", () => {
    const s = gameReducer({ ...beside("mushroom-1"), hp: 20 }, { type: "interact", poi: "mushroom-1" });
    const talked = gameReducer(s, { type: "interact", poi: "ranger" });
    expect(talked.hp).toBe(20);
    expect(talked.rangerFed).toBe(false);
  });

  it("stewLine thanks you either side of the stew", () => {
    expect(stewLine({ mushrooms: ["mushroom-1", "mushroom-2", "mushroom-3"], rangerFed: false })).toMatch(/all three/);
    expect(stewLine({ mushrooms: [], rangerFed: true })).toMatch(/Thanks again/);
  });
});
