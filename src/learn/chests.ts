import type { Point } from "../game/types";
import type { ZoneId } from "../game/zones";
import { CPP1_BANK, CPP2_BANK } from "./bank/cpp";
import { CSHARP_BANK } from "./bank/csharp";
import { CSS_BANK } from "./bank/css";
import { HTML_BANK } from "./bank/html";
import { JAVA_BANK } from "./bank/java";
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
  /** Null for the C# chest: the Archive stands for it. */
  at: Point | null;
  caption: "above" | "below" | null;
  north: boolean;
  /** Where the Codex says the chest is. */
  where: string;
  bank: Bank;
};

type Bank = readonly [Challenge, Challenge, Challenge];

const titled = (badge: string, questions: readonly ChestQuestion[]): Bank =>
  questions.map((q): Challenge => ({ ...q, title: `< CODE CHEST: ${badge.toUpperCase()} >` })) as unknown as Bank;

type Row = Omit<Chest, "bank" | "where"> & { questions: readonly [ChestQuestion, ChestQuestion, ChestQuestion] };

const whereOf = (row: Row) =>
  row.at === null
    ? "Dev Village · in the Archive"
    : row.zone === "village"
      ? "Dev Village"
      : row.north
        ? "C++ Peaks · north of the wall"
        : "C++ Peaks";

const ROWS: readonly Row[] = [
  { id: "chest-cpp-1", badge: "C++ I", spoken: "C++ 1", language: "C++", zone: "peaks", at: { x: 64, y: 14 }, caption: "above", north: true, questions: CPP1_BANK },
  { id: "chest-java", badge: "Java", spoken: "Java", language: "Java", zone: "peaks", at: { x: 20, y: 44 }, caption: "above", north: true, questions: JAVA_BANK },
  { id: "chest-cpp-2", badge: "C++ II", spoken: "C++ 2", language: "C++", zone: "peaks", at: { x: 84, y: 44 }, caption: "above", north: true, questions: CPP2_BANK },
  { id: "chest-html", badge: "HTML", spoken: "HTML", language: "HTML", zone: "peaks", at: { x: 10, y: 60 }, caption: "below", north: false, questions: HTML_BANK },
  { id: "chest-css", badge: "CSS", spoken: "CSS", language: "CSS", zone: "peaks", at: { x: 46, y: 82 }, caption: "above", north: false, questions: CSS_BANK },
  { id: "chest-py-1", badge: "Python I", spoken: "Python 1", language: "Python", zone: "peaks", at: { x: 88, y: 64 }, caption: "above", north: false, questions: PY1_BANK },
  { id: "chest-php", badge: "PHP", spoken: "PHP", language: "PHP", zone: "village", at: { x: 44, y: 62 }, caption: "above", north: false, questions: PHP_BANK },
  { id: "chest-sql", badge: "SQL", spoken: "SQL", language: "SQL", zone: "village", at: { x: 12, y: 80 }, caption: "below", north: false, questions: SQL_BANK },
  { id: "chest-py-2", badge: "Python II", spoken: "Python 2", language: "Python", zone: "village", at: { x: 82, y: 82 }, caption: "above", north: false, questions: PY2_BANK },
  { id: "chest-cs", badge: "C#", spoken: "C sharp", language: "C#", zone: "village", at: null, caption: null, north: false, questions: CSHARP_BANK },
];

/** The 10 language chests, in the spec's table order. */
export const CHESTS: readonly Chest[] = ROWS.map(({ questions, ...row }) => ({
  ...row,
  where: whereOf({ ...row, questions }),
  bank: titled(row.badge, questions),
}));

export const CHEST_IDS: readonly ChestId[] = CHESTS.map((c) => c.id);

export const chestById = (id: ChestId): Chest => CHESTS.find((c) => c.id === id)!;

/** The challenge a chest asks in this game, with its chest's title. */
export function chestChallenge(picks: Record<ChestId, 0 | 1 | 2>, id: ChestId): Challenge {
  return chestById(id).bank[picks[id]];
}
