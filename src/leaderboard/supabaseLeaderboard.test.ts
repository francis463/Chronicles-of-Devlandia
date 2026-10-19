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

  describe("photos", () => {
    const NEW = "11111111-1111-4111-8111-111111111111";
    const OLD = "22222222-2222-4222-8222-222222222222";
    const photo = new Blob(["x"], { type: "image/jpeg" });

    it("setAvatar gets a new key, uploads the file under it, then removes the old file", async () => {
      const { fake, load } = createFakeSupabase();
      fake.rpcReplies.avatar_start = { data: [{ new_key: NEW, old_key: OLD }], error: null };
      await createSupabaseLeaderboard(load, "u1").setAvatar(photo);
      expect(fake.calls.map((c) => c.name)).toEqual(["rpc", "storage(avatars).upload", "storage(avatars).remove"]);
      expect(fake.calls[1].args).toEqual([`${NEW}.jpg`, photo, { contentType: "image/jpeg" }]);
      expect(fake.calls[2].args).toEqual([[`${OLD}.jpg`]]);
    });

    it("setAvatar with no old photo removes nothing", async () => {
      const { fake, load } = createFakeSupabase();
      fake.rpcReplies.avatar_start = { data: [{ new_key: NEW, old_key: null }], error: null };
      await createSupabaseLeaderboard(load, "u1").setAvatar(photo);
      expect(fake.calls.map((c) => c.name)).toEqual(["rpc", "storage(avatars).upload"]);
    });

    it("a failed upload clears the half-made photo and rejects", async () => {
      const { fake, load } = createFakeSupabase();
      fake.rpcReplies.avatar_start = { data: [{ new_key: NEW, old_key: OLD }], error: null };
      fake.uploadReply = { error: { message: "too big" } };
      await expect(createSupabaseLeaderboard(load, "u1").setAvatar(photo)).rejects.toThrow();
      expect(fake.calls.map((c) => c.args[0])).toContain("avatar_clear");
    });

    it("setAvatar rejects when the server will not start one, and a bad reply is not trusted", async () => {
      const { fake, load } = createFakeSupabase();
      fake.rpcReplies.avatar_start = { data: null, error: { message: "no" } };
      await expect(createSupabaseLeaderboard(load, "u1").setAvatar(photo)).rejects.toThrow();
      fake.rpcReplies.avatar_start = { data: [{ new_key: "../x", old_key: null }], error: null };
      await expect(createSupabaseLeaderboard(load, "u1").setAvatar(photo)).rejects.toThrow();
    });

    it("removeAvatar clears the row and removes the file", async () => {
      const { fake, load } = createFakeSupabase();
      fake.rpcReplies.avatar_clear = { data: [{ old_key: OLD }], error: null };
      await createSupabaseLeaderboard(load, "u1").removeAvatar();
      expect(fake.calls[0]).toEqual({ name: "rpc", args: ["avatar_clear"] });
      expect(fake.calls[1].args).toEqual([[`${OLD}.jpg`]]);
    });

    it("guests can do neither, and the server is not asked", async () => {
      const { fake, load } = createFakeSupabase();
      const store = createSupabaseLeaderboard(load, null);
      await store.setAvatar(photo);
      await store.removeAvatar();
      expect(fake.calls).toEqual([]);
    });
  });
});
