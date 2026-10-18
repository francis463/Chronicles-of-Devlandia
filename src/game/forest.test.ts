import { describe, expect, it } from "vitest";
import { rangerLine } from "./forest";

const none = { gateUnlocked: false, hasLoot: false, clueDecoded: false, artifactFound: false };

describe("rangerLine", () => {
  it("speaks to the first stage you have not done", () => {
    expect(rangerLine(none)).toBe("Welcome to the Dense Forest! Back north, the Peaks' wall stands locked. Its gate opens with one CSS fix.");
    expect(rangerLine({ ...none, gateUnlocked: true })).toBe(
      "The gate's open! Empty the Supply Cache, hidden in the Hollow Tree in the north-east of this forest: explorers say it holds an old scroll.",
    );
    expect(rangerLine({ ...none, gateUnlocked: true, hasLoot: true })).toBe(
      "That scroll is scrambled. Decode it from your inventory: every letter is shifted 13 places.",
    );
    expect(rangerLine({ ...none, gateUnlocked: true, hasLoot: true, clueDecoded: true })).toBe(
      "The scroll points across the sea, to Foggaten Island. Take the boat from the Peaks' east dock and dig where the X is, in the island's south-east corner.",
    );
  });

  it("has a line for the finished quest", () => {
    expect(rangerLine({ gateUnlocked: true, hasLoot: true, clueDecoded: true, artifactFound: true })).toBe(
      "You found the Golden Semicolon! The forest has not been this quiet since it went missing. Open any chests you've left, explorer.",
    );
  });
});
