import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const SELF = "src/noSecrets.test.ts";
const INDEX = "supabase/functions/account/index.ts";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const repoFiles = [...files(join(ROOT, "src")), ...files(join(ROOT, "supabase")), join(ROOT, ".env.example")]
  .map((path) => ({ rel: relative(ROOT, path).split("\\").join("/"), path }))
  .filter((f) => f.rel !== SELF && !/\.(gif|png|jpg|ico)$/.test(f.rel));

describe("no secret is committed (Review Focus 3)", () => {
  it("has no secret key or JWT anywhere in the source, the Supabase folder or .env.example", () => {
    const leaks = repoFiles.filter((f) => /sb_secret_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/.test(readFileSync(f.path, "utf8")));
    expect(leaks.map((f) => f.rel)).toEqual([]);
  });

  it("names the service-role key only where the Edge Function reads it from its environment", () => {
    const mentions = repoFiles.filter((f) => readFileSync(f.path, "utf8").includes("SERVICE_ROLE_KEY"));
    expect(mentions.map((f) => f.rel)).toEqual([INDEX]);
    const uses = readFileSync(join(ROOT, INDEX), "utf8").match(/.*SERVICE_ROLE_KEY.*/g);
    expect(uses).toEqual(['const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;']);
  });

  it("sees the files it is meant to scan", () => {
    expect(repoFiles.map((f) => f.rel)).toEqual(expect.arrayContaining([INDEX, "src/net/config.ts", ".env.example"]));
  });
});

describe("function deployment settings", () => {
  it("the account function skips the JWT check, because signed-out players send only the publishable key", () => {
    const toml = readFileSync("supabase/config.toml", "utf8");
    expect(toml).toMatch(/\[functions\.account\]\s*\n\s*verify_jwt\s*=\s*false/);
  });
});
