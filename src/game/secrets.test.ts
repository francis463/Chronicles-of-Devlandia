import { describe, expect, it } from "vitest";
import { gameReducer, initialState, visiblePois } from "./reducer";
import { cardFor } from "./cards";
import { promptText } from "./geometry";
import { loadGame } from "./resume";
import { SECRETS, isSecret, secretsIn } from "./secrets";
import { ZONES, type ZoneId } from "./zones";

const beside = (id: string, hp = 5, zone?: ZoneId) => {
  const secret = SECRETS.find((s) => s.id === id)!;
  return { ...initialState, zone: zone ?? secret.zone, hp, player: { x: secret.x, y: secret.y } };
};
const interact = (s: ReturnType<typeof beside>, poi: string) => gameReducer(s, { type: "interact", poi: poi as never });

describe("the hidden spots", () => {
  it("are six, two in each of the forest, desert and beach, in that order", () => {
    expect(SECRETS.map((s) => [s.id, s.zone])).toEqual([
      ["secret-moss", "forest"],
      ["secret-den", "forest"],
      ["secret-cave", "desert"],
      ["secret-ridge", "desert"],
      ["secret-pool", "beach"],
      ["secret-bottle", "beach"],
    ]);
    expect(SECRETS.map((s) => [s.x, s.y])).toEqual([[14, 14], [88, 88], [10, 86], [84, 18], [14, 88], [86, 16]]);
    expect(isSecret("secret-moss")).toBe(true);
    expect(isSecret("remedy-herb")).toBe(false);
    expect(secretsIn("desert").map((s) => s.id)).toEqual(["secret-cave", "secret-ridge"]);
  });

  it("each is a place of its zone, with a card that is short", () => {
    for (const s of SECRETS) {
      expect(ZONES[s.zone].places.some((p) => p.id === s.id), s.id).toBe(true);
      expect(s.text.length, s.id).toBeGreaterThan(40);
      expect(s.text.length, s.id).toBeLessThan(260);
    }
  });

  it("finding one records it once, logs it with the card's first sentence and never heals", () => {
    const moss = SECRETS[0];
    const s = interact(beside("secret-moss", 3), "secret-moss");
    expect(s.secrets).toEqual(["secret-moss"]);
    expect(s.hp).toBe(3);
    expect(s.logs.at(-1)).toBe(`Found ${moss.label}. ${moss.text.split(/(?<=\.)\s/)[0]}`);
    const again = interact({ ...s, hp: 2 }, "secret-moss");
    expect(again.secrets).toEqual(["secret-moss"]);
    expect(again.hp).toBe(2);
    expect(again.logs).toEqual(s.logs);
  });

  it("a find at full health records it and never heals, then or later", () => {
    const s = interact(beside("secret-moss", 5), "secret-moss");
    expect(s.secrets).toEqual(["secret-moss"]);
    expect(s.hp).toBe(5);
    expect(interact({ ...s, hp: 1 }, "secret-moss").hp).toBe(1);
  });

  it("the second spot of an area gives the card too", () => {
    const s = interact(beside("secret-den", 2), "secret-den");
    expect(s.secrets).toEqual(["secret-den"]);
    expect(s.hp).toBe(2);
  });

  it("from far away the button only shows the card", () => {
    const s = interact({ ...beside("secret-cave", 2), player: { x: 60, y: 30 } }, "secret-cave");
    expect(s.secrets).toEqual([]);
    expect(s.inspected).toBe("secret-cave");
    expect(s.hp).toBe(2);
    expect(s.logs).toEqual(initialState.logs);
  });

  it("a found spot stays on the map and its card says so", () => {
    const s = interact(beside("secret-pool", 5), "secret-pool");
    expect(visiblePois(s).map((p) => p.id)).toContain("secret-pool");
    expect(cardFor({ ...s, inspected: "secret-pool" })?.text).toMatch(/already found/i);
    expect(cardFor({ ...initialState, zone: "beach", inspected: "secret-pool" })?.text).not.toMatch(/already found/i);
  });

  it("its prompt is Search the spot, then Inspect it once found", () => {
    const poi = ZONES.forest.places.find((p) => p.id === "secret-den")!;
    expect(promptText(initialState, poi)).toBe("[E] Search Fox Den");
    expect(promptText({ ...initialState, secrets: ["secret-den"] }, poi)).toBe("[E] Inspect Fox Den");
  });

  it("an older save without the list reads it as empty", () => {
    expect(initialState.secrets).toEqual([]);
    const { secrets: _gone, ...old } = initialState;
    localStorage.setItem("devlandia.savedGame", JSON.stringify({ v: 2, owner: "guest", game: { playerClass: "warrior", hard: false, state: old } }));
    expect(loadGame(null)?.state.secrets).toEqual([]);
  });
});
