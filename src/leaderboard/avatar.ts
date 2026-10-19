/** Photos are saved as small squares: 96 pixels across, JPEG. */
export const AVATAR_PX = 96;
const MAX_PICK_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Why a chosen file cannot be used, or null when it can. */
export function checkPhoto(file: File): string | null {
  return OK_TYPES.includes(file.type) && file.size <= MAX_PICK_BYTES ? null : "Pick a picture file (JPG, PNG or WebP).";
}

/** The middle square of a picture of this size. */
export function cropSquare(w: number, h: number): { sx: number; sy: number; side: number } {
  const side = Math.min(w, h);
  return { sx: Math.floor((w - side) / 2), sy: Math.floor((h - side) / 2), side };
}

/** Crops the picture to its middle square and redraws it at 96×96 as a JPEG. Redrawing also drops camera data such as location. */
export async function shrinkToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, side } = cropSquare(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    return await new Promise<Blob>((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("no image"))), "image/jpeg", 0.85));
  } finally {
    bitmap.close();
  }
}
