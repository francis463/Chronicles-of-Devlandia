import { describe, expect, it } from "vitest";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

describe("team server config", () => {
  it("points at the Devlandia Supabase project by default", () => {
    expect(SUPABASE_URL).toBe("https://oifzgkvgpxxnoiyvbwvt.supabase.co");
  });

  it("only ever ships a publishable key, never a secret one", () => {
    expect(SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")).toBe(true);
    expect(SUPABASE_PUBLISHABLE_KEY).not.toMatch(/secret|service_role/i);
  });
});
