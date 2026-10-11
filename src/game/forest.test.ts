import { describe, expect, it } from "vitest";
import { rangerLine } from "./forest";

const none = { gateUnlocked: false, hasLoot: false, clueDecoded: false, artifactFound: false };

describe("rangerLine", () => {
  it("speaks to the first stage you have not done", () => {
    expect(rangerLine(none)).toBe("Welcome to the Dense Forest! Back north, the Supply Cache waits behind the wall. Its gate opens with one CSS fix.");
    expect(rangerLine({ ...none, gateUnlocked: true })).toBe(
      "The gate's open! Empty the Supply Cache in the north-east snow: explorers say it holds an old scroll.",
    );
    expect(rangerLine({ ...none, gateUnlocked: true, hasLoot: true })).toBe(
      "That scroll is scrambled. Decode it from your inventory: every letter is shifted 13 places.",
    );
    expect(rangerLine({ ...none, gateUnlocked: true, hasLoot: true, clueDecoded: true })).toBe(
      "The scroll points here. Look for the X in the south-east corner of the clearing, and dig there.",
    );
  });

  it("has a line for the finished quest", () => {
    expect(rangerLine({ gateUnlocked: true, hasLoot: true, clueDecoded: true, artifactFound: true })).toBe(
      "You found the Golden Semicolon! The forest has not been this quiet since it went missing. Open any chests you've left, explorer.",
    );
  });
});
