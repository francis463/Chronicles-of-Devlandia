# Enterable Ski Lodge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Peaks' Ski Lodge becomes a building you walk into: a one-screen indoor zone with the HTML chest, a lodge keeper and a fireplace.

**Architecture:** A seventh zone `lodge` (320 × 180, scale 1) joins the six outdoor ones. `Zone` gains `doors` (walk onto a spot to change zone, in both directions). The room is a normal `Area` with a `floor` terrain, walls as props and new sprites; the scene draws it untinted. The keeper, soup and chest ride on the existing place/verb/card/reducer patterns (ranger, healing finds, chest hosts).

**Tech Stack:** Vite 8 / React 19 / TypeScript strict / Tailwind 4 / Vitest 5 + jsdom. Test commands: `npx tsc -b`; `timeout 250 npx vitest run > /tmp/v.log 2>&1; grep -E "^ *×|Tests " /tmp/v.log`. Tests that mutate `ZONE_SCALE` must save and restore it.

**Spec:** `docs/superpowers/specs/2026-10-18-enterable-lodge-design.md`

## Global Constraints

- Game positions stay percent of the zone (0–100); `BOUNDS` is x 6–94, y 10–90.
- `ZoneId` becomes `"peaks" | "village" | "forest" | "foggaten" | "desert" | "beach" | "lodge"`; the lodge's name is `Ski Lodge` and its entered log line `Entered the Ski Lodge.`.
- The lodge zone has no wall, no gate, no river, no edge exits, scale 1 (320 × 180).
- Doors: Peaks door at percent (19.4, 88) radius 2.5 → lodge, arriving at (50, 78); lodge mat at (50, 88) radius 2.5 → Peaks, arriving at (26, 88). Arrival points lie outside every door radius of the zone they arrive in.
- New `PoiId`s: `lodge-door` (Peaks, label `Ski Lodge`, at (19.4, 89.4) — the lodge's feet), `lodge-keeper` (label `Keeper`), `lodge-fireplace` (label `Fireplace`). `GameState.soupTaken: boolean`, default `false`.
- Soup: interacting beside the keeper (within `reachFor("lodge")`) while `hp < MAX_HP`, `!soupTaken` and not `hard` heals `REMEDY_HEAL` (2) and sets `soupTaken`; otherwise she only talks. Hard mode never offers it.
- `chest-html` moves to zone `lodge`, host `Shelf`, at percent (66, 40); its Codex place text reads `Ski Lodge · Shelf`. Badges stay 11.
- Sprites use the shared dark outline (`#0b1020`, palette key `o`).
- Copy: the keeper's hint line names what the player has not done yet, in the style of `rangerLine`; log lines end with a full stop.

## Review Focus

1. **Bouncing through a door:** after entering or leaving, a player must not be teleported straight back (arrival outside every door radius; also after the existing zone exits).
2. **A teammate in the lodge:** a `pos`/`ping` message with `zone: "lodge"` must parse (today `parseZone` lists the six zones by hand) and the teammate must appear in the lodge and on the mini-map, not vanish.
3. **A save made inside the lodge, and an old save without `soupTaken`:** both resume correctly.
4. **Being downed in the lodge:** respawn puts you at the Peaks start, and a downed or modal-blocked player cannot walk through a door.
5. **The hidden-spot, remedy and caption systems in the new zone:** the exhaustive caption/hit-area/prop-collision tests must run over the lodge too (furniture never overlaps a caption, the chest or the mat).

---

### Task 1: The lodge zone and doors (game layer, empty room)

**Files:**
- Modify: `src/game/zones.ts` (`ZoneId`, `Zone.doors`, `Door`, `ZONES.lodge`, Peaks door), `src/game/types.ts` (`PoiId`, `soupTaken`), `src/game/reducer.ts` (`initialState.soupTaken`, `move` door step), `src/game/zoneSize.ts` (`ZONE_SCALE.lodge = 1`), `src/game/team.ts` (`parseZone`), `src/learn/chests.ts` (`ZONE_NAMES`), `src/learn/codexModel.ts` (`ZONE_ORDER`), `src/render/areas/index.ts`, `src/render/areas/lodge.ts` (stub area), `src/screens/overworld/mapLayout.ts` and `MiniMap.tsx` (only what `tsc` demands), `src/game/constants.ts` (`LOG.enteredLodge`)
- Test: `src/game/lodge.test.ts` (new), `src/game/zones.test.ts`, `src/game/team.test.ts`

**Interfaces:**
- Produces: `type Door = { at: Point; radius: number; to: ZoneId; arrive: Point }`; `Zone.doors: Door[]` (empty for every zone but Peaks and lodge); `doorAt(zone: ZoneId, p: Point): Door | null` in `zones.ts`; `ZONES.lodge`; `AREAS.lodge` (stub: 320 × 180, no props, `terrainAt` → `"sand"` for now).

- [ ] **Step 1: Write the failing tests** in `src/game/lodge.test.ts`: `ZONES.lodge` has name `Ski Lodge`, no exits, `wall/gate/river` false; every zone has a `doors` array and only `peaks` and `lodge` have one; stepping from (22, 88) toward the Peaks door in the Peaks ends in zone `lodge` at (50, 78) with log `Entered the Ski Lodge.`; stepping from (50, 80) down onto the mat ends in `peaks` at (26, 88); arrival points are farther from every door of their zone than its radius (loop both doors and all existing `arrival(exit, …)` results for the Peaks' exits); `move` does nothing through a door while `hp` is 0 (downed) or a modal is open; `respawn` from the lodge returns to `peaks` at `PLAYER_START`. In `team.test.ts`: `parseZone`-backed parsing accepts `zone: "lodge"` in a `pos` message. In `zones.test.ts`: the new zone is in `ZONES` and `ZONE_ORDER` lists it last.
- [ ] **Step 2: Run them; expect failures** (`lodge` unknown).
- [ ] **Step 3: Implement** the types, `Door`, `doorAt`, the two doors, `ZONES.lodge` (places `[]` for now), the reducer door step (after the exit check and before clamping: if `doorAt(state.zone, target)` then `{ ...state, zone: door.to, player: door.arrive, drone: <arrive shifted 8 up, 2 left, clamped>, inspected: null }` plus the `entered` log), `parseZone` via `v in ZONES`, `ZONE_NAMES`/`ZONE_ORDER`/`ZONE_SCALE`, the stub area and the `tsc`-driven `Record<ZoneId, …>` entries.
- [ ] **Step 4: Run `npx tsc -b` and the whole suite; expect green** (update any exact zone/place lists that now include `lodge`).
- [ ] **Step 5: Commit** `feat: the Ski Lodge zone and doors (game layer)`.

### Task 2: The room (floor, walls, furniture, door button, mini-map)

**Files:**
- Modify: `src/render/sprites.ts` (`fireplace` 2 frames 24×22, `bunk` 28×18, `table` 24×14, `rug` 32×10, `shelf` 28×24, `door-mat` 20×6, `lodge-wall` 16×16 tile; `TextureId` `floor`), `src/render/areas/area.ts` (`TerrainKind` `floor`), `src/render/areas/lodge.ts` (real area), `src/render/terrain.ts` (no outer decoration or hedge for `floor`), `src/render/scene.ts` (lodge branch: no tint, no snow, fireplace glow light), `src/screens/overworld/mapLayout.ts` (landmark captions: `lodge-door` on the Peaks `lodge` sprite, `lodge-fireplace`), `src/screens/overworld/MapViewport.tsx` (buttons for the lodge zone; `lodge-door` button on the Peaks), `src/screens/overworld/MiniMap.tsx` (`MINI_COLORS.floor`; in the lodge the Peaks cell is current and the dot is at the door), `src/game/cards.ts`, `src/game/geometry.ts`, `src/game/zones.ts` (places), `src/game/types.ts`
- Test: `src/render/sprites.test.ts`, `src/render/scene.test.ts`, `src/render/terrain.test.ts`, `src/screens/overworld/mapLayout.test.ts`, `MapViewport.test.tsx`, `MiniMap.test.tsx`, `src/game/lodge.test.ts`

**Interfaces:**
- Consumes: Task 1's zone, doors and stub area.
- Produces: `AREAS.lodge` with props (walls along the top and both sides, door mat at (50, 90)%, rug, table, two bunks, shelf at (66, 40)%, fireplace at (20, 30)%), `LODGE_POINTS = { fireplace, shelf, mat, keeper }` in art px (`keeper` at (38, 52)%), places `lodge-door` (Peaks) and `lodge-fireplace` (lodge) with cards (`The lodge's door. Walk into it to go inside.`, `A crackling fire. The keeper keeps the logs coming.`), verbs `Inspect`, the lodge scene (untinted at every hour).

- [ ] **Step 1: Write the failing tests:** each new sprite has its declared size, anchor and only palette characters, and every edge is the shared outline (`fireplace` frames differ); the lodge scene at 12:00 and 23:00 has `tint === "transparent"` and no snow, with the fireplace sprite drawn once and warm light pixels near it at both hours; `terrainAt` is `floor` inside the world and `decorations(world-sized ring, AREAS.lodge)` is empty; all lodge props are inside the world, clear of each other, the mat and the keeper's spot, and protected; `lodge-door` has a caption/button on the Peaks that does not collide with other captions or hit areas (existing exhaustive tests, extended to `lodge`); in the lodge `MapViewport` shows the fireplace button and no Peaks buttons; the mini-map in the lodge outlines the Peaks cell with the player dot at the door's percent.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement** the sprites (drawn with `creature()` / `outlined()` like the existing furniture), the floor texture (two-tone planks), the area, the scene branch (reuse the generic upright draw; add `lodgeLight(t, reduced)` for the fireplace glow), the places, cards, verbs, captions and buttons, and the mini-map change.
- [ ] **Step 4: Run `tsc` and the whole suite; expect green.**
- [ ] **Step 5: Browser check:** seed `localStorage devlandia.savedGame` at the Peaks next to the lodge, walk in, screenshot the room, walk out, screenshot the Peaks; no page errors.
- [ ] **Step 6: Commit** `feat: the lodge room and its door button`.

### Task 3: The HTML chest moves inside

**Files:**
- Modify: `src/learn/chests.ts` (`chest-html`: `zone: "lodge"`, `host: "Shelf"`, `at: { x: 66, y: 40 }`), `src/screens/overworld/mapLayout.ts` (`HOSTS["chest-html"]` → sprite `shelf`, name `Shelf`), `src/render/scene.ts` / `src/render/areas` (the chest drawn open/closed over the shelf like other hosted chests), `src/chat/places.ts` (`html` ping spot follows the chest)
- Test: `src/learn/chests.test.ts`, `src/game/reducer.test.ts`, `src/screens/Codex.test.tsx`, `mapLayout.test.ts`, `src/chat/places.test.ts`

**Interfaces:** Consumes Task 2's shelf sprite and lodge zone. Produces: `chestById("chest-html").zone === "lodge"`.

- [ ] **Step 1: Write the failing tests:** the chest table has `chest-html` in `lodge` with host `Shelf`; interacting beside it in the lodge opens the HTML challenge; the Codex places it `Ski Lodge · Shelf` and `Go there` names it; the `html` ping resolves to zone `lodge`; the Peaks no longer lists the chest and the Peaks `lodge-door` caption does not read `Lodge ✓`; badges stay 11 and the HTML questions are unchanged; the shelf chest's caption passes the collision tests.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement** the moves; fix any Peaks tests that expected the old host and the start-here arrow over the lodge (it now points at the door).
- [ ] **Step 4: Run `tsc` and the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: the HTML chest lives inside the lodge`.

### Task 4: The keeper and the soup

**Files:**
- Create: `src/game/lodge.ts` (`KEEPER`, `keeperLine`, `SOUP`)
- Modify: `src/game/zones.ts`, `src/game/types.ts`, `src/game/reducer.ts` (interact), `src/game/cards.ts`, `src/game/geometry.ts`, `src/chat/places.ts` (`PING_PLACE_NAMES` gains `keeper`), `src/screens/overworld/mapLayout.ts`, `MapViewport.tsx`, `src/render/areas/lodge.ts` (keeper prop, `explorer-down` variant `#b45309`)
- Test: `src/game/lodge.test.ts`, `src/chat/places.test.ts`, `src/screens/overworld/mapLayout.test.ts`, `MapViewport.test.tsx`

**Interfaces:**
- Produces: `KEEPER: Poi` (id `lodge-keeper`, (38, 52)); `keeperLine(s: Pick<GameState, "gateUnlocked" | "hasLoot" | "clueDecoded" | "artifactFound" | "badges">): string`; `SOUP = { served: string; fine: string; already: string }`.

- [ ] **Step 1: Write the failing tests:** `keeperLine` gives a different line for each stage (nothing done; gate open; loot; clue; artifact) and ends with a full stop; interacting beside the keeper hurt (`hp 2`) once heals to 4, sets `soupTaken`, logs `SOUP.served`; again does not heal; at full health logs `SOUP.fine` and does not set `soupTaken`; in hard mode never heals; from far away only the card; `/ping keeper` resolves to zone `lodge` at the keeper; the keeper's caption/hit area pass the collision tests; an old save without `soupTaken` loads with `false`.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement** `lodge.ts`, the places, verb `Talk to Keeper`, card (the hint line), reducer branch, caption `[K] Keeper`, ping name and spot.
- [ ] **Step 4: Run `tsc` and the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: the lodge keeper and her soup`.

### Task 5: Team, README, browser check and final review

**Files:** Modify `README.md` (Peaks section, controls, Codex); test `src/screens/overworld/TeamOverworld.test.tsx`.

- [ ] **Step 1: Write the failing test:** in a team game a teammate whose position message says `zone: "lodge"` is drawn in the lodge for a player who is also there and absent for one outside, and appears on the mini-map's Peaks cell at the door.
- [ ] **Step 2: Run it; expect failure; implement what is missing** (mini-map placement of lodge teammates); run the whole suite.
- [ ] **Step 3: README:** describe the door, the room, the keeper, the soup and the chest's new home.
- [ ] **Step 4: Browser check:** walk in and out, talk to the keeper (hurt, then full), open the HTML chest, save and refresh inside the lodge (resumes inside), phone portrait and landscape screenshots, frame time unchanged.
- [ ] **Step 5: Final review** of the whole branch from this plan's first commit, each Review Focus item checked against its test; fix findings with a failing test first; `tsc` and the whole suite; push.
