import { beforeEach, describe, expect, it } from "vitest";
import { clearGame, loadGame, saveGame, type SavedGame } from "./resume";
import { DEFAULT_CLASS } from "./classes";
import { CHEST_IDS } from "../learn/chests";
import { initialState } from "./reducer";

const game = (over: Partial<SavedGame["state"]> = {}): SavedGame => ({ state: { ...initialState, ...over }, playerClass: DEFAULT_CLASS, hard: false });

describe("saved game", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a game for its player", () => {
    saveGame("u1", game({ zone: "forest", hp: 3, badges: [CHEST_IDS[0]] }));
    const back = loadGame("u1");
    expect(back?.state.zone).toBe("forest");
    expect(back?.state.hp).toBe(3);
    expect(back?.state.badges).toEqual([CHEST_IDS[0]]);
  });

  it("is only for the player who saved it, guests included", () => {
    saveGame("u1", game());
    expect(loadGame("u2")).toBeNull();
    expect(loadGame(null)).toBeNull();
    saveGame(null, game());
    expect(loadGame(null)).not.toBeNull();
    expect(loadGame("u1")).toBeNull();
  });

  it("comes back with every window shut", () => {
    saveGame(null, game({ codexOpen: true, finaleOpen: true, logicOpen: true, lampOpen: true, inspected: "campfire" as never }));
    const s = loadGame(null)!.state;
    expect([s.codexOpen, s.finaleOpen, s.logicOpen, s.lampOpen, s.inspected, s.challenge]).toEqual([false, false, false, false, null, null]);
  });

  it("reads nothing from missing, broken, wrong-version or doctored saves", () => {
    expect(loadGame(null)).toBeNull();
    localStorage.setItem("devlandia.savedGame", "{nope");
    expect(loadGame(null)).toBeNull();
    localStorage.setItem("devlandia.savedGame", JSON.stringify({ v: 0, owner: "guest", game: game() }));
    expect(loadGame(null)).toBeNull();
    saveGame(null, game());
    const raw = JSON.parse(localStorage.getItem("devlandia.savedGame")!);
    raw.game.state.zone = "mars";
    localStorage.setItem("devlandia.savedGame", JSON.stringify(raw));
    expect(loadGame(null)).toBeNull();
    raw.game.state.zone = "peaks";
    raw.game.state.hp = "lots";
    localStorage.setItem("devlandia.savedGame", JSON.stringify(raw));
    expect(loadGame(null)).toBeNull();
  });

  it("clearGame removes it", () => {
    saveGame(null, game());
    clearGame();
    expect(loadGame(null)).toBeNull();
  });
});
