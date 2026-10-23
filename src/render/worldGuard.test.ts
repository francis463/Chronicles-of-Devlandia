import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AREAS } from "./areas";
import { wallRect } from "./terrain";
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

  it("in every zone with a north wall, the wall's rows contain its game line (49 %)", () => {
    for (const zone of Object.keys(AREAS) as ZoneId[]) {
      if (!AREAS[zone].wall) continue;
      const { world } = AREAS[zone];
      const rows = wallRect(AREAS[zone]);
      expect(rows.y / world.height, zone).toBeLessThan(0.49);
      expect((rows.y + rows.h) / world.height, zone).toBeGreaterThan(0.49);
      expect(rows.w, zone).toBe(world.width);
    }
  });
});
