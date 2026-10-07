import { describe, expect, it } from "vitest";
import { isCorrectAnswer, normalizeAnswer } from "./puzzle";

describe("puzzle", () => {
  it("normalizes case, whitespace and a trailing semicolon", () => {
    expect(normalizeAnswer(" Block ; ")).toBe("block");
  });

  it.each(["block", " Block ", "BLOCK;", "block ;"])("accepts %j", (answer) => {
    expect(isCorrectAnswer(answer)).toBe(true);
  });

  it.each(["none", "", "blocks", "inline-block"])("rejects %j", (answer) => {
    expect(isCorrectAnswer(answer)).toBe(false);
  });
});
