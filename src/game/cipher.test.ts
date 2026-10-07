import { describe, expect, it } from "vitest";
import { isCorrectDecode, rot13 } from "./cipher";

describe("rot13", () => {
  it("decodes the scroll", () => {
    expect(rot13("QRAFR SBERFG")).toBe("DENSE FOREST");
  });

  it("is its own inverse and keeps case, spaces and punctuation", () => {
    expect(rot13("Hello, World!")).toBe("Uryyb, Jbeyq!");
    expect(rot13(rot13("Golden Semicolon;"))).toBe("Golden Semicolon;");
  });
});

describe("isCorrectDecode", () => {
  it.each(["DENSE FOREST", "dense forest", " Dense Forest ", "DENSEFOREST", "dense-forest"])("accepts %j", (answer) => {
    expect(isCorrectDecode(answer)).toBe(true);
  });

  it.each(["", "QRAFR SBERFG", "forest", "dense forests", "frozen river"])("rejects %j", (answer) => {
    expect(isCorrectDecode(answer)).toBe(false);
  });
});
