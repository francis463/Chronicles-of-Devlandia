# Learning Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ten language treasure chests with a 30-question bank, a Syntax Matcher that prints the Archive's access code, live syntax checks, a Blocks (drag-and-drop) mode with Undo/Reset in every code blank, and a Codex of earned badges, all on one challenge engine that the CSS gate and the scroll cipher move onto.

**Architecture:**
- **Pure engine** (`src/learn/`): challenge types, the live check, answer checking, deterministic shuffling, the access code, the question bank as data and the chest table. Nothing here imports React or game state.
- **Game layer** (`src/game/`): one `challenge` field replaces the gate's and cipher's six flags. Generic actions open, submit, hint and close any challenge. Places, cards, prompts and per-game rolls (picks, seed, Matcher round, access code) live here.
- **Team** (`src/game/team.ts`, `src/net/`, `src/hooks/useTeamSession.ts`): `archiveOpen` joins the shared flags (parsed leniently), and a `badge` message carries personal badges, subscribed in every transport.
- **Screen:** one `ChallengeTerminal` (blank, choice, match bodies; toolbar; submit row; success view) replaces `TerminalModal` and `CipherModal`. Then the Codex, the sprites and scene, and the map buttons with their layout rules.

**Tech Stack:** React 19, TypeScript strict (`tsc -b` also type-checks tests), Vite 8, Tailwind 4, Vitest 5 + jsdom 29 + Testing Library, Playwright from `/opt/node22/lib/node_modules/playwright` (browser check, scratchpad only).

**Spec:** `docs/superpowers/specs/2026-10-09-learning-core-design.md`. The spec is the authority for every word of copy, every question, token list and tile, and every place; this plan points at the spec section instead of repeating it.

## Global Constraints

- **No new dependencies** (runtime or dev).
- **Copy is verbatim from the spec**, including quotes, curly apostrophes and `…`. Where this plan says "spec §X", copy from that section exactly.
- **Language versions** (spec "Rules"): Python 3.10+, PHP 8, Java 21, C# 12 / .NET 8, C++17+, PostgreSQL 16, HTML Living Standard, current Chromium CSS.
- **The live check never looks at `answers`** and never states something untrue about a language. Closed sets (`legal`) are complete; open sets (`notLegal`) flag only listed near-misses.
- **Chest ids**: `chest-cpp-1`, `chest-java`, `chest-cpp-2`, `chest-html`, `chest-css`, `chest-py-1`, `chest-php`, `chest-sql`, `chest-py-2`, `chest-cs`. **Places**: the chest table in spec §"The 10 chests", plus `terminal` (68, 60) and `archive` (55, 66) in the village. `chest-cs` is not a place: the Archive stands for it.
- **Access-code alphabet**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- **Spoken badge names**: C++ 1, C++ 2, Python 1, Python 2, C sharp; the others as written.
- **Accessibility**: new controls are native buttons or inputs; on phones touch targets are ≥ 44 px tall; reduced motion animates nothing; every state change a sighted player sees has an accessible name or a live region (spec §"The challenge terminal").
- **Team compatibility**: messages from older clients (no `archiveOpen`, no `badge`) parse and play; unknown chest ids are ignored.
- **Map captions** never use the bracket letters W, A, S, D or E.
- **Commands**: `npm test`, `npx tsc -b`, `npm run build`; single files with `npx vitest run <path>`.

## Review Focus

1. **A teammate completes the thing your terminal is open on** (opens the gate, decodes the scroll, unseals the Archive). Expected: your terminal for it closes at once, and only the teammate line is logged, with no stale terminal and no second log. Pinned in Task 6.
2. **A double tap or a repeated identical wrong submission.** Expected: it counts as one wrong try, so the drone's auto-hint needs two different wrong answers. Pinned in Task 3 (reducer) and Task 7 (the SUBMIT reason `Change your answer to try again.`).
3. **Keys typed inside a terminal input** (`w a s d e c`). Expected: they never move you, interact or open the Codex. Pinned in Task 10.
4. **Mixed versions in one room**: flags without `archiveOpen`, a `badge` for an unknown chest, a malformed badge. Expected: nothing is dropped or crashes, and the unknown is ignored. Pinned in Task 6.
5. **A chest on a phone-size map (1×)**, whose caption is hidden. Expected: it is still discoverable, because its badge name is in the button's accessible name and in the `[E]` prompt when you are near. Pinned in Task 12.

---

### Task 1: The pure engine — types, live check, answers, shuffle, access code

**Files:**
- Create: `src/learn/types.ts`, `src/learn/check.ts`, `src/learn/shuffle.ts`, `src/learn/access.ts`
- Test: `src/learn/check.test.ts`, `src/learn/shuffle.test.ts`, `src/learn/access.test.ts`

**Interfaces:**
- Produces (`src/learn/types.ts`):
  ```ts
  export type Lang = "html" | "css" | "php" | "python" | "java" | "csharp" | "sql" | "cpp" | "logic";
  export type ChestId = "chest-cpp-1" | "chest-java" | "chest-cpp-2" | "chest-html" | "chest-css" | "chest-py-1" | "chest-php" | "chest-sql" | "chest-py-2" | "chest-cs";
  export type ChallengeTarget = ChestId | "gate" | "cipher" | "matcher" | "archive";
  export type LiveData =
    | { kind: "legal"; tokens: readonly string[]; label: string }
    | { kind: "notLegal"; tokens: readonly string[]; label: string }
    | { kind: "pattern"; pattern: RegExp; reason: string };
  type Base = { id: string; lang: Lang; title: string; prompt: string; hint: string; explain: string };
  export type BlankChallenge = Base & {
    kind: "blank"; code: readonly string[]; answers: readonly string[]; start?: string; caseSensitive: boolean;
    compare?: "normalised" | "letters"; live: LiveData; blocks?: readonly string[];
    instructionsLabel?: string; submitLabel?: string; inputLabel?: string; placeholder?: string; upperCase?: boolean;
    /** Wrong-answer copy for the gate and cipher; chests use the generic copy. */
    wrong?: (value: string) => string;
    /** Live-check line before the first edit (the keypad's). */
    pristine?: string;
  };
  export type ChoiceChallenge = Base & { kind: "choice"; code?: readonly string[]; options: readonly [string, string, string, string]; correct: 0 | 1 | 2 | 3; codeOptions?: boolean };
  export type MatchPair = { snippet: string; label: string; tag?: string };
  export type MatchChallenge = Base & { kind: "match"; pairs: readonly MatchPair[] };
  export type Challenge = BlankChallenge | ChoiceChallenge | MatchChallenge;
  export type Untitled<T> = Omit<T, "title">;
  export type ChestQuestion = Untitled<BlankChallenge> | Untitled<ChoiceChallenge>;
  export type CheckResult = { ok: true } | { ok: false; reason: string };
  export type BlankMode = "type" | "blocks";
  export type SubmitValue = string | number | readonly number[];
  ```
- Produces (`src/learn/check.ts`):
  - `normalize(raw: string, caseSensitive: boolean): string`
  - `lettersOf(raw: string): string`: upper-cased A–Z only
  - `gapContext(code: readonly string[]): { left: string; right: string | null }`
  - `checkBlank(c: BlankChallenge, input: string, mode?: BlankMode): CheckResult`
  - `isCorrectBlank(c: BlankChallenge, input: string): boolean`
  - `wrongBlankCopy(input: string): string`
  - `wrongChoiceCopy(): string`
  - `wrongMatchCopy(n: number): string`
  - `matchWrongCount(c: MatchChallenge, value: readonly number[]): number`
- Produces (`src/learn/shuffle.ts`): `order(n: number, seed: number, id: string): number[]`, a permutation of `0..n-1`.
- Produces (`src/learn/access.ts`):
  - `CODE_ALPHABET`
  - `CODE_BLOCKLIST: readonly string[]`, exactly `["FUCK","FVCK","CUNT","TWAT","SLUT","CRAP","DAMN","SUCK","WANK","DUMB","DYKE","FAGS","HELL","KKKK"]`
  - `accessCode(n: number): string`

- [ ] **Step 1: Write the failing tests.** Values come from spec §"Answer checking" and §"The live check".
  ```ts
  // check.test.ts — use small inline fixtures, not the bank (Task 2 owns the bank)
  const sql: BlankChallenge = { kind: "blank", id: "t-sql", lang: "sql", title: "", prompt: "", hint: "", explain: "",
    code: ["SELECT name ___ users;"], answers: ["FROM"], caseSensitive: false, live: { kind: "notLegal", tokens: ["FORM", "FRM"], label: "an SQL keyword" } };
  const py: BlankChallenge = { ...sql, id: "t-py", lang: "python", code: ['fruits.___("kiwi")'], answers: ["append"], caseSensitive: true,
    live: { kind: "legal", tokens: ["append", "clear", "count", "insert"], label: "a list method" } };
  const cpp: BlankChallenge = { ...sql, id: "t-cpp", lang: "cpp", code: ["for (int i = 0; i ___ 3; i++) {"], answers: ["<", "!=", "not_eq"], caseSensitive: true,
    live: { kind: "legal", tokens: ["<", "<=", ">", ">=", "==", "!=", "not_eq"], label: "a relational or equality operator" } };
  const list: BlankChallenge = { ...sql, id: "t-li", lang: "html", code: ["  <___>Apples</li>"], answers: ["li"], live: { kind: "notLegal", tokens: ["item"], label: "an HTML tag" } };
  const cipher: BlankChallenge = { ...sql, id: "t-ci", lang: "logic", code: ['rot13("QRAFR SBERFG")  → ___'], answers: ["DENSE FOREST"], compare: "letters",
    live: { kind: "pattern", pattern: /^[^0-9]*$/, reason: "No digits: the scroll is plain words." } };

  it("normalize trims, drops one trailing semicolon, collapses spaces and lower-cases unless case-sensitive", () => {
    expect(normalize("  Block; ", false)).toBe("block");
    expect(normalize("a   b", true)).toBe("a b");
    expect(normalize("Print", true)).toBe("Print");
  });
  it("gapContext finds the code touching the gap: left back to a space, right only when punctuation", () => {
    expect(gapContext(['fruits.___("kiwi")'])).toEqual({ left: "fruits.", right: "(" });
    expect(gapContext(["SELECT name ___ users;"])).toEqual({ left: "", right: null });
    expect(gapContext(["  <___>Apples</li>"])).toEqual({ left: "<", right: ">" });
  });
  it("rules in order, with their exact reasons", () => {
    expect(checkBlank(sql, "   ")).toEqual({ ok: false, reason: "Type something first." });
    expect(checkBlank(sql, "", "blocks")).toEqual({ ok: false, reason: "Place a block first." });
    expect(checkBlank(sql, '"FROM')).toEqual({ ok: false, reason: "Unclosed quote." });
    expect(checkBlank(py, "append(")).toEqual({ ok: false, reason: "Unclosed or extra bracket." });
    expect(checkBlank(py, "fruits.append")).toEqual({ ok: false, reason: "Type just the missing part: the code around the blank is already there." });
    expect(checkBlank(list, "<li>").ok).toBe(false);
    expect(checkBlank(sql, "FORM")).toEqual({ ok: false, reason: "'FORM' is not an SQL keyword." });
    expect(checkBlank(py, "push")).toEqual({ ok: false, reason: "'push' is not a list method." });
    expect(checkBlank(py, "Append")).toEqual({ ok: false, reason: "'Append' is not a list method. Names are case-sensitive." });
    expect(checkBlank(cipher, "DENSE 4EST")).toEqual({ ok: false, reason: "No digits: the scroll is plain words." });
  });
  it("skips the bracket and touching-code rules when a legal token contains the character", () => {
    expect(checkBlank(cpp, "<")).toEqual({ ok: true });
    expect(checkBlank(cpp, "<=")).toEqual({ ok: true });
  });
  it("pattern blanks skip the quote, bracket and touching-code rules", () => {
    expect(checkBlank(cipher, "'dense' (forest)")).toEqual({ ok: true });
  });
  it("never looks at answers: the answer and a legal wrong token get the same verdict", () => {
    expect(checkBlank(py, "append")).toEqual(checkBlank(py, "count"));
    expect(checkBlank(sql, "FROM")).toEqual(checkBlank(sql, "WHERE"));
  });
  it("isCorrectBlank normalises, honours case and compares letters for the cipher", () => {
    expect(isCorrectBlank(sql, "from;")).toBe(true);
    expect(isCorrectBlank(py, "Append")).toBe(false);
    expect(isCorrectBlank(cpp, "!=")).toBe(true);
    expect(isCorrectBlank(cipher, "dense-forest!")).toBe(true);
  });
  it("wrong copy", () => {
    expect(wrongBlankCopy("abcdefghijklmnopqrstuvwxyz")).toBe('Not quite: "abcdefghijklmnopqrstuvwx…" isn\'t the answer. Check the hint or try again.');
    expect(wrongChoiceCopy()).toBe("Not quite: that isn't the answer. Check the hint or try again.");
    expect([wrongMatchCopy(1), wrongMatchCopy(3)]).toEqual(["1 of 5 pairs is wrong.", "3 of 5 pairs are wrong."]);
  });
  // shuffle.test.ts
  it("order is a stable permutation for a seed and id, and data index 0 (the correct option) lands in every slot across seeds", () => {
    expect(order(4, 7, "x")).toEqual(order(4, 7, "x"));
    expect([...order(4, 7, "x")].sort()).toEqual([0, 1, 2, 3]);
    const slots = new Set(Array.from({ length: 200 }, (_, s) => order(4, s, "x").indexOf(0)));
    expect(slots).toEqual(new Set([0, 1, 2, 3]));
  });
  // access.test.ts
  it("accessCode is 4 alphabet characters, deterministic, never blocklisted", () => {
    expect(accessCode(42)).toBe(accessCode(42));
    expect(accessCode(42)).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    for (let n = 0; n < 20000; n++) expect(CODE_BLOCKLIST).not.toContain(accessCode(n));
  });
  ```
- [ ] **Step 2: Run** `npx vitest run src/learn`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement.**
  - **`checkBlank`** follows spec §"The live check" rules 1–6 in order.
    - Rules 2–4 apply only to `legal`/`notLegal` blanks.
    - Rule 3 is skipped when any legal token contains a bracket.
    - Rule 4 uses `normalize(input)` and `gapContext(c.code)`. It skips a sub-check only when the blank has `legal` and a legal token contains the touching characters. Like every rule, it never reads `answers`: if an answer would trip rule 4, that is a data error for Task 2's bank test to catch. "Wrapped in quotes" means `/^(["']).*\1$/`.
    - Rule 5 compares case-insensitively unless `caseSensitive`. It adds ` Names are case-sensitive.` when a legal token matches ignoring case.
    - Rule 6 tests the trimmed input.
  - **`order`** is a seeded Fisher–Yates driven by mulberry32 over a 32-bit FNV-1a hash of `` `${seed}:${id}` ``.
  - **`accessCode(n)`** maps the hash of `n` to 4 alphabet characters; while the result is blocklisted, it retries with n + 1, n + 2, ….
- [ ] **Step 4: Run** `npx vitest run src/learn` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(learn): the challenge engine — types, live check, answers, shuffle, access code`.

### Task 2: The question bank and the chest table

**Files:**
- Create:
  - `src/learn/bank/html.ts`, `css.ts`, `php.ts`, `sql.ts`, `python.ts` (exports `PY1_BANK`, `PY2_BANK`), `java.ts`, `csharp.ts`, `cpp.ts` (exports `CPP1_BANK`, `CPP2_BANK`)
  - `src/learn/bank/matcher.ts`, `src/learn/bank/builtin.ts`, `src/learn/chests.ts`
- Test: `src/learn/bank.test.ts`

**Interfaces:**
- Consumes: Task 1 types, `checkBlank`, `isCorrectBlank`.
- Produces:
  - Each language file: `export const <LANG>_BANK: readonly [ChestQuestion, ChestQuestion, ChestQuestion]`, with the data of spec §Appendix for that chest, in its order. Ids are as in the appendix (`html-link`, …).
  - `matcher.ts`: `MATCHER_ROUNDS: readonly [MatchChallenge, MatchChallenge, MatchChallenge]` (spec §"Syntax Matcher rounds", `title` `< SYNTAX TERMINAL: DEV VILLAGE >`).
  - `builtin.ts`: `GATE_CSS`, `SCROLL_CIPHER`, `ARCHIVE_LOCK: BlankChallenge`:
    - **`GATE_CSS`:** code lines `.north-gate {`, `    width: 100%;`, `    display: ___;  <-- FIX THIS VALUE`, `}`, with the other fields per spec §"The gate and the cipher".
    - **`SCROLL_CIPHER`:** code `// ROT13: every letter is shifted 13 places` and `` `rot13("${SCROLL_CIPHERTEXT}")  → ___` ``. Title `< SCROLL CIPHER: ROT13 >`, prompt `Decode the scroll to learn where the artifact is hidden.`, `upperCase: true`, `wrong: cipherError`.
    - **`ARCHIVE_LOCK`:** code `ACCESS CODE: ___`. `pristine` `Type the 4-character code.`, `live` pattern `/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/i` (it checks the trimmed input), with the copy of spec §"The Syntax Terminal and the Archive".
  - `chests.ts`:
    ```ts
    export type Chest = { id: ChestId; badge: string; spoken: string; language: string; zone: ZoneId;
      at: Point | null /* null: the Archive */; caption: "above" | "below" | null; north: boolean; where: string;
      bank: readonly [Challenge, Challenge, Challenge] };
    export const CHESTS: readonly Chest[];        // spec table order
    export const CHEST_IDS: readonly ChestId[];
    export const chestById: (id: ChestId) => Chest;
    export function chestChallenge(picks: Record<ChestId, 0 | 1 | 2>, id: ChestId): Challenge;
    ```
    - `bank` items get `title` `` `< CODE CHEST: ${badge.toUpperCase()} >` ``.
    - `where` is the Codex text of spec §"The Codex": `C++ Peaks · north of the wall`, `C++ Peaks`, `Dev Village`, `Dev Village · in the Archive`.
    - `language` is the full name used in card copy (`HTML`, `CSS`, `PHP`, `SQL`, `Python`, `Java`, `C#`, `C++`).
  - The gate keeps exporting `PUZZLE_HINT` etc. from `src/game/constants.ts`; `builtin.ts` imports them, so copy has one home.

- [ ] **Step 1: Write the failing bank test** (`bank.test.ts`), one `it` per bullet of spec §Testing "Bank validity" and the near-miss and reference bullets:
  - **"10 chests in table order, 3 challenges each, every language, 3 matcher rounds of 5 pairs":** `CHEST_IDS` equals the Global Constraints order, and the set of `lang`s over all chests has all 8 languages.
  - **"each blank: one gap, one kind of live data, answers pass their own check":** `code.join("\n").split("___").length === 2`; `checkBlank(c, a).ok` for every answer `a`.
  - **"legal lists have ≥ 2 valid wrong tokens; notLegal lists hold no answer".**
  - **"Blocks tiles: exactly one accepted answer and ≥ 2 wrong tiles that pass the live check":** in Blocks mode, `checkBlank(c, t, "blocks").ok`.
  - **"choices: 4 unique options, correct in range"; "match rounds: unique snippets and unique labels".**
  - **"real near-misses pass the live check":** a table `[challengeId, token][]` with exactly the spec's list:
    - `py-append`: `count`, `index`
    - `py-print`: `type`, `format`
    - `java-println`: `append`, `write`, `equals`
    - `cs-writeline`: `Read`, `ReadKey`
    - `cpp-cout`: `wcout`, `cerr`
    - `php-echo`: `include_once`, `throw`
    - `cpp-for`: `not_eq`
    - `css-color`: `margin`
    - `html-link`: `download`
    - `html-list`: `b`
    - `sql-from`: `SELECT`, `AS`
    - `gate-css`: `flow-root`
  - **"no flagged token is a real name":** each `notLegal` blank's tokens are disjoint from a reference list in the test:
    - `html-link`: `href src alt class id title target rel style download ping type hreflang referrerpolicy`
    - `html-list`: `li ul ol dl dt dd menu p b div span`
    - `css-color`: `color background background-color border-color fill stroke margin font-size outline caret-color accent-color`
    - `sql-from`: `FROM AS INTO WHERE HAVING LIMIT OFFSET AND OR LIKE SELECT`
    - `gate-css`: `block inline flex grid none contents table flow-root list-item`
  - **"every input today's isCorrectDecode accepts, with no digit, passes the scroll cipher's live check and is correct":** `it.each(["DENSE FOREST", "dense forest", " Dense Forest ", "DENSEFOREST", "dense-forest", "dense-forest!"])`, asserting `checkBlank(SCROLL_CIPHER, v)` equals `{ ok: true }` and `isCorrectBlank(SCROLL_CIPHER, v)` is `true`.
  - **"chestChallenge returns the picked question with the chest's title":** `chestChallenge({ ...allZero, "chest-sql": 2 }, "chest-sql").id === "sql-max"`, with title `< CODE CHEST: SQL >`.
- [ ] **Step 2: Run** `npx vitest run src/learn/bank.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the data, transcribing spec §Appendix exactly: prompts, code lines, answers, live data (closed lists as `legal`, open as `notLegal`, with the labels), tiles, hints and explanations. `py-append`'s `legal` is exactly `dir(list)` as Python 3.13 prints it: `__add__ __class__ __class_getitem__ __contains__ __delattr__ __delitem__ __dir__ __doc__ __eq__ __format__ __ge__ __getattribute__ __getitem__ __getstate__ __gt__ __hash__ __iadd__ __imul__ __init__ __init_subclass__ __iter__ __le__ __len__ __lt__ __mul__ __ne__ __new__ __reduce__ __reduce_ex__ __repr__ __reversed__ __rmul__ __setattr__ __setitem__ __sizeof__ __str__ __subclasshook__ append clear copy count extend index insert pop remove reverse sort`.
- [ ] **Step 4: Run** `npx vitest run src/learn` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(learn): the 30-question bank, Matcher rounds, built-in challenges and the chest table`.

### Task 3: The engine in the reducer — the gate and the cipher move onto it

**Files:**
- Modify:
  - `src/game/types.ts` (state and actions)
  - `src/game/reducer.ts` (initial state, `isModalOpen`, the new actions, the gate and cipher)
  - `src/game/constants.ts` (gate copy and the new `puzzleError`)
  - `src/hooks/useKeyboardControls.ts` (Esc)
  - `src/screens/overworld/Overworld.tsx` (temporary: feed the old modals, unchanged, from the new state)
- Create: `src/game/challenges.ts`
- Test: `src/game/reducer.test.ts` (migrate and extend), `src/game/challenges.test.ts`, `src/hooks/useKeyboardControls.test.tsx`, `src/screens/overworld/Overworld.test.tsx`, `src/screens/overworld/TouchControls.test.tsx` (seeds only)

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - **New `GameState` fields** (spec §"State and actions"), plus `challenge.lastWrong: string | null`, the JSON of the last wrong value, so an unchanged resubmission is ignored. Initial values:
    - `picks`: all `0`;
    - `seed`: `0`; `badges`: `[]`; `answered`: `{}`;
    - `challenge`: `null`; `hintsRevealed`: `[]`;
    - `matcherRound`: `0`; `matcherSolved`: `false`;
    - `accessCode`: `accessCode(0)`;
    - `archiveOpen`: `false`; `codexOpen`: `false`.
  - **Removed fields:** `terminalOpen`, `puzzleError`, `hintRevealed`, `cipherOpen`, `cipherError`, `cipherHintRevealed`.
  - **`GameAction`:**
    - removes `closeTerminal`, `submitCode`, `revealHint`, `closeCipher`, `submitCipher`, `revealCipherHint`;
    - keeps `openCipher`;
    - adds `{ type: "submitChallenge"; value: SubmitValue }`, `{ type: "revealChallengeHint" }`, `{ type: "closeChallenge" }`, `{ type: "resetLogic" }`, `{ type: "toggleCodex" }`.
  - `src/game/challenges.ts`: `challengeOf(s: GameState, target: ChallengeTarget): Challenge`, i.e. `GATE_CSS`, `SCROLL_CIPHER`, `ARCHIVE_LOCK`, `MATCHER_ROUNDS[s.matcherRound]`, or `chestChallenge(s.picks, id)`.
  - `isModalOpen(s) = s.challenge !== null || s.logicOpen || s.codexOpen`.
  - `puzzleError(value) = `Not quite: display: ${value} doesn't open this lock. Check the hint or try again.``; gate instructions `Fix the CSS value below to open the north gate.`.

- [ ] **Step 1: Write the failing tests, and migrate the old ones.**
  - **Migrating the gate and cipher tests:** replace `terminalOpen: true` with `challenge: { target: "gate", error: null, wrongTries: 0, solved: false, lastWrong: null }`; `cipherOpen` likewise with `"cipher"`; `submitCode`/`submitCipher` with `submitChallenge`; `revealHint`/`revealCipherHint` with `revealChallengeHint` and `hintsRevealed` containing `"gate-css"`/`"scroll-cipher"`; `closeTerminal`/`closeCipher` with `closeChallenge`. Update the gate's error expectation to `Not quite: display: flex doesn't open this lock. Check the hint or try again.`.
  - **New reducer tests**, in `describe("gameReducer: the challenge engine")`:
    - "interacting with the locked gate opens the gate challenge and logs as before": `challenge.target === "gate"`, last log `Gate terminal ready. Puzzle link found.`.
    - "submitting `block;` opens the gate, closes the terminal and logs `Gate unlocked. The way north is open.`".
    - "a wrong gate value sets the new error and counts one wrong try; the same value again changes nothing (`toBe`)".
    - "the second different wrong answer reveals the hint, appends the drone note, and keeps counting": `hintsRevealed` contains `"gate-css"`; error ends ` The drone has a tip below.`; `wrongTries === 2`.
    - "closing resets the tries but keeps a revealed hint": after `closeChallenge`, `challenge === null` and `hintsRevealed` still contains it.
    - "the cipher accepts `dense-forest!` (letters compare), logs the clue line and closes".
    - "crafted submits do nothing": with no challenge open; a number for the gate; an array for the cipher. Each `toBe` its input.
    - "isModalOpen: a challenge, the logic lock or the Codex"; "toggleCodex opens and closes the Codex, but not while a challenge is open".
  - **`challenges.test.ts`:** "challengeOf maps each target": gate → `GATE_CSS`, cipher → `SCROLL_CIPHER`, archive → `ARCHIVE_LOCK`, matcher → `MATCHER_ROUNDS[s.matcherRound]`, `chest-sql` with pick 1 → `sql-where`.
  - **`useKeyboardControls.test.tsx`:** "Esc closes an open challenge" (seed `challenge` as above; Esc dispatches `closeChallenge`).
  - **`Overworld.test.tsx`:** seed `challenge` in place of `terminalOpen`/`cipherOpen`, and change the gate's alert expectation (today `Compile error: display: flex keeps the gate shut.`) to `Not quite: display: flex doesn't open this lock. Check the hint or try again.`.
- [ ] **Step 2: Run** `npx vitest run src/game src/hooks src/screens/overworld`. Expected: the new tests FAIL; the migrated ones FAIL until the state exists.
- [ ] **Step 3: Implement.**
  - **`submitChallenge`:** for the gate and cipher, keep today's effects and logs, and close on success. On a wrong answer:
    - error = the challenge's `wrong(value)`, where value is the gate's normalised input (or `(empty)`), or the cipher's trimmed input (or `(empty)`);
    - `wrongTries + 1`; `lastWrong` = the JSON of the value;
    - on reaching 2 tries, add the challenge id to `hintsRevealed`;
    - from 2 tries on, append ` The drone has a tip below.`.
  - **Ignoring:** a value whose JSON equals `lastWrong` is ignored (the state is returned unchanged).
  - **`revealChallengeHint`** adds the open challenge's id to `hintsRevealed`.
  - **Esc** dispatches `closeChallenge` when a challenge is open, `closeLogic` for the lock, `toggleCodex` for the Codex.
  - **Temporary shims:** Overworld renders the old modals from `challenge?.target` until Task 7, with `error` from `challenge.error` and `hintRevealed` from `hintsRevealed`. Their `onSubmit` dispatches `submitChallenge`, and `onClose` dispatches `closeChallenge`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS.
- [ ] **Step 5: Commit** `refactor(game): one challenge engine; the gate and the cipher move onto it`.

### Task 4: Chests in the world — places, opening, badges, cards, prompts

**Files:**
- Modify:
  - `src/game/types.ts` (`PoiId` gains `ChestId` minus `chest-cs`, plus `"terminal" | "archive"`)
  - `src/game/constants.ts` (`TERMINAL`, `ARCHIVE` places; `LOG.badge`; card copy; narrow `INSPECT_COPY`'s key from `Exclude<PoiId, "villager">` to the old places `"gate" | "chest" | "river" | "tower" | "signpost" | "artifact"`, so the wider `PoiId` still compiles)
  - `src/game/zones.ts` (places per zone)
  - `src/game/reducer.ts` (interact and submit for chests; `reachPlaces`)
  - `src/game/geometry.ts` (state-aware labels)
  - `src/hooks/useKeyboardControls.ts` (`[E]` uses `reachPlaces`)
  - `src/screens/overworld/Overworld.tsx` (computes the prompt, the touch label and the card; passes them down)
  - `src/screens/overworld/MapViewport.tsx` (`prompt` and `card` props; drops `villagerLine`, its own place lookup and `INSPECT_COPY`)
  - `src/screens/overworld/TouchControls.tsx` (`label` prop)
  - `src/screens/overworld/EventLog.tsx` (spoken badge names)
- Create: `src/game/cards.ts`
- Test: `src/game/reducer.test.ts`, `src/game/cards.test.ts`, `src/game/geometry.test.ts`, `src/game/zones.test.ts`, `src/screens/overworld/Overworld.test.tsx`, `src/screens/overworld/EventLog.test.tsx`, plus props upkeep in `src/screens/overworld/MapViewport.test.tsx` and `src/screens/overworld/TouchControls.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`CHESTS`, `chestById`, `chestChallenge`), Task 3.
- Produces:
  - `TERMINAL: Poi = { id: "terminal", label: "Syntax Terminal", x: 68, y: 60 }` and `ARCHIVE: Poi = { id: "archive", label: "Archive", x: 55, y: 66 }`.
  - `chestPlaces(zone: ZoneId): Poi[]` (in `zones.ts`): the chests with an `at`, labelled `<Badge> Chest`.
  - Zone places, in this order: Peaks `[...POIS, ...chestPlaces("peaks")]`; Village `[ADA, SIGNPOST, TERMINAL, ARCHIVE, ...chestPlaces("village")]`.
  - `reachPlaces(s: GameState): Poi[]` (in `reducer.ts`): `visiblePois(s)` minus north chests while `!s.gateUnlocked && !isNorthOfWall(s.player)`. Used by `[E]`, the prompt and the touch button.
  - `interactLabel(s: GameState, poi: Poi): string` and `promptText(s: GameState, poi: Poi): string` replace the place-only versions, with the verbs of spec §"The map overlay" (landmarks keep `[E] Inspect <label>` and the touch label `<label>`).
  - `cardFor(s: GameState): { title: string; text: string; y: number } | null` (in `cards.ts`): the inspection card for `s.inspected`. Today's `INSPECT_COPY` rules for the old places, Ada's line for `villager`, and spec copy for chests (earned or not), the terminal (solved or not) and the Archive (sealed; open shows the C# chest's card). `y` is the inspected place's `y`, found among `[...ZONES[s.zone].places, HIDDEN_ARTIFACT]` (not `visiblePois(s)`, which drops the artifact once found while `inspected` stays `"artifact"`).
  - **MapViewport** takes `card: { title: string; text: string; y: number } | null` and `prompt: string` (empty when nothing is in reach) in place of `villagerLine`. It renders the card whenever `card` is non-null, at `card.y > 50 ? "top-3" : "bottom-3"`, and no longer looks the place up in `[...POIS, HIDDEN_ARTIFACT, ADA, SIGNPOST]` (that list has no chests, terminal or Archive, so their cards would never render). It no longer imports `INSPECT_COPY` or `promptText`.
  - **TouchControls** takes `label: string | null` (the `[E]` button reads `[E] ${label}`, or `[E] Interact` when null) in place of computing `interactLabel(inRange)`.
  - **Overworld** computes `inRange = downed ? null : placeInReach(state.player, reachPlaces(state))`, then `prompt = inRange ? promptText(state, inRange) : ""`, `label = inRange ? interactLabel(state, inRange) : null` and `card = cardFor(state)`.
  - **EventLog** speaks badge names. Log entries stay `string[]`. Where an entry contains `the <Badge> Badge` for a chest whose `spoken !== badge` (C++ I, C++ II, Python I, Python II, C#), the name renders as `<span aria-hidden="true">{badge}</span><span className="sr-only">{spoken}</span>`, trying longer names first so `C++ II` is not read as `C++ I` + `I`. All other text renders unchanged. Team-log assertions that use `countIn` on `textContent` must use badges whose spoken form equals the written one (HTML, CSS, SQL, Java, PHP).
  - `LOG.badge(badge: string)` = `Earned the ${badge} Badge.`.

- [ ] **Step 1: Write the failing tests.**
  - **reducer**, `describe("gameReducer: chests")`:
    - "a south chest opens its picked challenge and sets inspected": `interact chest-html` at (14, 64) → `challenge.target === "chest-html"`, `inspected === "chest-html"`.
    - "a north chest before the gate logs `LOG.wallLocked`, sets `inspected` and opens nothing; after the gate it opens".
    - "a right answer earns the badge once, records the answer, logs it and shows the success view": with pick 0 on `chest-sql`, `submitChallenge "from"` → `badges` `["chest-sql"]`, `answered["chest-sql"] === "from"`, last log `Earned the SQL Badge.`, `challenge.solved === true`. A second submit is a no-op (`toBe`). Then, after `closeChallenge`, with pick 0 on `chest-php` (`php-echo`) and the player at (42, 66), `interact chest-php` and `submitChallenge "echo"` → `badges` equals `["chest-sql", "chest-php"]` (earn order).
    - "a choice is checked by data index and records the option text": pick 1 on `chest-sql` (`sql-where`), `submitChallenge 0` → earned, `answered` `WHERE age > 18`.
    - "an earned chest opens its card, not the challenge".
    - "badges, answers, picks and seed survive respawn".
    - "places outside your zone do nothing": `interact chest-php` in the Peaks `toBe` its input.
  - **`reachPlaces`:** "south of the locked wall, north chests are out of reach of [E]": at (20, 50), `placeInReach(p, reachPlaces(s))?.id === "chest-html"`; with `gateUnlocked`, Java is nearer.
  - **geometry:** "labels follow state":
    - `promptText(s, chest-sql place) === "[E] Open SQL Chest"`, then after earning, `"[E] Review SQL Chest"`;
    - terminal: `"[E] Use Syntax Terminal"`;
    - archive: `"[E] Unseal Archive"`, then once open `"[E] Open C# Chest"`;
    - the gate stays `"[E] Inspect Terminal Gate"` with touch label `"Terminal Gate"`.
  - **cards:** "card copy":
    - unearned SQL chest: `A sealed code chest. Answer its SQL question to earn the SQL Badge.`;
    - earned: `SQL Badge earned. ` + the picked question's explain;
    - terminal, unsolved (`matcherSolved: false`): `A village terminal running a Syntax Matcher. Solve it to print the Archive's access code.`, and the text doesn't contain `s.accessCode`; solved: `It prints the Archive's access code: ${s.accessCode}.`;
    - Archive, sealed: `The Archive's door is chained shut. Its keypad wants a 4-character access code.`;
    - Ada: her line;
    - "`y` is the inspected place's": `chest-sql` → 80; `archive` → 66, sealed or open; `artifact` after it is found → the artifact's `y`.
  - **EventLog:** "badge names in log entries carry their spoken form as hidden text": `logs={["Earned the C++ II Badge.", "Kai earned the C# Badge.", "Earned the SQL Badge."]}`. The first two entries each have one `.sr-only` span reading `C++ 2` and `C sharp`, beside an `aria-hidden="true"` span reading `C++ II` and `C#`; the SQL entry has no `.sr-only` span and `getByText("Earned the SQL Badge.")` finds it.
  - **MapViewport upkeep:** `props()` replaces `villagerLine: "Hi"` with `card: null, prompt: ""`. "Ada's card shows her current line; the signpost's shows its text" becomes "the inspection card shows the card it is given": `card: { title: "Ada", text: "Line X", y: 70 }` shows the `POI Inspection` region with `Ada` and `Line X`; `card: null` shows none. The signpost's copy is now pinned in `cards.test.ts`. The caption-steps-aside test passes `prompt: "[E] Inspect " + poi.label` alongside `inRange: poi`.
  - **TouchControls upkeep:** pass `label` where the tests pass `inRange`.
  - **zones:** "village places in order: villager, signpost, terminal, archive, chest-php, chest-sql, chest-py-2".
  - **Overworld:**
    - "walking to the HTML chest shows `[E] Open HTML Chest` on the prompt and the touch button" (`getAllByText` length 2);
    - "new places show their cards on the map": `initial={{ zone: "village", inspected: "chest-sql" }}` shows the `POI Inspection` region with `A sealed code chest. Answer its SQL question to earn the SQL Badge.` and class `top-3`; with `badges: ["chest-sql"]` it shows `SQL Badge earned.`; in the Peaks with `inspected: "chest-java"` and the gate locked it shows `A sealed code chest. Answer its Java question to earn the Java Badge.` with `bottom-3`; the existing card-placement test (artifact `top-3`, cache `bottom-3`) still passes.
- [ ] **Step 2: Run** `npx vitest run src/game src/screens/overworld`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Chest `interact`:** zone guard → north rule (the wall line, `inspected` set) → earned card or `challenge` for the chest.
  - **`submitChallenge` for chests:** check with `isCorrectBlank`, the choice's `correct` or `matchWrongCount`. Right answer: badge, answer, log, `solved: true`. Wrong answer: the generic copy, with the tries and hint logic of Task 3.
  - **`closeChallenge` on a solved chest** clears `challenge` (the CONTINUE path).
  - **Opening the terminal** (Matcher) and the Archive is Task 5; until then `interact terminal|archive` sets `inspected` only.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(game): language chests in both zones — opening, badges, cards and prompts`.

### Task 5: The Matcher, the access code, the keypad, the Archive, the logic reset, the per-game roll

**Files:**
- Create: `src/game/roll.ts`
- Modify: `src/game/reducer.ts`, `src/game/constants.ts` (`LOG.matcher`, `LOG.archiveUnsealed`, `LOG.accessDenied`), `src/screens/LogicModal.tsx` (`[ RESET ]`), `src/screens/overworld/Overworld.tsx` (roll at mount)
- Test: `src/game/reducer.test.ts`, `src/game/roll.test.ts`, `src/screens/LogicModal.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `rollGame(rand: () => number, codeSeed?: number): Pick<GameState, "picks" | "seed" | "matcherRound" | "accessCode">`:
    - picks: `Math.floor(rand() * 3)` per chest, in `CHEST_IDS` order;
    - seed: `Math.floor(rand() * 2 ** 31)`;
    - matcherRound: `Math.floor(rand() * 3)`;
    - accessCode: `accessCode(codeSeed ?? Math.floor(rand() * 2 ** 31))`.
  - Overworld's reducer init: `{ ...initialState, ...rollGame(Math.random, team?.startedAt ?? undefined), ...initial }`.
  - `LOG.matcher(code)` = `Syntax Terminal: access code ${code}.`; `LOG.archiveUnsealed` = `Archive unsealed.`; keypad error `Access denied.`.

- [ ] **Step 1: Write the failing tests.**
  - "using the terminal opens the Matcher; solving it logs the code and shows the success view; using it again reopens the solved view": `submitChallenge` with the right pairing for round 0 → `matcherSolved`, last log `Syntax Terminal: access code ${s.accessCode}.`, `challenge.solved`. Interacting again gives `challenge: { target: "matcher", solved: true }`.
  - "a wrong pairing reports the count": two labels swapped → error `2 of 5 pairs are wrong.`.
  - "the sealed Archive opens the keypad; a wrong code is denied; the right code (any case, spaces around) unseals it, logs once and closes".
  - "the keypad never unseals on an empty, malformed or crafted value": `""`, `"AB"`, `5` → `archiveOpen` stays false.
  - "the keypad accepts the code before the Matcher is solved".
  - "once open, the Archive acts as the C# chest": `interact archive` → `challenge.target === "chest-cs"`; after earning, the card.
  - "resetLogic clears the logic error".
  - **roll:** "rollGame uses the random source in order and the code seed when given": with `rand` cycling `[0.5, 0.9, 0.1, …]`, assert picks and matcherRound. `rollGame(rand, 1234).accessCode === accessCode(1234)`.
  - **LogicModal:** "[ RESET ] turns every switch off and hides stale outputs": after toggling A and B and running, Reset → every `switch` `aria-checked="false"` and every output shows `?`.
- [ ] **Step 2: Run** `npx vitest run src/game src/screens/LogicModal.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per spec §"The Syntax Terminal and the Archive". The keypad check in the reducer: trim, upper-case, `ARCHIVE_LOCK.live.pattern` must match, then compare with `s.accessCode`. A string that fails the pattern changes nothing.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(game): the Syntax Matcher, the access code and the Archive keypad`.

### Task 6: Team — `archiveOpen`, badge messages, closing stale terminals

**Files:**
- Modify:
  - `src/game/team.ts` (flags, lenient parse, badge message, teammate copy)
  - `src/game/reducer.ts` (`teamSync` closes stale terminals)
  - `src/net/supabaseTransport.ts` (`SUBSCRIBED` record)
  - `src/hooks/useTeamSession.ts` (`publishBadge`, `onBadge`)
  - `src/screens/overworld/Overworld.tsx` (publish new badges; log teammates' badges; first-badge note)
- Test: `src/game/team.test.ts`, `src/net/supabaseTransport.test.ts`, `src/hooks/useTeamSession.test.tsx`, `src/game/reducer.test.ts`, `src/screens/overworld/TeamOverworld.test.tsx`, `src/screens/TeamLobby.test.tsx` (stub only)

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces:
  - `TeamFlags` gains `archiveOpen: boolean` (in `FLAG_KEYS`, `NO_FLAGS`, `TEAMMATE_LOG`: `${n} unsealed the Archive.`). `parseFlags` requires the six old keys as booleans, and reads `archiveOpen` as `v.archiveOpen === true`.
  - `TeamMessage` gains `{ type: "badge"; id: string; name: string; chest: ChestId }`. `parseMessage` accepts it only with a valid id, a nickname and a chest in `CHEST_IDS`.
  - `const SUBSCRIBED: Record<TeamMessage["type"], true> = { pos: true, progress: true, start: true, badge: true }` replaces `MESSAGE_TYPES`.
  - `TeamSession.publishBadge(chest: ChestId): void` and `TeamSession.onBadge(cb: (name: string, chest: ChestId) => void): () => void`. Deduplicated per `` `${senderId}:${chest}` `` in a ref cleared on teardown; your own messages are never reported.
  - `LOG.teammateBadge(name, badge)` = `${name} earned the ${badge} Badge.`; `LOG.badgesPersonal` = `Badges are personal: each explorer opens their own chest.`.

- [ ] **Step 1: Write the failing tests.**
  - **team:**
    - "flags parse leniently: a flags object without archiveOpen is accepted as false; with it, true is kept";
    - "a badge message parses; an unknown chest, a bad name or a missing id is dropped";
    - "archiveOpen merges one-way and logs `Kai unsealed the Archive.`".
  - **supabaseTransport:** "a badge broadcast reaches the message callback" (follow the file's existing pos and progress fake-channel tests).
  - **useTeamSession**, with fake timers and the memory hub:
    - "publishBadge reaches teammates once; a repeat from the same sender is ignored; your own is not reported";
    - "onBadge listeners are removed by their unsubscribe".
  - **reducer**, Review Focus 1: "a teammate's flags close your open terminal for the same thing, logging only the teammate line":
    - with the gate challenge open, `teamSync { gateUnlocked: true }` → `challenge === null`, last log `Ana opened the gate.`, logs grew by 1;
    - the same for the cipher with `clueDecoded` and the keypad with `archiveOpen`.
  - **Overworld wiring** (`TeamOverworld.test.tsx`, a new `describe("Overworld badges with a stub session")`). It renders `<Overworld team={stub}>` directly, where `stub` is a `TeamSession` built like `TeamLobby.test.tsx`'s `stub()`, with `publishBadge: vi.fn()` and an `onBadge` that captures its callback. The App-level flow, in which Kai earns through the UI, is pinned in Task 12, once chests have map buttons.
    - "each badge in state is published once": with `initial={{ badges: ["chest-html"] }}`, `publishBadge` is called once with `"chest-html"`; a rerender doesn't call it again.
    - "a teammate's badges log their own lines, and the personal-badges note only the first time": calling the captured callback with `("Kai", "chest-html")` then `("Kai", "chest-sql")` leaves the log with `Kai earned the HTML Badge.`, `Badges are personal: each explorer opens their own chest.` and `Kai earned the SQL Badge.`, each exactly once and in that order.
  - **Review Focus 4** (`useTeamSession.test.tsx`): "a mixed room: an older client's progress without archiveOpen and a badge for an unknown chest are handled without errors". A raw transport on the same memory hub sends:
    - a `progress` message whose flags lack `archiveOpen`, so `onProgress` receives `archiveOpen: false` with the other flags kept;
    - `{ type: "badge", id, name: "Zed", chest: "chest-rust" }`, so `onBadge` is never called and nothing throws.
  - **Stub upkeep:** `TeamLobby.test.tsx`'s `stub()` gains `publishBadge: vi.fn()` and `onBadge: vi.fn(() => () => {})`, so `tsc -b` stays clean.
- [ ] **Step 2: Run** `npx vitest run src/game src/net src/hooks src/screens/overworld/TeamOverworld.test.tsx src/screens/TeamLobby.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Badges out:** Overworld keeps a `published` ref (a Set of chest ids). For each id in `state.badges` not yet in it, it calls `publishBadge`.
  - **Badges in:** `onBadge` dispatches `note` with the teammate line, and the first time per game also `LOG.badgesPersonal`.
  - **`teamSync`:** after merging flags, clear `challenge` when its target's flag is now set (gate/`gateUnlocked`, cipher/`clueDecoded`, archive/`archiveOpen`).
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(team): personal badges over every transport, a shared Archive, stale terminals close`.

### Task 7: The challenge terminal — blank (Type mode), submit row, hint, success view, focus

**Files:**
- Create: `src/screens/ChallengeTerminal.tsx`, `src/screens/challenge/BlankBody.tsx`, `src/screens/challenge/SubmitRow.tsx`, `src/screens/challenge/HintPanel.tsx`, `src/screens/challenge/useLiveCheck.ts`
- Modify: `src/ui/TerminalDialog.tsx` (focusable list, `inert` background), `src/screens/overworld/Overworld.tsx` (render `ChallengeTerminal`; remove the shims), `vitest.setup.ts` (a no-op `scrollIntoView`)
- Delete: `src/screens/TerminalModal.tsx`, `src/screens/CipherModal.tsx` and their tests (their checks move)
- Test: `src/screens/ChallengeTerminal.test.tsx`, `src/ui/TerminalDialog.test.tsx` (create if absent), `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces:
  ```ts
  export type ChallengeView = { error: string | null; wrongTries: number; solved: boolean; hintRevealed: boolean; seed: number;
    success: { line: string; spoken: string; explain: string; answer: string } | { code: string; explain: string } | null;
    yourCode: string | null /* keypad: shown once the Matcher is solved */ };
  export function ChallengeTerminal(props: { challenge: Challenge; view: ChallengeView; mode: BlankMode;
    onModeChange(mode: BlankMode): void; onSubmit(value: SubmitValue): void; onRevealHint(): void; onClose(): void }); // return type inferred, as elsewhere
  export function useLiveCheck(c: BlankChallenge, value: string, mode: BlankMode, edited: boolean): { result: CheckResult | "pristine"; flush(): CheckResult };
  ```
  - `challengeView(s: GameState): ChallengeView | null` is added to `src/game/challenges.ts`.
  - Overworld renders `<ChallengeTerminal key={s.challenge.target} … />`, so closing and reopening starts fresh.

- [ ] **Step 1: Write the failing tests** (`ChallengeTerminal.test.tsx`; fake timers where noted). The gate and cipher checks moved from the old modal tests stay, under their old names.
  - "renders a labelled dialog with the title, instructions label and prompt":
    - for `GATE_CSS`: the dialog is named `< TERMINAL GATE LOCK: C++ PEAKS >`; it shows `PUZZLE INSTRUCTIONS:` and `Fix the CSS value below to open the north gate.`; the textbox `display value` holds `none`, is focused, and its text is selected;
    - for `SCROLL_CIPHER`: `SCROLL INSTRUCTIONS:`, the textbox `decoded text` with placeholder `plain text`, the button `[ SUBMIT DECODE ]`.
  - "before the first edit the live line reads `Fill the blank, then submit.` with no aria-invalid".
  - "after typing, the result appears after a 500 ms pause, on blur or on submit, and is announced only when it changes":
    - type `FORM` into the bank's `sql-from` (`SQL_BANK[0]`, notLegal `FORM FRM`); nothing changes before 500 ms; after it, `⚠ 'FORM' is not an SQL keyword.`, `aria-invalid="true"`, and the polite region holds that text;
    - clearing it and typing `FRM` (still invalid, different reason) updates the line and the polite region to `⚠ 'FRM' is not an SQL keyword.` after the pause; retyping `FRM` adds no new announcement;
    - typing `FORMS` reads `Syntax OK. Submit to check your answer.`, because an open set flags only its listed near-misses.
  - "a valid entry reads `Syntax OK. Submit to check your answer.` (no ✓)".
  - "SUBMIT is aria-disabled with a visible reason; pressing it or Enter doesn't submit and re-announces the reason":
    - `onSubmit` isn't called, the reason line equals the live reason, and the button has `aria-disabled="true"` and is focusable;
    - after a wrong submit, the reason becomes `Change your answer to try again.` until the text changes.
  - "the error line is an alert; after two wrong tries the hint panel shows `Drone: stuck? Here's a tip.` and the hint".
  - "a revealed hint shows without the stuck line".
  - "reaching two wrong tries scrolls the hint panel into view, instantly under reduced motion": assign `Element.prototype.scrollIntoView = vi.fn()`; rerendering with `wrongTries` going from 1 to 2 calls it once with `behavior: "smooth"`; a later rerender and a hint revealed by `[ USE HINT ITEM ]` don't call it; under the reduced-motion `matchMedia` mock (as in `useReducedMotion.test.tsx`) the call has `behavior: "auto"`.
  - "success view": the code block stays with the answer filled in; `✓ SQL Badge earned` appears in a status region with the accessible name `SQL Badge earned`, then the explanation; `[ CONTINUE ]` is focused, and pressing it calls `onClose`.
  - "Matcher success shows `ACCESS CODE: K Q Z M`'s visual code, with the spaced-out accessible name"; rendered already solved (a reopened Matcher), `[ CONTINUE ]` is focused.
  - "the keypad shows `Your code: <CODE>` once the Matcher is solved, and its pristine line is `Type the 4-character code.`".
  - "[X] CLOSE and Esc close"; "Tab stays inside, and the page behind is inert while open".
  - **Overworld:** "pressing E at the gate opens the challenge terminal, `block` opens the gate" (the old flow, now through the new terminal).
- [ ] **Step 2: Run** `npx vitest run src/screens src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** per spec §"The challenge terminal" items 1–3 (blank Type mode only), 5, 6 and 7, and the Focus rules.
  - **Live check:** `useLiveCheck` debounces 500 ms with `setTimeout`; `flush` runs it at once (on blur and submit).
  - **Hint panel (spec §Hints):** when `view.wrongTries` reaches 2, an effect calls `scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" })` on the panel, with `reduced` from `useReducedMotion()`. It runs once per opening. jsdom has no `scrollIntoView`, so `vitest.setup.ts` assigns a no-op `Element.prototype.scrollIntoView` next to the `getContext` stub.
  - **Inert:** `TerminalDialog` renders in place, with no portal. While mounted, an effect walks from its outer element up to `document.body` and sets the `inert` attribute on every sibling, at each level, that doesn't already have it. On unmount it removes the attribute from exactly the elements it set. Use `hasAttribute`/`setAttribute("inert", "")`/`removeAttribute`, never the `inert` property: jsdom 29 doesn't reflect it, so the test (`toHaveAttribute("inert")` on a sibling, gone after unmount) would not see it. Its focusable list becomes `button:not([disabled]), input:not([disabled]), [tabindex="0"], [data-autofocus]`.
  - **Mode:** Overworld holds `const [mode, setMode] = useState<BlankMode>("type")` and passes it as `mode`/`onModeChange`. Task 8 adds the toggle that uses it.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(screens): one challenge terminal with live syntax checks, an honest SUBMIT and a success view`.

### Task 8: Blocks mode, Undo and Reset

**Files:**
- Create: `src/screens/challenge/useUndo.ts`, `src/screens/challenge/Toolbar.tsx`, `src/screens/challenge/BlockTray.tsx`
- Modify: `src/screens/challenge/BlankBody.tsx`, `src/screens/ChallengeTerminal.tsx`
- Test: `src/screens/challenge/useUndo.test.ts`, `src/screens/ChallengeTerminal.test.tsx`

**Interfaces:**
- Consumes: Task 7.
- Produces:
  ```ts
  export function useUndo<T>(start: T, now?: () => number): {
    value: T; set(next: T, opts?: { typing?: boolean }): void; breakRun(): void; undo(): void; reset(): void; canUndo: boolean; canReset: boolean };
  ```
  - At most 20 steps.
  - A `typing` change coalesces with the immediately previous change only if that change was also `typing`, came less than 1000 ms earlier, and `breakRun()` hasn't been called since. `breakRun()` adds no step and changes no value; `ChallengeTerminal` calls it on every mode change (spec item 4: a run ends at a 1-second pause, a mode switch or a placed tile).
  - `reset` is itself an undoable step; `canReset` is false when `value` equals `start`.
  - The mode is Task 7's Overworld state; it survives closing a terminal and resets with a new game, because a new game remounts Overworld.

- [ ] **Step 1: Write the failing tests.**
  - **useUndo:**
    - "typing within a second is one step; a pause starts a new one";
    - "breakRun ends a typing run: typing, breakRun, typing again within a second makes two steps";
    - "20 steps at most";
    - "Reset is undoable";
    - "canUndo and canReset".
  - **ChallengeTerminal**, Blocks mode:
    - "the toggle `Type | Blocks` shows only on code blanks (not the cipher or keypad)";
    - "Blocks mode turns the blank into a slot button and shows the tiles in the seeded order":
      - the slot is a button showing `___`;
      - the tiles equal `order(n, seed, id)` applied to `blocks`;
      - no textbox exists;
      - focus is on the first tile;
    - "tap, Enter or Space places a tile; a new tile replaces it; pressing the filled slot empties it";
    - "mouse drag places a tile; a touch press shorter than 300 ms doesn't start a drag" (fire `pointerdown`/`pointermove`/`pointerup` with `pointerType`);
    - "switching modes keeps the value";
    - "switching modes ends a typing run" (fake timers): type `a`, switch to Blocks and back to Type, type `b` within a second; one Undo leaves `a`;
    - "the live line in Blocks mode updates at once, and an empty slot reads `⚠ Place a block first.` after an edit";
    - "Undo after Reset restores the tile; Undo and Reset are unavailable with nothing to do, and focus moves to the blank when the focused one becomes unavailable";
    - "Ctrl+Z outside the text box runs Undo".
- [ ] **Step 2: Run** `npx vitest run src/screens`. Expected: FAIL.
- [ ] **Step 3: Implement** per spec §"The challenge terminal" items 3 (Blocks) and 4. Dragging uses Pointer Events: a mouse or pen starts dragging on move; touch starts only after a 300 ms hold without moving more than 8 px. Drop on the slot places the tile.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(screens): Blocks mode with drag, tap and keys, plus Undo and Reset`.

### Task 9: Choice and match bodies

**Files:**
- Create: `src/screens/challenge/ChoiceBody.tsx`, `src/screens/challenge/MatchBody.tsx`
- Modify: `src/screens/ChallengeTerminal.tsx`, `src/index.css` (five pair-tag tokens `--pair-1` … `--pair-5`)
- Test: `src/screens/ChallengeTerminal.test.tsx`, `src/ui/Button.contrast.test.ts` (tags ≥ 3:1 on `--panel`; numbers ≥ 4.5:1 on the tag)

**Interfaces:**
- Consumes: Tasks 7–8 (`useUndo`, `Toolbar`, `SubmitRow`).
- Produces:
  - choice submits the data index (`order(4, seed, id)[shown]`);
  - match submits `number[]`, where `value[i]` is the data index of the label paired with snippet i;
  - match labels are shown in `order(5, seed, id)` order.

- [ ] **Step 1: Write the failing tests.**
  - **Choice:**
    - "a radio group A–D in the seeded order; arrows move, Space picks; SUBMIT says `Pick an answer first.` until one is picked";
    - "submitting sends the data index";
    - "after a wrong answer the picked option shows ✗ and its name ends `, wrong` until another is picked";
    - "on open, focus is on the first shown option (or the checked one); a choice has no `[ UNDO ]` or `[ RESET ]`".
  - **Match:**
    - "pairing in either order with the lowest free number; picking a paired item unpairs it (`Unpaired 2.`) and selects it; picking on the same side moves the selection; picking the selected item clears it";
    - "accessible names end `, pair 2`, `, not paired`, and after a wrong submit `, pair 2, wrong`; new pairs announce `Paired 2: print("Hi") with Python.`";
    - "SUBMIT reads `Pair all 5 first (3/5 paired).` until all are paired, then submits the mapping";
    - "Undo removes the last pair; Reset clears them all and is undoable";
    - "mouse drag from a snippet onto a label pairs them";
    - "round 3 shows each snippet's language tag";
    - "on open, focus is on the first snippet; after Reset with focus on `[ RESET ]`, both `[ RESET ]` and `[ UNDO ]` become unavailable and focus moves to the first snippet".
- [ ] **Step 2: Run** `npx vitest run src/screens src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** per spec §"The challenge terminal" item 3 (choice, match), item 4 (the match toolbar; choices have none), the Focus rules (first or checked option; first snippet; the fallback to the first match item) and the phone rule (match columns stay side by side).
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(screens): choice questions and the Syntax Matcher's pairing`.

### Task 10: The Codex, its key and button, the badges line, the menu confirmation

**Files:**
- Create: `src/screens/Codex.tsx`, `src/screens/overworld/LeaveConfirm.tsx`
- Modify: `src/screens/overworld/TopHud.tsx` (`[C] Codex`), `QuestList.tsx` (badges line), `MiniMap.tsx` (legend `Codex: [C]`), `Overworld.tsx` (render the Codex and the confirmation), `src/hooks/useKeyboardControls.ts` (`c`; `paused`), `src/hooks/useGameTimers.ts` (`paused`)
- Test: `src/screens/Codex.test.tsx`, `src/hooks/useKeyboardControls.test.tsx`, `src/screens/overworld/Overworld.test.tsx`, `src/screens/overworld/TeamOverworld.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 4, 6.
- Produces:
  - `Codex(props: { badges: ChestId[]; answered: Partial<Record<ChestId, string>>; picks: Record<ChestId, 0|1|2>; team: boolean; onClose(): void })`;
  - `TopHud` gains `onCodex(): void`;
  - `QuestList` gains `badges: number` and `team: boolean`.
  - `useKeyboardControls(state, dispatch, paused = false)` and `useGameTimers(state, dispatch, paused = false)`. Overworld passes `true` while the leave confirmation is open, and adds it to `TouchControls`' `disabled`. While `paused`, the keyboard hook ignores every key, Esc included (`LeaveConfirm` handles its own Esc as `[ STAY ]`), and the timers treat it like `isModalOpen`: no `tick`, no `riverDamage`. `isModalOpen` stays as the spec defines it.

- [ ] **Step 1: Write the failing tests.**
  - **Codex:**
    - "titled `< CODEX: 2/10 BADGES >` (team: `< YOUR CODEX: 2/10 BADGES >`), one list in table order with each chest's place";
    - "an earned entry is a button with aria-expanded that shows the question, your answer and the explanation; several can be open; an unearned entry ends `· not earned yet`";
    - "focus starts on the first earned entry, else `[X] CLOSE`; Esc, `[X] CLOSE` and C close it";
    - "accessible names use the spoken forms (`C sharp`, `C++ 1`)".
  - **Keys**, Review Focus 3:
    - "C opens the Codex only without modifiers and only with no terminal open";
    - "typing `w a s d e c` into a terminal input neither moves, interacts nor opens the Codex".
  - **Overworld:**
    - "the top bar has `[C] Codex` at least 16 px from `[=] Menu`" (assert the class providing the gap, e.g. `ml-4`);
    - "Quests show `Badges: 0/10` (team: `Your badges: 0/10`), bold at 10/10";
    - "the legend shows `Codex: [C]`";
    - "with any badge or unlock, [=] Menu asks `Leave this game? Badges and unlocks aren't saved yet.` with `[ STAY ]` focused; STAY keeps playing and LEAVE calls onMenu; with nothing to lose it leaves at once";
    - "while `Leave this game?` is open, W doesn't move the player, E doesn't interact, C doesn't open the Codex, river damage doesn't tick (fake timers, player seeded in the river), and Esc closes the confirmation like `[ STAY ]`".
  - **App** (`src/App.test.tsx`, the existing "[=] Menu returns to the main menu and Solo Quest starts a fresh game"): the opened gate is an unlock, so after `[=] Menu` the `< LEAVE GAME? >` dialog shows with `[ STAY ]` focused; click `[ LEAVE ]`, then `Solo Quest`, and the test continues as before.
- [ ] **Step 2: Run** `npx vitest run src/screens src/hooks src/App.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per spec §"The Codex" and §"The 10 chests" (Persistence). The confirmation pauses play like any terminal, through `paused`. The Codex uses `TerminalDialog` for its frame. The confirmation is a small dialog using `TerminalDialog`, titled `< LEAVE GAME? >`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(overworld): the Codex, its key and button, the badges line and a leave confirmation`.

### Task 11: Sprites, scene and mini-map

**Files:**
- Modify:
  - `src/render/sprites.ts` (`code-chest` 2 frames, `syntax-terminal` 2 frames, `archive` 2 frames)
  - `src/render/scene.ts` (`SceneInput` gains `archiveOpen`, `matcherSolved`, `earned`; chests, terminal and Archive drawn)
  - `src/render/areas/village.ts` (the Archive leaves `props`; new protected boxes)
  - `src/render/areas/peaks.ts` (chest protected boxes)
  - `src/screens/overworld/MapViewport.tsx` (new required props `badges: ChestId[]`, `matcherSolved: boolean`, `archiveOpen: boolean`; the scene input gets `earned: badges`, `matcherSolved`, `archiveOpen`)
  - `src/screens/overworld/MiniMap.tsx` (diamonds; new required props `badges: ChestId[]`, `archiveOpen: boolean`)
  - `src/screens/overworld/Overworld.tsx` (pass `badges`, `matcherSolved` and `archiveOpen` from state to MapViewport; `badges` and `archiveOpen` to MiniMap)
  - `src/screens/MenuBackdrop.tsx` (scene input defaults)
- Test: `src/render/sprites.test.ts`, `src/render/scene.test.ts`, `src/render/terrain.test.ts`, `src/screens/overworld/MiniMap.test.tsx`, `src/screens/overworld/Overworld.test.tsx`, plus fixture upkeep so `tsc -b` stays clean: `src/render/paint.test.ts` and `src/screens/overworld/MapCanvas.test.tsx` (their `SceneInput` literals gain `archiveOpen: false, matcherSolved: false, earned: []`) and `src/screens/overworld/MapViewport.test.tsx` (`props()` gains `badges: [], matcherSolved: false, archiveOpen: false`)

**Interfaces:**
- Consumes: Task 2 (`CHESTS`), Task 4 (places).
- Produces:
  - **Sprite grids:** bottom-anchored, every row of the stated width, outline `o` `#0b1020`.
    - `code-chest` 16 × 16: palette teal `#2dd4bf`, deep blue `#1e3a8a`, steel `#94a3b8`. Closed: a rounded lid over a body with a centred lock plate. Open: the lid raised behind, with a lighter interior.
    - `syntax-terminal` 16 × 24: a post with a 12 × 8 screen, red `#ef4444` (frame 0) and green `#22c55e` (frame 1).
    - `archive` 32 × 24: the `hut` grid, except the door columns, which are chained with a padlock (frame 0) or a dark open doorway (frame 1).
  - **Scene:**
    - chests are drawn at their art points (`toArt(place)`), frame 1 if earned;
    - the C# chest is drawn at art (176, 119) only while `archiveOpen`;
    - the terminal at `toArt(TERMINAL)`, frame `matcherSolved ? 1 : 0`;
    - the Archive at art (176, 116), frame `archiveOpen ? 1 : 0`.
  - **Mini-map:** chests are diamonds (a 1.5 × 1.5 rotated square): unearned `#0f172a` with a 1 px `#2dd4bf` border; earned solid `#2dd4bf` with a 1 px `#0f172a` border. The C# diamond shows at the Archive only when `archiveOpen`.

- [ ] **Step 1: Write the failing tests.**
  - "sprites: code-chest 16×16 ×2 frames, syntax-terminal 16×24 ×2, archive 32×24 ×2, bottom-anchored".
  - "the village scene draws the Archive (sealed frame), the terminal (red frame) and its three chests; no `hut` at (176,116)".
  - "earned chests draw open; the C# chest appears only once the Archive is open".
  - "the Peaks scene draws its six chests; north ones behind the wall's feet row".
  - "village decorations stay clear of the new protected boxes" (extend the existing village decoration test).
  - "mini-map: one diamond per chest in its zone's cell; earned ones solid; no C# diamond until the Archive opens".
  - **Overworld:** "the mini-map shows an earned chest solid from state": `initial={{ badges: ["chest-html"] }}` makes the HTML diamond in the Peaks cell the solid one (this pins that Overworld passes the data through).
- [ ] **Step 2: Run** `npx vitest run src/render src/screens/overworld`. Expected: FAIL.
- [ ] **Step 3: Implement.** Draw the grids to the stated palettes; the tests pin sizes and frames, the look is a judgement call reviewed in the browser check.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): code chests, the Syntax Terminal and the Archive on the map and mini-map`.

### Task 12: Map buttons, captions, hit areas and label weights

**Files:**
- Modify:
  - `src/screens/overworld/mapLayout.ts` (`LANDMARK_CAPTIONS` gains the chests, `Terminal` and `Archive`; `hitAreas` with midline cuts)
  - `src/screens/overworld/labelLayout.ts` (`heavy` boxes cost 500)
  - `src/screens/overworld/MapViewport.tsx` (buttons, caption visibility at 1×, heavy exit sign)
  - `src/index.css` (`--code-chest: #2dd4bf`)
- Test: `src/screens/overworld/mapLayout.test.ts`, `src/screens/overworld/labelLayout.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/ui/Button.contrast.test.ts`, `src/screens/overworld/TeamOverworld.test.tsx`

**Interfaces:**
- Consumes: Tasks 4, 11.
- Produces:
  - `hitAreas(boxes: { id: string; box: Rect }[], world: WorldRect): Record<string, CssRect>`: each a 44-px-minimum hit area as today, cut back at the midline between two drawings where two would overlap, never smaller than its own drawing.
  - `labelLayout(player, drone, map, obstacles, scale, fixed, heavy: Box[] = [])`: each heavy box a label covers costs 500 (`100` per fixed box, `1000` per mutual overlap as today). MapViewport passes `exitSignBox(world, zone)` as `heavy`, not `fixed`.
  - Caption texts: chests `<Badge>` / `<Badge> ✓`; the terminal `Terminal` (below); the Archive `Archive` / `C#` / `C# ✓` (above). Chest caption sides as in the spec table.
  - **Visibility:** at `world.scale < 2`, a chest caption chip is `opacity-0` unless its button is hovered or focused (`group-hover`/`group-focus-visible`) or the chest is `inRange`.
  - **Names:** each outdoor chest button's accessible name is its spoken badge name plus ` chest` (e.g. `C++ 1 chest`, `HTML chest`), plus `, earned` once earned (e.g. `SQL chest, earned`). The terminal is named `Syntax Terminal`. The Archive's name follows its caption: `Archive` while sealed, `C sharp chest` once open, and `C sharp chest, earned` once you've earned the C# badge.

- [ ] **Step 1: Write the failing tests.**
  - **mapLayout**, extending "no caption box intersects another…":
    - per zone, at 1× (without chest captions) and 2× (with them), the captions now include the chests, `Terminal` and `Archive`; blockers add every new sprite box;
    - "no two hit areas intersect after the midline cut, and the centre of every drawing lies in its own hit area";
    - "hit areas never shrink below their drawing".
  - **labelLayout:**
    - "a label over an exit sign costs 5 fixed-box hits": with one heavy box under the cheapest layout and two fixed boxes elsewhere, the layout prefers the fixed boxes;
    - the existing grid tests pass with the new captions as fixed and the exit sign as heavy.
  - **MapViewport:**
    - "the Peaks show six chest buttons and the village three plus `Terminal` and `Archive`, named by their spoken forms";
    - "earned chests' captions read `SQL ✓`, and the button is named `SQL chest, earned`";
    - "the Archive caption reads `Archive`, then `C#`, then `C# ✓`, and the button is named `Archive`, then `C sharp chest`, then `C sharp chest, earned`".
  - **Review Focus 5, MapViewport:** "at 1× a chest caption is hidden until hovered, focused or in reach, but the button keeps its accessible name". No mock is needed: MapViewport sizes itself with its private `useMapSize`, which in jsdom (no ResizeObserver) falls back to 600 × 360 at DPR 1, i.e. scale 1. As a precondition assert the `world-layer` width is `320px`. Then: the chip has `opacity-0`; with `inRange` set to that chest it doesn't; `getByRole("button", { name: "HTML chest" })` exists either way. Component tests can't reach 2×, so the 2× caption cases live in `mapLayout.test.ts` (via `fitWorld`) and the Task 13 browser check.
  - Chest buttons don't use `hideCaption`; the old landmarks keep it, and the existing "caption steps aside" test stays as it is.
  - **Contrast:** "--code-chest on the caption chip is at least 4.5:1".
  - **TeamOverworld**, App-level, using the file's `startedPair()`: "Kai earns two badges through the UI; Ana's log shows each line once and the personal-badges note once".
    - `vi.spyOn(Math, "random").mockReturnValue(0)` before `startedPair()`, so every pick is 0 (`html-link`, `css-color`); restore it after.
    - Kai clicks `HTML chest`, types `href` into the textbox `answer`, clicks `[ SUBMIT CODE ]`, then `[ CONTINUE ]`; then `CSS chest`, `color`, `[ SUBMIT CODE ]`.
    - After `flush()`, Ana's log has `Kai earned the HTML Badge.`, `Badges are personal: each explorer opens their own chest.` and `Kai earned the CSS Badge.`, each with `countIn(...) === 1`. Kai's own log has no `Kai earned` line.
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement.** If a caption or hit area at the spec's places fails at 1× or 2×, move that new place (chest or terminal) by the fewest 2-unit steps that clear it, and record a `Ruling:`. Never move existing places.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(overworld): chest, terminal and Archive buttons with captions, fair tap areas and label weights`.

### Task 13: README, browser check, final review

**Files:**
- Modify: `README.md`
- Create (scratchpad only): `…/scratchpad/learning/check.cjs`

- [ ] **Step 1: README.**
  - Intro: add the 10 language chests, the Syntax Matcher and the Codex.
  - How to play: add `C` (Codex) to the table, and bullets for the chests (`E` or their button; badges; Blocks mode and Undo/Reset), the Syntax Terminal and the Archive (access code; in teams the same code for everyone), and the live syntax check.
  - Team Lobby: badges are personal, and "Kai earned the SQL Badge." joins the examples; the Archive is shared.
  - Project layout: add `src/learn/` ("the challenge engine and question bank").
- [ ] **Step 2: Build and serve:** `npm run build`, then `npx vite preview --port 4173 --strictPort` in the background.
- [ ] **Step 3: Playwright checks**, printing PASS/FAIL per check and saving screenshots:
  - **1366 × 657:**
    - walk to the HTML chest, open it, answer by typing (live line, the SUBMIT reason, a wrong answer, the drone after 2), earn the badge (success view), open the Codex (`C`) and see it;
    - open another chest and answer with Blocks (tap a tile), using Undo and Reset;
    - walk to the village; solve the Matcher (read the round from the DOM order); unseal the Archive with the printed code; earn the C# badge;
    - the gate: `flex` gives the new error, `block` opens it.
  - **390 × 844, touch, DPR 3:** a chest with Blocks by tapping; a second chest answered by typing in the input (the submit row still reachable); the success view shows the earned badge; open the Codex with the `[C] Codex` top-bar button (not overlapping `[=] Menu`), see the badge, close it; captions hidden at 1× and shown in reach; the terminal stacks with the submit row under the live line; a match keeps two columns.
  - **Team, Same computer, two pages:** Kai earns a badge, and Ana's log shows the two lines once; Ana unseals the Archive with her code, and Kai's map shows it open with Kai's log line `Ana unsealed the Archive.`. Then, if the supabase.co WebSocket connects, repeat the badge and Archive steps in Online mode; otherwise print `SKIP Online: network blocked`.
  - **No console errors** (the blocked supabase.co WebSocket excepted, only when Online was skipped).
- [ ] **Step 4: Run** `npm test`, `npx tsc -b` and `npm run build`. Expected: all PASS.
- [ ] **Step 5: Commit** `docs: the learning core in the README`, then push. Then the executor's final whole-branch review and the finishing-a-development-branch menu.
