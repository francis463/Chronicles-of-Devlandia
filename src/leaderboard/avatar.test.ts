import { describe, expect, it } from "vitest";
import { AVATAR_PX, checkPhoto, cropSquare } from "./avatar";

const file = (type: string, size = 10) => new File([new Uint8Array(size)], "p", { type });

describe("cropSquare", () => {
  it("takes the middle square of a wide picture", () => expect(cropSquare(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 }));
  it("takes the middle square of a tall picture", () => expect(cropSquare(200, 500)).toEqual({ sx: 0, sy: 150, side: 200 }));
  it("keeps a square as it is", () => expect(cropSquare(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 }));
});

describe("checkPhoto", () => {
  it("accepts JPG, PNG and WebP", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp"]) expect(checkPhoto(file(t))).toBeNull();
  });
  it("refuses anything else, and files over 10 MB", () => {
    for (const t of ["text/plain", "image/svg+xml", "image/gif", ""]) expect(checkPhoto(file(t))).not.toBeNull();
    expect(checkPhoto(file("image/png", 10 * 1024 * 1024 + 1))).not.toBeNull();
  });
  it("the saved picture is 96 pixels square", () => expect(AVATAR_PX).toBe(96));
});
