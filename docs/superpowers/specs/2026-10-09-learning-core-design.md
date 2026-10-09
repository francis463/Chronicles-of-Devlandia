# Learning Core — Design

**Status:** sub-project order, approach (one challenge engine) and all four design sections approved in chat (2026-10-09). Written spec awaiting review.
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

### Challenges

A **challenge** is data, in `src/learn/`:

- **`blank`**: code lines with exactly one gap, written `___`. Fields:
  - `answers`: the accepted answers (one or more);
  - `caseSensitive`: whether case matters (true for Python, Java, C#, C++; false for HTML, CSS, PHP keywords, SQL);
  - `legal` and `legalLabel`: the tokens that are valid in this position, which always include the answers *and* at least two valid wrong ones, so passing the live check reveals nothing; `legalLabel` names them for the error, e.g. "an SQL keyword";
  - `blocks`: 4–6 tiles for Blocks mode, including one accepted answer;
  - `hint`, `explain`.
- **`choice`**: an optional code block, a question, four options (`options`, shown in code font when they are code) and `correct` (the index). The output style is a `choice` whose question is "What does this print?". Fields `hint`, `explain`.
- **`match`**: five `pairs` of `[snippet, label]`. The labels are shown shuffled. Fields `hint`, `explain`.

Every challenge has an `id`, a `lang` (one of `html`, `css`, `php`, `python`, `java`, `csharp`, `sql`, `cpp`, or `logic` for the gate's and cipher's own content), a `title` and a `prompt`. The appendix lists every challenge's copy, word for word.

### Answer checking

- **Normalising a blank's input:** trim; drop one trailing `;` and trim again; collapse inner runs of spaces to one; lower-case it unless `caseSensitive`.
- **Correct** when the normalised input equals a normalised accepted answer.
- **A choice** is correct when the picked index is `correct`. **A match** is correct when all five pairs are right.
- **Wrong answers** cost nothing: retries are unlimited, nothing resets, and the error copy is
  - blank: `Not quite: "<input>" isn't the answer. Check the hint or try again.`
  - choice: `Not quite: that isn't the answer. Check the hint or try again.`
  - match: `<n> of 5 pairs are wrong.` (n ≥ 1)
- The gate and the cipher keep their own error copy (see "The gate and the cipher").

### The live check

`checkBlank(challenge, input)` returns `{ ok: true }` or `{ ok: false, reason }`, from the input alone, in this order:

1. Empty after trimming → `Type something first.`
2. An odd number of `"` or of `'` → `Unclosed quote.`
3. Brackets `()[]{}<>` that don't pair up in order → `Unclosed or extra bracket.` (Not applied to blanks whose `legal` list contains a bracket token, such as the C++ comparison operators.)
4. With a `legal` list: the normalised input isn't in it (compared case-insensitively unless `caseSensitive`) → `'<input>' is not <legalLabel>.` and, when `caseSensitive` and the input matches a legal token only ignoring case, ` Names are case-sensitive.` is added.
5. With a `pattern` instead (the cipher): the input doesn't match it → the challenge's `patternReason`.

It never looks at `answers`. A test proves this for every blank: for each accepted answer `a` there is a legal wrong token `w` with `checkBlank(a).ok === checkBlank(w).ok === true`.

### The 10 chests

| Chest (`id`) | Badge | Zone | Place (game %) | Gate needed |
|---|---|---|---|---|
| `chest-cpp-1` | C++ I | Peaks | (64, 14) | yes (north) |
| `chest-java` | Java | Peaks | (20, 44) | yes (north) |
| `chest-cpp-2` | C++ II | Peaks | (84, 44) | yes (north) |
| `chest-html` | HTML | Peaks | (14, 56) | no |
| `chest-css` | CSS | Peaks | (46, 82) | no |
| `chest-py-1` | Python I | Peaks | (88, 62) | no |
| `chest-php` | PHP | Village | (40, 56) | no |
| `chest-sql` | SQL | Village | (12, 80) | no |
| `chest-py-2` | Python II | Village | (80, 80) | no |
| `chest-cs` | C# | Village | in the Archive, at its door (55, 66) | the Archive must be unsealed |

- The places keep chest sprites off the ice, the wall, paths, exits, captions and the other places. The plan's layout tests may move a chest by the fewest 2-unit steps that clear an overlap at 1× or 2×; each such move is a ledger ruling.
- **Each chest's bank** is the 3 challenges in the appendix. Which one it asks is in `picks: Record<ChestId, 0 | 1 | 2>`, rolled once per game when the Overworld mounts (`Math.random`); tests pass picks through `initial`.
- **Display order:** the same per-game roll sets `seed: number`. Choice options, Blocks tiles and Matcher labels are shown in an order shuffled deterministically from `seed` and the challenge id, so the correct option isn't always first and the order doesn't change while you play. `correct` and `answers` refer to the data, never to the shown order.
- **Opening:** `E` next to it, or its map button. North chests wait for the gate exactly like the tower and the cache: from the south, before the gate opens, the button logs `LOG.wallLocked` and opens nothing.
  - Not yet earned → the challenge terminal opens on the picked challenge.
  - Earned → the inspection card shows `<Badge> Badge earned.` and the explanation of the question you answered.
- **Correct answer:**
  - the chest becomes earned for you: `badges` gains its id (earn order), and `answered` records your answer text (the blank's input or the picked option's text);
  - the log adds `Earned the <Badge> Badge.`;
  - the terminal switches to its success view: `✓ <Badge> Badge earned`, the explanation, and `[ CONTINUE ]`, which closes it.
- Badges, answers and picks survive respawning. `[=] Menu` and a new game start fresh (saving is sub-project 3).

### Hints

- Each challenge has a drone hint panel, `SMART AI DRONE DIAGNOSTIC HINT:`, locked until you press `[ USE HINT ITEM ]` (unlimited, as today). It shows the challenge's `hint`.
- **Mistakes trigger the drone:** after the 2nd wrong submission on the same challenge, the hint reveals itself and the panel's first line reads `Drone: stuck? Here's a tip.`
- A revealed hint stays revealed for that challenge when you close and reopen it (`hintsRevealed: string[]` of challenge ids). The wrong-try count resets when the terminal closes.

### The Syntax Terminal and the Archive

- **Places:** `terminal` (label `Syntax Terminal`) at (68, 60) and `archive` (label `Archive`) at (55, 66), both in Dev Village. The Archive is the village hut at art (176, 116), which gets a sealed door.
- **The Matcher round** is one of three `match` challenges (appendix), `matcherRound: 0 | 1 | 2` rolled per game like `picks`.
- **Solving the Matcher:** `matcherSolved` becomes true, the log adds `Syntax Terminal: access code <CODE>.`, and the terminal's success view shows `ACCESS CODE: <CODE>` in large text. Using the terminal again shows that view, not a new round.
- **The access code:** 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O, 0, I, 1).
  - Solo: random per game.
  - Team: computed from the room's `startedAt`, so every teammate's terminal prints the same code and they can tell each other. A small hash (`accessCode(seed: number)`) maps the seed to the 4 characters; solo uses a random seed.
- **The Archive while sealed:** using it opens the keypad terminal, `< ARCHIVE LOCK: DEV VILLAGE >`, with one input `access code`.
  - Its live check: empty → `Type something first.`; otherwise not 4 characters from the alphabet (case-insensitive) → `Codes are 4 letters or digits (no O, 0, I or 1).`
  - It has no Blocks mode.
  - A wrong code → `Access denied.`; the right code (any case) → `archiveOpen` becomes true, the log adds `Archive unsealed.`, and the keypad closes.
  - The keypad accepts the code before the Matcher is solved too: a teammate may have told you it.
- **The Archive once unsealed:** the door is drawn open and the C# chest stands in the doorway. Using the Archive then acts as the C# chest (challenge, or its earned card).

### The gate and the cipher

- **The CSS gate** becomes the `blank` challenge `gate-css`. It keeps its title `< TERMINAL GATE LOCK: C++ PEAKS >`, instructions, code lines, starting value `none`, answer `block`, error copy `Compile error: display: <value> keeps the gate shut.`, hint copy and its effect (`gateUnlocked`). New: the live check (legal display values: `block`, `none`, `inline`, `inline-block`, `flex`, `inline-flex`, `grid`, `inline-grid`, `contents`, `table`, `list-item`; label `a display value`), Blocks mode (tiles `none`, `block`, `hidden`, `inline`, `flex`), Undo and Reset, and the drone after 2 wrong tries.
- **The scroll cipher** becomes the `blank` challenge `scroll-cipher`. It keeps its copy, ciphertext, answer `DENSE FOREST` (case- and punctuation-insensitive as today) and effect (`clueDecoded`). New: the live check with a `pattern` of letters, spaces and the punctuation `. , ! ? ' -` (so everything accepted today can still be submitted), `patternReason` `No digits or symbols: the scroll is plain words.`; Undo and Reset; the drone after 2 wrong tries. No Blocks mode: its answer isn't code.
- **The logic lock** keeps its switch panel and gains `[ RESET ]`, which turns every switch off (and clears stale outputs, as changing a switch does today).
- These three keep their unlock flags (`gateUnlocked`, `clueDecoded`, `towerPowered`), team sharing and log lines unchanged.

### State and actions

`GameState` gains:

| Field | Type | Meaning |
|---|---|---|
| `picks` | `Record<ChestId, 0 \| 1 \| 2>` | which bank challenge each chest asks |
| `seed` | `number` | the per-game shuffle seed for options, tiles and labels |
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
- Actions: `openChallenge` (internal to `interact` and `openCipher`), `submitChallenge { value }` (text for blanks and the keypad, an index for choices, a pairing for matches), `revealChallengeHint`, `closeChallenge`, `resetLogic`, `toggleCodex`.
- `isModalOpen` is true while `challenge`, the logic lock or the Codex is open, so movement, timers and river damage pause as they do for terminals today.

## Team play

- **Badges are personal.** A new message `{ type: "badge"; id; name; chest: ChestId }` is sent when you earn one. Teammates log `<name> earned the <Badge> Badge.` once per (player, chest). Unknown chest ids are ignored, so older and newer versions mix.
- **`archiveOpen` joins `TeamFlags`.** It is one-way like the others, its teammate log is `<name> unsealed the Archive.`, and late joiners get it from presence like the gate. Parsing is lenient: a flags object without `archiveOpen` reads as false, so an older client's messages still parse.
- **The access code** in team games comes from the room's `startedAt` (see above). Picks and the Matcher round are rolled per player.

## Drawing

### Sprites (new)

| Sprite | Size | Frames |
|---|---|---|
| `code-chest` | 16 × 16, bottom-anchored | closed, open; blue and teal, so it never reads as the amber Supply Cache |
| `syntax-terminal` | 16 × 24, bottom-anchored | one: a terminal post with a green screen |
| `archive` | 32 × 24, bottom-anchored | sealed (the hut's door with a padlock and chain), open (a dark doorway) |

- The Archive replaces the village hut prop at art (176, 116); its frame follows `archiveOpen`.
- Earned chests (yours) draw open; the C# chest is drawn at the Archive door only while the Archive is open.
- Every new sprite box joins the area's protected boxes, so decorations stay clear.

### The map overlay

- **Chest buttons:** each chest gets a landmark button (≥ 44 × 44 CSS px hit area, the same focus and hover rings) with a caption chip of its badge name (`C++ I`, `SQL`, …), in a new colour token for code chests. Once earned, the caption reads `<Badge> ✓`. North chests' buttons follow the wall rule above.
- **Village buttons:** `[S] Syntax Terminal` and `[A] Archive` join `[V] Ada` and `[P] Signpost`.
- **Prompts:** `[E] Open <Badge> Chest`, `[E] Use Syntax Terminal`, `[E] Unseal Archive` (sealed) or `[E] Open C# Chest` (open, not earned). An earned chest reads `[E] Review <Badge> Chest`.
- **Layout tests:** the existing caption tests extend to the new buttons: at 1× and 2× no caption box intersects another caption, a landmark or chest drawing, the dig spot or an exit sign; the label-layout grid tests take the new captions as fixed boxes.
- **Mini-map:** chests are small blue squares in their zone's cell, filled once you've earned them.

### The challenge terminal

One component, `ChallengeTerminal`, inside today's `TerminalDialog` (amber frame, dim backdrop, `[X] CLOSE`, Esc, focus trap, first input focused):

1. **Header:** the challenge's `title`, e.g. `< CODE CHEST: SQL >`.
2. **Instructions:** `PUZZLE INSTRUCTIONS:` and the `prompt`.
3. **Body by kind:**
   - **blank:** the code block (editor colours, line numbers) with the input in place of `___`. Under the code, the live-check line: `✓ Valid syntax` (muted) or `⚠ <reason>` (amber), announced in a polite live region; the input gets `aria-invalid` and a wavy underline while invalid.
   - **choice:** the code block (if any), then four options as a radio group (A–D; click, tap, arrow keys).
   - **match:** two columns of buttons (snippets left, labels right). Pick one from each side, in either order, to pair them; dragging a snippet onto a label with a mouse also pairs. Each pair shows the same numbered colour tag (1–5) on both items. Items are toggle buttons (`aria-pressed`), and each new pair is announced (`Paired 2: print("Hi") with Python.`).
4. **Toolbar** (blank and match): a `Type | Blocks` segmented toggle (blank only, not on the cipher or keypad), `[ UNDO ]` and `[ RESET ]`.
   - **Blocks mode** shows the tiles under the code; drag one into the blank, or tap it, or focus it and press Enter. A new tile replaces the old one. The live check applies to the placed tile. The chosen mode is remembered for the session (all challenges).
   - **Undo** steps back through the last 20 changes (typed edits, placed tiles, pairs). **Reset** returns to the starting value (the gate's `none`, otherwise empty) or clears all pairs or the chosen option. Both are disabled when there's nothing to undo or reset. Ctrl+Z inside the input keeps its native behaviour.
5. **Error line** after a wrong submission (`role="alert"`, danger colour). For a match, the wrong pairs also show `✗` until changed.
6. **Drone hint panel and buttons:** the hint panel (see Hints), `[ SUBMIT CODE ]` (disabled, with the live-check reason as its description, while the blank's check fails, while no option is chosen, or until all 5 pairs are made), `[ USE HINT ITEM ]`.
7. **Success view:** replaces the body after a correct answer: `✓ <Badge> Badge earned` (chests), `ACCESS CODE: <CODE>` (Matcher), or the gate's and cipher's existing success behaviour (they close at once, as today). Then the explanation and `[ CONTINUE ]`.

On phones the toolbar, tiles, options and match items are at least 44 px tall and the layout stacks; under reduced motion nothing animates.

### The Codex

- **Opening:** a `[C] Codex` button in the top bar, or the `C` key when no terminal is open. It opens in the same dialog frame, titled `< CODEX: <n>/10 BADGES >`, and closes with `[X] CLOSE` or Esc.
- **Grid:** the 10 badges. Each shows its name, where its chest is (`C++ Peaks · north of the wall`, `C++ Peaks`, `Dev Village`, `Dev Village · in the Archive`) and earned or not.
- **Earned badges** expand to show the question (its prompt and code), your answer and the explanation.
- **Quests:** the list gains `Badges: <n>/10` (bold at 10/10).

## Architecture

- **`src/learn/`** (new, pure):
  - `types.ts`: `Lang`, `Challenge`, `ChestId`, `ChallengeTarget`;
  - `bank/html.ts` … `bank/cpp.ts`, `bank/matcher.ts`, `bank/legacy.ts` (gate and cipher): the appendix, as data;
  - `chests.ts`: the chest table, `chestChallenge(state, id)`;
  - `check.ts`: `normalize`, `checkBlank`, `isCorrect`;
  - `access.ts`: `accessCode(seed)`.
- **`src/game/`:** `reducer.ts` (actions above), `types.ts` (state), `constants.ts` (places, log copy), `zones.ts` (places per zone), `team.ts` (`archiveOpen`, badge message, lenient flags).
- **`src/screens/`:**
  - `ChallengeTerminal.tsx` (new) with `challenge/BlankBody.tsx`, `ChoiceBody.tsx`, `MatchBody.tsx`, `Toolbar.tsx` and a small `useUndo` hook;
  - `Codex.tsx` (new);
  - `TerminalModal.tsx` and `CipherModal.tsx` are removed (their copy moves into `bank/legacy.ts`);
  - `LogicModal.tsx` gains Reset.
- **`src/render/`:** the new sprites, chest and Archive drawing in `scene.ts`, protected boxes in `areas/`.
- **`src/screens/overworld/`:** chest and village buttons (`MapViewport`, `mapLayout`), mini-map squares, the Codex button (`TopHud`), `Badges` line (`QuestList`), the `C` key (`useKeyboardControls`).

## Testing

- **Bank validity** (one test over all data):
  - 10 chests with exactly 3 challenges each, and 3 Matcher rounds of 5 pairs;
  - every language appears;
  - each blank has exactly one `___`, its accepted answers pass its own live check, its legal list has at least two valid wrong tokens, and its tiles contain an accepted answer;
  - choice options are 4 and unique, with `correct` in range;
  - match snippets and labels are unique within a round.
- **The live check:** each rule with its exact reason, and the no-leak property for every blank.
- **Answer checking:** normalising (trailing `;`, spaces, case by flag), correct and wrong for each kind.
- **Shuffling:** for a fixed seed the shown order is stable and is a permutation of the data; across seeds the correct choice option lands in every position.
- **Reducer:**
  - open, wrong, right, hint after 2 wrong tries, hint persistence, close resets tries;
  - badge order, `answered`, the log line, and the earned chest's card;
  - north chests before the gate;
  - picks and badges surviving respawn;
  - the Matcher solve and code;
  - the keypad (wrong, right, before solving);
  - the Archive acting as the C# chest;
  - the gate and the cipher unchanged in effect and copy;
  - the logic lock's reset;
  - modal pausing, including the Codex.
- **Team:**
  - badge messages logged once and unknown chests ignored;
  - `archiveOpen` shared, logged, and parsed leniently when missing;
  - every teammate's access code is the same for one `startedAt`.
- **Components:**
  - Type and Blocks (tap, Enter, drag), Undo and Reset limits, SUBMIT disabled with its reason;
  - the choice radio group;
  - match pairing by click, keyboard and drag, numbered tags, `✗` marks;
  - the success views;
  - the Codex grid and expansion;
  - chest buttons and captions, mini-map squares, the `C` key.
- **Layout:** the caption and label-grid tests extended as above.
- **Browser check (final task):**
  - desktop (1366 × 657) and phone (390 × 844, touch): answer a chest with typing and with Blocks; earn a badge; open the Codex;
  - solve the Matcher and unseal the Archive; earn the C# badge;
  - the gate with the live check;
  - a two-page team game: Kai's badge appears in Ana's log, and Ana's code opens the Archive for both;
  - no console errors.

## Edge cases

- **Closing mid-answer** keeps nothing you typed or paired; a revealed hint stays.
- **Hazards:** you can't be downed inside a terminal or the Codex, because time and hazards pause.
- **Crafted actions:** a `submitChallenge` with no open challenge, or with a value of the wrong kind, does nothing. Interacting with a chest in another zone does nothing (existing guard).
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

Code is shown exactly as it appears in the terminal. For blanks, `answers` are listed first, then `legal` (label in quotes), then `blocks`. Every answer has been checked against the language's real behaviour.

### HTML — `chest-html`

1. **blank** `html-link` — *Make the link go to the Devlandia site.*
   ```
   1 | <a ___="https://devlandia.dev">Home</a>
   ```
   answers `href`; legal `href src alt class id title target rel style` ("an HTML attribute"); blocks `href src link url alt`. Hint: "The attribute's name is short for 'hypertext reference'." Explain: "href sets where a link goes. src is for images and scripts."
2. **choice** `html-heading` — *Which tag makes the largest heading?* Options `<h1>` `<h6>` `<head>` `<header>`; correct `<h1>`. Hint: "Headings run from 1 (biggest) to 6 (smallest)." Explain: "<h1> is the top heading and <h6> the smallest. <head> holds page metadata, and <header> is a page section."
3. **blank** `html-list` — *Finish the list item.*
   ```
   1 | <ul>
   2 |   <___>Apples</li>
   3 | </ul>
   ```
   answers `li`; legal `li ul ol p div span td tr` ("an HTML tag"); blocks `li ol item p`. Hint: "The opening tag must match the closing tag." Explain: "Each item in a list sits in an <li> (list item) element."

### CSS — `chest-css`

1. **blank** `css-color` — *Make the paragraph text red.*
   ```
   1 | p {
   2 |   ___: red;
   3 | }
   ```
   answers `color`; legal `color background background-color border-color font-size font-weight opacity width` ("a CSS property"); blocks `color text-color font-color background`. Hint: "CSS uses American spelling for this property." Explain: "color sets the text colour; background-color sets the colour behind it."
2. **choice** `css-id` — *Which selector targets the element with id="hero"?* Options `#hero` `.hero` `hero` `*hero`; correct `#hero`. Hint: "Classes use a dot; ids use a different symbol." Explain: "# selects by id, . selects by class, and a bare name selects a tag."
3. **choice** `css-margin` — *.box { margin: 10px 20px; } — how much margin is on the left?* Options `20px` `10px` `0` `30px`; correct `20px`. Hint: "With two values, the first is top and bottom, the second is left and right." Explain: "margin: 10px 20px means 10px top and bottom, 20px left and right."

### PHP — `chest-php`

1. **blank** `php-echo` — *Print the greeting.*
   ```
   1 | <?php
   2 |   ___ "Hello, Devlandia!";
   3 | ?>
   ```
   answers `echo`, `print`; legal `echo print return include require` ("a PHP statement"); blocks `echo console.log printf say`. Hint: "PHP's usual output statement echoes what you give it." Explain: "echo (or print) sends text to the page. console.log is JavaScript."
2. **choice** `php-var` — *How does every PHP variable name start?* Options `$` `@` `#` `&`; correct `$`. Hint: "It's a currency symbol." Explain: "PHP variables start with $, as in $name."
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
   answers `FROM`; legal `FROM WHERE INTO JOIN SET VALUES TABLE ORDER GROUP BY` ("an SQL keyword"), case-insensitive; blocks `FROM INTO FORM WHERE`. Hint: "You select columns from a table." Explain: "SELECT … FROM table picks columns from that table."
2. **choice** `sql-where` — *Which clause keeps only the rows where age is over 18?* Options `WHERE age > 18` `ORDER BY age > 18` `FILTER age > 18` `LIMIT 18`; correct `WHERE age > 18`. Hint: "This clause filters rows by a condition." Explain: "WHERE filters rows; ORDER BY sorts them and LIMIT caps how many come back."
3. **choice** `sql-max` — *The scores table's points column holds 7, 3 and 9. What does this return?*
   ```
   1 | SELECT MAX(points) FROM scores;
   ```
   Options `9` `3` `19` `7`; correct `9`. Hint: "MAX picks one value." Explain: "MAX returns the largest value in the column: 9."

### Python — `chest-py-1` (Python I)

1. **blank** `py-print` — *Show the greeting on screen.*
   ```
   1 | ___("Hello, Devlandia!")
   ```
   answers `print`; legal `print input len str int` ("a Python built-in function"), case-sensitive; blocks `print echo printf Print`. Hint: "It's the same word you'd use in English." Explain: "print() writes to the screen. echo and printf belong to other languages."
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
   answers `append`; legal `append insert extend remove pop sort` ("a list method"), case-sensitive; blocks `append add push insert`. Hint: "You append to the end." Explain: "append() adds one item to the end of a list. add and push are other languages' names."
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
   answers `println`; legal `println print printf format` ("a System.out method"), case-sensitive; blocks `println print log echo`. Hint: "The method's name ends with 'ln', for line." Explain: "println prints and ends the line; print doesn't end it. log and echo aren't System.out methods."
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
   answers `WriteLine`; legal `WriteLine Write ReadLine Clear Beep` ("a Console method"), case-sensitive; blocks `WriteLine println Print writeline`. Hint: "C# method names start with a capital letter." Explain: "Console.WriteLine prints a line. C# names are case-sensitive, so writeline isn't the same method."
2. **choice** `cs-var` — *Which keyword declares a variable whose type the compiler works out?* Options `var` `let` `auto` `dim`; correct `var`. Hint: "It's short for 'variable'." Explain: "var lets C# infer the type. let is JavaScript, auto is C++ and Dim is Visual Basic."
3. **choice** `cs-interp` — *What does this print?*
   ```
   1 | string name = "Ada";
   2 | Console.WriteLine($"Hi {name}");
   ```
   Options `Hi Ada` `Hi {name}` `$Hi Ada` `Hi name`; correct `Hi Ada`. Hint: "The $ before the quotes fills in the braces." Explain: "An interpolated string ($\"…\") replaces {name} with the variable's value."

### C++ — `chest-cpp-1` (C++ I)

1. **blank** `cpp-cout` — *Print Hello.*
   ```
   1 | #include <iostream>
   2 | int main() {
   3 |   std::___ << "Hello";
   4 | }
   ```
   answers `cout`; legal `cout cin cerr clog endl` ("an iostream name"), case-sensitive; blocks `cout cin print console`. Hint: "It's the 'character output' stream." Explain: "std::cout is the standard output stream; << sends text into it."
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
   answers `<`; legal `< <= > >= == !=` ("a C++ comparison operator"; the bracket rule doesn't apply here); blocks `< <= => =<`. Hint: "The loop must stop before i reaches 3." Explain: "i < 3 runs for 0, 1 and 2. => and =< aren't C++ operators."
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

Title `< SYNTAX TERMINAL: DEV VILLAGE >`. Prompt: "Match each snippet to its language, then submit to print the Archive's access code." (Round 3: "…to its output, then…".) Hint: "Look for each language's tell-tale symbols: $ for PHP, :: for C++, tags for HTML." (Round 3: "Work each line out in your head; ** is a power and % a remainder.") Explain: "Every language has its own syntax: the same 'say hi' looks different in each."

1. `SELECT name FROM users;` → SQL · `$name = "Ada"; echo $name;` → PHP · `System.out.println("Hi");` → Java · `print("Hi")` → Python · `<p>Hi</p>` → HTML
2. `std::cout << "Hi";` → C++ · `Console.WriteLine("Hi");` → C# · `h1 { color: teal; }` → CSS · `def hi(): return "Hi"` → Python · `INSERT INTO users VALUES ('Ada');` → SQL
3. `print(2 ** 3)` (Python) → `8` · `print("ab" * 2)` (Python) → `abab` · `std::cout << 7 % 3;` (C++) → `1` · `System.out.println(10 / 4);` (Java) → `2` · `echo strlen("devs");` (PHP) → `4`

### Gate and cipher (`bank/legacy.ts`)

The gate's and cipher's existing copy, unchanged: titles, instructions, code lines, `PUZZLE_HINT`, `CIPHER_HINT`, `puzzleError`, `cipherError`, `SCROLL_CIPHERTEXT`, with the new live-check data given under "The gate and the cipher".
