import { describe, expect, it } from "vitest";
import { checkBlank, gapContext, isCorrectBlank, normalize, wrongBlankCopy, wrongChoiceCopy, wrongMatchCopy } from "./check";
import type { BlankChallenge } from "./types";

// Small inline fixtures, not the bank (the bank has its own tests).
const sql: BlankChallenge = {
  kind: "blank", id: "t-sql", lang: "sql", title: "", prompt: "", hint: "", explain: "",
  code: ["SELECT name ___ users;"], answers: ["FROM"], caseSensitive: false,
  live: { kind: "notLegal", tokens: ["FORM", "FRM"], label: "an SQL keyword" },
};
const py: BlankChallenge = {
  ...sql, id: "t-py", lang: "python", code: ['fruits.___("kiwi")'], answers: ["append"], caseSensitive: true,
  live: { kind: "legal", tokens: ["append", "clear", "count", "insert"], label: "a list method" },
};
const cpp: BlankChallenge = {
  ...sql, id: "t-cpp", lang: "cpp", code: ["for (int i = 0; i ___ 3; i++) {"], answers: ["<", "!=", "not_eq"], caseSensitive: true,
  live: { kind: "legal", tokens: ["<", "<=", ">", ">=", "==", "!=", "not_eq"], label: "a relational or equality operator" },
};
const list: BlankChallenge = {
  ...sql, id: "t-li", lang: "html", code: ["  <___>Apples</li>"], answers: ["li"],
  live: { kind: "notLegal", tokens: ["item"], label: "an HTML tag" },
};
const cipher: BlankChallenge = {
  ...sql, id: "t-ci", lang: "logic", code: ['rot13("QRAFR SBERFG")  → ___'], answers: ["DENSE FOREST"], compare: "letters",
  live: { kind: "pattern", pattern: /^[^0-9]*$/, reason: "No digits: the scroll is plain words." },
};

describe("normalize and gapContext", () => {
  it("normalize trims, drops one trailing semicolon, collapses spaces and lower-cases unless case-sensitive", () => {
    expect(normalize("  Block; ", false)).toBe("block");
    expect(normalize("a   b", true)).toBe("a b");
    expect(normalize("Print", true)).toBe("Print");
  });

  it("gapContext finds the code touching the gap: left back to a space, right only when punctuation", () => {
    expect(gapContext(['fruits.___("kiwi")'])).toEqual({ left: "fruits.", right: "(" });
    expect(gapContext(["SELECT name ___ users;"])).toEqual({ left: "", right: null });
    expect(gapContext(["  <___>Apples</li>"])).toEqual({ left: "<", right: ">" });
  });
});

describe("checkBlank: the live check", () => {
  it("rules in order, with their exact reasons", () => {
    expect(checkBlank(sql, "   ")).toEqual({ ok: false, reason: "Type something first." });
    expect(checkBlank(sql, "", "blocks")).toEqual({ ok: false, reason: "Place a block first." });
    expect(checkBlank(sql, '"FROM')).toEqual({ ok: false, reason: "Unclosed quote." });
    expect(checkBlank(py, "append(")).toEqual({ ok: false, reason: "Unclosed or extra bracket." });
    expect(checkBlank(py, "fruits.append")).toEqual({
      ok: false,
      reason: "Type just the missing part: the code around the blank is already there.",
    });
    expect(checkBlank(list, "<li>").ok).toBe(false);
    expect(checkBlank(sql, "FORM")).toEqual({ ok: false, reason: "'FORM' is not an SQL keyword." });
    expect(checkBlank(py, "push")).toEqual({ ok: false, reason: "'push' is not a list method." });
    expect(checkBlank(py, "Append")).toEqual({
      ok: false,
      reason: "'Append' is not a list method. Names are case-sensitive.",
    });
    expect(checkBlank(cipher, "DENSE 4EST")).toEqual({ ok: false, reason: "No digits: the scroll is plain words." });
  });

  it("skips the bracket and touching-code rules when a legal token contains the character", () => {
    expect(checkBlank(cpp, "<")).toEqual({ ok: true });
    expect(checkBlank(cpp, "<=")).toEqual({ ok: true });
  });

  it("pattern blanks skip the quote, bracket and touching-code rules", () => {
    expect(checkBlank(cipher, "'dense' (forest)")).toEqual({ ok: true });
  });

  it("never looks at answers: the answer and a legal wrong token get the same verdict", () => {
    expect(checkBlank(py, "append")).toEqual(checkBlank(py, "count"));
    expect(checkBlank(sql, "FROM")).toEqual(checkBlank(sql, "WHERE"));
  });
});

describe("answers and wrong copy", () => {
  it("isCorrectBlank normalises, honours case and compares letters for the cipher", () => {
    expect(isCorrectBlank(sql, "from;")).toBe(true);
    expect(isCorrectBlank(py, "Append")).toBe(false);
    expect(isCorrectBlank(cpp, "!=")).toBe(true);
    expect(isCorrectBlank(cipher, "dense-forest!")).toBe(true);
  });

  it("wrong copy", () => {
    expect(wrongBlankCopy("abcdefghijklmnopqrstuvwxyz")).toBe(
      'Not quite: "abcdefghijklmnopqrstuvwx…" isn\'t the answer. Check the hint or try again.',
    );
    expect(wrongChoiceCopy()).toBe("Not quite: that isn't the answer. Check the hint or try again.");
    expect([wrongMatchCopy(1), wrongMatchCopy(3)]).toEqual(["1 of 5 pairs is wrong.", "3 of 5 pairs are wrong."]);
  });
});
