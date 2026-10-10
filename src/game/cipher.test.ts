import { describe, expect, it } from "vitest";
import { rot13 } from "./cipher";

describe("rot13", () => {
  it("decodes the scroll", () => {
    expect(rot13("QRAFR SBERFG")).toBe("DENSE FOREST");
  });

  it("is its own inverse and keeps case, spaces and punctuation", () => {
    expect(rot13("Hello, World!")).toBe("Uryyb, Jbeyq!");
    expect(rot13(rot13("Golden Semicolon;"))).toBe("Golden Semicolon;");
  });
});
