import { describe, expect, it } from "vitest";
import { ADA, CAMPFIRE, FOREST_SIGNPOST, HIDDEN_ARTIFACT, OLD_OAK, POIS, RANGER, SIGNPOST } from "./constants";
import { clampPlayer, distance, interactLabel, isInRiver, nearestPoi, placeInReach, poiInRange, promptText } from "./geometry";
import { initialState } from "./reducer";
import type { GameState } from "./types";
import { ZONES } from "./zones";

describe("geometry", () => {
  it("measures Euclidean distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("clamps the player inside the map bounds", () => {
    expect(clampPlayer({ x: 2, y: 95 })).toEqual({ x: 6, y: 90 });
    expect(clampPlayer({ x: 99, y: 3 })).toEqual({ x: 94, y: 10 });
  });

  it("finds the nearest point of interest", () => {
    const nearest = nearestPoi({ x: 50, y: 52 });
    expect(nearest.poi.id).toBe("gate");
    expect(nearest.distance).toBe(2);
  });

  it("treats the river zone bounds as inclusive", () => {
    expect(isInRiver({ x: 24, y: 28 })).toBe(true);
    expect(isInRiver({ x: 76, y: 39 })).toBe(true);
    expect(isInRiver({ x: 23.9, y: 30 })).toBe(false);
    expect(isInRiver({ x: 50, y: 39.1 })).toBe(false);
  });

  it("finds the signal tower in the snowy top-left", () => {
    expect(poiInRange({ x: 14, y: 26 })?.id).toBe("tower");
  });

  it("also considers extra points of interest passed in, such as a revealed dig spot", () => {
    const spot = { id: "artifact" as const, label: "Golden Semicolon", x: 72, y: 84 };
    expect(poiInRange({ x: 72, y: 80 })).toBeNull();
    expect(poiInRange({ x: 72, y: 80 }, [spot])?.id).toBe("artifact");
  });

  it("returns the nearest point of interest only when within interact range", () => {
    expect(poiInRange({ x: 50, y: 58 })?.id).toBe("gate");
    expect(poiInRange({ x: 50, y: 63 })?.id).toBe("gate");
    expect(poiInRange({ x: 50, y: 63.1 })).toBeNull();
    expect(poiInRange({ x: 28, y: 72 })).toBeNull();
  });

  it("placeInReach finds the nearest place within reach, or nothing (also for no places)", () => {
    expect(placeInReach({ x: 34, y: 72 }, [ADA, SIGNPOST])?.id).toBe("villager");
    expect(placeInReach({ x: 90, y: 66 }, [ADA, SIGNPOST])?.id).toBe("signpost");
    expect(placeInReach({ x: 60, y: 80 }, [ADA, SIGNPOST])).toBeNull();
    expect(placeInReach({ x: 34, y: 72 }, [])).toBeNull();
  });

  it("interactLabel and promptText name what [E] does", () => {
    const gate = POIS.find((p) => p.id === "gate")!;
    const s = initialState;
    expect([interactLabel(s, ADA), promptText(s, ADA)]).toEqual(["Talk to Ada", "[E] Talk to Ada"]);
    expect([interactLabel(s, SIGNPOST), promptText(s, SIGNPOST)]).toEqual(["Read Signpost", "[E] Read Signpost"]);
    expect([interactLabel(s, RANGER), promptText(s, RANGER)]).toEqual(["Talk to Ranger", "[E] Talk to Ranger"]);
    expect(promptText(s, CAMPFIRE)).toBe("[E] Inspect Campfire");
    expect(promptText(s, OLD_OAK)).toBe("[E] Inspect Old Oak");
    expect([interactLabel(s, FOREST_SIGNPOST), promptText(s, FOREST_SIGNPOST)]).toEqual(["Read Signpost", "[E] Read Signpost"]);
    expect([interactLabel(s, gate), promptText(s, gate)]).toEqual(["Terminal Gate", "[E] Inspect Terminal Gate"]);
    expect([interactLabel(s, HIDDEN_ARTIFACT), promptText(s, HIDDEN_ARTIFACT)]).toEqual(["Dig here", "[E] Dig here"]);
  });

  it("labels follow state", () => {
    const village: GameState = { ...initialState, zone: "village" };
    const place = (id: string) => ZONES.village.places.find((p) => p.id === id)!;
    expect(promptText(village, place("chest-sql"))).toBe("[E] Open SQL Chest");
    expect(interactLabel(village, place("chest-sql"))).toBe("Open SQL Chest");
    expect(promptText({ ...village, badges: ["chest-sql"] }, place("chest-sql"))).toBe("[E] Review SQL Chest");
    expect(promptText(village, place("terminal"))).toBe("[E] Use Syntax Terminal");
    expect(promptText(village, place("archive"))).toBe("[E] Unseal Archive");
    expect(promptText({ ...village, archiveOpen: true }, place("archive"))).toBe("[E] Open C# Chest");
    expect(promptText({ ...village, archiveOpen: true, badges: ["chest-cs"] }, place("archive"))).toBe("[E] Review C# Chest");
    const gate = POIS.find((p) => p.id === "gate")!;
    expect([promptText(initialState, gate), interactLabel(initialState, gate)]).toEqual(["[E] Inspect Terminal Gate", "Terminal Gate"]);
  });
});
