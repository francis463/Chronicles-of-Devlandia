import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "../auth/fakeSupabase";
import { createSupabaseLeaderboard } from "./supabaseLeaderboard";

describe("createSupabaseLeaderboard", () => {
  it("top() asks for 20 rows and returns them parsed", async () => {
    const { fake, load } = createFakeSupabase();
    fake.rpcReplies.leaderboard_top = { data: [{ rank: 1, name: "Alice", badges: 3 }, { rank: 2, name: 5, badges: 3 }], error: null };
    expect(await createSupabaseLeaderboard(load, null).top()).toEqual([{ rank: 1, name: "Alice", badges: 3 }]);
    expect(fake.calls[0]).toEqual({ name: "rpc", args: ["leaderboard_top", { max_rows: 20 }] });
  });

  it("top() rejects when the call fails", async () => {
    const { fake, load } = createFakeSupabase();
    fake.rpcReplies.leaderboard_top = { data: null, error: { message: "boom" } };
    await expect(createSupabaseLeaderboard(load, "u1").top()).rejects.toThrow();
  });

  it("me() is null without a user and without asking the server", async () => {
    const { fake, load } = createFakeSupabase();
    expect(await createSupabaseLeaderboard(load, null).me()).toBeNull();
    expect(fake.calls).toEqual([]);
  });

  it("me() returns the caller's standing", async () => {
    const { fake, load } = createFakeSupabase();
    fake.rpcReplies.leaderboard_me = { data: [{ rank: 4, badges: 2, hidden: true }], error: null };
    expect(await createSupabaseLeaderboard(load, "u1").me()).toEqual({ rank: 4, badges: 2, hidden: true });
    expect(fake.calls[0]).toEqual({ name: "rpc", args: ["leaderboard_me"] });
  });

  it("me() rejects when the call fails", async () => {
    const { fake, load } = createFakeSupabase();
    fake.rpcReplies.leaderboard_me = { data: null, error: { message: "boom" } };
    await expect(createSupabaseLeaderboard(load, "u1").me()).rejects.toThrow();
  });

  it("setHidden(true) inserts the player's row and treats a duplicate as done", async () => {
    const { fake, load } = createFakeSupabase();
    const store = createSupabaseLeaderboard(load, "u1");
    await store.setHidden(true);
    expect(fake.calls[0]).toEqual({ name: "from(leaderboard_hidden).insert", args: [{ user_id: "u1" }] });
    fake.insertReplies.leaderboard_hidden = { data: null, error: { code: "23505" } };
    await expect(store.setHidden(true)).resolves.toBeUndefined();
    fake.insertReplies.leaderboard_hidden = { data: null, error: { code: "42501", message: "no" } };
    await expect(store.setHidden(true)).rejects.toThrow();
  });

  it("setHidden(false) deletes the player's row, and rejects on an error", async () => {
    const { fake, load } = createFakeSupabase();
    const store = createSupabaseLeaderboard(load, "u1");
    await store.setHidden(false);
    expect(fake.calls[0]).toEqual({ name: "from(leaderboard_hidden).delete.eq", args: ["user_id", "u1"] });
    fake.deleteReplies.leaderboard_hidden = { data: null, error: { message: "boom" } };
    await expect(store.setHidden(false)).rejects.toThrow();
  });

  it("setHidden does nothing without a user", async () => {
    const { fake, load } = createFakeSupabase();
    const store = createSupabaseLeaderboard(load, null);
    await store.setHidden(true);
    await store.setHidden(false);
    expect(fake.calls).toEqual([]);
  });
});
