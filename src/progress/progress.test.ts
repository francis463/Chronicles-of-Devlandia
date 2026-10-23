import { describe, expect, it } from "vitest";
import { CHEST_IDS, CHESTS, type Picks } from "../learn/chests";
import { createMemoryProgress, seedFromSaved } from "./progress";

const zeroPicks = Object.fromEntries(CHEST_IDS.map((id) => [id, 0])) as Picks;
const sql = CHESTS.find((c) => c.id === "chest-sql")!;

describe("seedFromSaved", () => {
  it("restores the badge, the answer and the very question that was answered (Review Focus 5)", () => {
    const seeded = seedFromSaved([{ chest: "chest-sql", questionId: sql.bank[3].id, answer: "FROM" }], zeroPicks);
    expect(seeded.badges).toEqual(["chest-sql"]);
    expect(seeded.answered).toEqual({ "chest-sql": "FROM" });
    expect(seeded.picks["chest-sql"]).toBe(3);
    for (const id of CHEST_IDS.filter((c) => c !== "chest-sql")) expect(seeded.picks[id], id).toBe(0);
  });

  it("keeps the badge and answer when the saved question is no longer in the bank, and leaves the pick alone", () => {
    const seeded = seedFromSaved([{ chest: "chest-sql", questionId: "sql-retired", answer: "X" }], { ...zeroPicks, "chest-sql": 2 });
    expect(seeded.badges).toEqual(["chest-sql"]);
    expect(seeded.picks["chest-sql"]).toBe(2);
  });

  it("keeps the first of duplicate rows, drops unknown chests, and orders badges as the chest table does", () => {
    const seeded = seedFromSaved(
      [
        { chest: "chest-sql", questionId: sql.bank[1].id, answer: "first" },
        { chest: "chest-html", questionId: CHESTS.find((c) => c.id === "chest-html")!.bank[0].id, answer: "h" },
        { chest: "chest-sql", questionId: sql.bank[2].id, answer: "second" },
        { chest: "chest-rust" as never, questionId: "r", answer: "r" },
      ],
      zeroPicks,
    );
    expect(seeded.badges).toEqual(["chest-html", "chest-sql"]);
    expect(seeded.answered["chest-sql"]).toBe("first");
    expect(seeded.picks["chest-sql"]).toBe(1);
  });

  it("returns an untouched copy for no saved rows", () => {
    const seeded = seedFromSaved([], zeroPicks);
    expect(seeded).toEqual({ badges: [], answered: {}, picks: zeroPicks });
    expect(seeded.picks).not.toBe(zeroPicks);
  });
});

describe("createMemoryProgress", () => {
  it("loads what it holds and ignores a chest that is already saved", async () => {
    const store = createMemoryProgress([{ chest: "chest-sql", questionId: "q", answer: "a" }]);
    await store.save({ chest: "chest-sql", questionId: "other", answer: "b" });
    await store.save({ chest: "chest-css", questionId: "c", answer: "d" });
    expect(await store.load()).toEqual([
      { chest: "chest-sql", questionId: "q", answer: "a" },
      { chest: "chest-css", questionId: "c", answer: "d" },
    ]);
  });

  it("fails the next `failNext` saves", async () => {
    const store = createMemoryProgress();
    store.failNext = 1;
    await expect(store.save({ chest: "chest-sql", questionId: "q", answer: "a" })).rejects.toThrow();
    await expect(store.save({ chest: "chest-sql", questionId: "q", answer: "a" })).resolves.toBeUndefined();
  });
});
