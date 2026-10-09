# Learning Core — Design

**Status:** sub-project order, approach (one challenge engine) and all four design sections approved in chat (2026-10-09). Revised after the adversarial spec review wf_e44c6f12-183 (content, rules and UX lenses, every blocking finding verified; reviewers ran real Python 3.13, PHP 8.3, g++ 13, Java 21, SQLite/PostgreSQL 16 and Chromium 141). Written spec awaiting review.
**Builds on:** the zones work on `claude/trusting-archimedes-64rvrc` (`2026-10-08-dev-village-zones-design.md`), which itself builds on the pixel-art map, team play and north wall specs.
**Why:** Group 2's proposal (*Chronicles of Devlandia*, ElecIT-104 / IT 20) promises language questions, mini-games, helpers and more that the game doesn't have. A claim-by-claim comparison found 31 missing and 55 partial items. This spec is the first of the sub-projects that close that gap.

## Goal

Make the game teach what the proposal says it teaches, with one engine that every later puzzle reuses:

1. **10 language treasure chests** with questions in HTML, CSS, PHP, Python, Java, C#, SQL and C++ (C++ as real code, not only a place name).
2. **A Syntax Matcher** at a new terminal in Dev Village. Solving it prints an access code that unseals the village's Archive.
3. **Helpers in every code blank:** live syntax highlighting before you submit, a Type / Blocks (drag-and-drop) mode for beginners, and Undo and Reset.
4. **A Codex** of the badges you have earned and the questions behind them.

## Decisions (from the chat)

| Question | Answer |
|---|---|
| Sub-project order | 1 Learning core (this) → 2 Mini-game pack → 3 Progression + saving → 4 Team play (chat, team-only content) → 5 World (village life, more areas, scrolling camera) |
| Answer formats | A mix: fill a blank in a code snippet, pick one of four, or predict the output |
| Where the chests go | Spread over both zones: 6 in C++ Peaks (3 north of the wall), 4 in Dev Village (1 inside the Archive) |
| Chest reward | A language badge, plus a Codex that keeps each solved question and its explanation |
| Chests in team games | Personal: each player answers to earn the badge; the log tells the team |
| Syntax Matcher | A village Syntax Terminal; solving prints an access code that unseals the Archive |
| Live check | Syntax only: it flags what can't be valid in the blank, never whether the answer is right |
| Drag-and-drop blocks | Included now: a Type / Blocks toggle on every code blank |
| Questions per chest | A bank of 3, one picked at random per game (30 in total) |
| Approach | One challenge engine; the CSS gate and the scroll cipher move onto it |

## Roadmap (replaces the zones spec's specs 2–5)

1. **Learning core** (this spec).
2. **Mini-game pack:** IT Word Search, Tile Slider, IT Crossword, on the same engine.
3. **Progression + saving:** XP and player levels (badges and solves feed XP), character gear, saved between sessions.
4. **Team play:** an in-game chatbox with safe commands; harder team-only variants and time limits.
5. **World:** village life (merchant, more villagers, collectibles), more areas (seasonal and language-named), the scrolling camera.

Each gets its own questions, design, spec and plan when its turn comes.

## Rules (game logic)

Coordinates, zones and reach are as today: game percentages of one 320 × 180 screen, `INTERACT_RADIUS` 13, places answer only in their zone.

**Language versions.** Answers, legal lists and outputs assume: Python 3.10+ run as a script (not the interactive prompt); PHP 8; Java 21; C# 12 / .NET 8; C++17 or later (no `std::print`); SQL as PostgreSQL 16 parses it; the HTML Living Standard; CSS as current Chromium supports it.

### Challenges

A **challenge** is data, in `src/learn/`. Every challenge has an `id`, a `lang` (`html`, `css`, `php`, `python`, `java`, `csharp`, `sql`, `cpp`, or `logic` for the built-in gate, cipher and keypad), a `title`, a `prompt`, a `hint` and an `explain`. The appendix lists every challenge's copy, word for word.

- **`blank`**: code lines with exactly one gap, written `___`. Fields:
  - `answers`: the accepted answers (one or more);
  - `start`: the starting value (default empty; the gate's is `none`);
  - `caseSensitive`: whether case matters (true for Python, Java, C#, C++; false for HTML, CSS, PHP keywords, SQL);
  - `compare`: `"normalised"` (default) or `"letters"` (the cipher: correct when the upper-cased A–Z letters of the input equal an answer's);
  - the live-check data, exactly one of:
    - `legal` (a **closed set**: the complete set of tokens `legalLabel` describes, taken from the language itself, never a sample; it includes the answers and at least two valid wrong tokens);
    - `notLegal` (an **open set** too large to list, such as HTML attributes, CSS properties or SQL keywords: a short list of near-misses that are certainly *not* `legalLabel`, each checked against the language's reference; only these are flagged, anything else passes);
    - `pattern` with `patternReason` (the cipher and the keypad);
  - `legalLabel`: names the category for the reason line, e.g. "a list method";
  - `blocks`: 4–6 tiles for Blocks mode (not on the cipher or keypad): exactly one accepted answer and at least two wrong tiles that pass the live check, so placing tiles never singles out the answer;
  - UI copy with defaults: `instructionsLabel` (`PUZZLE INSTRUCTIONS:`), `submitLabel` (`[ SUBMIT CODE ]`), `inputLabel` (`answer`), `placeholder` (none).
- **`choice`**: an optional code block, the question, four `options` (shown in code font when they are code) and `correct` (the data index). The output style is a `choice` whose question is "What does this print?". `submitLabel` `[ SUBMIT ANSWER ]`.
- **`match`**: five `pairs` of `{ snippet, label, tag? }` (`tag` is an optional muted language name shown after the snippet). `submitLabel` `[ SUBMIT MATCHES ]`.

The rule behind the live-check data: **a missed flag only costs a `Not quite`; a false flag teaches something untrue.** When unsure whether a token is real, it stays out of `notLegal` (or goes into `legal`).

### Answer checking

- **Normalising a blank's input:** trim; drop one trailing `;` and trim again; collapse inner runs of spaces to one; lower-case it unless `caseSensitive`.
- **Correct** when the normalised input equals a normalised accepted answer (for `compare: "letters"`, when both reduce to the same letters).
- **A choice** is correct when the picked data index is `correct`. **A match** is correct when all five pairs are right.
- **Wrong answers** cost nothing: retries are unlimited and nothing resets. The error copy (`role="alert"`) is:
  - blank: `Not quite: "<input>" isn't the answer. Check the hint or try again.` (the input cut to 24 characters plus `…`);
  - choice: `Not quite: that isn't the answer. Check the hint or try again.`, and the wrong option shows `✗` until another is picked;
  - match: `<n> of 5 pairs are wrong.` (`1 of 5 pairs is wrong.` when n is 1), and the wrong pairs show `✗` until changed;
  - the gate and the cipher: their own copy (see "The gate and the cipher").
- After a wrong submission, SUBMIT is not ready until the answer changes, with the reason `Change your answer to try again.` (so a double tap never counts as two misses).

### The live check

`checkBlank(challenge, input, mode)` returns `{ ok: true }` or `{ ok: false, reason }` from the input alone. It never looks at `answers`. Rules, in order:

1. Empty after trimming → `Type something first.` (Blocks mode: `Place a block first.`)
2. *(Blanks with `legal` or `notLegal` only.)* An odd number of `"` or of `'` → `Unclosed quote.`
3. *(Same, and only when no legal token contains a bracket.)* Brackets `()[]{}<>` that don't pair up in order → `Unclosed or extra bracket.`
4. *(Same, unless a legal token itself contains the character.)* The normalised input repeats the code touching the gap: it starts with the code touching the gap on its left, back to the previous space (`std::`, `System.out.`, `fruits.`, `<`; nothing when a space touches the gap), or contains the character touching the gap on its right when that is punctuation (`(`, `>`, `:`, `=`, `"`; never a letter, digit or space), or is wrapped in quotes → `Type just the missing part: the code around the blank is already there.` (Because it uses the normalised input, the gate's `block;` still passes.)
5. With `legal`: the normalised input isn't in it (case-insensitively unless `caseSensitive`); with `notLegal`: the normalised input is in it (case-insensitively) → `'<input>' is not <legalLabel>.` When `caseSensitive` and the input matches a legal token only ignoring case, ` Names are case-sensitive.` is added.
6. With `pattern`: the trimmed input doesn't match → `patternReason`.

When it runs (blank in Type mode):

- **Before the first edit** the line reads `Fill the blank, then submit.` (keypad: `Type the 4-character code.`), muted, with no `aria-invalid` and no underline.
- **After an edit** the result updates when typing pauses for 500 ms, when the input loses focus, or on a submit attempt. In Blocks mode it updates as soon as a tile is placed.
- **The valid state** reads `Syntax OK. Submit to check your answer.` (muted, no ✓: the ✓ glyph means solved or earned everywhere else). An invalid result reads `⚠ <reason>` (amber), with `aria-invalid` and a wavy underline.
- **The polite live region** speaks only when the result changes (valid ↔ a different reason), never once per keystroke.

**No-leak property** (tested for every blank): for each accepted answer `a` there are at least two wrong tokens `w` with `checkBlank(w).ok` (from `legal`, or for a `notLegal` blank, outside it), and the same holds among the Blocks tiles. Real near-misses also pass (see Testing).

### The 10 chests

| Chest (`id`) | Badge (spoken) | Zone | Place (game %) | Caption side | North of the wall |
|---|---|---|---|---|---|
| `chest-cpp-1` | C++ I (C++ 1) | Peaks | (64, 14) | above | yes |
| `chest-java` | Java | Peaks | (20, 44) | above | yes |
| `chest-cpp-2` | C++ II (C++ 2) | Peaks | (84, 44) | above | yes |
| `chest-html` | HTML | Peaks | (14, 60) | below | no |
| `chest-css` | CSS | Peaks | (46, 82) | above | no |
| `chest-py-1` | Python I (Python 1) | Peaks | (88, 62) | above | no |
| `chest-php` | PHP | Village | (42, 62) | above | no |
| `chest-sql` | SQL | Village | (12, 80) | below | no |
| `chest-py-2` | Python II (Python 2) | Village | (82, 82) | above | no |
| `chest-cs` | C# (C sharp) | Village | the Archive (not a place of its own) | — | no |

- **Places.** These keep every sprite off the ice, the wall, the paths, the exits and the props, and every caption clear (the review verified this set at 1× and 2×). The plan's layout tests may move any new place (a chest or the Syntax Terminal) by the fewest 2-unit steps that clear an overlap; each such move is a ledger ruling.
- **Labels.** Each chest place is labelled `<Badge> Chest` (e.g. `C++ I Chest`). Badge names have spoken forms (the table) used as accessible names on caption chips, in the Codex, on the success line and as visually hidden text in log entries.
- **Banks and display order.** Each chest's bank is its 3 challenges in the appendix. `picks: Record<ChestId, 0 | 1 | 2>` and `seed: number` are rolled once per game when the Overworld mounts (`Math.random`); tests pass both through `initial`. Choice options, Blocks tiles and Matcher labels are shown in an order shuffled deterministically from `seed` and the challenge id, so the correct option isn't always first and the order doesn't change while you play. `correct` and `answers` always refer to the data, never to the shown order.
- **Opening.** `E` next to it, or its map button. Opening a chest, the Syntax Terminal or the Archive sets `inspected` to it, as the gate does.
  - North chests wait for the gate like the tower and the cache: from the south, before the gate opens, the button logs `LOG.wallLocked` and opens nothing.
  - **While the gate is locked**, the `[E]` prompt, the `E` key and the touch `[E]` button skip north places when you stand south of the wall (Java and C++ II are within reach of the wall's south side).
  - Not yet earned → the challenge terminal opens on the picked challenge.
  - Earned → the inspection card shows `<Badge> Badge earned.` and the explanation of the question you answered.
- **Inspection copy.** An unearned chest's card (e.g. after the wall refuses) reads `A sealed code chest. Answer its <Language> question to earn the <Badge> Badge.`
- **Correct answer:**
  - the chest becomes earned for you: `badges` gains its id (earn order), and `answered` records your answer text (the blank's input or the picked option's text);
  - the log adds `Earned the <Badge> Badge.`;
  - the terminal switches to its success view (see "The challenge terminal").
- **Persistence.** Badges, answers, picks and the seed survive respawning. A new game starts fresh (saving is sub-project 3). `[=] Menu`, while you hold any badge or unlock, first asks `Leave this game? Badges and unlocks aren't saved yet.` with `[ LEAVE ]` and `[ STAY ]` (`[ STAY ]` focused).

### Hints

- Each challenge has the drone hint panel, `SMART AI DRONE DIAGNOSTIC HINT:`, locked until you press `[ USE HINT ITEM ]` (unlimited, as today). It shows the challenge's `hint`.
- **Mistakes trigger the drone:** on the 2nd wrong submission in the current opening, the hint reveals itself. The panel's first line reads `Drone: stuck? Here's a tip.` while `wrongTries ≥ 2`, the error line gets ` The drone has a tip below.` added, and the panel scrolls into view (instantly under reduced motion).
- A revealed hint stays revealed when you close and reopen the challenge (`hintsRevealed: string[]` of challenge ids) and shows without the "stuck?" line. The wrong-try count resets when the terminal closes.

### The Syntax Terminal and the Archive

- **Places:** `terminal` (label `Syntax Terminal`) at (68, 60) and `archive` (label `Archive`) at (55, 66), both in Dev Village. The Archive is the village hut at art (176, 116), which leaves `AREAS.village.props` and is drawn by the scene with a sealed or open door.
- **The Matcher round** is one of three `match` challenges (appendix), `matcherRound: 0 | 1 | 2`, rolled per game like `picks`.
- **Solving the Matcher:** `matcherSolved` becomes true, the log adds `Syntax Terminal: access code <CODE>.`, and the success view shows `ACCESS CODE: <CODE>` in large text. Using the terminal again shows that view, not a new round.
- **The access code:** 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O, 0, I or 1).
  - `accessCode(n: number)` maps any integer to the 4 characters, re-hashing (n + 1, n + 2, …) until the result isn't on a short blocklist of offensive words.
  - The Overworld computes it once, at mount: from `team.startedAt` in a team game (the team Overworld only mounts after the start), otherwise from a fresh `Math.random()` integer. So every teammate's terminal prints the same code, and they can tell each other.
  - `initialState.accessCode` is `accessCode(0)`, never empty.
- **The keypad (Archive while sealed)** is the built-in blank `archive-lock`:
  - title `< ARCHIVE LOCK: DEV VILLAGE >`;
  - instructions `Enter the Archive's 4-character access code. The Syntax Terminal in this village prints it.`;
  - input label `access code`, button `[ ENTER CODE ]`, no Blocks mode;
  - hint `Solve the Syntax Terminal's matcher to get the code. In a team game every explorer's code is the same, so ask a teammate.`;
  - once you've solved the Matcher, it also shows `Your code: <CODE>`;
  - live check: rule 1, then a `pattern` of 4 characters from the alphabet (case-insensitive, after trimming) with `patternReason` `Codes are 4 letters or digits (no O, 0, I or 1).`;
  - the reducer trims and upper-cases the input and compares it with `accessCode` only when it passes that check;
  - a wrong code → `Access denied.` (wrong tries and the drone as usual; the hint never shows the code); the right code → `archiveOpen` becomes true, the log adds `Archive unsealed.`, and the keypad closes;
  - it accepts the code before your own Matcher is solved: a teammate may have told you it;
  - if `archiveOpen` becomes true (a teammate) while the keypad is open, the keypad closes and no second unseal line is logged.
- **The Archive once unsealed:** the door is drawn open and the C# chest stands in the doorway. The Archive is then the C# chest: using it opens the C# challenge, or its earned card.
- **Inspection copy:** Syntax Terminal `A village terminal running a Syntax Matcher. Solve it to print the Archive's access code.` (once solved: `It prints the Archive's access code: <CODE>.`); Archive, sealed: `The Archive's door is chained shut. Its keypad wants a 4-character access code.`; Archive, open: the C# chest's card.

### The gate and the cipher

- **The CSS gate** becomes the built-in blank `gate-css`. It keeps its title `< TERMINAL GATE LOCK: C++ PEAKS >`, code lines, input label `display value`, starting value `none`, answer `block`, hint and effect (`gateUnlocked`). Changed, because the old copy would now be false:
  - instructions `Fix the CSS value below to open the north gate.` (it is a value, not a property);
  - the code line's marker `<-- FIX THIS VALUE` (it was `TYPE CORRECT VALUE HERE`);
  - wrong-answer copy `Not quite: display: <value> doesn't open this lock. Check the hint or try again.` (it was `Compile error: … keeps the gate shut.`, which is untrue for `flex`, `grid` or `inline-block`: they do show the box).
  - New: the live check (`notLegal` `hidden visible show hide`, label `a display value`), Blocks mode (tiles `none`, `block`, `hidden`, `inline`, `flex`), Undo and Reset, and the drone after 2 wrong tries.
- **The scroll cipher** becomes the built-in blank `scroll-cipher`. It keeps its copy (`SCROLL INSTRUCTIONS:`, `[ SUBMIT DECODE ]`, input label `decoded text`, placeholder `plain text`, upper-case display), ciphertext, error copy, answer `DENSE FOREST` with `compare: "letters"` (as today), and effect (`clueDecoded`). New: a live check that skips rules 2–4 and uses a `pattern` refusing only digits, `patternReason` `No digits: the scroll is plain words.`; Undo and Reset; the drone after 2 wrong tries. No Blocks mode: its answer isn't code.
- **The logic lock** keeps its switch panel and gains `[ RESET ]`: it dispatches `resetLogic` (clears `logicError`), turns every switch to 0 and forgets the last run, so every output shows `?` again.
- These three keep their unlock flags (`gateUnlocked`, `clueDecoded`, `towerPowered`), team sharing and log lines.

### State and actions

`GameState` gains:

| Field | Type | Meaning |
|---|---|---|
| `picks` | `Record<ChestId, 0 \| 1 \| 2>` | which bank challenge each chest asks |
| `seed` | `number` | the per-game shuffle seed |
| `badges` | `ChestId[]` | earned chests, in order |
| `answered` | `Partial<Record<ChestId, string>>` | your answer text, for the Codex |
| `challenge` | `{ target: ChallengeTarget; error: string \| null; wrongTries: number; solved: boolean } \| null` | the open terminal |
| `hintsRevealed` | `string[]` | challenge ids whose hint is revealed |
| `matcherRound` | `0 \| 1 \| 2` | |
| `matcherSolved` | `boolean` | |
| `accessCode` | `string` | |
| `archiveOpen` | `boolean` | shared with the team |
| `codexOpen` | `boolean` | |

- `ChallengeTarget = ChestId | "gate" | "cipher" | "matcher" | "archive"`.
- `challenge` replaces `terminalOpen`, `puzzleError`, `hintRevealed`, `cipherOpen`, `cipherError` and `cipherHintRevealed`. The logic lock keeps its own fields.
- Actions:
  - `openChallenge` (internal to `interact` and `openCipher`);
  - `submitChallenge { value }`: the typed text for a blank or the keypad; the option's data index for a choice (the component maps the shown position back); for a match, a `number[]` where `value[i]` is the data index of the label paired with snippet i. It does nothing when no challenge is open, when `challenge.solved`, when the chest is already in `badges`, or when the value is of the wrong kind;
  - `revealChallengeHint`, `closeChallenge`, `resetLogic`, `toggleCodex`.
- `isModalOpen` is true while `challenge`, the logic lock or the Codex is open, so movement, timers and river damage pause as for terminals today.
- The Type / Blocks mode lives in Overworld React state (not GameState or storage): it survives closing and reopening terminals and resets with a new game.

## Team play

- **Badges are personal.** A new message `{ type: "badge"; id; name; chest: ChestId }` is sent when you earn one:
  - `src/net/supabaseTransport.ts` subscribes from `const SUBSCRIBED: Record<TeamMessage["type"], true> = { pos: true, progress: true, start: true, badge: true }`, so a message type that isn't subscribed fails to compile (today's `MESSAGE_TYPES` list would silently drop `badge` in Online mode);
  - `useTeamSession` gains `publishBadge(chest)` and `onBadge(cb: (name, chest) => void)`, deduplicated per (sender id, chest) in the hook, like `lastFlags`;
  - the Overworld sends one badge message for each new entry in `badges`;
  - teammates log `<name> earned the <Badge> Badge.` Unknown chest ids are ignored, so older and newer versions mix;
  - badge messages are best effort: one sent while you are reconnecting is lost (badges aren't in presence).
- **Team clarity:** in team games the quest line reads `Your badges: <n>/10` and the Codex title `< YOUR CODEX: <n>/10 BADGES >`, and the first teammate badge in a game adds `Badges are personal: each explorer opens their own chest.`
- **`archiveOpen` joins `TeamFlags`.** It is one-way like the others, its teammate log is `<name> unsealed the Archive.`, and late joiners get it from presence like the gate. Parsing is lenient: a flags object without `archiveOpen` reads as false, so an older client's messages still parse.
- **The access code** comes from the room's `startedAt` (see above). Picks, the seed and the Matcher round are rolled per player.

## Drawing

### Sprites (new)

| Sprite | Size | Frames |
|---|---|---|
| `code-chest` | 16 × 16, bottom-anchored | closed, open; teal and blue, so it never reads as the amber Supply Cache |
| `syntax-terminal` | 16 × 24, bottom-anchored | unsolved (red screen), solved (green screen), following `matcherSolved` (Green = solved, Red = locked, as the proposal's convention) |
| `archive` | 32 × 24, bottom-anchored | sealed (the hut's door with a padlock and chain), open (a dark doorway) |

- `SceneInput` gains `archiveOpen`, `matcherSolved` and `earned: ChestId[]`. Earned chests (yours) draw open; the C# chest is drawn at the Archive door only while the Archive is open.
- Every new sprite box joins the area's protected boxes, so decorations stay clear. The village caption test's blockers add the Archive's box.

### The map overlay

- **Chest buttons:** each of the 9 outdoor chests gets a landmark button (≥ 44 × 44 CSS px hit area, the same focus and hover rings) with a caption chip of its badge name (`C++ I`, `SQL`, …) in the token `--code-chest: #2dd4bf` (9.6:1 on the caption chip). Once earned, the caption reads `<Badge> ✓`. Captions go on the side in the chest table.
  - On maps at 2× and larger the captions always show. On a 1× map (phones) a chest's caption shows only while its button is hovered or focused, or while the chest is in reach; its name is still in the `[E]` prompt and the button's accessible name.
  - North chests' buttons follow the wall rule above.
- **Village buttons:** `Terminal` (caption below) and `Archive` (caption above) join `[V] Ada` and `[P] Signpost`. The Archive's caption reads `Archive` while sealed, `C#` once open, and `C# ✓` once you've earned the badge. Bracket letters on map captions never name a movement or action key (W, A, S, D, E).
- **Hit areas:** where two places' 44-px hit areas would overlap, each is cut back at the midline between the two drawings, never smaller than its own drawing.
- **Prompts and the touch `[E]` button** show the same state-aware verb, so `promptText` and `interactLabel` take the game state: `[E] Open <Badge> Chest`, `[E] Review <Badge> Chest` (earned), `[E] Use Syntax Terminal`, `[E] Unseal Archive` (sealed), `[E] Open C# Chest` or `[E] Review C# Chest` (open).
- **Labels and exit signs:** `labelLayout` counts a label over an exit sign as 5 fixed-box hits (cost 500), so labels give way to an exit sign before another caption, but never at the cost of your two labels covering each other (1000).
- **Mini-map:** chests are drawn as diamonds in their zone's cell: unearned a `#0f172a` diamond with a 1 px teal border, earned solid teal with a 1 px `#0f172a` border. Shape, not colour alone, sets them apart from the places' squares. The Archive's diamond is the C# chest's: it appears once the Archive is open.
- **Controls legend** gains `Codex: [C]`.

### The challenge terminal

One component, `ChallengeTerminal`, inside today's `TerminalDialog` (amber frame, dim backdrop, `[X] CLOSE`, Esc, focus trap):

1. **Header:** the challenge's `title`; chests use `< CODE CHEST: <BADGE IN CAPITALS> >`.
2. **Instructions:** `instructionsLabel` and the `prompt`.
3. **Body by kind:**
   - **blank, Type mode:** the code block (editor colours, line numbers) with a text input in place of `___`, then the live-check line.
   - **blank, Blocks mode:** the blank becomes a drop slot (a button, not a text box, so no on-screen keyboard opens) showing the placed tile or `___`, with the tiles under the code.
     - Tap a tile, or press Enter or Space on it, to place it; a mouse or pen can drag it. On touch, a drag starts only after a 300 ms press-and-hold, so swipes still scroll.
     - Tiles are copied: the tray never changes. Pressing the filled slot empties it, as one undoable change.
     - Switching modes keeps the value; a typed value that isn't a tile stays in the slot until a tile replaces it.
   - **choice:** the code block (if any), then the four options as a radio group (A–D; click, tap, arrow keys).
   - **match:** two columns of buttons, snippets left (with their `tag`), labels right.
     - Pick one from each side, in either order, to pair them; a mouse can also drag a snippet onto a label.
     - Picking an item that is already paired breaks that pair (announced `Unpaired 2.`) and selects it. Picking another item on the same side moves the selection; picking the selected item again clears it.
     - A new pair takes the lowest free number, shown as the same numbered colour tag (1–5) on both items; the five tag tokens are each ≥ 3:1 on `--panel`, with their number ≥ 4.5:1 on the tag.
     - Each item's accessible name ends with its state: `, pair 2`, `, pair 2, wrong` or `, not paired`. New pairs are announced `Paired 2: print("Hi") with Python.`
4. **Toolbar** (blanks, including the cipher and keypad but with the `Type | Blocks` toggle only on code blanks; and matches; choices have none, because picking another option is the undo): `[ UNDO ]` and `[ RESET ]`.
   - Undo steps back through the last 20 changes. A run of typing is one change until a 1-second pause, a mode switch or a placed tile. Each placed or removed tile, pair, unpair and Reset is one change, so Undo after Reset restores everything.
   - Reset returns to `start` or clears all pairs.
   - Both are unavailable when there's nothing to undo or reset.
   - Ctrl/Cmd+Z runs Undo anywhere in the terminal outside the text box; inside it, it is the browser's own undo.
5. **Error line** after a wrong submission (see "Answer checking").
6. **Submit row and hint:** directly above SUBMIT, a visible reason line shows why it isn't ready: the live-check reason (blank), `Pick an answer first.` (choice), `Pair all 5 first (<k>/5 paired).` (match), or `Change your answer to try again.` SUBMIT (`submitLabel`) uses `aria-disabled="true"` (it stays focusable, full contrast, with a dashed border), not `disabled`. Pressing it, or Enter in the input, while not ready doesn't submit and re-announces the reason (`role="status"`). Then the drone hint panel and `[ USE HINT ITEM ]`. On phones the submit row sits directly under the live-check line, above the hint panel.
7. **Success view:** the code block stays, read-only, with the accepted answer filled in (choice: the chosen option highlighted). Below it: `✓ <Badge> Badge earned` (chests) or `ACCESS CODE: <CODE>` (the Matcher; its accessible name spells the code out, `K Q Z M`), in a `role="status"` region, then the explanation and `[ CONTINUE ]`. The gate, the cipher and the keypad close at once instead, as the gate and cipher do today.

**Focus:**

- On open: the blank's input (Type) or first tile (Blocks); the checked or first option (choice); the first snippet (match); the input (cipher, keypad); `[ CONTINUE ]` in any success view, including a reopened Matcher.
- When Undo or Reset becomes unavailable while focused, focus moves to the blank (or the first match item).
- Every new control is a native button or input; `TerminalDialog`'s focusable list gains `[tabindex="0"]` and `[data-autofocus]` targets. While any dialog is open, the rest of the page is `inert`.

On phones the toolbar, tiles, options and match items are at least 44 px tall and the layout stacks, except the match, whose columns stay side by side (labels in a column as wide as the longest label, snippets wrapping in the rest). Under reduced motion nothing animates.

### The Codex

- **Opening:** a `[C] Codex` button in the top bar (at least 16 px from `[=] Menu`), or the `C` key (without Ctrl, Meta or Alt) when no terminal is open. It opens in the same dialog frame, titled `< CODEX: <n>/10 BADGES >` (team: `< YOUR CODEX: … >`), and closes with `[X] CLOSE`, Esc or `C`.
- **List:** one column at every width, the 10 badges in the chest table's order. Each shows its name, where its chest is (`C++ Peaks · north of the wall`, `C++ Peaks`, `Dev Village`, `Dev Village · in the Archive`) and whether it's earned.
  - An earned entry is a button with `aria-expanded` that opens below itself to show the question (prompt and code), your answer and the explanation; any number can be open.
  - An unearned entry is plain text ending `· not earned yet`.
  - Focus on open: the first earned entry, else `[X] CLOSE`.
- **Quests:** the list gains `Badges: <n>/10` (team: `Your badges: <n>/10`), bold at 10/10.

## Architecture

- **`src/learn/`** (new, pure):
  - `types.ts`: `Lang`, `Challenge`, `ChestId`, `ChallengeTarget`;
  - `bank/html.ts` … `bank/cpp.ts`, `bank/matcher.ts`, `bank/builtin.ts` (gate, cipher, keypad): the appendix, as data;
  - `chests.ts`: the chest table, `chestChallenge(state, id)`;
  - `check.ts`: `normalize`, `checkBlank`, `isCorrect`;
  - `shuffle.ts`: the deterministic order from `seed` and id;
  - `access.ts`: `accessCode(n)`.
- **`src/game/`:** `reducer.ts` (actions above), `types.ts` (state), `constants.ts` (places, log and card copy), `zones.ts` (places per zone), `geometry.ts` (state-aware `promptText`/`interactLabel`, the wall-side reach rule), `team.ts` (`archiveOpen`, badge message, lenient flags).
- **`src/net/supabaseTransport.ts`:** the `SUBSCRIBED` record; **`src/hooks/useTeamSession.ts`:** `publishBadge`, `onBadge`.
- **`src/screens/`:**
  - `ChallengeTerminal.tsx` (new) with `challenge/BlankBody.tsx`, `ChoiceBody.tsx`, `MatchBody.tsx`, `Toolbar.tsx`, `SubmitRow.tsx` and a small `useUndo` hook;
  - `Codex.tsx` (new), the `[=] Menu` confirmation;
  - `TerminalModal.tsx` and `CipherModal.tsx` are removed (their copy moves into `bank/builtin.ts`);
  - `LogicModal.tsx` gains Reset;
  - `ui/TerminalDialog.tsx`: focusable list and `inert` background.
- **`src/render/`:** the new sprites, chest, terminal and Archive drawing in `scene.ts`, protected boxes in `areas/`.
- **`src/screens/overworld/`:** chest and village buttons, midline hit areas and caption visibility (`MapViewport`, `mapLayout`), the exit-sign weight (`labelLayout`), mini-map diamonds and legend (`MiniMap`), the Codex button (`TopHud`), the badges line (`QuestList`), the `C` key (`useKeyboardControls`).

## Testing

- **Bank validity** (one test over all data):
  - 10 chests with exactly 3 challenges each, and 3 Matcher rounds of 5 pairs; every language appears;
  - each blank has exactly one `___` and exactly one kind of live-check data; its accepted answers pass its own live check; a `legal` list has at least two valid wrong tokens; a `notLegal` list holds no accepted answer;
  - its tiles contain exactly one accepted answer and at least two wrong tiles that pass the live check;
  - choice options are 4 and unique, with `correct` in range; match snippets and labels are unique within a round.
- **The live check:**
  - each rule with its exact reason, in order, and its timing (first-edit state, 500 ms pause, blur, submit attempt, announce on change only);
  - the no-leak property for every blank's lists and tiles;
  - real near-misses pass: `count`, `index` (list methods); `type`, `format` (built-ins); `append`, `write`, `equals` (System.out); `Read`, `ReadKey` (Console); `wcout`, `cerr` (streams); `include_once`, `throw` (PHP); `not_eq` (C++ operators); `margin`, `download`, `b`, `SELECT`, `AS`, `flow-root` (open sets);
  - no reason contradicts the language: a test asserts every flagged token in the bank is absent from the reference list it was checked against.
- **Answer checking:** normalising (trailing `;`, spaces, case by flag), `compare: "letters"`, correct and wrong for each kind; every input today's `isCorrectDecode` accepts that contains no digit passes the cipher's live check and is correct.
- **Shuffling:** for a fixed seed the shown order is stable and a permutation of the data; across seeds the correct choice option lands in every position.
- **Reducer:**
  - open, wrong, right, the drone after 2 wrong tries, hint persistence, close resets tries, submit not ready until the answer changes;
  - badge order, `answered`, the log line, the earned and unearned cards;
  - north chests before the gate, and the wall-side reach rule for `[E]`;
  - picks, seed and badges surviving respawn;
  - the Matcher solve and code; the keypad (wrong, right, before solving, crafted or empty input never unseals, a teammate unsealing while it's open);
  - the Archive acting as the C# chest;
  - the gate and the cipher unchanged in effect, the cipher's copy unchanged, the gate's new copy;
  - the logic lock's reset; modal pausing, including the Codex; stale and wrong-kind submits do nothing.
- **Team:**
  - a `badge` broadcast reaches subscribers in the Supabase transport (the `SUBSCRIBED` record); badge messages logged once per (sender, chest), unknown chests ignored;
  - `archiveOpen` shared, logged, and parsed leniently when missing;
  - every teammate's access code is the same for one `startedAt`; `accessCode` never yields a blocklisted word.
- **Components:**
  - Type and Blocks (tap, Enter, Space, mouse drag, the touch hold), the slot emptying, mode switching keeps the value;
  - Undo and Reset (typing runs, Reset undoable, limits, focus after they become unavailable);
  - SUBMIT not ready: `aria-disabled`, its visible reason, Enter doesn't submit;
  - the choice radio group and its `✗`; match pairing by click, keyboard and drag, re-pairing, numbering, accessible names, `✗` marks;
  - the success views; focus on open; `inert` background;
  - the Codex list, expansion and focus; the `C` key (not with modifiers); the Menu confirmation;
  - chest buttons and captions (1× hover/focus/reach visibility), mini-map diamonds.
- **Layout:** at 1× (without chest captions) and 2× (with them): no caption box intersects another caption, a hit area, a landmark or chest drawing, the dig spot or an exit sign; no two hit areas intersect after the midline cut, and a tap at the centre of every drawing reaches that place's button; the label-layout grid tests take the new captions as fixed boxes and still pass with the exit-sign weight.
- **Migration:** tests that seed `terminalOpen` or `cipherOpen` seed `challenge: { target: "gate" | "cipher", error: null, wrongTries: 0, solved: false }` instead. The checks in `TerminalModal.test` and `CipherModal.test` (copy, starting value `none`, text selected on open, error line, hint) move to `ChallengeTerminal.test`, with the gate's error assertions updated to its new copy.
- **Browser check (final task):**
  - desktop (1366 × 657) and phone (390 × 844, touch): answer a chest by typing and with Blocks; earn a badge; open the Codex;
  - solve the Matcher and unseal the Archive; earn the C# badge;
  - the gate with the live check;
  - a two-page team game in Same computer mode (and Online where the network allows): Kai's badge appears in Ana's log, and Ana's code opens the Archive for both;
  - no console errors.

## Edge cases

- **Closing mid-answer** keeps nothing you typed or paired; a revealed hint stays.
- **Hazards:** you can't be downed inside a terminal or the Codex, because time and hazards pause.
- **Crafted actions:** a `submitChallenge` with no open challenge, a solved one, or a value of the wrong kind does nothing. Interacting with a chest in another zone does nothing (existing guard).
- **Team variety:** two teammates can get different questions for the same chest; the team log still names the same badge.
- **Late joiners** roll their own picks and seed, and see the Archive open if it is.
- **The keypad** accepts the code typed in any case and with spaces around it.

## Out of scope (later sub-projects)

- XP, player levels, gear and saving (3).
- Word Search, Tile Slider and Crossword (2).
- Chat and commands; team-only harder variants and time limits (4).
- Merchant, villagers, new areas and the scrolling camera (5).
- Questions beyond the 30 here; a teacher editor for the bank.

## Appendix: the challenges

Code is shown exactly as it appears in the terminal. For blanks: `answers` first, then the live-check data (`legal` for a closed set, `notLegal` for an open one, with `legalLabel` in quotes), then `blocks`. Every answer, legal token, near-miss and label was checked against the language's real behaviour in the versions under "Rules" (the review ran Python 3.13, PHP 8.3, g++ 13, Java 21, PostgreSQL 16, SQLite 3.45 and Chromium 141; C# is from the .NET 8 reference, and the plan confirms it with `typeof(Console).GetMethods()`).

### HTML — `chest-html`

1. **blank** `html-link` — *Make the link go to the Devlandia site.*
   ```
   1 | <a ___="https://devlandia.dev">Home</a>
   ```
   answers `href`; notLegal `url ref goto hyperlink` ("an HTML attribute"); blocks `href src link url alt`. Hint: "The attribute's name is short for 'hypertext reference'." Explain: "href sets where a link goes. src is for images and scripts."
2. **choice** `html-heading` — *Which tag makes the largest heading?* Options `<h1>` `<h6>` `<head>` `<header>`; correct `<h1>`. Hint: "Headings run from 1 (biggest) to 6 (smallest)." Explain: "<h1> is the top heading and <h6> the smallest. <head> holds page metadata, and <header> is a page section."
3. **blank** `html-list` — *Finish the list item.*
   ```
   1 | <ul>
   2 |   <___>Apples</li>
   3 | </ul>
   ```
   answers `li`; notLegal `item list bullet listitem` ("an HTML tag"); blocks `li ol item p`. Hint: "The opening tag must match the closing tag." Explain: "Each item in a list sits in an <li> (list item) element."

### CSS — `chest-css`

1. **blank** `css-color` — *Make the paragraph text red.*
   ```
   1 | p {
   2 |   ___: red;
   3 | }
   ```
   answers `color`, `-webkit-text-fill-color`; notLegal `text-color font-color colour text-colour foreground` ("a CSS property"); blocks `color background-color border-color text-color font-color`. Hint: "CSS uses American spelling for this property." Explain: "color sets the text colour; background-color sets the colour behind it. (-webkit-text-fill-color also paints text red in most browsers, but color is the standard way.)"
2. **choice** `css-id` — *Which selector targets the element with id="hero"?* Options `#hero` `.hero` `hero` `*hero`; correct `#hero`. Hint: "Classes use a dot; ids use a different symbol." Explain: "# selects by id, . selects by class, and a bare name selects a tag."
3. **choice** `css-margin` — *.box { margin: 10px 20px; } — how much margin is on the left?* Options `20px` `10px` `0` `30px`; correct `20px`. Hint: "With two values, the first is top and bottom, the second is left and right." Explain: "margin: 10px 20px means 10px top and bottom, 20px left and right."

### PHP — `chest-php`

1. **blank** `php-echo` — *Print the greeting.*
   ```
   1 | <?php
   2 |   ___ "Hello, Devlandia!";
   3 | ?>
   ```
   answers `echo`, `print`; legal `echo print return include include_once require require_once throw clone` ("a PHP keyword that can take a string here"; exactly the reserved words that parse in this line); blocks `echo return include console.log printf`. Hint: "PHP's usual output statement echoes what you give it." Explain: "echo (or print) sends text to the page. console.log is JavaScript, and printf is a function that needs brackets."
2. **choice** `php-var` — *What symbol comes before every PHP variable's name?* Options `$` `@` `#` `&`; correct `$`. Hint: "It's a currency symbol." Explain: "PHP variables are written with a $ before the name, as in $name."
3. **choice** `php-concat` — *What does this print?*
   ```
   1 | <?php $a = 5; $b = "5"; echo $a . $b; ?>
   ```
   Options `55` `10` `5 5` `Error`; correct `55`. Hint: "In PHP the dot joins strings; it doesn't add." Explain: "The . operator concatenates, so 5 and \"5\" become \"55\"."

### SQL — `chest-sql`

1. **blank** `sql-from` — *Read every name from the users table.*
   ```
   1 | SELECT name ___ users;
   ```
   answers `FROM`; notLegal `FORM FRM` ("an SQL keyword"), case-insensitive; blocks `FROM INTO FORM WHERE`. Hint: "You select columns from a table." Explain: "SELECT … FROM table picks columns from that table."
2. **choice** `sql-where` — *Which clause keeps only the rows where age is over 18?* Options `WHERE age > 18` `ORDER BY age > 18` `FILTER age > 18` `LIMIT 18`; correct `WHERE age > 18`. Hint: "This clause filters rows by a condition." Explain: "WHERE filters rows; ORDER BY sorts them and LIMIT caps how many come back."
3. **choice** `sql-max` — *The scores table's points column holds 7, 3 and 9. What does this return?*
   ```
   1 | SELECT MAX(points) FROM scores;
   ```
   Options `9` `3` `19` `7`; correct `9`. Hint: "MAX picks one value." Explain: "MAX returns the largest value in the column: 9."

### Python — `chest-py-1` (Python I)

1. **blank** `py-print` — *Show the greeting on screen, without waiting for the player to type anything.*
   ```
   1 | ___("Hello, Devlandia!")
   ```
   answers `print`; legal: the 71 names in Python's Built-in Functions table, `abs aiter all anext any ascii bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval exec filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip __import__` ("a Python built-in function"), case-sensitive; blocks `print len str echo printf Print`. Hint: "It's the same word you'd use in English." Explain: "print() writes to the screen. input() shows its text too, but then waits for a reply: it's for asking, not telling. echo and printf belong to other languages."
2. **choice** `py-range` — *What does this print?*
   ```
   1 | for i in range(3):
   2 |     print(i)
   ```
   Options `0, 1, 2 (one per line)` `1, 2, 3 (one per line)` `0, 1, 2, 3 (one per line)` `3`; correct the first. Hint: "range(3) starts at 0 and stops before 3." Explain: "range(n) counts from 0 up to n − 1."
3. **choice** `py-def` — *Which line starts a function in Python?* Options `def greet():` `function greet() {` `void greet() {` `fn greet()`; correct `def greet():`. Hint: "Python's keyword is short for 'define'." Explain: "def starts a function, and the colon begins its indented body."

### Python — `chest-py-2` (Python II)

1. **blank** `py-append` — *Add "kiwi" to the end of the list.*
   ```
   1 | fruits = ["apple", "fig"]
   2 | fruits.___("kiwi")
   ```
   answers `append`; legal: every name in `dir(list)`, the methods `append clear copy count extend index insert pop remove reverse sort` plus its `__dunder__` names ("a list method"), case-sensitive; blocks `append insert extend add push`. Hint: "The method's name means 'attach at the end', like an appendix at the back of a book." Explain: "append() adds one item to the end of a list. add is for Python sets, and push is JavaScript's."
2. **choice** `py-len` — *What does this print?*
   ```
   1 | print(len("code"))
   ```
   Options `4` `3` `5` `code`; correct `4`. Hint: "Count the letters." Explain: "len() gives the number of characters: c, o, d, e."
3. **choice** `py-if` — *What does this print?*
   ```
   1 | x = 7
   2 | if x > 5:
   3 |     print("big")
   4 | else:
   5 |     print("small")
   ```
   Options `big` `small` `True` `nothing`; correct `big`. Hint: "Is 7 greater than 5?" Explain: "The condition is true, so only the if branch runs."

### Java — `chest-java`

1. **blank** `java-println` — *Print Hello on its own line.*
   ```
   1 | System.out.___("Hello");
   ```
   answers `println`; legal: every public method name of `java.io.PrintStream` in Java 21, inherited ones included, `append charset checkError close equals flush format getClass hashCode notify notifyAll nullOutputStream print printf println toString wait write writeBytes` ("a System.out method"), case-sensitive; blocks `println print printf log echo`. Hint: "The method's name ends with 'ln', for line." Explain: "println prints and ends the line; print and printf don't end it. log and echo aren't System.out methods."
2. **choice** `java-int` — *Which type holds whole numbers like 42?* Options `int` `String` `boolean` `double`; correct `int`. Hint: "Short for 'integer'." Explain: "int stores whole numbers; double stores decimals and String stores text."
3. **choice** `java-plus-eq` — *What does this print?*
   ```
   1 | int x = 10;
   2 | x += 5;
   3 | System.out.println(x);
   ```
   Options `15` `105` `10` `5`; correct `15`. Hint: "x += 5 means x = x + 5." Explain: "+= adds to the variable, so x becomes 15."

### C# — `chest-cs` (in the Archive)

1. **blank** `cs-writeline` — *Print the greeting on its own line.*
   ```
   1 | Console.___("Hello, Devlandia!");
   ```
   answers `WriteLine`; legal: every public method name of `System.Console` in .NET 8, those inherited from object included, `Beep Clear Equals GetCursorPosition GetHashCode GetType MoveBufferArea OpenStandardError OpenStandardInput OpenStandardOutput Read ReadKey ReadLine ReferenceEquals ResetColor SetBufferSize SetCursorPosition SetError SetIn SetOut SetWindowPosition SetWindowSize ToString Write WriteLine` ("a Console method"), case-sensitive; blocks `WriteLine Write ReadLine println writeline`. Hint: "C# method names start with a capital letter." Explain: "Console.WriteLine prints a line; Write prints without ending it. C# names are case-sensitive, so writeline isn't the same method."
2. **choice** `cs-var` — *In C#, which keyword declares a local variable whose type the compiler works out?* Options `var` `val` `auto` `dim`; correct `var`. Hint: "It's short for 'variable'." Explain: "var lets C# infer a local variable's type from its value. val is Kotlin, auto does the same job in C++, and Dim declares variables in Visual Basic."
3. **choice** `cs-interp` — *What does this print?*
   ```
   1 | string name = "Ada";
   2 | Console.WriteLine($"Hi {name}");
   ```
   Options `Hi Ada` `Hi {name}` `$Hi Ada` `Hi name`; correct `Hi Ada`. Hint: "The $ before the quotes fills in the braces." Explain: "An interpolated string ($\"…\") replaces {name} with the variable's value."

### C++ — `chest-cpp-1` (C++ I)

1. **blank** `cpp-cout` — *Print Hello to standard output (the normal output, not the error stream).*
   ```
   1 | #include <iostream>
   2 | int main() {
   3 |   std::___ << "Hello";
   4 | }
   ```
   answers `cout`, `wcout`; legal `cout cin cerr clog wcout wcin wcerr wclog` ("a standard stream object"; the complete set), case-sensitive; blocks `cout cin cerr print console`. Hint: "It's the 'character output' stream." Explain: "std::cout is the standard output stream; << sends text into it. std::cerr and std::clog reach the screen too, but they are the error and log streams. std::wcout is cout's wide-character twin."
2. **choice** `cpp-semicolon` — *What ends almost every statement in C++?* Options `;` `.` `:` `nothing`; correct `;`. Hint: "Devlandia's lost artifact is one of these." Explain: "A semicolon ends a C++ statement, the very thing the Golden Semicolon stands for."
3. **choice** `cpp-int-div` — *What does this print?*
   ```
   1 | int a = 7 / 2;
   2 | std::cout << a;
   ```
   Options `3` `3.5` `4` `2`; correct `3`. Hint: "Both numbers are whole numbers." Explain: "Dividing two ints drops the remainder, so 7 / 2 is 3."

### C++ — `chest-cpp-2` (C++ II)

1. **blank** `cpp-for` — *Make the loop print 012.*
   ```
   1 | for (int i = 0; i ___ 3; i++) {
   2 |   std::cout << i;
   3 | }
   ```
   answers `<`, `!=`, `not_eq`; legal `< <= > >= == != not_eq` ("a relational or equality operator"; the three-way `<=>` is a category of its own, so it is truthfully not one); blocks `< <= > => =<`. Hint: "The loop must stop before i reaches 3." Explain: "i < 3 runs for 0, 1 and 2. i != 3 (also spelled not_eq) does too, but < is the usual choice because it still stops if i ever jumps past 3. => and =< aren't C++ operators."
2. **choice** `cpp-address` — *Which expression gives the address of a variable x?* Options `&x` `*x` `#x` `@x`; correct `&x`. Hint: "The 'and' sign." Explain: "&x is the address of x; *p reads what a pointer p points to."
3. **choice** `cpp-ref` — *What does this print?*
   ```
   1 | int n = 5;
   2 | int& r = n;
   3 | r = 9;
   4 | std::cout << n;
   ```
   Options `9` `5` `14` `Error`; correct `9`. Hint: "r is another name for n." Explain: "A reference is an alias: changing r changes n."

### Syntax Matcher rounds (`bank/matcher.ts`)

Title `< SYNTAX TERMINAL: DEV VILLAGE >`. Prompt: "Match each snippet to its language, then submit to print the Archive's access code." (Round 3: "Match each snippet to its output, then submit to print the Archive's access code.") Hint: "Look for each language's tell-tale symbols: $ for PHP, :: for C++, tags for HTML." (Round 3: "Work each line out in your head; ** is a power and % a remainder.")

1. `SELECT name FROM users;` → SQL · `$name = "Ada"; echo $name;` → PHP · `System.out.println("Hi");` → Java · `print("Hi")` → Python · `<p>Hi</p>` → HTML. Explain: "Each language has its own tell: SQL reads like English commands, PHP variables start with $, Java prints through System.out, Python's print needs no semicolon, and HTML uses tags."
2. `std::cout << "Hi";` → C++ · `Console.WriteLine("Hi");` → C# · `h1 { color: teal; }` → CSS · `def hi(): return "Hi"` → Python · `INSERT INTO users VALUES ('Ada');` → SQL. Explain: "C++ streams text with <<, C# uses Console.WriteLine, CSS styles selectors in braces, Python defines functions with def, and SQL adds rows with INSERT INTO."
3. `print(2 ** 3)` (tag Python) → `8` · `print("ab" * 2)` (tag Python) → `abab` · `std::cout << 7 % 3;` (tag C++) → `1` · `System.out.println(10 / 4);` (tag Java) → `2` · `echo strlen("devs");` (tag PHP) → `4`. Explain: "** raises to a power, * repeats a string, % gives the remainder, int / int drops the fraction, and strlen counts characters."

### Built-in challenges (`bank/builtin.ts`)

- **`gate-css`:** today's title, code lines, input label, starting value, answer and `PUZZLE_HINT`, with the changes and live-check data under "The gate and the cipher".
- **`scroll-cipher`:** today's copy, unchanged (`SCROLL INSTRUCTIONS:`, `SCROLL_CIPHERTEXT`, `CIPHER_HINT`, `cipherError`, `[ SUBMIT DECODE ]`, `decoded text`, `plain text`), with the live-check data under "The gate and the cipher".
- **`archive-lock`:** the copy under "The Syntax Terminal and the Archive".
