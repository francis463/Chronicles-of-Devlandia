# Character classes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before a game starts, a player picks Warrior, Archer, Mage, Assassin, Tank or Healer; their hero (and teammates' heroes) are drawn in that class. Look only.

**Architecture:** A pure `classes.ts` defines the six ids and their colours. The explorer sprite gets a per-class outfit recolour plus a small per-class item layer, both carried in the sprite-cache variant string `"<hood>:<class>"`. The class travels in team presence and, for signed-in players, in the account's `user_metadata` (no database change). A new `ClassPicker` screen sits between the menu and Solo / Team Lobby.

**Tech Stack:** Vite 8, React 19, TypeScript strict (`tsc -b` also checks tests; `noUnusedLocals/Parameters`), Tailwind 4, Vitest 5 + jsdom, Testing Library + user-event.

**Spec:** `docs/superpowers/specs/2026-10-17-character-classes-design.md`

## Global Constraints

- Classes are **cosmetic only**: no change to `GameState`, the reducer, HP, stamina, speed, hints or puzzles. Every existing test passes unchanged.
- The six ids, in this order: `warrior`, `archer`, `mage`, `assassin`, `tank`, `healer`. Default: `warrior`.
- The hood keeps the player's **team colour**; the class changes only the cloak (`c`, `C`) and adds an item layer. An item covers at most 6 hood (`h`/`H`) pixels and never an eye (`e`).
- Any class value that is not one of the six (missing, wrong type, `"__proto__"`, an older client's absence) becomes `warrior`; nothing throws.
- No database migration, no policy, no Edge Function change, no secret. Nothing in Supabase needs the owner.
- Commit trailers on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub`. No model identifiers in code or commits. Push to `claude/trusting-archimedes-64rvrc` after commits; never force.
- `SceneInput.playerClass`, scene teammates' `cls` and `PresenceMeta.cls` are **optional in their types** so existing fixtures compile unchanged; consumers apply `classOrDefault`.

## Review Focus

1. A hostile or missing class value (from a teammate's presence, or from edited `user_metadata`) never crashes the scene, lobby or picker. Tests: Task 1 (`classOrDefault`), Task 5 (`parsePresence`), Task 6 (`getAccount`).
2. Two same-class teammates stay distinguishable (hood colour). Test: Task 4.
3. The picker never traps a player and a failed class save never blocks starting. Tests: Task 8.
4. One player's class never carries over to the next account on the same tab. Test: Task 8.
5. Sprite-cache entries for different classes, hoods, flips and rotations never collide. Test: Task 3.

---

### Task 1: The class list

**Files:**
- Create: `src/game/classes.ts`
- Test: `src/game/classes.test.ts`

**Interfaces:**
- Produces:
  - `type ClassId = "warrior" | "archer" | "mage" | "assassin" | "tank" | "healer"`
  - `CLASS_IDS: readonly ClassId[]` (the order above), `DEFAULT_CLASS: ClassId` (`"warrior"`)
  - `isClassId(v: unknown): v is ClassId`, `classOrDefault(v: unknown): ClassId`
  - `CLASSES: Record<ClassId, { name: string; blurb: string; outfit: string; trim: string }>`

- [ ] **Step 1: Write the failing test** in `src/game/classes.test.ts`:
  - `CLASS_IDS` equals the six ids in order; `DEFAULT_CLASS` is `"warrior"`.
  - `classOrDefault` returns each valid id unchanged, and `"warrior"` for `undefined`, `null`, `42`, `{}`, `""`, `"Mage"` (case matters), `"__proto__"`, `"constructor"`, `"toString"`.
  - `CLASSES` has an entry for every id: `name` is the capitalised id (`"Warrior"`…), `blurb` non-empty, and `outfit`/`trim` match `/^#[0-9a-f]{6}$/`; all six `outfit` values are distinct.
  - The six names and blurbs are exactly the spec's table.
- [ ] **Step 2: Run** `npx vitest run src/game/classes.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `classes.ts`. `isClassId` must use `CLASS_IDS.includes`, never `in` / property access, so `"__proto__"` and `"toString"` are refused. Colours (`outfit`, `trim`): warrior `#64748b`/`#b91c1c`; archer `#15803d`/`#713f12`; mage `#1d4ed8`/`#6d28d9`; assassin `#27272a`/`#52525b`; tank `#6b7280`/`#ca8a04`; healer `#f1f5f9`/`#eab308`.
- [ ] **Step 4: Run** the test — Expected: PASS.
- [ ] **Step 5: Commit** `feat: the six character classes`.

### Task 2: Class outfit and item art

**Files:**
- Modify: `src/render/sprites.ts` (`explorerPalette`, new `CLASS_ITEMS`)
- Test: `src/render/sprites.test.ts`

**Interfaces:**
- Consumes: `ClassId`, `CLASS_IDS`, `CLASSES` (Task 1).
- Produces:
  - `explorerPalette(hood: string, cls?: ClassId): Palette` — unchanged result when `cls` is omitted; with a class, keys `c` and `C` become `CLASSES[cls].outfit` and `.trim`; `h`/`H` still follow `hood`.
  - `type ItemFacing = "down" | "up" | "right"`
  - `CLASS_ITEMS: Record<ClassId, { palette: Palette; down: PixelGrid; up: PixelGrid; right: PixelGrid }>` — each grid is 16 × 16, `.` transparent; the palette has keys `o` (outline `#0b1020`), `i`, `j`.

- [ ] **Step 1: Write the failing tests** (in `sprites.test.ts`, using the existing `EXPLORERS`):
  - `explorerPalette("#22c55e")` deep-equals what it returned before (capture the old expected object in the test).
  - `explorerPalette("#22c55e","mage")`: `h === "#22c55e"`, `c === "#1d4ed8"`, `C === "#6d28d9"`, `s`/`e`/`o` unchanged.
  - For every class and facing: 16 rows of 16 characters; every character is `.` or a key of that class's palette; at least 8 non-`.` pixels.
  - For each facing, the six item grids are pairwise different.
  - Against `explorer-down|up|right` frame 0: an item never covers an `e` cell, and covers at most 6 `h`/`H` cells (the item grid's non-`.` cell at the same x,y).
- [ ] **Step 2: Run** `npx vitest run src/render/sprites.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `CLASS_ITEMS` and the `cls` parameter. Draw each item to sit where the spec's table says, using only transparent area, cloak or at most 6 hood cells: warrior — a 2-pixel crest on the hood top plus a gold shoulder pad; archer — a bow arc on the left edge (columns 0–1, rows 4–12) with a string, quiver tip over the right shoulder; mage — a pointed hat tip on the top rows (≤ 6 hood cells covered) and a star; assassin — a dark mask over the lower face rows (skin may be covered, eyes never) and a scarf tail; tank — a round shield on the left (columns 0–4, rows 8–13) with a gold boss; healer — a staff on the right edge (columns 14–15, rows 2–14) with a glowing head. `right` is drawn facing right (the scene mirrors it for left); `up` shows the item from behind (bow and staff as in `down`, mask and hat tip hidden or reduced, shield on the same side).
- [ ] **Step 4: Run** the test — Expected: PASS.
- [ ] **Step 5: Commit** `feat: class outfits and items for the explorer`.

### Task 3: Painting classes into the sprite cache

**Files:**
- Modify: `src/render/paint.ts` (`paletteFor`, `createSpriteCache`)
- Test: `src/render/paint.test.ts`

**Interfaces:**
- Consumes: `explorerPalette(hood, cls?)`, `CLASS_ITEMS`, `isClassId` (Tasks 1–2).
- Produces: `sprites.get(sprite, frame, variant, flip, rotate)` now also accepts the variant `"<hood>:<class>"` for explorer sprites. A trailing part that is not a valid class id is ignored (treated as the plain hood).

- [ ] **Step 1: Write the failing tests** (reuse the file's fake canvas that records `fillRect` calls):
  - `get("explorer-down",0,"#f472b6:mage",false,false)` and `get(..., "#f472b6", ...)` return different images, and each is cached (second call returns the same image).
  - Two classes with the same hood, two hoods with the same class, flipped vs not, rotated vs not: all give distinct cache entries (no key collision).
  - The recorded fills for a class variant include the class cloak colour and an item colour; with `"#f472b6:nonsense"` they match the plain `"#f472b6"` fills exactly.
  - `"grey"` ignores any class: `get(..., "grey", ...)` fills equal the existing grey fills.
  - A flipped class sprite's item pixels are mirrored (the item's leftmost fill x in the unflipped image equals `15 − rightmost` in the flipped one).
- [ ] **Step 2: Run** `npx vitest run src/render/paint.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** In `paletteFor`, split the variant at its last `:` and call `explorerPalette(hood, cls)`. In the cache `get`, after the base runs for an explorer with a valid class, draw the item grid for the sprite's facing (`explorer-down`→`down`, `-up`→`up`, `-right`→`right`) with the same `mirror`/`rotate90` transforms applied to the item grid, using `CLASS_ITEMS[cls].palette`.
- [ ] **Step 4: Run** the test — Expected: PASS.
- [ ] **Step 5: Commit** `feat: paint class items into the sprite cache`.

### Task 4: Classes in the scene

**Files:**
- Modify: `src/render/scene.ts` (`SceneInput`, `explorer`, `buildScene`), `src/screens/MenuBackdrop.tsx`
- Test: `src/render/scene.test.ts`

**Interfaces:**
- Consumes: `ClassId`, `DEFAULT_CLASS` (Task 1).
- Produces: `SceneInput.playerClass?: ClassId`; `SceneInput.teammates[number].cls?: ClassId`. With a class, the explorer drawable's `variant` is `"<color>:<class>"`; without one it stays `"<color>"`. A downed player stays `"grey"`.

- [ ] **Step 1: Write the failing tests:**
  - `playerClass: "archer"` → the player drawable's variant is `"<playerColor>:archer"`; omitted → the plain colour (existing tests still pass).
  - A teammate with `cls: "tank"` → `"<their colour>:tank"`; without `cls` → plain colour.
  - Two teammates with the same `cls` and different colours get different variants (Review Focus 2).
  - A downed player with a class is still `variant: "grey"`, `rotate: true`.
  - The menu backdrop scene uses `DEFAULT_CLASS` (assert on `MENU_SCENE` via the existing backdrop test's scene capture, or export the constant if there is none).
- [ ] **Step 2: Run** `npx vitest run src/render/scene.test.ts src/screens/MenuBackdrop.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the optional fields and the variant composition in `explorer(pose, variant)` callers; set `playerClass: DEFAULT_CLASS` in `MENU_SCENE`.
- [ ] **Step 4: Run** the two files, then `npx vitest run src/render src/screens` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: draw classes in the scene`.

### Task 5: Classes in the team

**Files:**
- Modify: `src/game/team.ts` (`PresenceMeta`, `parsePresence`), `src/hooks/useTeamSession.ts` (`Teammate`, `TeamSession.create/join`, `Request`, the `me.current` meta, `teammates` memo)
- Test: `src/game/team.test.ts`, `src/hooks/useTeamSession.test.tsx`

**Interfaces:**
- Consumes: `ClassId`, `classOrDefault` (Task 1).
- Produces:
  - `PresenceMeta.cls?: ClassId`
  - `Teammate.cls: ClassId` (always set)
  - `TeamSession.create(name: string, mode: TeamMode, cls?: ClassId): void` and `join(name: string, code: string, mode: TeamMode, cls?: ClassId): void`. An omitted class is `DEFAULT_CLASS`.

- [ ] **Step 1: Write the failing tests:**
  - `parsePresence` of a valid payload plus `cls: "mage"` → `cls: "mage"`; with no `cls`, with `cls: 42`, `"__proto__"`, `{}` → `cls: "warrior"`; the other fields are unaffected.
  - `rankPlayers` keeps `cls` on each ranked player.
  - In the session hook test (with its fake transport): `create("Kai","online","archer")` tracks presence with `cls: "archer"`; `join` likewise; with no class argument the tracked presence carries `"warrior"`; a roster teammate with unknown `cls` shows `cls: "warrior"` in `teammates`; a teammate's `cls` is exposed as given.
- [ ] **Step 2: Run** `npx vitest run src/game/team.test.ts src/hooks/useTeamSession.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the type, parser (`cls: classOrDefault(raw.cls)`), request field, tracked meta, and teammate mapping (`cls: classOrDefault(p.cls)`).
- [ ] **Step 4: Run** the two files, then `npx tsc -b` — Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat: classes travel in team presence`.

### Task 6: Saving the class on the account

**Files:**
- Modify: `src/net/supabaseClient.ts` (`AuthApiLike.updateUser`, `SessionLike` user), `src/auth/authClient.ts`, `src/auth/supabaseAuth.ts`, `src/auth/memoryAuth.ts`, `src/auth/fakeSupabase.ts`, `src/auth/useAuth.ts`
- Test: `src/auth/supabaseAuth.test.ts`, `src/auth/memoryAuth.test.ts`, `src/auth/useAuth.test.tsx`

**Interfaces:**
- Consumes: `ClassId`, `isClassId` (Task 1).
- Produces:
  - `Account.playerClass: ClassId | null`
  - `AuthClient.setClass(cls: ClassId): Promise<Result>`
  - `Auth.setClass(cls: ClassId): Promise<Result>` (calls the client at call time, no refresh)
  - `AuthApiLike.updateUser` accepts `{ password?; email?; data?: { class: string } }`; `SessionLike.user` may carry `user_metadata?: Record<string, unknown>`.

- [ ] **Step 1: Write the failing tests:**
  - Supabase auth: `setClass("mage")` calls `updateUser({ data: { class: "mage" } })` and returns `{ ok: true }`; an `updateUser` error maps to `{ ok: false, error: "unreachable" }` when the error is a network failure and `"unknown"` otherwise (same mapping `addEmail` uses); `getAccount` returns `playerClass: "mage"` for `user_metadata.class === "mage"`, and `null` for missing metadata, `"Mage"`, `42`, `"__proto__"` (Review Focus 1).
  - Memory auth: `setClass` stores on the session; a later `getAccount` returns it; `reachable = false` gives `unreachable`; a fresh login as another account returns that account's own `playerClass` (starts `null`).
  - `useAuth`: `setClass` is looked up on the client when called (spy replaced after render still sees the call) and does not change `status`.
- [ ] **Step 2: Run** `npx vitest run src/auth` — Expected: FAIL.
- [ ] **Step 3: Implement** the interface, Supabase and memory versions, the fake, and the hook method.
- [ ] **Step 4: Run** `npx vitest run src/auth src/net` and `npx tsc -b` — Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat: save the chosen class with the account`.

### Task 7: The class picker screen

**Files:**
- Create: `src/screens/ClassPicker.tsx`
- Test: `src/screens/ClassPicker.test.tsx`

**Interfaces:**
- Consumes: `CLASS_IDS`, `CLASSES`, `ClassId` (Task 1); `SPRITES`/`CLASS_ITEMS`/`explorerPalette`/`gridRuns` (Task 2) to draw each card's sprite.
- Produces: `ClassPicker({ initial, mode, onContinue, onBack }: { initial: ClassId; mode: "solo" | "team"; onContinue(cls: ClassId): void; onBack(): void })`.

- [ ] **Step 1: Write the failing tests:**
  - Renders a `radiogroup` named "Choose your class" with six radios named Warrior, Archer, Mage, Assassin, Tank, Healer, each with its blurb; the `initial` class is checked.
  - Clicking a card selects it; ArrowRight / ArrowLeft / ArrowDown / ArrowUp move the selection (wrapping) and focus follows.
  - The primary button reads `[ Start ]` for `mode="solo"` and `[ Continue ]` for `"team"`, and calls `onContinue` with the selected class; Enter on a focused radio does the same.
  - `[ Back ]` calls `onBack` and `onContinue` is not called.
  - Each card has a canvas-free preview (a `<canvas>` with `aria-hidden`, or inline SVG built from the same grids) that is hidden from screen readers; the card is at least 44 px tall (`pointer-coarse:min-h-11`-style class present).
  - An `initial` that is somehow not valid never renders an empty selection: the component falls back to the default.
- [ ] **Step 2: Run** `npx vitest run src/screens/ClassPicker.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `ClassPicker` as a roving-tabindex radio group using the existing `Panel` / `Button` components and theme variables; 3 × 2 grid on `sm` and up, one column on phones. Draw previews with `gridRuns` over the down-facing explorer plus the class item, on a small canvas (skip drawing when `getContext` is unavailable, as jsdom's is).
- [ ] **Step 4: Run** the test — Expected: PASS.
- [ ] **Step 5: Commit** `feat: the Choose your class screen`.

### Task 8: Wiring the picker into the game

**Files:**
- Modify: `src/App.tsx`, `src/screens/overworld/Overworld.tsx`, `src/screens/overworld/MapViewport.tsx` (pass `playerClass`), `src/screens/overworld/TopHud.tsx`, `src/screens/TeamLobby.tsx`, `src/testing/GuestApp.tsx` only if its props need it
- Test: `src/App.test.tsx`, `src/screens/overworld/Overworld.test.tsx`, `src/screens/TeamLobby.test.tsx`, `src/screens/overworld/TopHud` assertions inside `Overworld.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–7 (`ClassPicker`, `Auth.setClass`, `Account.playerClass`, `TeamSession.create/join` with a class, `SceneInput.playerClass`).
- Produces: `Screen` gains `"class"`; `App` state `chosenClass: ClassId | null` and `next: "overworld" | "lobby"`; `Overworld` prop `playerClass?: ClassId` (shown as `Class: <Name>` in the top bar and drawn on the map); `TeamLobby` prop `playerClass?: ClassId` passed to `session.create/join`, and the roster shows each player's class name beside their nickname.

- [ ] **Step 1: Write the failing tests:**
  - Menu → Solo Quest shows "Choose your class" (not the overworld); `[ Start ]` then shows the overworld with `Class: Warrior`; picking Mage first shows `Class: Mage`. `[ Back ]` returns to the menu.
  - Menu → Team Lobby shows the picker with `[ Continue ]`; continuing shows the lobby; creating a room tracks presence with the picked class (use the existing fake transport); the lobby roster shows the class name beside the nickname.
  - A signed-in player whose memory account has `playerClass: "tank"` sees Tank preselected; picking Healer calls `setClass("healer")` (spy) and the next picker visit preselects Healer; a guest starts on Warrior and `setClass` is never called.
  - `setClass` rejecting (`reachable=false`) does not stop `[ Start ]` from working and shows no error text (Review Focus 3).
  - Log out, then log in as a different account: the picker shows that account's class (or Warrior), never the previous player's (Review Focus 4).
  - Classes change no gameplay: a solo game started as Mage and one as Warrior show the same HP and stamina values and the same starting log.
  - A team of two with the same class: both appear in the roster with that class name.
- [ ] **Step 2: Run** `npx vitest run src/App.test.tsx src/screens` — Expected: FAIL.
- [ ] **Step 3: Implement.** `App`: both menu buttons set `next` and go to `"class"`; the picker's `onContinue(cls)` stores `chosenClass`, calls `auth.setClass(cls)` without awaiting (swallow the result) when `auth.status === "signedIn"`, then `setScreen(next)`; `onBack` returns to `"menu"`. The picker's `initial` is `chosenClass ?? account?.playerClass ?? DEFAULT_CLASS`. Reset `chosenClass` to `null` when `userId` changes (log out or another account). Pass `playerClass={chosenClass ?? DEFAULT_CLASS}` to `Overworld` (solo and team) and `TeamLobby`. `Overworld` forwards it to `MapViewport` → `SceneInput.playerClass`; the `teammates` already carry `cls`; `TopHud` shows `Class: <Name>`.
- [ ] **Step 4: Run** `npx vitest run` (the whole suite) and `npx tsc -b` — Expected: all pass, clean. The existing tests that click Solo Quest / Team Lobby are updated only by the extra picker click through `GuestApp`-based helpers, or by passing a prop to skip the picker if that keeps them simpler; every assertion about game behaviour stays as it was.
- [ ] **Step 5: Commit** `feat: pick a class before every game`.

### Task 9: README, browser check, final review

**Files:**
- Modify: `README.md`
- Create (temporary, outside the repo): a Playwright script in the scratchpad

- [ ] **Step 1: README.** Add a short "Character classes" section: the six classes, look only, the picker before each game, saved with signed-in accounts, teammates see each other's class, and the layout lines for the new files.
- [ ] **Step 2: Browser check** at 1366 × 657 and 390 × 844 against `npm run dev` with Supabase aborted (as in the accounts check): the picker shows six cards with no horizontal scroll; each class selected in turn changes the hero on the map; `[ Back ]` returns to the menu; keyboard arrows and Enter work; no console errors. Take screenshots and look at them (all six heroes must be visibly different and the hood colour still visible).
- [ ] **Step 3: Full verification.** `npx tsc -b`, `npx vitest run`, `npm run build` — Expected: clean, all green.
- [ ] **Step 4: Commit and push** `docs: character classes in the README`.
- [ ] **Step 5: Final whole-branch review** on the most capable model with the Review Focus above; triage, one fix pass (each fix RED→GREEN), ledger the rest.
