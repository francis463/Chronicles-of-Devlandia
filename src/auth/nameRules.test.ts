import { describe, expect, it } from "vitest";
import * as server from "../../supabase/functions/account/rules";
import * as client from "./nameRules";

/** Names that are valid or invalid in both copies of the rules (the rude check is client-only). */
const VALID = ["Kai", "a_b-9", "abcdefghijkl", "A1b"];
const INVALID = ["ab", "abcdefghijklm", "has space", "émile", "x!", "", " Kai "];
const PASSWORDS: Array<[string, string | null]> = [
  ["1234567", "weak-password"],
  ["12345678", null],
  ["", "weak-password"],
];

describe.each([
  ["client", client],
  ["server", server],
])("%s rules", (_label, rules) => {
  it.each(VALID)("accepts the name %j", (name) => expect(rules.validateName(name)).toBeNull());
  it.each(INVALID)("rejects the name %j", (name) => expect(rules.validateName(name)).toBe("invalid-name"));
  it.each(PASSWORDS)("password %j → %j", (password, expected) => expect(rules.validatePassword(password)).toBe(expected));
  it("keys names ignoring case and edge spaces", () => expect(rules.accountKey("  KaI ")).toBe("kai"));
  it("derives the hidden address from the name", () => {
    expect(rules.internalEmail("Kai")).toBe("kai@players.devlandia.invalid");
    expect(rules.isInternalEmail("kai@players.devlandia.invalid")).toBe(true);
    expect(rules.isInternalEmail("a@b.com")).toBe(false);
  });
});

describe("client-only rude check", () => {
  it("refuses a name the chat filter would mask", () => {
    expect(client.validateName("bitch")).toBe("rude-name");
    expect(server.validateName("bitch")).toBeNull();
  });
});
