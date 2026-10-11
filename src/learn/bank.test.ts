import { describe, expect, it } from "vitest";
import { ARCHIVE_LOCK, GATE_CSS, SCROLL_CIPHER } from "./bank/builtin";
import { MATCHER_ROUNDS } from "./bank/matcher";
import { checkBlank, isCorrectBlank, normalize } from "./check";
import { BANK_SIZE, CHEST_IDS, CHESTS, chestChallenge, type Picks } from "./chests";
import type { BlankChallenge, Challenge } from "./types";

const bankItems: Challenge[] = CHESTS.flatMap((c) => [...c.bank]);
const blanks = [...bankItems, GATE_CSS, SCROLL_CIPHER, ARCHIVE_LOCK].filter((c): c is BlankChallenge => c.kind === "blank");
const byId = (id: string) => {
  const found = [...bankItems, GATE_CSS, SCROLL_CIPHER, ARCHIVE_LOCK].find((c) => c.id === id);
  if (!found || found.kind !== "blank") throw new Error(`no blank ${id}`);
  return found;
};
const accepts = (c: BlankChallenge, token: string) =>
  c.answers.some((a) => normalize(a, c.caseSensitive) === normalize(token, c.caseSensitive));
const allZero = Object.fromEntries(CHEST_IDS.map((id) => [id, 0])) as Picks;

describe("the question bank and the chest table", () => {
  it("11 chests in table order, a bank each, every language, 3 matcher rounds of 5 pairs", () => {
    expect(CHEST_IDS).toEqual([
      "chest-cpp-1", "chest-java", "chest-cpp-2", "chest-html", "chest-css",
      "chest-py-1", "chest-php", "chest-sql", "chest-py-2", "chest-cs", "chest-js",
    ]);
    for (const chest of CHESTS) expect(chest.bank.length, chest.id).toBe(BANK_SIZE);
    expect(new Set(bankItems.map((c) => c.lang))).toEqual(
      new Set(["html", "css", "php", "sql", "python", "java", "csharp", "cpp", "javascript"]),
    );
    expect(MATCHER_ROUNDS).toHaveLength(3);
    for (const round of MATCHER_ROUNDS) expect(round.pairs, round.id).toHaveLength(5);
    expect(new Set(bankItems.map((c) => c.id)).size).toBe(bankItems.length);
  });

  it("six questions per chest, 66 distinct ids, and every pick resolves with the chest's title", () => {
    expect(BANK_SIZE).toBe(6);
    expect(bankItems).toHaveLength(66);
    expect(new Set(bankItems.map((c) => c.id)).size).toBe(66);
    for (const chest of CHESTS) {
      for (let pick = 0; pick < BANK_SIZE; pick++) {
        const challenge = chestChallenge({ ...allZero, [chest.id]: pick }, chest.id);
        expect(challenge.id, `${chest.id} #${pick}`).toBe(chest.bank[pick].id);
        expect(challenge.title, chest.id).toBe(`< CODE CHEST: ${chest.badge.toUpperCase()} >`);
      }
    }
  });

  it("each blank: one gap, one kind of live data, answers pass their own check", () => {
    for (const c of blanks) {
      expect(c.code.join("\n").split("___").length, c.id).toBe(2);
      expect(["legal", "notLegal", "pattern"], c.id).toContain(c.live.kind);
      for (const a of c.answers) expect(checkBlank(c, a), `${c.id}: ${a}`).toEqual({ ok: true });
    }
  });

  it("legal lists have ≥ 2 valid wrong tokens; notLegal lists hold no answer", () => {
    for (const c of blanks) {
      if (c.live.kind === "legal") {
        const wrong = c.live.tokens.filter((t) => !accepts(c, t) && checkBlank(c, t).ok);
        expect(wrong.length, c.id).toBeGreaterThanOrEqual(2);
      } else if (c.live.kind === "notLegal") {
        const flagged = c.live.tokens.map((t) => t.toLowerCase());
        for (const a of c.answers) expect(flagged, `${c.id}: ${a}`).not.toContain(a.toLowerCase());
      }
    }
  });

  it("Blocks tiles: exactly one accepted answer and ≥ 2 wrong tiles that pass the live check", () => {
    const tiled = blanks.filter((c) => c.blocks);
    expect(tiled.length).toBeGreaterThanOrEqual(13);
    for (const c of tiled) {
      const tiles = c.blocks ?? [];
      expect(tiles.length, c.id).toBeGreaterThanOrEqual(4);
      expect(tiles.length, c.id).toBeLessThanOrEqual(6);
      expect(tiles.filter((t) => accepts(c, t)), c.id).toHaveLength(1);
      const passing = tiles.filter((t) => !accepts(c, t) && checkBlank(c, t, "blocks").ok);
      expect(passing.length, c.id).toBeGreaterThanOrEqual(2);
    }
    expect(SCROLL_CIPHER.blocks).toBeUndefined();
    expect(ARCHIVE_LOCK.blocks).toBeUndefined();
  });

  it("HTML, CSS and PHP each have six questions with unique ids", () => {
    for (const id of ["chest-html", "chest-css", "chest-php"] as const) {
      const ids = CHESTS.find((c) => c.id === id)!.bank.map((q) => q.id);
      expect(ids, id).toHaveLength(6);
      expect(new Set(ids).size, id).toBe(6);
    }
  });

  it("SQL, Java and C# each have six questions with unique ids", () => {
    for (const id of ["chest-sql", "chest-java", "chest-cs"] as const) {
      const ids = CHESTS.find((c) => c.id === id)!.bank.map((q) => q.id);
      expect(ids, id).toHaveLength(6);
      expect(new Set(ids).size, id).toBe(6);
    }
  });

  it("C++ and Python chests each have six questions with unique ids", () => {
    for (const id of ["chest-cpp-1", "chest-cpp-2", "chest-py-1", "chest-py-2"] as const) {
      const ids = CHESTS.find((c) => c.id === id)!.bank.map((q) => q.id);
      expect(ids, id).toHaveLength(6);
      expect(new Set(ids).size, id).toBe(6);
    }
  });

  it("the JavaScript chest has six unique questions: two blanks then four choices, titled for its badge", () => {
    const chest = CHESTS.find((c) => c.id === "chest-js")!;
    expect(chest.bank.map((q) => q.id)).toEqual(["js-console-log", "js-const", "js-strict-equal", "js-array-length", "js-template", "js-typeof"]);
    expect(chest.bank.map((q) => q.kind)).toEqual(["blank", "blank", "choice", "choice", "choice", "choice"]);
    expect([chest.zone, chest.at, chest.caption, chest.north, chest.where]).toEqual(["forest", { x: 18, y: 78 }, "above", false, "Dense Forest"]);
    expect(chestChallenge({ ...allZero, "chest-js": 0 }, "chest-js").title).toBe("< CODE CHEST: JAVASCRIPT >");
    expect(accepts(byId("js-console-log"), "log")).toBe(true);
    expect(accepts(byId("js-console-log"), "info")).toBe(false);
    expect(accepts(byId("js-const"), "const")).toBe(true);
    expect(accepts(byId("js-const"), "let")).toBe(false);
  });

  it("java-class offers no other type-declaring keyword as a wrong tile (an enum is an enum class)", () => {
    const tiles = byId("java-class").blocks ?? [];
    for (const keyword of ["enum", "record"]) expect(tiles).not.toContain(keyword);
  });

  it("choices: 4 unique options, correct in range", () => {
    const choices = bankItems.filter((c) => c.kind === "choice");
    expect(choices.length).toBeGreaterThan(0);
    for (const c of choices) {
      expect(new Set(c.options).size, c.id).toBe(4);
      expect([0, 1, 2, 3], c.id).toContain(c.correct);
    }
  });

  it("match rounds: unique snippets and unique labels", () => {
    for (const round of MATCHER_ROUNDS) {
      expect(new Set(round.pairs.map((p) => p.snippet)).size, round.id).toBe(5);
      expect(new Set(round.pairs.map((p) => p.label)).size, round.id).toBe(5);
      expect(round.title).toBe("< SYNTAX TERMINAL: DEV VILLAGE >");
    }
  });

  it("real near-misses pass the live check", () => {
    const table: [string, string][] = [
      ["py-append", "count"], ["py-append", "index"],
      ["py-print", "type"], ["py-print", "format"],
      ["java-println", "append"], ["java-println", "write"], ["java-println", "equals"],
      ["cs-writeline", "Read"], ["cs-writeline", "ReadKey"],
      ["cpp-cout", "wcout"], ["cpp-cout", "cerr"],
      ["php-echo", "include_once"], ["php-echo", "throw"],
      ["cpp-for", "not_eq"],
      ["css-color", "margin"],
      ["html-link", "download"],
      ["html-list", "b"],
      ["sql-from", "SELECT"], ["sql-from", "AS"],
      ["gate-css", "flow-root"],
      ["html-img-alt", "title"], ["html-img-alt", "src"],
      ["css-font-size", "font-weight"], ["css-font-size", "line-height"],
      ["php-if", "foreach"], ["php-if", "else"],
      ["sql-order", "GROUP"], ["sql-order", "WHERE"],
      ["java-class", "interface"], ["java-class", "static"],
      ["cs-if", "else"], ["cs-if", "switch"],
      ["cpp-include", "define"], ["cpp-include", "pragma"],
      ["cpp-while", "for"], ["cpp-while", "if"],
      ["js-console-log", "warn"], ["js-console-log", "error"],
      ["js-const", "let"], ["js-const", "var"],
      ["py-input", "print"], ["py-input", "len"],
      ["py-dict-get", "pop"], ["py-dict-get", "keys"],
    ];
    for (const [id, token] of table) expect(checkBlank(byId(id), token), `${id}: ${token}`).toEqual({ ok: true });
  });

  it("no flagged token is a real name", () => {
    const reference: Record<string, string> = {
      "html-link": "href src alt class id title target rel style download ping type hreflang referrerpolicy",
      "html-list": "li ul ol dl dt dd menu p b div span",
      "css-color": "color background background-color border-color fill stroke margin font-size outline caret-color accent-color",
      "sql-from": "FROM AS INTO WHERE HAVING LIMIT OFFSET AND OR LIKE SELECT",
      "gate-css": "block inline flex grid none contents table flow-root list-item",
      "html-img-alt": "alt src title width height loading srcset sizes class id style",
      "css-font-size": "font-size font-weight font-family font line-height width height margin padding",
      "php-if": "if else elseif foreach while for switch match do",
      "sql-order": "ORDER GROUP WHERE HAVING LIMIT SELECT FROM PARTITION",
      "java-class": "class interface enum record abstract final static void",
      "cs-if": "if else switch while for foreach do when",
      "cpp-while": "while for do if else switch goto break continue",
    };
    for (const [id, names] of Object.entries(reference)) {
      const live = byId(id).live;
      expect(live.kind, id).toBe("notLegal");
      const flagged = live.kind === "notLegal" ? live.tokens.map((t) => t.toLowerCase()) : [];
      for (const name of names.split(" ")) expect(flagged, `${id}: ${name}`).not.toContain(name.toLowerCase());
    }
  });

  it.each(["DENSE FOREST", "dense forest", " Dense Forest ", "DENSEFOREST", "dense-forest", "dense-forest!"])(
    "every input today's isCorrectDecode accepts, with no digit, passes the scroll cipher's live check and is correct: %j",
    (v) => {
      expect(checkBlank(SCROLL_CIPHER, v)).toEqual({ ok: true });
      expect(isCorrectBlank(SCROLL_CIPHER, v)).toBe(true);
    },
  );

  it.each(["", "QRAFR SBERFG", "forest", "dense forests", "frozen river"])("the scroll cipher rejects %j", (v) => {
    expect(isCorrectBlank(SCROLL_CIPHER, v)).toBe(false);
  });

  it.each(["block", " Block ", "BLOCK;", "block ;"])("the gate accepts %j", (v) => {
    expect(isCorrectBlank(GATE_CSS, v)).toBe(true);
  });

  it.each(["none", "", "blocks", "inline-block"])("the gate rejects %j", (v) => {
    expect(isCorrectBlank(GATE_CSS, v)).toBe(false);
  });

  it("chestChallenge returns the picked question with the chest's title", () => {
    const picked = chestChallenge({ ...allZero, "chest-sql": 2 }, "chest-sql");
    expect(picked.id).toBe("sql-max");
    expect(picked.title).toBe("< CODE CHEST: SQL >");
    expect(chestChallenge(allZero, "chest-cpp-1").title).toBe("< CODE CHEST: C++ I >");
  });
});
