import { describe, expect, it } from "vitest";
import { AVATAR_PX, checkPhoto, cropRect, MAX_ZOOM } from "./avatar";

const file = (type: string, size = 10) => new File([new Uint8Array(size)], "p", { type });

describe("cropRect", () => {
  it("with no crop takes the middle square of a wide picture", () => expect(cropRect(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 }));
  it("with no crop takes the middle square of a tall picture", () => expect(cropRect(200, 500)).toEqual({ sx: 0, sy: 150, side: 200 }));
  it("keeps a square as it is", () => expect(cropRect(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 }));

  it("zooming in shrinks the square around the chosen centre", () => {
    expect(cropRect(400, 200, { zoom: 2, cx: 200, cy: 100 })).toEqual({ sx: 150, sy: 50, side: 100 });
  });
  it("moves the square to a new centre", () => {
    expect(cropRect(400, 200, { zoom: 2, cx: 300, cy: 80 })).toEqual({ sx: 250, sy: 30, side: 100 });
  });
  it("never lets the square leave the picture", () => {
    expect(cropRect(400, 200, { zoom: 2, cx: 0, cy: 0 })).toEqual({ sx: 0, sy: 0, side: 100 });
    expect(cropRect(400, 200, { zoom: 2, cx: 999, cy: 999 })).toEqual({ sx: 300, sy: 100, side: 100 });
    expect(cropRect(400, 200, { zoom: 1, cx: 0, cy: 0 })).toEqual({ sx: 0, sy: 0, side: 200 });
  });
  it("keeps the zoom between 1 and the maximum, and ignores a zoom that is not a number", () => {
    expect(cropRect(400, 200, { zoom: 0.2, cx: 200, cy: 100 }).side).toBe(200);
    expect(cropRect(400, 200, { zoom: 99, cx: 200, cy: 100 }).side).toBe(200 / MAX_ZOOM);
    expect(cropRect(400, 200, { zoom: Number.NaN, cx: 200, cy: 100 }).side).toBe(200);
  });
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
