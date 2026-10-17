import { describe, expect, it } from "vitest";
import { HIDDEN_ARTIFACT } from "./constants";
import { cardFor } from "./cards";
import { initialState } from "./reducer";
import type { GameState } from "./types";
import { rangerLine } from "./forest";
import { adaLine } from "./village";
import { ISLAND_COPY, hermitLine } from "./island";

const village: GameState = { ...initialState, zone: "village" };

describe("cardFor", () => {
  it("card copy", () => {
    expect(cardFor({ ...village, inspected: "chest-sql" })?.text).toBe(
      "A sealed code chest. Answer its SQL question to earn the SQL Badge.",
    );
    expect(cardFor({ ...village, inspected: "chest-sql" })?.title).toBe("SQL Chest");
    expect(cardFor({ ...village, inspected: "chest-sql", badges: ["chest-sql"] })?.text).toBe(
      "SQL Badge earned. SELECT … FROM table picks columns from that table.",
    );
    const unsolved = cardFor({ ...village, inspected: "terminal" })!;
    expect(unsolved.text).toBe("A village terminal running a Syntax Matcher. Solve it to print the Archive's access code.");
    expect(unsolved.text).not.toContain(village.accessCode);
    expect(cardFor({ ...village, inspected: "terminal", matcherSolved: true })?.text).toBe(
      `It prints the Archive's access code: ${village.accessCode}.`,
    );
    expect(cardFor({ ...village, inspected: "archive" })?.text).toBe(
      "The Archive's door is chained shut. Its keypad wants a 4-character access code.",
    );
    expect(cardFor({ ...village, inspected: "archive", archiveOpen: true })?.text).toBe(
      "A sealed code chest. Answer its C# question to earn the C# Badge.",
    );
    expect(cardFor({ ...village, inspected: "villager" })).toMatchObject({ title: "Ada", text: adaLine(village) });
    expect(cardFor({ ...initialState, inspected: "chest", hasLoot: true })?.text).toBe(
      "Cache recovered. Repair Patch added to inventory.",
    );
    expect(cardFor(village)).toBeNull();
    const forest = { ...initialState, zone: "forest" as const };
    expect(cardFor({ ...forest, inspected: "ranger" })).toMatchObject({ title: "Ranger", text: rangerLine(forest) });
    expect(cardFor({ ...forest, inspected: "campfire" })?.text).toBe("A campfire crackles in the clearing. Someone left it burning for the next explorer.");
    expect(cardFor({ ...forest, inspected: "old-oak" })?.text).toBe("An enormous old oak. Its bark is carved with a thousand tiny semicolons.");
    const directions =
      "C++ PEAKS → North through the trees: base camp, the north gate and the frozen river. RANGER and CAMPFIRE → Northwest, in the clearing. OLD OAK → Far west. JAVASCRIPT CHEST → Far west, near the forest edge.";
    expect(cardFor({ ...forest, inspected: "forest-signpost" })?.text).toBe(directions);
    expect(cardFor({ ...forest, clueDecoded: true, inspected: "forest-signpost" })?.text).toBe(`${directions} The scroll's clue: dig in the south-east corner.`);
  });

  it("y is the inspected place's", () => {
    expect(cardFor({ ...village, inspected: "chest-sql" })?.y).toBe(80);
    expect(cardFor({ ...village, inspected: "archive" })?.y).toBe(66);
    expect(cardFor({ ...village, inspected: "archive", archiveOpen: true })?.y).toBe(66);
    const found = { ...initialState, clueDecoded: true, artifactFound: true, inspected: "artifact" as const };
    expect(cardFor(found)?.y).toBe(HIDDEN_ARTIFACT.y);
  });
});

describe("cardFor: Foggaten Island", () => {
  const island: GameState = { ...initialState, zone: "foggaten" };

  it("every place on the island has a card titled with its label", () => {
    for (const [id, title] of [["island-dock", "Dock"], ["lighthouse", "Lighthouse"], ["hermit", "Hermit"], ["island-fire", "Campfire"], ["ruins", "Ruins"]] as const) {
      const card = cardFor({ ...island, inspected: id });
      expect(card?.title, id).toBe(title);
      expect(card?.text.length, id).toBeGreaterThan(10);
    }
  });

  it("the lighthouse's card changes once the lamp is lit", () => {
    expect(cardFor({ ...island, inspected: "lighthouse" })?.text).toBe(ISLAND_COPY.lighthouse);
    expect(cardFor({ ...island, lighthouseLit: true, inspected: "lighthouse" })?.text).toBe(ISLAND_COPY.lighthouseLit);
  });

  it("the hermit's card is his current hint", () => {
    expect(cardFor({ ...island, inspected: "hermit" })?.text).toBe(hermitLine(island));
  });

  it("the Peaks' dock has a card", () => {
    expect(cardFor({ ...initialState, inspected: "dock" })?.title).toBe("Dock");
  });
});

describe("cardFor: the Snowy Peaks' camp places", () => {
  const peaks: GameState = { ...initialState, zone: "peaks" };

  it("the signpost lists the destinations and says whether the gate is open and the tower powered", () => {
    const closed = cardFor({ ...peaks, inspected: "peaks-signpost" });
    expect(closed?.title).toBe("Signpost");
    for (const word of ["Gate", "Tower", "Supply Cache", "Dock", "Dev Village", "Forest", "HTML", "CSS", "Python"]) expect(closed?.text, word).toContain(word);
    expect(closed?.text).toContain("The gate is still locked.");
    const open = cardFor({ ...peaks, gateUnlocked: true, towerPowered: true, inspected: "peaks-signpost" });
    expect(open?.text).toContain("The gate is open.");
    expect(open?.text).toContain("The tower is powered.");
    expect(open?.text).not.toContain("still locked");
  });

  it("the weather station shows the time and phase", () => {
    const at = (minutes: number) => cardFor({ ...peaks, minutes, inspected: "weather-station" })!;
    expect(at(12 * 60).title).toBe("Weather Station");
    expect(at(12 * 60).text).toContain("12:00");
    expect(at(12 * 60).text).toContain("Day");
    expect(at(19 * 60 + 29).text).toContain("19:29");
    expect(at(19 * 60 + 29).text).toContain("Dusk");
    expect(at(23 * 60).text).toContain("Night");
    expect(new Set([12 * 60, 19 * 60 + 29, 23 * 60].map((m) => at(m).text)).size).toBe(3);
  });

  it("the snow cave has a story card", () => {
    const card = cardFor({ ...peaks, towerPowered: true, inspected: "snow-cave" });
    expect(card?.title).toBe("Snow Cave");
    expect(card?.text.length).toBeGreaterThan(40);
  });
});

describe("the Sunbaked Desert's cards", () => {
  const desert = { ...initialState, zone: "desert" as const };
  it("every desert place has a card with its label as the title", () => {
    for (const [id, title] of [["nomad", "Nomad"], ["oasis", "Oasis"], ["desert-pyramid", "Pyramid"], ["desert-signpost", "Signpost"]] as const) {
      const card = cardFor({ ...desert, inspected: id });
      expect(card?.title, id).toBe(title);
      expect(card?.text.length, id).toBeGreaterThan(20);
    }
  });
  it("the signpost points back to the Dense Forest and the nomad's hint never changes", () => {
    expect(cardFor({ ...desert, inspected: "desert-signpost" })?.text).toContain("Dense Forest");
    const a = cardFor({ ...desert, inspected: "nomad" })?.text;
    expect(cardFor({ ...desert, inspected: "nomad", gateUnlocked: true, hasLoot: true })?.text).toBe(a);
  });
});
