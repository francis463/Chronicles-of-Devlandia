import { describe, expect, it } from "vitest";
import { accessCode, CODE_BLOCKLIST } from "./access";

describe("accessCode", () => {
  it("accessCode is 4 alphabet characters, deterministic, never blocklisted", () => {
    expect(accessCode(42)).toBe(accessCode(42));
    expect(accessCode(42)).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    for (let n = 0; n < 20000; n++) expect(CODE_BLOCKLIST).not.toContain(accessCode(n));
  });
});
