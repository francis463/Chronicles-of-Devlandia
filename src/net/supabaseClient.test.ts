import { describe, expect, it } from "vitest";
import { makeSupabaseLoader } from "./supabaseClient";

describe("makeSupabaseLoader", () => {
  it("rejects when the server isn't configured, without loading supabase-js", async () => {
    await expect(makeSupabaseLoader({ url: "", key: "" })()).rejects.toThrow("not configured");
  });

  it("memoizes: one load gives the same client promise", () => {
    const load = makeSupabaseLoader({ url: "https://x.supabase.co", key: "sb_publishable_x" });
    expect(load()).toBe(load());
  });
});
