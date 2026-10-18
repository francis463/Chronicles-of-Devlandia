import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AREAS } from "./areas";
import type { ZoneId } from "../game/zones";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });

describe("one screen versus a zone's world", () => {
  it("nothing but the world module and the title backdrop uses the fixed 320 × 180 WORLD", () => {
    const users = files("src").filter((f) => /\bWORLD\b/.test(readFileSync(f, "utf8"))).map((f) => f.replace(/\\/g, "/"));
    expect(users.sort()).toEqual(["src/render/world.ts"]);
  });

  it("the zones with a north wall are one screen wide (the wall is authored for 320)", () => {
    for (const zone of Object.keys(AREAS) as ZoneId[]) if (AREAS[zone].wall) expect(AREAS[zone].world, zone).toEqual({ width: 320, height: 180 });
  });
});
