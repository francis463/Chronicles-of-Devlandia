/** A hero's look. Classes change how the explorer is drawn and nothing else. */
export const CLASS_IDS = ["warrior", "archer", "mage", "assassin", "tank", "healer"] as const;
export type ClassId = (typeof CLASS_IDS)[number];
export const DEFAULT_CLASS: ClassId = "warrior";

export const isClassId = (v: unknown): v is ClassId => (CLASS_IDS as readonly unknown[]).includes(v);
/** Anything that is not one of the six (missing, wrong type, an older client) is the default. */
export const classOrDefault = (v: unknown): ClassId => (isClassId(v) ? v : DEFAULT_CLASS);

/** `outfit` and `trim` recolour the explorer's cloak; the hood stays the player's team colour. */
export const CLASSES: Record<ClassId, { name: string; blurb: string; outfit: string; trim: string }> = {
  warrior: { name: "Warrior", blurb: "Steel and nerve.", outfit: "#64748b", trim: "#b91c1c" },
  archer: { name: "Archer", blurb: "Sharp eyes, steady hands.", outfit: "#15803d", trim: "#713f12" },
  mage: { name: "Mage", blurb: "Reads the code between the lines.", outfit: "#1d4ed8", trim: "#6d28d9" },
  assassin: { name: "Assassin", blurb: "Quiet feet, quick fixes.", outfit: "#27272a", trim: "#52525b" },
  tank: { name: "Tank", blurb: "Nothing gets past the wall.", outfit: "#6b7280", trim: "#ca8a04" },
  healer: { name: "Healer", blurb: "Mends bugs and spirits.", outfit: "#f1f5f9", trim: "#eab308" },
};
