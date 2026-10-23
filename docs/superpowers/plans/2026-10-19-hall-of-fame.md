# Hall of Fame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new zone, Hall of Fame, north of Dev Village, where the top 10 of the leaderboard stand (three on a stage, seven on the ground) as their class hero with a round profile badge and a name.

**Architecture:** A new `hall` zone (scale 1) with its own `Area`, ten fixed place ids (`hall-1` … `hall-10`), and figures that are data-driven: a hook loads `LeaderboardStore.top(10)` when you enter, the scene draws the hero sprites, and `MapViewport` overlays the DOM badges, names and buttons. Pressing `E` on a figure logs a line built in the overworld, so the reducer never holds leaderboard data. The class reaches the client through one extra column on `leaderboard_top`.

**Tech Stack:** React 19, TypeScript strict, Vite, Vitest + jsdom, Tailwind 4, canvas pixel art, Supabase (SQL migration run by the owner).

**Spec:** `docs/superpowers/specs/2026-10-19-hall-of-fame-design.md`

## Global Constraints

- Positions are percent of a zone; the Hall is scale 1 (320 × 180 art px), `ZONE_SCALE.hall = 1`.
- Every table keyed by `ZoneId` must gain `hall` (TypeScript flags the missing ones: follow the errors).
- The exhaustive collision and caption-overlap tests in `mapLayout.test.ts`, `areas.test.ts` and `zones.test.ts` must pass unchanged in rule; new things are placed to satisfy them.
- A class from the server is accepted only if `isClassId`; anything else is the default Warrior (`classOrDefault`).
- Names shown go through `maskRude` (the leaderboard's filter).
- Leaderboard screen keeps asking for 20 rows; the Hall asks for 10.
- Owner SQL goes in `supabase/migrations/20261019010000_leaderboard_class.sql`; the Supabase connector holds `DROP` statements, so it is run by the owner in the SQL Editor.
- Commit messages end with the two trailer lines the session requires. Do not open a new PR.

## Review Focus

- **Fewer than 10 players, or none**: empty spots (faded hero, "?" badge) and the log line for them; no crash on an empty list. (Task 3, 5)
- **Tied ranks**: two players share rank 1: both show "1", the stage fills by list order. (Task 5)
- **A name or class the server should not send** (a 40-character class string, a rude name, a non-string name): the row is kept or dropped by the existing rules; the figure never breaks the page. (Task 1, 6)
- **Leaving the Hall while the list is loading**: a late reply must not change the next screen's state. (Task 4)
- **A photo that fails to load**: falls back to the first letter, as on the leaderboard screen. (Task 6)

---

### Task 1: Data: class on the leaderboard rows, `top(rows)`, the SQL

**Files:**
- Modify: `src/leaderboard/leaderboard.ts`, `src/leaderboard/supabaseLeaderboard.ts`, `src/leaderboard/memoryLeaderboard.ts`
- Create: `supabase/migrations/20261019010000_leaderboard_class.sql`
- Modify: `supabase/tests/leaderboard.sql` (the column list)
- Test: `src/leaderboard/leaderboard.test.ts`, `src/leaderboard/supabaseLeaderboard.test.ts`, `src/leaderboard/memoryLeaderboard.test.ts`

**Interfaces:**
- Produces: `Row.cls?: ClassId`; `LeaderboardStore.top(rows?: number): Promise<Row[]>` (default 20, clamped by the server to 1–50).

- [ ] **Step 1: Write the failing tests.** `parseRows` keeps `cls` when it is one of the six class ids and drops it (keeping the row) for a missing value, a wrong type, an unknown string or one over 12 characters. `createSupabaseLeaderboard(...).top(10)` calls `rpc("leaderboard_top", { max_rows: 10 })` and `top()` still sends 20. The memory store's `top(n)` returns at most `n` rows.
- [ ] **Step 2: Run them; expect FAIL** (`cls` not parsed, `top` takes no argument).
- [ ] **Step 3: Implement.** `Row` gains `cls?: ClassId`; `parseRows` adds `...(isClassId(r.cls) ? { cls: r.cls } : {})`; `LeaderboardStore.top(rows?: number)`; the Supabase store passes `max_rows: rows ?? 20`; the memory store slices.
- [ ] **Step 4: The migration.** Drop and recreate `public.leaderboard_top(int)` with the extra output column `cls text` = `left(u.raw_user_meta_data ->> 'class', 12)` joined from `auth.users u on u.id = p.user_id` (inside the existing `counted` CTE, grouped), keeping every existing column, the 1–50 limit, the revokes and grants. Update `supabase/tests/leaderboard.sql`: the expected column list becomes `avatar, badges, cls, last_earned, name, rank`, and add a check that a user with `raw_user_meta_data = '{"class":"mage","secret":"x"}'` shows `cls = 'mage'` and no other metadata key leaves the function.
- [ ] **Step 5: Run the SQL checks on the local Postgres** (the stand-in `auth`/`storage` schemas from the avatars work: `su postgres -c "psql ... -f ..."` with the four migrations then `leaderboard.sql`, `avatars.sql`, `policies.sql`). Expected: all print "all checks passed".
- [ ] **Step 6: Run `npx vitest run src/leaderboard` and `npx tsc -b`; expect PASS, no output from tsc. Commit** `feat: the leaderboard rows carry each player's class`.

### Task 2: The zone in the game layer

**Files:**
- Modify: `src/game/zones.ts`, `src/game/zoneSize.ts`, `src/game/constants.ts` (`LOG.enteredHall`, the ten spot places, the signpost), `src/game/types.ts` (`PoiId`), `src/learn/chests.ts` (`ZONE_NAMES`), `src/learn/codexModel.ts` (`ZONE_ORDER`, how to reach), `src/chat/places.ts`, `src/hooks/useCrossingFade.ts` only if the type demands it
- Create: `src/game/hall.ts`
- Test: `src/game/zones.test.ts`, `src/game/hall.test.ts`

**Interfaces:**
- Produces: `ZoneId` includes `"hall"`. `HALL_SLOTS: Poi[]` (ids `hall-1`..`hall-10`, in rank order: 1 centre of the stage, 2 left, 3 right, 4..10 along the ground arc) with `label` `"Spot 1"`..; `HALL_SIGNPOST: Poi`; `isHallSlot(id): id is HallSlotId`; `hallSlotIndex(id): number` (0-based).
- `hallLine(slot: Row | null, index: number): string`: `"Alice: rank 1, 3/11 badges, Mage."` using `maskRude(name)` and `CLASSES[cls ?? DEFAULT_CLASS].name`; for `null` `"Spot 4 is waiting for a player."`.

- [ ] **Step 1: Failing tests.** In `hall.test.ts`: `hallLine` for a full row, a tied row (rank 1 on index 1 still prints "rank 1"), a rude name (masked), no class (Warrior), and `null` (with the right spot number). `zones.test.ts`: `ZONES.hall` exists, has a south exit to `village` and `ZONES.village` has a north exit to `hall`, the two exits' ranges overlap in columns, and every Hall place is inside `BOUNDS` and at least `reachFor` apart (the existing generic guards run on the new zone automatically).
- [ ] **Step 2: Run; expect FAIL.**
- [ ] **Step 3: Implement.** Add the zone (no wall, gate or river; `entered: LOG.enteredHall`), the exits, `ZONE_SCALE.hall = 1`, the places, and follow `npx tsc -b` errors for every `Record<ZoneId, …>` and `ZONE_ORDER`. Stage positions (percent of the zone): 1st (50, 30), 2nd (36, 36), 3rd (64, 36); ground arc for 4..10 at y 62–84 across x 18–82. Positions may be tuned in Task 3 to satisfy the collision guards; record any change in the ledger.
- [ ] **Step 4: Run `npx vitest run src/game src/learn src/chat` and `npx tsc -b`; expect PASS. Commit** `feat: the Hall of Fame zone and its ten spots`.

### Task 3: The Hall's art: sprites and area, the village's north mouth

**Files:**
- Modify: `src/render/sprites.ts` (`stage`, `podium-1`, `podium-2`, `podium-3`, `banner`, `trophy`), `src/render/areas/index.ts`, `src/render/areas/village.ts` (a second mouth and corridor on the north edge, protected rects), `src/render/mini terrain` (`paintMiniTerrain` for `hall`, if it switches on zone)
- Create: `src/render/areas/hall.ts` (`HALL: Area`, `HALL_POINTS`)
- Test: `src/render/areas/areas.test.ts` (the existing exhaustive guards), `src/render/sprites.test.ts`

**Interfaces:**
- Produces: `HALL_POINTS.slots: ArtPoint[]` (ten art points, feet of each hero, from `HALL_SLOTS` via `zoneToArt`), `HALL_POINTS.signpost`; sprite ids above in `SpriteId`.

- [ ] **Step 1: Failing tests.** The generic area tests are parameterised over `AREAS`: after adding `hall` to `ZoneId` they fail until `AREAS.hall` exists. Add: every slot's hero box (16 × 16 sprite box at its point) lies inside the reachable area and overlaps neither a podium nor another slot; the village's north mouth is a gap in its hedge at the columns `ZONES.village` exits through, with a corridor kept clear of props.
- [ ] **Step 2: Run; expect FAIL.**
- [ ] **Step 3: Implement the sprites** as pixel grids in the file's existing style (wide `stage` platform with a curtain, three podium blocks of increasing height with a numeral, a hanging `banner`, a small `trophy`). **Implement `HALL`** (`terrainAt` → `"floor"` inside the plaza and `"meadow"` outside; paths for the aisle; props: stage, podiums, banners, trophy, lanterns, hedges; `protected` rects for every slot and the corridor). **Village**: add the north mouth and corridor to `VILLAGE`.
- [ ] **Step 4: Run `npx vitest run src/render` and `npx tsc -b`; expect PASS. Commit** `feat: Hall of Fame art and the village's north way`.

### Task 4: Loading the list: `useHallOfFame`

**Files:**
- Create: `src/hooks/useHallOfFame.ts`
- Test: `src/hooks/useHallOfFame.test.tsx`

**Interfaces:**
- Consumes: `LeaderboardStore.top(rows)`.
- Produces: `useHallOfFame(store: LeaderboardStore, active: boolean): { phase: "idle" | "loading" | "ready" | "failed"; slots: (Row | null)[] }` (`slots` always length 10).

- [ ] **Step 1: Failing tests** (with `createMemoryLeaderboard`): inactive does nothing; becoming active loads once and fills ten slots in list order (rows 1–3 first), padding with `null`; fewer than 10 rows; an empty list; a rejected `top` gives `failed` with ten `null` slots; becoming inactive then active again reloads; a reply that arrives after it went inactive (a pending promise resolved late) is ignored (`phase` stays `idle`).
- [ ] **Step 2: Run; expect FAIL.**
- [ ] **Step 3: Implement** with an effect keyed on `[active, store]`, a request counter ref (newest wins, like `Leaderboard.tsx`), `top(10)` and `parseRows` on the result.
- [ ] **Step 4: Run the hook tests and `npx tsc -b`; expect PASS. Commit** `feat: load the leaderboard when you enter the Hall`.

### Task 5: The scene draws the figures; `E` reads them; Overworld wiring

**Files:**
- Modify: `src/render/scene.ts` (`SceneInput.hall?: HallFigure[]`; figures as uprights for `zone === "hall"`), `src/screens/overworld/Overworld.tsx` (use the hook, pass `hall` to the canvas, handle `E` on a slot), `src/App.tsx` (pass the leaderboard store to `Overworld` as `leaderboard`), `src/screens/overworld/MapCanvas.tsx` if it forwards scene input
- Test: `src/render/scene.test.ts`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Produces: `type HallFigure = { slot: number; cls: ClassId | null; rank: number | null }` (`cls`/`rank` null = empty spot); in the scene each figure is `placed("explorer-down", point, { variant: withClass(hood, cls ?? DEFAULT_CLASS) })` with hood gold/silver/bronze for slots 0–2 and a plain hood otherwise; an empty spot is the same sprite at `alpha`-reduced `variant: "grey"`.
- Consumes: `useHallOfFame`, `hallLine`, `HALL_POINTS`.

- [ ] **Step 1: Failing tests.** Scene: with `zone: "hall"` and figures for slots 0, 1 and 5, the scene's uprights include exactly those hero drawables at the slot points, plus the stage and podiums; empty slots are drawn greyed; no figures in other zones. Overworld: with a memory store holding two rows and the player placed in the Hall beside spot 1, pressing `E` adds the log line `Alice: rank 1, 3/11 badges, Mage.`; beside an empty spot the "waiting for a player" line; a rude name is masked; while loading the log says the Hall is waking up; on failure "Can't reach the leaderboard."
- [ ] **Step 2: Run; expect FAIL.**
- [ ] **Step 3: Implement.** In `Overworld`, call `useHallOfFame(leaderboard, state.zone === "hall")`; build `HallFigure[]` from the slots; where the overworld already handles `inspect` for other places, route `isHallSlot(id)` to `dispatch({ type: "note", text: hallLine(slots[hallSlotIndex(id)], hallSlotIndex(id)) })` instead of the reducer's inspect; log the loading/failed lines once per entry using `pushLogOnce`-style `note`s.
- [ ] **Step 4: Run `npx vitest run src/render src/screens/overworld src/App.test.tsx` and `npx tsc -b`; expect PASS. Commit** `feat: the Hall's figures draw in the scene and read with E`.

### Task 6: The badges, names and buttons; captions and signs

**Files:**
- Modify: `src/screens/overworld/mapLayout.ts` (`LANDMARK_CAPTIONS` entries for the ten spots and the signpost, `MAP_CAPTIONS`/`EXIT_SIGNS` for the Hall and the village's north sign), `src/screens/overworld/MapViewport.tsx` (the overlay: a button per spot with the round badge above the head and the name under the feet; the `(Hall of Fame Biome)` caption)
- Create: `src/screens/overworld/HallFigureLabel.tsx` (badge + name, reused for all ten)
- Test: `src/screens/overworld/mapLayout.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/screens/overworld/HallFigureLabel.test.tsx`

**Interfaces:**
- `HallFigureLabel({ name, rank, avatar, empty }: { name: string; rank: number | null; avatar?: string; empty?: boolean })`: the round badge is the photo (`avatarUrl(avatar)`, fallback to the first letter on `error`) or "?" when empty; the name is `maskRude(name)`; the rank number is shown small beside the name. Reuse the `Face` look from `Leaderboard.tsx` (extract it to `src/ui/Face.tsx` and import it in both).

- [ ] **Step 1: Failing tests.** `HallFigureLabel`: photo, no photo (letter), broken photo (letter), empty ("?"), rude name masked. `mapLayout`: the existing collision/caption-overlap guards include the ten spots with a caption width of the longest allowed name (12 characters) and do not overlap each other, the stage or the exit signs. `MapViewport` in the Hall renders ten buttons (named by `hallLine`-style accessible names), each with its badge, and none outside the Hall.
- [ ] **Step 2: Run; expect FAIL.**
- [ ] **Step 3: Implement.** Extract `Face`, build `HallFigureLabel`, add the captions and signs, render the overlay from the same `slots` the scene uses (passed down from `Overworld`), buttons call the same `onInspect` as other places.
- [ ] **Step 4: Run `npx vitest run src/screens` and `npx tsc -b`; expect PASS. Commit** `feat: Hall of Fame badges, names and buttons`.

### Task 7: The world map

**Files:**
- Modify: `src/screens/overworld/MiniMap.tsx` (a `hall` cell above the village at `top: 0`), the mini-terrain painter
- Test: `src/screens/overworld/MiniMap.test.tsx`

- [ ] **Step 1: Failing test.** `minimap-cell-hall` renders above `minimap-cell-village` (its `top` is 0 and `left` equals the village's), is marked current when the zone is `hall`, and a player standing in the Hall is shown in that cell.
- [ ] **Step 2: Run; expect FAIL.**
- [ ] **Step 3: Implement** the cell (extend `CELLS`' type so a cell can have its own `top`), the terrain for `hall` (paved), and the player/teammate dot positions.
- [ ] **Step 4: Run `npx vitest run src/screens/overworld/MiniMap.test.tsx` and `npx tsc -b`; expect PASS. Commit** `feat: the Hall on the world map`.

### Task 8: README, browser check, final review

**Files:**
- Modify: `README.md` (a Hall of Fame section; the layout list; the owner's SQL step), `docs/superpowers/plans/2026-10-19-hall-of-fame.md` is the ledger's source.

- [ ] **Step 1: README.** Describe the Hall, the figures, `E`, the load-on-entry rule, guests/teammates, and the SQL step with the file name; mention that until it is run everyone is a Warrior.
- [ ] **Step 2: Whole suite.** `npx vitest run` and `npx tsc -b`; expect all pass, no tsc output.
- [ ] **Step 3: Browser check.** Build and preview; with a throwaway harness page (deleted afterwards) render the Hall with a memory store of 0, 4 and 12 rows (with and without photos and with a tied pair), take screenshots at desktop and phone width, and check the stage, the ground spots, the badges and the village's north exit by walking through it. Read the screenshots.
- [ ] **Step 4: Final review.** Dispatch the whole-branch review on the most capable model with the spec, this plan and the ledger; fix Critical and Important findings in one pass, each with a failing test first; ledger the minors.
- [ ] **Step 5: Push and report**, including the SQL file path and the steps for the owner.
