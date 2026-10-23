# Bigger Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the user chose native, inline execution). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow every language chest's question bank from 3 to 6 (60 questions, 30 new), picked at random per game.

**Architecture:** `Chest.bank` and each `*_BANK` constant become `readonly ChestQuestion[]`; one exported `BANK_SIZE` is the source of truth; `GameState.picks` becomes `Record<ChestId, number>`; `rollGame` rolls over `BANK_SIZE`. Tasks 2–4 add the new questions while `BANK_SIZE` is still 3 (tests use `>= 3` and uniqueness); Task 6 flips `BANK_SIZE` to 6 and tightens the tests to exactly 6.

**Tech Stack:** TypeScript strict (`tsc -b` also checks tests), Vitest 5 + jsdom, React 19.

**Spec:** `docs/superpowers/specs/2026-10-11-bigger-question-bank-design.md` (read it; it is the authority). Background: `docs/superpowers/specs/2026-10-09-learning-core-design.md`.

## Global Constraints

- Chests only: the Syntax Matcher's 3 rounds, the gate, the cipher and the Archive lock are unchanged.
- 3 new questions per chest, appended after the existing 3; existing ids, text and order unchanged (tests use `bank[0]` and `bank[1]`).
- Each new bank keeps the same mix as the old: 1 `blank` + 2 `choice` (so every chest ends with 2 blanks and 4 choices).
- A blank has exactly one `___` gap, a `live` check (`legal`, `notLegal` or `pattern`), `answers`, `caseSensitive`, `blocks` tiles (4–6, exactly one accepted, at least 2 wrong tiles that pass the live check), a `hint` and an `explain`. A choice has 4 unique `options`, one `correct` (data index 0–3), a `hint` and an `explain`. Ids are unique, `<lang>-<topic>`.
- The question must be correct for its chest's language and have exactly one defensible answer.
- `rollGame` consumes the same number of `rand()` draws in the same order, so seed, Matcher round and access code are unchanged for the same draws.
- No memory of questions seen in earlier games; no persistence changes.
- Commit trailers on every commit:
  ```
  Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub
  ```
- Branch `claude/trusting-archimedes-64rvrc`. No model identifiers in code or commits. Never push `main` without explicit permission.

## Review Focus

1. **The last pick.** A draw of `0.999` picks index `BANK_SIZE - 1`; every chest resolves every index `0..5` to a challenge with its own title. Pinned in Task 6.
2. **A second defensible answer.** A blank whose `answers` miss an equally valid token (e.g. `println` vs a qualified form), or a choice with two correct options. Pinned in Task 5 (independent verification) and, for the mechanical part, by the existing invariants over all 60.
3. **A wrong tile that is secretly right.** A Blocks tile that is a valid answer but not in `answers`. Pinned by the existing "exactly one accepted tile" invariant now covering the new blanks (Tasks 2–4) and by the near-miss tables extended in each task.
4. **The Codex and cards for a late pick.** An earned chest with pick 3–5 shows its own question and explanation in the Codex. Pinned in Task 6.
5. **Team games.** Each player's picks stay personal, and a team's access code is unchanged by the new draw range. Pinned in Task 1 (roll test).

---

### Task 1: Widen the types and roll over BANK_SIZE

**Files:**
- Modify: `src/learn/chests.ts`, `src/game/roll.ts`, `src/game/types.ts`, `src/game/reducer.ts`, `src/screens/Codex.tsx`, `src/learn/bank/{html,css,php,sql,java,csharp,cpp,python}.ts` (bank constant types only)
- Test: `src/learn/bank.test.ts`, `src/game/roll.test.ts`, `src/screens/Codex.test.tsx` (fixture type)

**Interfaces:**
- Produces:
  ```ts
  // chests.ts
  export const BANK_SIZE = 3;   // Task 6 sets it to 6
  export type Picks = Record<ChestId, number>;
  export function chestChallenge(picks: Picks, id: ChestId): Challenge;
  // every *_BANK: readonly ChestQuestion[]; Chest.bank: readonly Challenge[]
  // GameState.picks: Picks
  ```
- `rollGame` picks `Math.floor(rand() * BANK_SIZE)`.

- [ ] **Step 1: Write the failing tests.** In `roll.test.ts`: `draws.map((d) => Math.floor(d * BANK_SIZE))` replaces the literal 3; add `it("a draw of 0.999 picks the last question", …)` expecting every pick to equal `BANK_SIZE - 1`; keep the seed, Matcher round and access-code assertions as they are. In `bank.test.ts` replace `toHaveLength(3)` with `toBeGreaterThanOrEqual(BANK_SIZE)`, replace the `30` distinct-ids count with `CHESTS.reduce((n, c) => n + c.bank.length, 0)`, and type `allZero` as `Picks`.
- [ ] **Step 2: Run** `npx vitest run src/game/roll.test.ts src/learn/bank.test.ts`. Expected: FAIL (`BANK_SIZE` / `Picks` not exported).
- [ ] **Step 3: Implement** the interface above: drop the `0 | 1 | 2` types everywhere (`types.ts:57`, `reducer.ts:48`, `Codex.tsx:20`, `chests.ts`, `bank.test.ts`, `Codex.test.tsx`), change each `*_BANK` annotation to `readonly ChestQuestion[]`, and `titled(...)` to return `readonly Challenge[]`. `matcherRound` stays `0 | 1 | 2`.
- [ ] **Step 4: Run** `npx vitest run src/game src/learn src/screens/Codex.test.tsx` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `refactor(learn): banks are lists and picks are plain indexes`.

---

### Task 2: New questions — HTML, CSS, PHP

**Files:**
- Modify: `src/learn/bank/html.ts`, `src/learn/bank/css.ts`, `src/learn/bank/php.ts`
- Test: `src/learn/bank.test.ts`

**Interfaces:** Consumes the `ChestQuestion` shape and Task 1's list-typed banks. Produces 3 more questions in each of `HTML_BANK`, `CSS_BANK`, `PHP_BANK` (each ends with 6).

Topics (one blank, then two choices per bank; ids `<lang>-<topic>`):
- **HTML:** blank `html-img-alt` (the `alt` attribute on an image); choice `html-table-row` (which tag is a table row: `<tr>`); choice `html-attr-quotes` or `html-input-type` (which `type` makes a password box: `password`).
- **CSS:** blank `css-font-size` (the `font-size` property); choice `css-class` (selector for class `card`: `.card`); choice `css-display-none` (what `display: none` does: removes the element from the layout).
- **PHP:** blank `php-if` (the keyword that starts a condition, in `if ($age >= 18) { … }` blank `if`); choice `php-array` (how to write an array: `[1, 2, 3]`); choice `php-strlen` (what `strlen("Hello")` returns: `5`).

- [ ] **Step 1: Write the failing tests.** In `bank.test.ts`, add one row per new blank to the "real near-misses pass the live check" table (e.g. `["html-img-alt", "title"]`, `["css-font-size", "font"]`, `["php-if", "foreach"]`: tokens that are real but wrong) and one row per new blank to the "no flagged token is a real name" reference table (the real names that must not be flagged). Add `it("each new question is in its bank", …)` asserting `HTML_BANK`, `CSS_BANK` and `PHP_BANK` each have length 6 and the six ids are unique.
- [ ] **Step 2: Run** `npx vitest run src/learn/bank.test.ts`. Expected: FAIL (length 3; ids not found).
- [ ] **Step 3: Implement** the 9 questions, appended in each file, following the Global Constraints and the file's existing entries as the model for field shapes.
- [ ] **Step 4: Run** `npx vitest run src/learn` and `npx tsc -b`. Expected: PASS (all existing invariants now cover the new questions: gap count, live data, tiles, choices).
- [ ] **Step 5: Commit** `feat(learn): three more HTML, CSS and PHP questions`.

---

### Task 3: New questions — SQL, Java, C#

**Files:**
- Modify: `src/learn/bank/sql.ts`, `src/learn/bank/java.ts`, `src/learn/bank/csharp.ts`
- Test: `src/learn/bank.test.ts`

**Interfaces:** As Task 2, for `SQL_BANK`, `JAVA_BANK`, `CSHARP_BANK`.

Topics:
- **SQL:** blank `sql-order` (`ORDER BY` — blank `ORDER`); choice `sql-count` (what `COUNT(*)` returns); choice `sql-insert` (which statement adds a row: `INSERT INTO`).
- **Java:** blank `java-class` (the keyword that declares a class: `class`); choice `java-string` (type for text: `String`); choice `java-array-len` (what `arr.length` is for `int[] arr = {4, 5, 6}`: `3`).
- **C#:** blank `cs-class` or `cs-if` (the keyword for a condition: `if`); choice `cs-string` (the type alias for text: `string`); choice `cs-array` (what `new int[3].Length` returns: `3`).

- [ ] **Step 1: Write the failing tests** exactly as Task 2 Step 1, for the three banks and their new blank ids (near-miss and real-name tables get a row each; add the length-6 and unique-ids assertion).
- [ ] **Step 2: Run** `npx vitest run src/learn/bank.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the 9 questions.
- [ ] **Step 4: Run** `npx vitest run src/learn` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(learn): three more SQL, Java and C# questions`.

---

### Task 4: New questions — C++ I and II, Python I and II

**Files:**
- Modify: `src/learn/bank/cpp.ts`, `src/learn/bank/python.ts`
- Test: `src/learn/bank.test.ts`

**Interfaces:** As Task 2, for `CPP1_BANK`, `CPP2_BANK`, `PY1_BANK`, `PY2_BANK`. The two chests of a language must not repeat each other's topics.

Topics:
- **C++ I:** blank `cpp-include` (`#include <iostream>`: blank `include`); choice `cpp-main` (the function every program starts at: `main`); choice `cpp-bool` (what `5 > 3` evaluates to when printed with `cout << (5 > 3)`: `1`).
- **C++ II:** blank `cpp-while` (the loop keyword: `while`); choice `cpp-array-index` (the index of the first element: `0`); choice `cpp-pointer-deref` (what `*p` means: the value `p` points to).
- **Python I:** blank `py-input` (`name = ___("Name? ")`: `input`); choice `py-comment` (which symbol starts a comment: `#`); choice `py-type` (what `type(3.5)` shows: `float`).
- **Python II:** blank `py-dict-key` (reading a value: `ages["Ana"]` style, blank the key-lookup keyword/method `get` in `ages.___("Ana")`); choice `py-slice` (what `"devland"[0:3]` is: `dev`); choice `py-in` (what `3 in [1, 2, 3]` returns: `True`).

- [ ] **Step 1: Write the failing tests** as Task 2 Step 1, for the four banks and their new blank ids.
- [ ] **Step 2: Run** `npx vitest run src/learn/bank.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the 12 questions.
- [ ] **Step 4: Run** `npx vitest run src/learn` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(learn): three more C++ and Python questions per chest`.

---

### Task 5: Independent content verification

**Files:**
- Modify: the bank files, only where a finding is real
- Test: `src/learn/bank.test.ts` (a regression row for each real finding)

**Interfaces:** none.

- [ ] **Step 1: Verify the 30 new questions independently.** Run a workflow (ultracode is on) with one verifier agent per chest bank (10), each given only that bank's file and the Global Constraints. For every new question it checks: the accepted answer(s) are correct and complete (no other equally valid token missing from `answers`); wrong tiles and options are really wrong; exactly one defensible answer; the `hint` does not give the answer away and the `explain` is true; code in `code`/options is valid for the language (a verifier may run it with the language's toolchain where one is installed). The prompt must not tell the verifier what the author intended beyond the file. Each returns findings with severity.
- [ ] **Step 2: For each real finding,** write a failing test row that pins it (a near-miss, an extra accepted answer, a changed option), watch it fail, fix the bank entry, watch it pass.
- [ ] **Step 3: Run** `npx vitest run src/learn` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 4: Commit** `fix(learn): content review of the new questions` (skip when there is nothing to fix and say so in the ledger).

---

### Task 6: Flip BANK_SIZE to 6, tighten the tests, README

**Files:**
- Modify: `src/learn/chests.ts` (`BANK_SIZE = 6`), `README.md`
- Test: `src/learn/bank.test.ts`, `src/game/roll.test.ts`, `src/screens/Codex.test.tsx`

**Interfaces:** Consumes everything above.

- [ ] **Step 1: Write the failing tests.** `bank.test.ts`: the "10 chests…" test expects `toHaveLength(BANK_SIZE)` (and `expect(BANK_SIZE).toBe(6)`) per chest and 60 distinct ids; add `it("every pick 0..5 resolves for every chest, with the chest's title")` looping `CHESTS × 0..5` through `chestChallenge`; each result's `title` is the chest's `< CODE CHEST: … >` title and the six ids per chest are distinct. `roll.test.ts`: the `0.999` test now yields pick `5`. `Codex.test.tsx`: with `picks` set to `5` for an earned chest, the Codex shows that question's `explain` (Review Focus 4).
- [ ] **Step 2: Run** `npx vitest run src/learn src/game/roll.test.ts src/screens/Codex.test.tsx`. Expected: FAIL (`BANK_SIZE` is 3; picks 3–5 undefined).
- [ ] **Step 3: Implement** `BANK_SIZE = 6`. README: in "How to play → Code chests" change "from a bank of 3" to "from a bank of 6".
- [ ] **Step 4: Run** `npm test`, `npx tsc -b`, `npm run build`. Expected: all PASS. Then one Playwright check against `npx vite preview --port 4173 --strictPort` at 1366 × 657: with `Math.random` forced to `0.999` before load, open the HTML chest and confirm the sixth question appears and its answer earns the badge (screenshot to the scratchpad). Report PASS/FAIL.
- [ ] **Step 5: Commit** `feat(learn): six questions per chest`, then push to `claude/trusting-archimedes-64rvrc`. Then the executor's final whole-branch review and the finishing-a-development-branch menu.
