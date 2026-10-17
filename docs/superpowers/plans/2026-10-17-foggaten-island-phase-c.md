# Foggaten Island, Phase C: The Lighthouse Lamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the team light the island's lighthouse by setting eight switches to the binary letter `H`, with a shared one-way `lighthouseLit` flag, a lit lamp and a sweeping beam.

**Architecture:** The lamp is a modal puzzle like the Signal Tower's `LogicModal` (separate state fields, a pure rules module, a screen), not part of the challenge engine, because its input is a row of switches. `lighthouseLit` is a game flag shared with the team exactly like `archiveOpen` (optional on the wire, lenient when missing or odd). The lit state is drawn by a second lighthouse sprite frame, a glow and a beam in the existing canvas painter. This is **Phase C of five** in the spec; Phase D (12th chest) and Phase E (Cinder Isle) will later read the flag, and until then lighting the lighthouse only gives a story line and a lit lamp.

**Tech Stack:** Vite 8, React 19, TypeScript strict (`tsc -b` also checks tests; `noUnusedLocals/Parameters`), Tailwind 4, Vitest 5 + jsdom, Testing Library + user-event, the pixel-art canvas painter in `src/render`.

**Spec:** `docs/superpowers/specs/2026-10-17-foggaten-island-design.md` (section "Phase C: The Lighthouse Lamp puzzle" and the cross-cutting sections)

## Global Constraints

- The puzzle: at the lighthouse, `E` opens a terminal titled `< LIGHTHOUSE: LAMP LOCK >` with **eight switches**, a live binary and decimal readout, and the target text `Make the lamp send the letter H` (ASCII `H` = 72 = `01001000`). `[ RUN LAMP ]` checks the switches.
- Wrong setting: the error says what the lamp sent instead: `The lamp sent "K". It should send "H".`; when the number is not a letter (A–Z, a–z) it sends `?`: `The lamp sent "?". It should send "H".`. From the second wrong run on, the error ends with ` The drone has a tip below.` and the tip shows (the same rule as the other puzzles); `[ USE HINT ITEM ]` also shows it. The tip text: `Each switch is worth a power of two: 128, 64, 32, 16, 8, 4, 2, 1. H is number 72 in the ASCII table: 64 + 8.`
- Reward: a correct setting sets `lighthouseLit` for the whole team, closes the terminal and logs `The lamp catches. The lighthouse beam sweeps the fog.`; a teammate who lights it logs `<name> lit the lighthouse. Its beam sweeps the fog.`
- Lit lighthouse card: `The lighthouse lamp burns bright. Its beam sweeps the fog, and something stirs far across the water.` (Phase D and E will give it a purpose). The `[E]` verb at the lighthouse is `Light the Lamp` until it is lit, then `Inspect Lighthouse`.
- The hermit gains a last stage before his closing line, for `lighthouseLit === false` once the Golden Semicolon is found: `The lighthouse lamp wants a letter, spelled in eight switches of binary. Look for the terminal by its door.`
- `lighthouseLit` is **one-way** and shared: older clients' messages without it read as `false`; any value other than `true` reads as `false`; a teammate's flag never turns it off.
- It is part of the game, not the account: it is not saved anywhere. There are still 11 badges, and no HP, stamina, clock, quest or existing puzzle changes. No chest, no boat, no database change.
- While the lamp terminal is open, movement, time and hazards pause (it is a modal like the tower's); `Esc` closes it; the Codex, a challenge, the tower terminal and `sail` cannot open or run on top of it; opening it needs a place in reach and no other modal open.
- Reduced motion: the beam does not sweep (it is drawn steady, pointing right); the lit lamp itself is a still frame.
- Commit trailers on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub`. No model identifiers in code or commits. Push to `claude/trusting-archimedes-64rvrc` after commits; never force.

## Review Focus

1. A teammate lighting the lighthouse while you have the lamp terminal open closes yours with only their line logged (you never sit in a dead terminal), and the flag can never go back to false through any team message. Tests: Tasks 2 and 3.
2. Only `01001000` lights it: every other 8-bit setting (all 255) is refused, changes nothing but the error and the try count, and a crafted `submitLamp` action with the wrong length or non-bits is ignored. Tests: Task 1 and Task 2.
3. Modal exclusivity: the lamp cannot open over another modal, `sail`, the Codex and every other modal are refused while it is open, and `Esc` closes it. Tests: Task 2.
4. Older and newer clients mix: a flags object without `lighthouseLit` still parses; one with `lighthouseLit: "yes"` or `1` reads as false. Tests: Task 3.
5. Reduced motion draws a steady beam and still lamp; nothing else on the island or elsewhere changes. Tests: Task 5.

---

### Task 1: The lamp rules

**Files:**
- Create: `src/game/lamp.ts`
- Test: `src/game/lamp.test.ts`
- Modify: `src/game/constants.ts` (copy: `LAMP_HINT`, `LOG.lampOpened`, `LOG.lampLit`, `LOG.lighthouseOnline`)

**Interfaces:**
- Produces:
  - `type Bits8 = [Bit, Bit, Bit, Bit, Bit, Bit, Bit, Bit]` (`Bit` from `./logic`)
  - `LAMP_LETTER = "H"`
  - `isBits8(v: unknown): v is Bits8`: an array of exactly 8 values each `0` or `1`
  - `lampLetter(bits: Bits8): string`: the character whose code is the binary number, if it is `A–Z` or `a–z`, else `"?"`
  - `isLampLit(bits: Bits8): boolean`: true only for `01001000`
  - `lampError(bits: Bits8): string | null`: null when lit, else `The lamp sent "<letter>". It should send "H".`
  - `bits8ToBinary(bits: Bits8): string`, `bits8ToDecimal(bits: Bits8): number`
  - constants in `constants.ts`: `LAMP_HINT` (the tip text above), `LOG.lampOpened` = `Lighthouse terminal ready. Lamp lock found.`, `LOG.lampLit` = `The lamp catches. The lighthouse beam sweeps the fog.`, `LOG.lighthouseOnline` = the lit lighthouse card text above

- [ ] **Step 1: Write the failing tests** in `lamp.test.ts`: `isBits8` accepts `[0,1,0,0,1,0,0,0]` and rejects length 7 and 9, `[2,0,0,0,0,0,0,0]`, `["0",...]`, `null`, a string; `lampLetter` gives `"H"` for `01001000`, `"K"` for `01001011`, `"a"` for `01100001`, `"?"` for `00000000`, `"?"` for `11111111` and for `00110000` (the digit `0`); `isLampLit` is true for exactly one of all 256 settings (loop over every number 0–255 and count) and that one is `01001000`; `lampError` is null for it and equals `The lamp sent "K". It should send "H".` for `01001011` and `The lamp sent "?". It should send "H".` for `00000000`; `bits8ToBinary` of 72 is `01001000` and `bits8ToDecimal` gives 72.
- [ ] **Step 2: Run** `npx vitest run src/game/lamp.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `lamp.ts` and the constants. `lampLetter` converts the bits to a number and tests `/^[A-Za-z]$/` on `String.fromCharCode(n)`.
- [ ] **Step 4: Run** `npx vitest run src/game/lamp.test.ts` and `npx tsc -b` — Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat: the lighthouse lamp's rules`.

---

### Task 2: The lamp in the game state

**Files:**
- Modify: `src/game/types.ts` (state fields, actions), `src/game/reducer.ts` (`initialState`, `isModalOpen`, `interact` at the lighthouse, new actions, `toggleCodex` guard, `teamSync`), `src/game/cards.ts` (lit card), `src/game/island.ts` (`ISLAND_COPY.lighthouseLit`, hermit stage), `src/game/geometry.ts` (verb), `src/hooks/useKeyboardControls.ts` (Esc), `src/screens/MenuBackdrop.tsx` (its state literal)
- Test: `src/game/reducer.test.ts`, `src/game/cards.test.ts`, `src/game/island.test.ts`, `src/game/geometry.test.ts`, `src/hooks/useKeyboardControls.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`Bits8`, `isBits8`, `isLampLit`, `lampError`, `LAMP_HINT`, the `LOG` lines)
- Produces:
  - `GameState` gains `lighthouseLit: boolean` (shared; false initially), `lampOpen: boolean`, `lampError: string | null`, `lampTries: number`, `lampHintRevealed: boolean`
  - `GameAction` gains `{ type: "submitLamp"; bits: Bits8 }`, `{ type: "closeLamp" }`, `{ type: "revealLampHint" }`, `{ type: "resetLamp" }`
  - `isModalOpen` also true while `lampOpen`
  - `interact` at `lighthouse`: unlit and no modal open → `inspected: "lighthouse"`, `lampOpen: true`, `lampError: null`, `lampTries: 0`, log `LOG.lampOpened`; lit → `inspected: "lighthouse"` and log `LOG.lighthouseOnline`
  - `submitLamp` with a value that is not `isBits8`, or when `lampOpen` is false: state returned untouched; wrong bits: `lampTries + 1`, `lampError` from `lampError(bits)` plus ` The drone has a tip below.` from the second wrong try on, and `lampHintRevealed: true` from the second wrong try on; right bits: `lighthouseLit: true`, `lampOpen: false`, `lampError: null`, log `LOG.lampLit`
  - `closeLamp` closes it and clears the error; `resetLamp` clears the error only; `revealLampHint` sets `lampHintRevealed`
  - `teamSync`: a newly set `lighthouseLit` closes an open lamp terminal (only the teammate's line is logged)
  - `hermitLine` gains the last stage (field `lighthouseLit` in its `Progress` pick)
  - `verbFor` at the lighthouse: `Light the Lamp` when unlit, else `Inspect Lighthouse` (the existing default label path)

- [ ] **Step 1: Write the failing tests.**
  - `reducer.test.ts`: `interact` at the lighthouse (player beside it, no modal) opens the lamp: `lampOpen`, `inspected: "lighthouse"`, the `LOG.lampOpened` line, `isModalOpen` true; with the Codex, a challenge or the tower terminal already open it changes nothing; when lit it only inspects and logs `LOG.lighthouseOnline`; `submitLamp` with `01001000` lights it (flag true, modal closed, `LOG.lampLit`, `hp/stamina/minutes/badges` unchanged); for **every** other value 0–255 `lighthouseLit` stays false and `lampOpen` stays true (loop); the first wrong run sets the error without the drone note and `lampHintRevealed` false, the second adds ` The drone has a tip below.` and sets `lampHintRevealed`; a crafted `submitLamp` with 7 bits, 9 bits, `[2,0,0,0,0,0,0,0]` or a string returns the same state object; `submitLamp` while `lampOpen` is false returns the same state; `closeLamp`/`resetLamp`/`revealLampHint` do their one thing; while the lamp is open `toggleCodex`, `sail`, `interact` at another place (the tower, a chest) and `move` change nothing; `teamSync` with `lighthouseLit: true` while the lamp is open closes it, sets the flag, and logs only the teammate's line; `teamSync` never sets `lighthouseLit` back to false.
  - `cards.test.ts`: the lighthouse card is `ISLAND_COPY.lighthouse` unlit and `ISLAND_COPY.lighthouseLit` when `lighthouseLit`.
  - `island.test.ts`: with `hasLoot`, `clueDecoded`, `artifactFound` true and `lighthouseLit` false the hermit gives the lighthouse hint; with all four true he gives his closing line; no stage mentions the gate; the existing stage order is unchanged.
  - `geometry.test.ts`: the lighthouse verb is `Light the Lamp` unlit and `Inspect Lighthouse` lit.
  - `useKeyboardControls.test.tsx`: `Esc` with `lampOpen` dispatches `closeLamp`.
- [ ] **Step 2: Run** `npx vitest run src/game src/hooks` — Expected: FAIL.
- [ ] **Step 3: Implement** the types, reducer branches, card, hermit stage, verb, Esc handling and the `MenuBackdrop` state literal. The wrong-run error and drone note reuse the reducer's existing `DRONE_NOTE`. `teamSync`'s stale list gains `lampOpen && merged.lighthouseLit` (it closes `lampOpen`, as it closes the challenge for the gate).
- [ ] **Step 4: Run** `npx vitest run src/game src/hooks` and `npx tsc -b` — Expected: PASS, clean (fix every state literal in tests that `tsc` reports).
- [ ] **Step 5: Commit** `feat: the lighthouse lamp puzzle in the game`.

---

### Task 3: The shared `lighthouseLit` flag

**Files:**
- Modify: `src/game/team.ts` (`TeamFlags`, `FLAG_KEYS`, `NO_FLAGS`, `TEAMMATE_LOG`, `parseFlags`)
- Test: `src/game/team.test.ts`, `src/hooks/useTeamSession.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`GameState.lighthouseLit`)
- Produces: `TeamFlags.lighthouseLit: boolean`; `FlagKey` includes it; `flagsOf`, `mergeFlags` (logical OR, so it never goes false), `newlySet` and `teammateLog(name, "lighthouseLit")` = `<name> lit the lighthouse. Its beam sweeps the fog.`; `parseFlags` treats `archiveOpen` and `lighthouseLit` both as optional and lenient (`=== true` or false)

- [ ] **Step 1: Write the failing tests.** `team.test.ts`: `NO_FLAGS.lighthouseLit` is false; `flagsOf(state)` carries it; `mergeFlags` keeps it true when either side has it and never clears it; `newlySet` reports `lighthouseLit` once; `teammateLog("Kai", "lighthouseLit")` is the exact line; `parsePresence` and `parseMessage` (`progress`) accept flags **without** `lighthouseLit` (and without `archiveOpen`) and read it as false, read `lighthouseLit: true` as true, and read `"yes"`, `1`, `null` as false; the six original flags are still required (a message missing `gateUnlocked` is rejected). `useTeamSession.test.tsx`: a raw teammate progress message with `lighthouseLit: true` reaches `onProgress` as a flag set containing it (follow the existing `archiveOpen` test).
- [ ] **Step 2: Run** `npx vitest run src/game/team.test.ts src/hooks/useTeamSession.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** by generalising `REQUIRED_FLAGS`/the optional handling in `team.ts` to a list of optional keys.
- [ ] **Step 4: Run** the two files, `npx vitest run` (whole suite) and `npx tsc -b` — Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat: lighthouseLit is a shared team flag`.

---

### Task 4: The lamp terminal screen

**Files:**
- Create: `src/screens/LampModal.tsx`
- Modify: `src/screens/overworld/Overworld.tsx` (render it)
- Test: `src/screens/LampModal.test.tsx`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Consumes: Task 1 and 2
- Produces: `LampModal({ error, hintRevealed, onSubmit, onClose, onRevealHint, onReset })` with the props of `LogicModal` but `onSubmit: (bits: Bits8) => void`. It renders `TerminalDialog` titled `< LIGHTHOUSE: LAMP LOCK >`, the text `Make the lamp send the letter H`, eight `role="switch"` buttons labelled `Switch 1` … `Switch 8` showing `[1: 0]` etc. (switch 1 is the 128 bit), the readout `<binary> (binary) = <n> (decimal)`, the error (hidden while the switches differ from the last run), the hint section (`LAMP_HINT` when revealed, else `PUZZLE_HINT_LOCKED`), and buttons `[ RUN LAMP ]`, `[ RESET ]` (switches back to all 0 and clears the error), `[ USE HINT ITEM ]`. Switches are at least 44 px and wrap on a phone.

- [ ] **Step 1: Write the failing tests.** `LampModal.test.tsx`: eight switches start off with the readout `00000000 (binary) = 0 (decimal)`; toggling switch 2 and switch 5 reads `01001000 (binary) = 72 (decimal)`; `[ RUN LAMP ]` calls `onSubmit` with `[0,1,0,0,1,0,0,0]`; an `error` prop shows an alert until a switch changes; `[ RESET ]` zeroes the switches and calls `onReset`; `[ USE HINT ITEM ]` calls `onRevealHint`; the hint shows `LAMP_HINT` when `hintRevealed`; the text `Make the lamp send the letter H` is present; the title is present and `Esc` closes (via `TerminalDialog`). `Overworld.test.tsx`: from a state beside the lighthouse on the island, `E` (or its button) opens the dialog; setting the switches to `01001000` and pressing `[ RUN LAMP ]` closes it and logs `LOG.lampLit`; a wrong setting shows `The lamp sent "K". It should send "H".`.
- [ ] **Step 2: Run** `npx vitest run src/screens/LampModal.test.tsx src/screens/overworld/Overworld.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `LampModal.tsx` copying the structure and classes of `LogicModal.tsx`, and render it in `Overworld.tsx` next to the logic modal, wired to the four lamp actions.
- [ ] **Step 4: Run** the same files and `npx tsc -b` — Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat: the lighthouse lamp terminal`.

---

### Task 5: The lit lighthouse

**Files:**
- Modify: `src/render/sprites.ts` (a second lighthouse frame), `src/render/scene.ts` (`SceneInput.lighthouseLit`, the island branch: frame, glow, beam), `src/screens/overworld/MapViewport.tsx` (pass `lighthouseLit` into the scene), `src/screens/overworld/Overworld.tsx` (pass the prop)
- Test: `src/render/sprites.test.ts`, `src/render/scene.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, plus fixtures that `tsc` reports

**Interfaces:**
- Consumes: Task 2
- Produces:
  - `SPRITES.lighthouse.frames` has two frames: frame 0 unchanged (dark lamp room), frame 1 with the lamp room in warm yellow (`#fde047`, palette key `y`) and the same outline and size
  - `SceneInput.lighthouseLit: boolean`; on `foggaten` the lighthouse is drawn with `frame: lighthouseLit ? 1 : 0`; when lit, `light` gains a glow around the lamp (the existing `glow()` in `#fde047`, at full strength by night and by day at 0.5) and a **beam**: a row of pixels from the lamp, 60 art px long, alpha falling from 0.5 to 0.05, drawn to the right for the first 2 s of every 4 s and to the left for the next 2 s; with reduced motion it is always drawn to the right. When unlit the island's `light` is `[]` as before.

- [ ] **Step 1: Write the failing tests.** `sprites.test.ts`: the lighthouse has 2 frames of 22 × 44 and frame 1 differs from frame 0 only in the lamp-room rows; the outline test for every sprite still holds. `scene.test.ts`: on `foggaten` the lighthouse drawable has frame 0 unlit and frame 1 lit; unlit `light` is empty; lit `light` has glow pixels in `#fde047` near the lamp and beam pixels extending right of the lamp at `t = 0` and left of it at `t = 2500`; with `reduced` the beam is right of the lamp at both times; the beam stays inside the world rows and its alpha is between 0.05 and 0.5; no other zone's scene changes when `lighthouseLit` is true (compare village, forest and Peaks scenes with and without it). `MapViewport.test.tsx`: the scene given to the canvas carries `lighthouseLit`.
- [ ] **Step 2: Run** `npx vitest run src/render src/screens/overworld` — Expected: FAIL.
- [ ] **Step 3: Implement** the lit frame (a copy of `lighthouseGrid` that paints the lamp room with `y`), the island branch in `scene()` (the zone currently falls into the generic non-forest branch; add an island branch before it), and pass the prop through.
- [ ] **Step 4: Run** `npx vitest run` (whole suite) and `npx tsc -b` — Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat: a lit lighthouse with a sweeping beam`.

---

### Task 6: README, browser check, final review

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README.** Under the Foggaten Island bullet, explain the lamp lock (eight switches, the letter `H`, the drone's tip after two wrong tries), that lighting it is shared with the team and lights the lamp and beam, and that the 12th chest and the second island come in later phases; add `lamp` to the `src/game/` layout line.
- [ ] **Step 2: Browser check** at 1366 × 657 and 390 × 844 against `npm run build` + `vite preview` (kill by saved pid), as a guest in Solo Quest: solve the Terminal Gate, sail, open the lamp at the lighthouse, run a wrong setting twice (error text and drone tip show), set `01001000` and run it, see the lit lamp and sweeping beam; confirm `Esc` closes the terminal; no horizontal scroll; no console errors (the missing favicon 404 is known). Take screenshots and look at them.
- [ ] **Step 3: Full verification:** `npx tsc -b`, `npx vitest run`, `npm run build` — Expected: clean and green.
- [ ] **Step 4: Commit and push** `docs: the lighthouse lamp in the README`.
- [ ] **Step 5: Final whole-branch review** on the most capable model with the Review Focus above; triage, one fix pass (each fix RED→GREEN), ledger the rest. Then write the Phase D plan (the 12th chest and the database migration) when the owner asks for it.
