# Bigger question bank — design

Status: draft for review. Branch: `claude/trusting-archimedes-64rvrc`. Builds on `2026-10-09-learning-core-design.md`.

## Intent

Each of the 10 language chests asks one question per game, picked at random from a bank of 3. After a few games players meet repeats. Grow every chest's bank to **6** so games vary more. For a course project played by classmates in solo or 2–4 player team games; success means more variety with nothing else changing.

Decided with the user: 6 per chest (60 questions, 30 new); chests only (the Syntax Matcher's 3 rounds, the gate, the cipher and the Archive lock are unchanged); no memory of questions seen in earlier games.

## Design

1. **Data.** `Chest.bank` becomes `readonly Challenge[]` (today a 3-tuple). `src/learn/chests.ts` exports `BANK_SIZE = 6`; each `*_BANK` constant is a `readonly ChestQuestion[]` of exactly `BANK_SIZE` entries. `GameState.picks` and `chestChallenge` take `Record<ChestId, number>` (an index `0..BANK_SIZE-1`) instead of `0 | 1 | 2`.
2. **Content.** 3 new questions per chest, appended after the existing 3 (existing ids and text unchanged), keeping each bank a mix of `blank` and `choice` questions. Every new question follows the learning-core rules: a blank has exactly one `___` gap, a `live` check (`legal`, `notLegal` or `pattern`), `answers`, optional Blocks `blocks` tiles (4–6, exactly one accepted, at least 2 wrong tiles that pass the live check), a `hint` and an `explain`; a choice has 4 options, one `correct`. Ids are unique and follow the `<lang>-<topic>` pattern. Each question is about the chest's language and is correct for it.
3. **Rolling.** `rollGame` picks `Math.floor(rand() * BANK_SIZE)` per chest, once when a game starts, in `CHEST_IDS` order, consuming the same number of `rand()` draws as before so the seed, Matcher round and access code are unchanged for the same draws. A team game still rolls per player; teammates may get different questions from the same chest.
4. **Unchanged.** The reducer's initial `picks` (all `0`), the Codex (shows the question behind each earned badge via `picks`), badge and team messages, and the Matcher.

## Testing

- `bank.test.ts`: 6 challenges per chest, 60 distinct ids, and every existing invariant (blank gap count, live data, answers pass their own check, Blocks tile rules, choice shape) now holds across all 60.
- `roll.test.ts`: a draw `d` gives pick `Math.floor(d * 6)`; `0.999` gives `5`; seed, Matcher round and code are as before.
- A test that every pick `0..BANK_SIZE-1` resolves through `chestChallenge` to a challenge with that chest's title, for every chest.
- Existing tests that assume 3 (e.g. all-zero `picks` fixtures typed `0 | 1 | 2`) are updated to the new type.
- Content check: the new questions are written per language in parallel and each is then verified by an independent reviewer (the accepted answer is valid, wrong options are really wrong, the explanation matches, nothing is ambiguous or has two defensible answers).

## Out of scope

Remembering questions across games; more Matcher rounds; a harder tier; changing the question kinds.
