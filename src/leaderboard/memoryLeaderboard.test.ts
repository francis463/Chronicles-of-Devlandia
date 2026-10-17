import { describe, expect, it } from "vitest";
import { createMemoryLeaderboard } from "./memoryLeaderboard";

describe("createMemoryLeaderboard", () => {
  it("returns its rows and standing", async () => {
    const store = createMemoryLeaderboard({ rows: [{ rank: 1, name: "Alice", badges: 3 }], me: { rank: 1, badges: 3, hidden: false } });
    expect(await store.top()).toEqual([{ rank: 1, name: "Alice", badges: 3 }]);
    expect(await store.me()).toEqual({ rank: 1, badges: 3, hidden: false });
  });

  it("starts empty", async () => {
    const store = createMemoryLeaderboard();
    expect(await store.top()).toEqual([]);
    expect(await store.me()).toBeNull();
  });

  it("failNext rejects that many calls and then recovers", async () => {
    const store = createMemoryLeaderboard({ rows: [{ rank: 1, name: "Alice", badges: 1 }] });
    store.failNext = 2;
    await expect(store.top()).rejects.toThrow();
    await expect(store.me()).rejects.toThrow();
    expect(await store.top()).toHaveLength(1);
  });

  it("setHidden records the flag and the call", async () => {
    const store = createMemoryLeaderboard({ me: { rank: 2, badges: 1, hidden: false } });
    await store.setHidden(true);
    expect(store.meState?.hidden).toBe(true);
    expect(store.calls).toEqual(["setHidden:true"]);
    store.failNext = 1;
    await expect(store.setHidden(false)).rejects.toThrow();
    expect(store.meState?.hidden).toBe(true);
  });
});
