import { describe, expect, it } from "vitest";
import { HIDDEN_ARTIFACT } from "./constants";
import { cardFor } from "./cards";
import { initialState } from "./reducer";
import type { GameState } from "./types";
import { adaLine } from "./village";

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
  });

  it("y is the inspected place's", () => {
    expect(cardFor({ ...village, inspected: "chest-sql" })?.y).toBe(80);
    expect(cardFor({ ...village, inspected: "archive" })?.y).toBe(66);
    expect(cardFor({ ...village, inspected: "archive", archiveOpen: true })?.y).toBe(66);
    const found = { ...initialState, clueDecoded: true, artifactFound: true, inspected: "artifact" as const };
    expect(cardFor(found)?.y).toBe(HIDDEN_ARTIFACT.y);
  });
});
