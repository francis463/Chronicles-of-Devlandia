import type { Point } from "../game/types";
import type { ZoneId } from "../game/zones";
import { CPP1_BANK, CPP2_BANK } from "./bank/cpp";
import { CSHARP_BANK } from "./bank/csharp";
import { CSS_BANK } from "./bank/css";
import { HTML_BANK } from "./bank/html";
import { JAVA_BANK } from "./bank/java";
import { JS_BANK } from "./bank/javascript";
import { PHP_BANK } from "./bank/php";
import { PY1_BANK, PY2_BANK } from "./bank/python";
import { SQL_BANK } from "./bank/sql";
import type { Challenge, ChestId, ChestQuestion } from "./types";

export type Chest = {
  id: ChestId;
  /** The written badge name (`C++ I`), and how it is spoken (`C++ 1`). */
  badge: string;
  spoken: string;
  /** The language's full name, for card copy. */
  language: string;
  zone: ZoneId;
  /** The landmark the chest is inside, and where it stands. Null for the C# chest: the Archive stands for it. */
  host: string | null;
  at: Point | null;
  north: boolean;
  /** Where the Codex says the chest is. */
  where: string;
  bank: readonly Challenge[];
};

/** How many questions each chest holds; each game rolls one of them per chest. */
export const BANK_SIZE = 12;
/** Each chest's rolled question, by index into its bank. */
export type Picks = Record<ChestId, number>;

const titled = (badge: string, questions: readonly ChestQuestion[]): readonly Challenge[] =>
  questions.map((q): Challenge => ({ ...q, title: `< CODE CHEST: ${badge.toUpperCase()} >` }));

type Row = Omit<Chest, "bank" | "where"> & { questions: readonly ChestQuestion[] };

const ZONE_NAMES: Record<ZoneId, string> = { peaks: "C++ Peaks", village: "Dev Village", forest: "Dense Forest", desert: "Sunbaked Desert", beach: "Sunny Beach", foggaten: "Foggaten Island", lodge: "Ski Lodge" };

const whereOf = (row: Row) =>
  row.host === null ? "Dev Village · in the Archive" : `${ZONE_NAMES[row.zone]} · ${row.host}${row.north ? ", north of the wall" : ""}`;

const ROWS: readonly Row[] = [
  { id: "chest-cpp-1", badge: "C++ I", spoken: "C++ 1", language: "C++", zone: "beach", host: "Pier", at: { x: 90, y: 62 }, north: false, questions: CPP1_BANK },
  { id: "chest-java", badge: "Java", spoken: "Java", language: "Java", zone: "desert", host: "Pyramid", at: { x: 20, y: 34 }, north: false, questions: JAVA_BANK },
  { id: "chest-cpp-2", badge: "C++ II", spoken: "C++ 2", language: "C++", zone: "beach", host: "Shipwreck", at: { x: 60, y: 30 }, north: false, questions: CPP2_BANK },
  { id: "chest-html", badge: "HTML", spoken: "HTML", language: "HTML", zone: "lodge", host: "Shelf", at: { x: 66, y: 46 }, north: false, questions: HTML_BANK },
  { id: "chest-css", badge: "CSS", spoken: "CSS", language: "CSS", zone: "peaks", host: "Ice Cave", at: { x: 46.9, y: 8.9 }, north: true, questions: CSS_BANK },
  { id: "chest-py-1", badge: "Python I", spoken: "Python 1", language: "Python", zone: "foggaten", host: "Ruins", at: { x: 28, y: 50 }, north: false, questions: PY1_BANK },
  { id: "chest-php", badge: "PHP", spoken: "PHP", language: "PHP", zone: "village", host: "Hut", at: { x: 28.75, y: 22.8 }, north: false, questions: PHP_BANK },
  { id: "chest-sql", badge: "SQL", spoken: "SQL", language: "SQL", zone: "village", host: "Windmill", at: { x: 13.75, y: 42.2 }, north: false, questions: SQL_BANK },
  { id: "chest-py-2", badge: "Python II", spoken: "Python 2", language: "Python", zone: "desert", host: "Oasis", at: { x: 42, y: 52 }, north: false, questions: PY2_BANK },
  { id: "chest-cs", badge: "C#", spoken: "C sharp", language: "C#", zone: "village", host: null, at: null, north: false, questions: CSHARP_BANK },
  { id: "chest-js", badge: "JavaScript", spoken: "JavaScript", language: "JavaScript", zone: "forest", host: "Old Oak", at: { x: 24, y: 50 }, north: false, questions: JS_BANK },
];

/** The 11 language chests, in the spec's table order. */
export const CHESTS: readonly Chest[] = ROWS.map(({ questions, ...row }) => ({
  ...row,
  where: whereOf({ ...row, questions }),
  bank: titled(row.badge, questions),
}));

export const CHEST_IDS: readonly ChestId[] = CHESTS.map((c) => c.id);

export const chestById = (id: ChestId): Chest => CHESTS.find((c) => c.id === id)!;

/** The challenge a chest asks in this game, with its chest's title. */
export function chestChallenge(picks: Picks, id: ChestId): Challenge {
  return chestById(id).bank[picks[id]];
}
