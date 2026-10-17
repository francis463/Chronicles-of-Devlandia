import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "../auth/fakeSupabase";
import { createSupabaseProgress } from "./supabaseProgress";

describe("createSupabaseProgress", () => {
  it("loads the user's saved badges", async () => {
    const { fake, load } = createFakeSupabase();
    fake.tableReplies.badges = { data: [{ chest: "chest-sql", question_id: "sql-from", answer: "FROM" }], error: null };
    expect(await createSupabaseProgress(load, "u1").load()).toEqual([{ chest: "chest-sql", questionId: "sql-from", answer: "FROM" }]);
    expect(fake.calls[0]).toEqual({ name: "from(badges).select", args: ["chest, question_id, answer", "user_id", "u1"] });
  });

  it("rejects when loading fails", async () => {
    const { fake, load } = createFakeSupabase();
    fake.tableReplies.badges = { data: null, error: { message: "boom" } };
    await expect(createSupabaseProgress(load, "u1").load()).rejects.toThrow();
  });

  it("inserts a badge and treats a duplicate as saved", async () => {
    const { fake, load } = createFakeSupabase();
    const store = createSupabaseProgress(load, "u1");
    await store.save({ chest: "chest-sql", questionId: "sql-from", answer: "FROM" });
    expect(fake.calls[0]).toEqual({ name: "from(badges).insert", args: [{ user_id: "u1", chest: "chest-sql", question_id: "sql-from", answer: "FROM" }] });
    fake.insertReplies.badges = { data: null, error: { code: "23505" } };
    await expect(store.save({ chest: "chest-sql", questionId: "sql-from", answer: "FROM" })).resolves.toBeUndefined();
    fake.insertReplies.badges = { data: null, error: { code: "42501", message: "denied" } };
    await expect(store.save({ chest: "chest-css", questionId: "c", answer: "d" })).rejects.toThrow();
  });
});
