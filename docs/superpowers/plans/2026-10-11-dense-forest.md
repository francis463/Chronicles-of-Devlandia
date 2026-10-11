# Dense Forest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the user chose native, inline execution). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Dense Forest as a third zone south of the C++ Peaks, with a ranger guide, landmarks, an 11th (JavaScript) chest, and the Golden Semicolon's new burial place.

**Architecture:** Zones gain a list of exits on any of four edges (today one, west/east), and areas gain lists of mouths and corridors, so a vertical exit is data, not a special case. The forest is then added the way the village was: a `ZoneId`, a `Zone` entry, an `Area` (terrain, paths, mouths, props), places, map buttons, a mini-map cell. The JavaScript chest is one more row in the chest table; the dig spot becomes a forest-only reveal.

**Tech Stack:** TypeScript strict (`tsc -b` also checks tests), React 19, Vitest 5 + jsdom, Canvas pixel art (`src/render`), Playwright (at `/opt/node22/lib/node_modules/playwright`, Chromium at `/opt/pw-browsers/chromium`).

**Spec:** `docs/superpowers/specs/2026-10-11-dense-forest-design.md` (read it; it is the authority). Background: `2026-10-08-dev-village-zones-design.md` (the pattern this repeats), `2026-10-11-bigger-question-bank-design.md` (bank rules, `BANK_SIZE`).

## Global Constraints

- Three zones: `"peaks" | "village" | "forest"`. Exits: Peaks west (rows 62–78 → village), village east (rows 62–78 → Peaks), **Peaks south** (columns 62–78 → forest), **forest north** (columns 62–78 → Peaks). Spans are inclusive game percentages.
- Leaving through a south or north exit is a vertical step off the edge (`y > BOUNDS.maxY` / `y < BOUNDS.minY`) from a column inside the span; the column is kept; arrival is on the opposite edge (`y` 10 or 90); the drone lands 8 rows in and 2 columns over. West/east behaviour and tests are unchanged.
- The forest has **no hazard, no fog, no wall and no river**. Respawn is unchanged (Peaks camp). Only the forest turns off the fog; Peaks and village keep it until the tower is powered.
- Forest places (game %): `[R] Ranger` (60, 62) id `ranger`; `[F] Campfire` (46, 66) id `campfire`; `[O] Old Oak` (24, 50) id `old-oak`; `[P] Signpost` (84, 26) id `forest-signpost`; JavaScript chest (18, 78) id `chest-js`; dig spot (86, 80) (the Golden Semicolon, `artifact`). The ranger is an `explorer-down` sprite with hood `#be123c`. The plan's executor may nudge an art point by a few px to fit a final sprite, recording a ruling.
- JavaScript chest: `ChestId` `"chest-js"`, `Lang` `"javascript"`, badge `JavaScript`, spoken `JavaScript`, language `JavaScript`, zone `forest`, caption `above`, `north: false`, appended as the 11th row; bank = `BANK_SIZE` (6) questions, 2 blanks + 4 choices, same field rules as the other banks (one `___` gap, a `live` check, 4–6 Blocks tiles with exactly one accepted and ≥ 2 wrong that pass the live check, hints that do not give the answer away, true explanations, ids `js-<topic>`).
- `rollGame` draws the 11 picks (chest table order) **before** the seed, so the solo seed, Matcher round and access code shift by one draw; a team's code seed is unchanged.
- Everything that said "10 badges" says 11; no source or doc keeps a stale 10 (a grep is a step in Task 6).
- Ping places grow by `ranger`, `campfire`, `js`. Their points come from the constants, never copies.
- Commit trailers on every commit:
  ```
  Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub
  ```
- Branch `claude/trusting-archimedes-64rvrc`; never push `main` without explicit permission; no model identifiers in code or commits.

## Review Focus

1. **Stepping at the exit's edge.** The last row inside the span steps out; one column outside the span clamps and stays; a diagonal-like sequence never teleports; the arrival (and the drone) is inside `BOUNDS`. Pinned in Task 1.
2. **A teammate in the forest.** `pos` with zone `"forest"` is accepted and drawn in the mini-map cell and `/where`; a zone this version doesn't know is still "somewhere new" and never drops the player. Pinned in Task 3.
3. **A stale dig spot.** After a teammate's `artifactFound` syncs while you stand in the Peaks, no X, no button and no `[E] Dig here` remains anywhere; in the forest the X shows only between decoding and finding. Pinned in Task 8.
4. **The count 11.** No hard-coded 10 or 30/60 left (Codex title, quest line, `/badges`, tests, README, the bank test's totals), and the roll's draw order is pinned. Pinned in Task 6.
5. **The wall and the fog in the forest.** A player at y 48 and y 50 crosses freely in the forest; the wall tiles and the north-chest gating never apply there; the fog is off in the forest and still on in the village. Pinned in Tasks 3 and 4.

---

### Task 1: Exits on any edge, as a list

**Files:**
- Modify: `src/game/zones.ts`, `src/game/reducer.ts` (call site only)
- Test: `src/game/zones.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Exit = { edge: "west" | "east" | "south" | "north"; min: number; max: number; to: ZoneId };
  // Zone.exits: Exit[]   (replaces Zone.exit)
  export function exitFrom(exits: readonly Exit[], from: Point, to: Point): Exit | null; // pure, tested directly
  export function exitFor(zone: ZoneId, from: Point, to: Point): Exit | null;            // = exitFrom(ZONES[zone].exits, …)
  export function arrival(exit: Exit, from: Point): { player: Point; drone: Point };     // was (exit, y)
  ```
  `min`/`max` are rows (`y`) for west/east and columns (`x`) for south/north, inclusive. Until Task 3 the two zones keep one exit each (`min` 62, `max` 78).

- [ ] **Step 1: Write the failing tests.** In `zones.test.ts` keep every existing assertion's meaning (rewritten for `exits`, `min`/`max`, `arrival(exit, from)`), and add `exitFrom` cases on a literal exit list: `{ edge: "south", min: 62, max: 78, to: "forest" }` — a step from `(70, 90)` to `(70, 94)` leaves; from `(62, 90)` and `(78, 90)` leave; from `(58, 90)` and `(82, 90)` do not; a horizontal step at the south edge does not; a step to `(70, 94)` from `(70, 86)` does not (not on the edge row). The same for `{ edge: "north", … }` at `y` 10. `arrival` on a south exit from `(70, 90)` is player `(70, 10)` and drone `(68, 18)`; on a north exit from `(70, 10)` is player `(70, 90)` and drone `(68, 82)`; west/east arrivals are as today (drone 8 columns in, 2 rows up). Every arrival point is inside `BOUNDS` and on the movement lattice (x ≡ 2 mod 4 after a horizontal crossing; for vertical crossings the column keeps its value).
- [ ] **Step 2: Run** `npx vitest run src/game/zones.test.ts`. Expected: FAIL (`exitFrom`, `exits`).
- [ ] **Step 3: Implement** the types and functions above; update the reducer's `move` to `arrival(exit, state.player)`; nothing else in the game changes.
- [ ] **Step 4: Run** `npx vitest run src/game` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `refactor(game): a zone's exits are a list and can be on any edge`.

---

### Task 2: Areas with several mouths and corridors

**Files:**
- Modify: `src/render/areas/area.ts`, `src/render/areas/peaks.ts`, `src/render/areas/village.ts`, `src/render/terrain.ts`
- Test: `src/render/terrain.test.ts`, `src/render/areas/areas.test.ts`

**Interfaces:**
- Produces: `Area.mouth: Rect` → `Area.mouths: Rect[]` and `Area.corridor: Rect` → `Area.corridors: Rect[]` (same rects, now in lists); `terrain.ts` treats a hedge piece as a gap when its box intersects **any** mouth, and drops outside scenery that intersects **any** corridor. No behaviour change for the two existing areas.

- [ ] **Step 1: Write the failing tests.** Update `terrain.test.ts` and `areas.test.ts` to the list shape (`PEAKS.corridors`, `VILLAGE.corridors`, "every mouth …"). Add a test that builds a copy of `PEAKS` with a second, bottom mouth `{ x: 192, y: 148, w: 64, h: 32 }` and second corridor `{ x: 192, y: 180, w: 64, h: 1000 }` and asserts the bottom-row hedge pieces whose boxes intersect it are left out, other bottom-row pieces are still there, and no outside decoration below the world intersects the corridor.
- [ ] **Step 2: Run** `npx vitest run src/render`. Expected: FAIL.
- [ ] **Step 3: Implement** the list shape and the two loops in `terrain.ts`; wrap the existing rects in arrays in `peaks.ts` and `village.ts`.
- [ ] **Step 4: Run** `npx vitest run src/render src/screens` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `refactor(render): areas can have several exit mouths`.

---

### Task 3: The forest as an empty, walkable zone

**Files:**
- Create: `src/render/areas/forest.ts`
- Modify: `src/game/zones.ts`, `src/game/constants.ts` (`LOG.enteredForest`), `src/game/reducer.ts` (wall flag, forest has no river), `src/game/team.ts` (zone parsing), `src/render/areas/index.ts`, `src/render/areas/peaks.ts` (south mouth, corridor, path, protected boxes), `src/screens/overworld/mapLayout.ts` (exit signs as a list, forest caption), `src/screens/overworld/MapViewport.tsx` (forest branch, fog), `src/screens/overworld/MiniMap.tsx` (three cells)
- Test: `src/game/zones.test.ts`, `src/game/reducer.test.ts`, `src/game/team.test.ts`, `src/render/areas/areas.test.ts`, `src/render/terrain.test.ts`, `src/screens/overworld/mapLayout.test.ts`, `src/screens/overworld/labelLayout.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/screens/overworld/MiniMap.test.tsx`, `src/screens/overworld/TeamOverworld.test.tsx`

**Interfaces:**
- Consumes: Task 1's `Exit`, `Zone.exits`; Task 2's `Area.mouths`/`corridors`.
- Produces:
  ```ts
  export type ZoneId = "peaks" | "village" | "forest";
  // Zone gains `wall: boolean` (peaks true, village true, forest false); `gate` and `river` as today (forest false/false).
  // ZONES.peaks.exits = [west(62–78 → village), south(62–78 → forest)]; ZONES.village.exits = [east(62–78 → peaks)];
  // ZONES.forest.exits = [north(62–78 → peaks)]; ZONES.forest.places = [] until Task 5; ZONES.forest.name = "Dense Forest".
  // LOG.enteredForest = "Entered Dense Forest."
  export const FOREST: Area;                       // src/render/areas/forest.ts
  // mapLayout: EXIT_SIGNS: Record<ZoneId, ReadonlyArray<{ id: MapCaptionId; text: string }>>; exitSignBox(world, zone) → Edges[]
  ```
- Forest area decisions: terrain is `"forest"` everywhere except a `"meadow"` clearing `{ x: 120, y: 90, w: 110, h: 70 }`; mountains band `y < 16` only. One dirt path from the north mouth down to the clearing and a short branch to the dig corner; mouth `{ x: 192, y: 0, w: 64, h: 32 }` in the **top** hedge (the top row of cells is open scenery, so the forest's hedge piece rule applies to its top edge: the barrier code in `terrain.ts` gains a top row `cy === 0` for areas whose `mouths` include a top mouth, left out inside the mouth like the others) and corridor `{ x: 192, y: -1000, w: 64, h: 1000 }`; `gateBox: null`, `ice: null`. The Peaks gets south mouth `{ x: 192, y: 148, w: 64, h: 32 }`, corridor `{ x: 192, y: 180, w: 64, h: 1000 }`, a path piece `{ x: 222, y: 112, w: 6, h: 1068 }` running out through it, and these join its protected boxes; the dig-spot boxes (`semicolon`, `x-mark` at `p.dig`) stay until Task 8.

- [ ] **Step 1: Write the failing tests.**
  - `zones.test.ts`: `ZONES` has three zones; every exit has a matching return exit in its target on the opposite edge with the same span; the Peaks has two exits, the forest one; `exitFor("peaks", {x:70,y:90}, {x:70,y:94})?.to` is `"forest"` and `exitFor("forest", {x:70,y:10}, {x:70,y:6})?.to` is `"peaks"`; west/east unchanged.
  - `reducer.test.ts`: moving down from `(70, 90)` in the Peaks gives `zone: "forest"`, player `(70, 10)`, drone `(68, 18)`, stamina −1, `inspected: null`, and the newest log `"Entered Dense Forest."`; moving back up from `(70, 10)` returns to the Peaks at `(70, 90)` with `"Entered C++ Peaks."`; in the forest a player at y 48 steps to y 52 and back freely (no wall, no `wallLocked` log); the river's cold never applies in the forest (`inRiver` false there); `respawn` from the forest returns to the Peaks camp; a step from a column outside the span (`x` 58) at the south edge clamps and stays in the Peaks (Review Focus 1).
  - `team.test.ts` (Review Focus 2): `parseMessage` accepts a `pos` with zone `"forest"` and a `ping` with zone `"forest"`; zone `"mars"` in a `pos` still parses with zone `null`; presence with zone `"forest"` parses.
  - `areas.test.ts` / `terrain.test.ts`: `AREAS` has the forest; every area's mouths/corridors lie inside the right edge; forest decorations avoid its protected boxes and the mouth; the top hedge has a gap at the forest's mouth; the Peaks' bottom hedge has a gap at its south mouth.
  - `mapLayout.test.ts` / `labelLayout.test.ts`: the Peaks has two exit signs (`← Dev Village`, `Dense Forest ↓`), the village `C++ Peaks →`, the forest `↑ C++ Peaks`; `exitSignBox` returns one box per sign and the label layout avoids all of them in every zone.
  - `MapViewport.test.tsx`: in the forest the world layer shows the `(Dense Forest)` caption and the exit sign, no Peaks or village buttons; `fog` has opacity `0` in the forest with the tower unpowered and `1` in the village (Review Focus 5); a fade element is keyed by the zone.
  - `MiniMap.test.tsx`: three cells in the order village, peaks, forest, each `64 × 36` CSS px, left offsets `0`, `64`, `128` (a 194 × 56 box with a 1 px border gives 192 × 54 inside: the cells are 64 wide, 36 tall, vertically centred); yours is outlined; a teammate or ping with zone `forest` sits in the forest cell; `paintMiniTerrain` paints the forest from its area with no wall line.
  - `TeamOverworld.test.tsx` (App-level, as the existing village test): Kai walks south through the exit; Ana's mini-map shows him in the forest cell, her log says `Kai went to Dense Forest.`, and `/where` says `Kai: Dense Forest`.
- [ ] **Step 2: Run** `npx vitest run src/game src/render src/screens`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces and decisions above. The reducer's `move` uses `ZONES[zone].wall` (a zone without a wall never calls `wallBlock`/`crossesWall`); `inRiver` already keys on `ZONES[zone].river`. `MapViewport` keeps a branch per zone (`peaks` / `village` / `forest`); the fog opacity is `zone === "forest" || towerPowered ? 0 : 1`. The mini-map keeps `CELL_H` proportional: `CELL_W = 64`, `CELL_H = 36`, `w-16`/`h-9`, centred in the 54 px inner height (9 px above and below).
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc -b` and `npm run build`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(forest): the Dense Forest as a zone you can walk into`.

---

### Task 4: Forest art — sprites, props, light

**Files:**
- Modify: `src/render/sprites.ts`, `src/render/areas/forest.ts`, `src/render/scene.ts`, `src/render/paint.ts` (only if the tint needs it)
- Test: `src/render/sprites.test.ts`, `src/render/scene.test.ts`, `src/render/areas/areas.test.ts`, `src/render/paint.test.ts`

**Interfaces:**
- Produces: `SpriteId` gains `"campfire"` (2 frames, 12 × 14, anchor `bottom`: frame 0 and 1 are two flame shapes) and `"old-oak"` (1 frame, 40 × 48, anchor `bottom`); `LIGHTS` gains `campfire: ArtPoint` (the flame's centre); `FOREST.props` holds the campfire, the old oak, the signpost, the ranger (`explorer-down`, variant `#be123c`) at the art points of the constants above; `Scene` is unchanged (the tint and the glow are computed in `buildScene`).

- [ ] **Step 1: Write the failing tests.** `sprites.test.ts`: the two new sprites are in `SPRITES`, every row has the declared width, the palette covers every character used, `campfire` has exactly 2 frames. `scene.test.ts`: the forest scene draws the oak, the campfire, the signpost and the ranger (y-sorted with the explorer), no wall tiles, no Peaks landmarks (`tower`, `gate`, `chest-*`); the forest `tint` is the fixed forest tint `"rgba(10,30,40,0.18)"` over the phase tint (so with `lightMode: "day"` it is still that tint, and with `"night"` it is the night tint composed with it — the scene exposes one `tint` string, so the executor encodes the composition as one `rgba` and records a ruling); the campfire's glow pixels (reusing `glow(...)`) appear only at night strength and flicker with `t` (frame 0/1 every 400 ms) and are still under `reduced`; `areas.test.ts`: forest props' boxes are inside the world, do not intersect each other or the paths' mouths, and each place point is at least 12 game-% apart.
- [ ] **Step 2: Run** `npx vitest run src/render`. Expected: FAIL.
- [ ] **Step 3: Implement** the two sprites (hand-drawn pixel rows in the existing style: `o` outline `#0b1020`, forest greens, warm flame oranges), the props list, the campfire light, the forest tint branch in `buildScene` (the Peaks/village tint code is unchanged), and the scene's per-zone `learning`/props wiring so the forest draws its props like the village.
- [ ] **Step 4: Run** `npx vitest run src/render src/screens` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(render): the forest's oak, campfire, ranger and light`.

---

### Task 5: Places, the ranger and the map buttons

**Files:**
- Create: `src/game/forest.ts` (the ranger's lines, like `village.ts`)
- Modify: `src/game/constants.ts` (`RANGER`, `CAMPFIRE`, `OLD_OAK`, `FOREST_SIGNPOST`, `INSPECT_COPY`), `src/game/types.ts` (`PoiId`), `src/game/zones.ts` (`ZONES.forest.places`), `src/game/reducer.ts` (interact), `src/game/geometry.ts` (verbs), `src/game/cards.ts`, `src/chat/places.ts`, `src/screens/overworld/mapLayout.ts`, `src/screens/overworld/MapViewport.tsx`
- Test: `src/game/forest.test.ts`, `src/game/reducer.test.ts`, `src/game/geometry.test.ts`, `src/game/cards.test.ts`, `src/chat/places.test.ts`, `src/screens/overworld/mapLayout.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/chat/commands.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const RANGER: Poi = { id: "ranger", label: "Ranger", x: 60, y: 62 };
  export const CAMPFIRE: Poi = { id: "campfire", label: "Campfire", x: 46, y: 66 };
  export const OLD_OAK: Poi = { id: "old-oak", label: "Old Oak", x: 24, y: 50 };
  export const FOREST_SIGNPOST: Poi = { id: "forest-signpost", label: "Signpost", x: 84, y: 26 };
  // PoiId gains "ranger" | "campfire" | "old-oak" | "forest-signpost".  ZONES.forest.places = [RANGER, CAMPFIRE, OLD_OAK, FOREST_SIGNPOST, ...chestPlaces("forest")]
  export function rangerLine(s: Pick<GameState, "gateUnlocked" | "hasLoot" | "clueDecoded" | "artifactFound">): string; // src/game/forest.ts
  // PING_PLACE_NAMES gains "ranger", "campfire" (appended after "cs"; "js" arrives in Task 6)
  ```
- Ranger lines, first unmet stage (exact copy):
  1. `!gateUnlocked`: `Welcome to the Dense Forest! Back north, the Supply Cache waits behind the wall. Its gate opens with one CSS fix.`
  2. `!hasLoot`: `The gate's open! Empty the Supply Cache in the north-east snow: explorers say it holds an old scroll.`
  3. `!clueDecoded`: `That scroll is scrambled. Decode it from your inventory: every letter is shifted 13 places.`
  4. `!artifactFound`: `The scroll points here. Look for the X in the south-east corner of the clearing, and dig there.`
  - done: `You found the Golden Semicolon! The forest has not been this quiet since it went missing. Open any chests you've left, explorer.`
- Verbs/prompts: `[E] Talk to Ranger`, `[E] Inspect Campfire`, `[E] Inspect Old Oak`, `[E] Read Signpost`. Cards: the ranger's card shows her current line; campfire: `A campfire crackles in the clearing. Someone left it burning for the next explorer.`; oak: `An enormous old oak. Its bark is carved with a thousand tiny semicolons.`; signpost: `C++ PEAKS → North through the trees: base camp, the north gate and the frozen river.`
- Map: captions `[R] Ranger`, `[F] Campfire`, `[O] Old Oak`, `[P] Signpost` (zone `forest`, prefers above); buttons ≥ 44 × 44 CSS px, hidden captions while the prompt names that place, like Ada's.

- [ ] **Step 1: Write the failing tests.** `forest.test.ts`: `rangerLine` returns each stage's line for the flag combinations and the done line. `reducer.test.ts`: in the forest `interact` with `ranger` sets `inspected: "ranger"` and logs `Ranger: "<line>"` once (pushLogOnce); `campfire`, `old-oak`, `forest-signpost` set `inspected` and log nothing; interacting with a Peaks or village place id while in the forest changes nothing; `ranger` from the Peaks changes nothing; `reachPlaces` in the forest is its places. `geometry.test.ts`: `promptText`/`interactLabel` for the four. `cards.test.ts`: each card's text. `places.test.ts`: the table grows by two rows with `placeSpot`/`placeCopy` (`the Ranger`... copy: `the Ranger`, `the Campfire`) and `PING_PLACE_NAMES` order; `commands.test.ts`: the unknown-place line lists them. `mapLayout.test.ts` / `MapViewport.test.tsx`: four forest buttons with the captions above, ≥ 44 px, only in the forest; `zoneHitAreas("forest")` has no overlaps; pressing `[R] Ranger` calls `onInteract("ranger")`.
- [ ] **Step 2: Run** `npx vitest run src/game src/chat src/screens`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces, copy, reducer cases, cards, verbs, ping places (their points are the constants), caption rows and buttons (an `LandmarkCaption` row per place, sprite `explorer-down` / `campfire` / `old-oak` / `signpost`).
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(forest): the ranger, the campfire, the old oak and the signpost`.

---

### Task 6: The JavaScript chest and 11 badges

**Files:**
- Create: `src/learn/bank/javascript.ts`
- Modify: `src/learn/types.ts` (`Lang`, `ChestId`), `src/learn/chests.ts`, `src/game/roll.ts` (comment only; the table drives it), `src/game/types.ts`, `src/screens/Codex.tsx`, `src/screens/overworld/QuestList.tsx`, `src/chat/places.ts`, `src/screens/overworld/MiniMap.tsx` (forest-cell diamond uses `CHESTS`), `README.md`
- Test: `src/learn/bank.test.ts`, `src/game/roll.test.ts`, `src/game/team.test.ts`, `src/screens/Codex.test.tsx`, `src/screens/overworld/QuestList.test.tsx` (or its existing test file), `src/chat/places.test.ts`, `src/chat/commands.test.ts`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Produces: `ChestId` gains `"chest-js"`; `Lang` gains `"javascript"`; `export const JS_BANK: readonly ChestQuestion[]` (6 entries); the chest row `{ id: "chest-js", badge: "JavaScript", spoken: "JavaScript", language: "JavaScript", zone: "forest", at: { x: 18, y: 78 }, caption: "above", north: false, questions: JS_BANK }` appended after `chest-cs`; `PING_PLACE_NAMES` gains `"js"` last (`placeSpot`: zone forest, the chest's point; copy `the JavaScript Chest`).
- Topics (3 blank, then choices; the executor writes 2 blanks + 4 choices): blank `js-console-log` (`console.___("Hello")` → `log`, a `legal` list of `Console` methods in ES2024/Node 22: `assert clear count countReset debug dir dirxml error group groupCollapsed groupEnd info log profile profileEnd table time timeEnd timeLog timeStamp trace warn`); blank `js-const` (`___ name = "Ada";` → `const`, `legal` list `var let const`; the answer set is `["const"]` only if the prompt says the variable is never reassigned); choices `js-strict-equal` (`5 === "5"` → `false`), `js-array-length` (`[4,5,6].length` → `3`), `js-template` (`` `Hi ${name}` `` with `name = "Ada"` → `Hi Ada`), `js-typeof` (`typeof 42` → `"number"`).
- Copy that changes to 11: `Codex.tsx` (`n/11 BADGES`), `QuestList.tsx` (`Badges: n/11`, bold at 11), the doc comments, the README (the 10-chests sentence, "all 10 badges", the project layout line, "bank of 6" stays) — a `grep -rnE "\b10\b|/10|of 10"` over `src README.md` finds only unrelated hits (record the checked list in the ledger).

- [ ] **Step 1: Write the failing tests.** `bank.test.ts`: 11 chests in table order (ending `chest-cs`, `chest-js`), `JS_BANK` length `BANK_SIZE`, `66` distinct ids (replace the literal `60`), languages include `javascript`, every existing bank invariant over the new bank, near-miss rows (`["js-console-log", "warn"]`, `["js-const", "let"]`), and `chestChallenge` resolves every pick for the 11th chest with title `< CODE CHEST: JAVASCRIPT >`. `roll.test.ts`: the picks list has 11 entries, the seed is the 12th draw, the Matcher round the 13th, a team code seed is unchanged; the `0.999` test still gives `BANK_SIZE - 1` for all 11. `team.test.ts`: `parseMessage` accepts a `badge` message for `chest-js` and still rejects an unknown chest id. `Codex.test.tsx` / quest list test: titles read `n/11`, the quest line bold at 11, the JavaScript entry's place text is `Dense Forest · …` (from `whereOf`). `places.test.ts` / `commands.test.ts`: `js` row and the unknown-place line. `Overworld.test.tsx`: walking to the forest chest and pressing `[E]` opens `< CODE CHEST: JAVASCRIPT >`; the forest chest's button exists only in the forest; the mini-map forest cell has the `minimap-chest-chest-js` diamond.
- [ ] **Step 2: Run** `npx vitest run src`. Expected: FAIL.
- [ ] **Step 3: Implement** the types, the chest row, the bank (6 questions), the copy changes, the grep pass.
- [ ] **Step 4: Run** `npm test`, `npx tsc -b`, `npm run build`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(learn): a JavaScript chest in the Dense Forest — 11 badges`.

---

### Task 7: Independent verification of the JavaScript bank

**Files:**
- Modify: `src/learn/bank/javascript.ts` only where a finding is real
- Test: `src/learn/bank.test.ts` (a regression row per real finding)

- [ ] **Step 1: Verify the 6 questions independently.** Run a workflow (ultracode is on) with one verifier agent that is given only `src/learn/bank/javascript.ts` and the bank rules in Global Constraints (not the author's intent). It checks every field as the Task 5 verifiers did in the question-bank plan: accepted answers are complete and correct (no equally valid token missing), wrong tiles and options are really wrong, the code is valid JavaScript and every "what does this print" is exactly what `node` (installed) prints — it must RUN each snippet — `legal`/`notLegal` lists are complete / flag no real name, hints do not give the answer away, explanations are true. It returns findings with severity.
- [ ] **Step 2: For each real finding,** write a failing test row, watch it fail, fix the entry, watch it pass.
- [ ] **Step 3: Run** `npx vitest run src/learn` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 4: Commit** `fix(learn): content review of the JavaScript questions` (skip when there is nothing to fix and say so in the ledger).

---

### Task 8: The Golden Semicolon moves into the forest

**Files:**
- Modify: `src/game/constants.ts` (`HIDDEN_ARTIFACT`, `LOG.clueDecoded`), `src/game/team.ts` (`teammateLog.clueDecoded`), `src/game/village.ts` (Ada's last stage), `src/game/reducer.ts` (`visiblePois`), `src/game/cards.ts`, `src/render/areas/peaks.ts`, `src/render/areas/forest.ts`, `src/render/scene.ts`, `src/screens/overworld/MapViewport.tsx`, `src/screens/overworld/MiniMap.tsx`
- Test: `src/game/reducer.test.ts`, `src/game/village.test.ts` (or the file that tests Ada), `src/game/team.test.ts`, `src/game/cards.test.ts`, `src/render/scene.test.ts`, `src/render/areas/areas.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/screens/overworld/MiniMap.test.tsx`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Produces: `HIDDEN_ARTIFACT = { id: "artifact", label: "Golden Semicolon", x: 86, y: 80 }`; `visiblePois` adds `revealedPois(s)` when `s.zone === "forest"` (no longer `"peaks"`); copy: `LOG.clueDecoded = "Clue decoded: the artifact is buried in the Dense Forest, south of camp."`, the team line `"${n} decoded the scroll: the artifact is buried in the Dense Forest, south of camp."`, Ada's last stage `"The Dense Forest, you say? Take the path south from the Peaks and look for the X in its south-east corner."`.

- [ ] **Step 1: Write the failing tests.** Reducer: with `clueDecoded` and not `artifactFound`, `visiblePois` includes the artifact only in the forest, never in the Peaks (Review Focus 3); `interact artifact` in the Peaks changes nothing; in the forest at the dig spot it sets `artifactFound`, logs `Artifact found: the Golden Semicolon!`, `inspected: "artifact"`; a teammate's `artifactFound` sync leaves no X in the Peaks. Scene: the forest draws `x-mark` while `clueDecoded && !artifactFound`, the `semicolon` (with its glow) after `artifactFound`, both at the dig spot's art point; the Peaks no longer draws either and its protected boxes no longer include them. Map: the dig obstacle for the label layout is used only in the forest; no `[E] Dig here` prompt in the Peaks; the forest prompt shows when in reach. Mini-map: the artifact dot is in the forest cell, not the Peaks'. Copy: the new `LOG`, team and Ada lines (`adaLine` returns the new text at the last stage; `rangerLine` stage 4 and Ada's agree that the X is in the south-east corner).
- [ ] **Step 2: Run** `npx vitest run src`. Expected: FAIL.
- [ ] **Step 3: Implement** the move: constants and copy; the forest-only reveal; the scene's `x-mark`/`semicolon` branch moved from the Peaks branch to a forest branch (keyed by `input.zone === "forest"`), their boxes into `FOREST.protected` and out of `PEAKS.protected` (`LANDMARK_POINTS.dig` is removed or points at the forest's constant, whichever leaves the Peaks tests honest; record it in the ledger); the map's obstacle and mini-map dot conditions `zone/cell === "forest"`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(forest): the Golden Semicolon is buried in the Dense Forest`.

---

### Task 9: README, browser check, final review

**Files:**
- Modify: `README.md`
- Create (scratchpad only): `…/scratchpad/forest/check.cjs`

- [ ] **Step 1: README.** Intro: the Dense Forest; How to play: the forest, the ranger, the JavaScript chest (11 badges), where the Golden Semicolon is now; Team Lobby: a teammate in the forest shows on the mini-map; project layout line for `render/areas` if it lists zones. Keep the "bank of 6" sentence.
- [ ] **Step 2: Build and serve:** `npm run build`, then `npx vite preview --port 4173 --strictPort` in the background.
- [ ] **Step 3: Playwright checks**, PASS/FAIL each, with screenshots to the scratchpad:
  - **1366 × 657, solo:** walk from camp to the Peaks' south exit and through it (the exit sign reads `Dense Forest ↓`); arrive in the forest (`REGION: DENSE FOREST`); the mini-map shows three cells with yours outlined; talk to the ranger (log line `Ranger: "…"`); open the JavaScript chest and earn the badge (`Badges: 1/11`); with `Math.random` forced to `0` before load, answer correctly; go north through the gate flow is not needed: instead inject progress by playing it (open the gate, loot the cache, decode the scroll) or by loading a state through the app's own controls; then walk to the forest's south-east corner, see the X, press `[E]` to dig; no page scroll, no console errors (the blocked network and the browser's `/favicon.ico` 404 excepted).
  - **390 × 844, touch, DPR 3:** the same walk with the D-pad; ranger, signpost and chest buttons ≥ 44 px; the exit works.
  - **Two Same-computer windows:** one walks into the forest; the other's mini-map shows it in the forest cell and its log says `<name> went to Dense Forest.`; `/where` agrees; the JavaScript badge reaches the teammate's log.
- [ ] **Step 4: Run** `npm test`, `npx tsc -b` and `npm run build`. Expected: all PASS.
- [ ] **Step 5: Commit** `docs: the Dense Forest in the README`, then push. Then the executor's final whole-branch review and the finishing-a-development-branch menu.
