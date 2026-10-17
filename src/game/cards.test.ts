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
