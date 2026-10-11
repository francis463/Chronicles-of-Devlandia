import { describe, expect, it } from "vitest";
import { CHAT_MAX, RAW_CHAT_MAX, RUDE_WORDS, chatLength, cleanChat, clampChat, maskRude } from "./filter";

describe("limits", () => {
  it("are the spec's", () => {
    expect([CHAT_MAX, RAW_CHAT_MAX]).toEqual([120, 480]);
  });
  it("chatLength counts code points", () => {
    expect(chatLength("abc")).toBe(3);
    expect(chatLength("😀😀")).toBe(2);
  });
});

describe("cleanChat", () => {
  it("removes zero-width and format characters instead of splitting words (Review Focus 5)", () => {
    expect(cleanChat("fu\u200Bck")).toBe("fuck");
    expect(cleanChat("a\u0085b")).toBe("ab");
    expect(cleanChat("a\u00ADb\uFEFFc\u{E0041}d")).toBe("abcd");
    expect(cleanChat("a\u202Eb")).toBe("ab");
  });

  it("turns tabs and line breaks into spaces and collapses whitespace", () => {
    expect(cleanChat("a b")).toBe("a b");
    expect(cleanChat("  a \t b\n c  ")).toBe("a b c");
  });

  it("removes the invisible fillers, so a message of only them is blank", () => {
    for (const filler of ["\u3164", "\u2800", "\u115F", "\u1160", "\uFFA0", "\u200B\u200F"]) expect(cleanChat(filler)).toBe("");
  });

  it("keeps at most two combining marks in a row", () => {
    expect(cleanChat("x\u0301\u0302\u0303\u0304")).toBe("x\u0301\u0302");
  });

  it("normalises full-width letters", () => {
    expect(cleanChat("ｆｕｃｋ")).toBe("fuck");
  });
});

describe("maskRude", () => {
  it("masks whole words only", () => {
    expect(maskRude("fuck you")).toBe("*** you");
    expect(maskRude("ass.")).toBe("***.");
    expect(maskRude("class pass assess Scunthorpe leche flan Lady Gaga room 455")).toBe("class pass assess Scunthorpe leche flan Lady Gaga room 455");
  });

  it("sees through repeated letters, leetspeak, accents and Filipino forms", () => {
    for (const word of ["fuuuck", "asssss", "pussssy", "b1tch", "$hit", "fúck", "putanginamo", "ulul", "stfu"]) expect(maskRude(word), word).toBe("***");
  });

  it("masks a rude word decorated with combining marks (underline, strikethrough)", () => {
    const U = String.fromCharCode(0x332), S = String.fromCharCode(0x336);
    const deco = (w: string, m: string) => [...w].map((c) => c + m).join("");
    expect(maskRude(cleanChat(deco("fuck", U)))).toBe("***");
    expect(maskRude(cleanChat(deco("fuck", S) + " you"))).toBe("*** you");
  });

  it("masks every listed word", () => {
    expect(RUDE_WORDS.size).toBeGreaterThan(60);
    for (const word of RUDE_WORDS) expect(maskRude(word), word).toBe("***");
  });

  it("masks a rude word split by a zero-width character once cleaned (Review Focus 5)", () => {
    expect(maskRude(cleanChat("fu\u200Bck"))).toBe("***");
    expect(maskRude(cleanChat("ｆｕｃｋ"))).toBe("***");
  });
});

describe("clampChat", () => {
  it("keeps the first 120 code points", () => {
    expect(chatLength(clampChat("a".repeat(130)))).toBe(120);
    expect(chatLength(clampChat("😀".repeat(130)))).toBe(120);
    expect(clampChat("short")).toBe("short");
  });
});
