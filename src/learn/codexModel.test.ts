import { describe, expect, it } from "vitest";
import { ARCHIVE } from "../game/constants";
import { CHESTS } from "./chests";
import { LANG_TAGS, QUESTS, filterGroups, groupChests, goToNote, nextHint, practiceQuestion } from "./codexModel";

describe("groupChests", () => {
  it("groups the 11 chests by zone in world order, with each group's earned count", () => {
    const groups = groupChests(["chest-html", "chest-sql", "chest-cs"]);
    expect(groups.map((g) => [g.zone, g.chests.map((c) => c.id), g.earned])).toEqual([
      ["peaks", ["chest-html", "chest-css"], 1],
      ["village", ["chest-php", "chest-sql", "chest-cs"], 2],
      ["forest", ["chest-js"], 0],
      ["desert", ["chest-java", "chest-py-2"], 0],
      ["beach", ["chest-cpp-1", "chest-cpp-2"], 0],
      ["foggaten", ["chest-py-1"], 0],
    ]);
    expect(groups.map((g) => g.name)).toEqual(["C++ Peaks", "Dev Village", "Dense Forest", "Sunbaked Desert", "Sunny Beach", "Foggaten Island"]);
    expect(groups.flatMap((g) => g.chests)).toHaveLength(CHESTS.length);
  });
});

describe("filterGroups", () => {
  const groups = groupChests(["chest-html", "chest-js"]);
  it("all keeps everything; earned and to-find keep only matching chests and drop empty zones", () => {
    expect(filterGroups(groups, "all", ["chest-html", "chest-js"])).toBe(groups);
    expect(filterGroups(groups, "earned", ["chest-html", "chest-js"]).flatMap((g) => g.chests.map((c) => c.id))).toEqual(["chest-html", "chest-js"]);
    const todo = filterGroups(groups, "todo", ["chest-html", "chest-js"]);
    expect(todo.flatMap((g) => g.chests.map((c) => c.id))).not.toContain("chest-html");
    expect(todo.flatMap((g) => g.chests)).toHaveLength(9);
    expect(todo.map((g) => g.zone)).not.toContain("forest");
  });
});

describe("nextHint", () => {
  it("names the nearest unearned chest in your zone and how many steps away it is", () => {
    const hint = nextHint({ badges: [], zone: "village", player: { x: 28.75, y: 34.8 } });
    expect(hint).toBe("Next closest: Hut, 3 steps away.");
  });

  it("with none left in your zone, points at the first unearned chest elsewhere", () => {
    expect(nextHint({ badges: ["chest-js"], zone: "forest", player: { x: 50, y: 50 } })).toBe("Next: Ski Lodge in C++ Peaks.");
  });

  it("when all 11 are earned, says so", () => {
    expect(nextHint({ badges: CHESTS.map((c) => c.id), zone: "peaks", player: { x: 0, y: 0 } })).toBe("All 11 badges earned. Well done, explorer!");
  });

  it("counts the Archive for the C# chest", () => {
    const rest = CHESTS.filter((c) => c.id !== "chest-cs").map((c) => c.id);
    expect(nextHint({ badges: rest, zone: "village", player: { x: ARCHIVE.x, y: ARCHIVE.y } })).toBe("Next closest: Archive, 0 steps away.");
  });
});

describe("goToNote", () => {
  it("says where the landmark is and what it takes to get there", () => {
    expect(goToNote("chest-html")).toBe("Head to the Ski Lodge in C++ Peaks.");
    expect(goToNote("chest-css")).toBe("Head to the Ice Cave in C++ Peaks, north of the wall: the gate must be open first.");
    expect(goToNote("chest-py-1")).toBe("Head to the Ruins in Foggaten Island: take the boat from the Peaks' east dock.");
    expect(goToNote("chest-java")).toBe("Head to the Pyramid in the Sunbaked Desert, west of the Dense Forest.");
    expect(goToNote("chest-cpp-1")).toBe("Head to the Pier in the Sunny Beach, east of the Dense Forest.");
    expect(goToNote("chest-cs")).toBe("Head to the Archive in Dev Village: its keypad needs the Syntax Terminal's access code.");
  });
});

describe("QUESTS", () => {
  const none = { gateUnlocked: false, questComplete: false, hasLoot: false, clueDecoded: false, artifactFound: false, towerPowered: false, lighthouseLit: false, archiveOpen: false };
  it("lists the story steps with their done flags", () => {
    const rows = QUESTS.map((q) => [q.id, q.done(none)]);
    expect(rows.every(([, done]) => done === false)).toBe(true);
    expect(QUESTS.find((q) => q.id === "artifactFound")!.done({ ...none, artifactFound: true })).toBe(true);
    expect(QUESTS.map((q) => q.label)).toEqual(expect.arrayContaining(["Golden Semicolon", "Signal tower", "Lighthouse lamp", "Archive"]));
    for (const q of QUESTS) expect(q.hint.length, q.id).toBeGreaterThan(10);
  });
});

describe("LANG_TAGS", () => {
  it("gives every chest's language a short tag and a colour", () => {
    for (const c of CHESTS) {
      expect(LANG_TAGS[c.language], c.language).toMatchObject({ tag: expect.any(String), bg: expect.stringMatching(/^#/), fg: expect.stringMatching(/^#/) });
    }
  });
});

describe("practiceQuestion", () => {
  it("cycles through the chest's whole bank starting after the one you were asked", () => {
    const chest = CHESTS.find((c) => c.id === "chest-sql")!;
    const ids = [0, 1, 2, 3, 4, 5, 6].map((n) => practiceQuestion(chest.id, 2, n).id);
    expect(ids.slice(0, 6)).toEqual([3, 4, 5, 0, 1, 2].map((i) => chest.bank[i].id));
    expect(ids[6]).toBe(ids[0]);
  });
});
