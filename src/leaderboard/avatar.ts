/** Photos are saved as small squares: 96 pixels across, JPEG. */
export const AVATAR_PX = 96;
const MAX_PICK_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Why a chosen file cannot be used, or null when it can. */
export function checkPhoto(file: File): string | null {
  return OK_TYPES.includes(file.type) && file.size <= MAX_PICK_BYTES ? null : "Pick a picture file (JPG, PNG or WebP).";
}

/** How far you can zoom in: the square shrinks to a quarter of its side. */
export const MAX_ZOOM = 4;
/** The chosen square: `cx`/`cy` are its centre in picture pixels, `zoom` is 1 (the biggest square) up to MAX_ZOOM. */
export type Crop = { zoom: number; cx: number; cy: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The square to cut from a picture of this size: the middle one unless a crop says otherwise, always inside the picture. */
export function cropRect(w: number, h: number, crop?: Crop): { sx: number; sy: number; side: number } {
  const zoom = clamp(Number.isFinite(crop?.zoom) ? crop!.zoom : 1, 1, MAX_ZOOM);
  const side = Math.min(w, h) / zoom;
  const cx = Number.isFinite(crop?.cx) ? crop!.cx : w / 2;
  const cy = Number.isFinite(crop?.cy) ? crop!.cy : h / 2;
  return { sx: clamp(cx - side / 2, 0, w - side), sy: clamp(cy - side / 2, 0, h - side), side };
}

/** Cuts the chosen square (the middle one by default) and redraws it at 96×96 as a JPEG. Redrawing also drops camera data such as location. */
export async function shrinkToSquare(file: File, crop?: Crop): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, side } = cropRect(bitmap.width, bitmap.height, crop);
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
