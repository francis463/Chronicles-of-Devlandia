# Foggaten Island, Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add **Foggaten Island**, a separate walkable island reached by a dock on the Peaks' east shore once the Terminal Gate is solved, with a fade crossing, drifting fog, a hermit who gives hints, an unlit lighthouse, places to inspect, and a mini-map panel.

**Architecture:** The island is a new zone (`foggaten`) like the village and forest, but it has no edge exits: it is entered and left by a new `sail` game action at a dock. Its art is a new `Area` (land inside the walkable rect, sea only beyond it, so movement rules do not change). A view-only mist overlay and a short crossing fade are drawn by `MapViewport`/`Overworld`. This is **Phase A of five** in the spec; the mini-game, lamp puzzle, 12th chest and Cinder Isle are separate later plans.

**Tech Stack:** Vite 8, React 19, TypeScript strict (`tsc -b` also checks tests; `noUnusedLocals/Parameters`), Tailwind 4, Vitest 5 + jsdom, Testing Library + user-event, a hand-drawn pixel-art canvas painter (`src/render`).

**Spec:** `docs/superpowers/specs/2026-10-17-foggaten-island-design.md` (Phase A and the cross-cutting sections)

## Global Constraints

- Zone id `foggaten`, name `Foggaten Island`; no wall, no river, no gate, no exits; `river: false`, `wall: false`, `gate: false`.
- The island never changes any stat: no HP drain, no clock change, no new puzzle, no chest, no badge. There are still 11 badges.
- Copy, exactly:
  - entered the island: `Fog rolls over Foggaten Island. A lighthouse stands dark at the far end.`
  - sailing out: `You sail through the fog to Foggaten Island.`; sailing back: `You sail back to the Peaks.`
  - dock before the gate is open: `The boatman waits for the gate to open`
  - labels: `[B] Dock` (Peaks), `[B] Dock` (island), `[L] Lighthouse`, `[H] Hermit`, `[F] Campfire`, `[R] Ruins`.
- New place ids (all `PoiId`s): `dock` (Peaks), `island-dock`, `lighthouse`, `hermit`, `island-fire`, `ruins`.
- `sail` is allowed only: from the Peaks to the island when the player is within reach of the Peaks' dock and `gateUnlocked`; from the island to the Peaks when within reach of the island's dock; never while a terminal, the Codex or the challenge is open; never for any other zone pair. Anything else changes no state (except the one locked-dock log line).
- The reachable (walkable) area is unchanged: the island's art must make every cell inside `REACHABLE_RECT` land; sea is drawn only beyond it.
- Reduced motion: no crossing fade (the move is instant) and the mist does not drift.
- Older clients: an unknown zone in presence or position messages parses as `null` and is simply not shown; nothing throws.
- Existing tests that list every zone (the zone table, the areas table, the mini-map cells, zone parsing) are updated for the new zone; every other existing assertion stays as it is.
- Commit trailers on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub`. No model identifiers in code or commits. Push to `claude/trusting-archimedes-64rvrc` after commits; never force.

## Review Focus

1. A teammate on the island (or an older client that sends an unknown zone) never crashes parsing, the roster, the mini-map or `/where`; the dock opens for the whole team through the shared gate flag. Tests: Tasks 2 and 5.
2. `sail` cannot be abused: out of range, a locked dock, a modal open, a wrong or unknown destination, or repeated calls never move the player or change anything else. Tests: Task 1.
3. The sea is never walkable: every cell of the walkable rect on the island is land, and movement bounds are unchanged. Tests: Task 4.
4. Nothing existing changes: HP, stamina, clock, the river, the gate and every existing puzzle behave as before; the island adds no HP loss. Tests: Task 1 (state before and after) and the full suite in every task.
5. Reduced motion removes the fade and the mist drift, and the crossing never traps the player (it ends by itself). Tests: Task 5.

---

### Task 1: The zone and the `sail` rule

**Files:**
- Modify: `src/game/types.ts` (`PoiId`), `src/game/constants.ts` (POIs, `LOG`), `src/game/zones.ts` (`ZoneId`, `ZONES`), `src/game/reducer.ts` (`sail`, dock/lighthouse/hermit interactions, `visiblePois` unchanged), `src/game/cards.ts` (cards for the new places)
- Create: `src/game/island.ts` (`hermitLine`)
- Test: `src/game/zones.test.ts`, `src/game/reducer.test.ts`, `src/game/cards.test.ts`, `src/game/island.test.ts` (new)

**Interfaces:**
- Produces:
  - `PoiId` gains `"dock" | "island-dock" | "lighthouse" | "hermit" | "island-fire" | "ruins"`
  - `ZoneId` gains `"foggaten"`; `ZONES.foggaten: Zone` with `exits: []`, `entered: LOG.enteredFoggaten`, `places: [ISLAND_DOCK, LIGHTHOUSE, HERMIT, ISLAND_FIRE, RUINS]`; `ZONES.peaks.places` gains `DOCK`
  - Constants (game coordinates, percent of the world): `DOCK` `{ id: "dock", label: "Dock", x: 88, y: 62 }`, `ISLAND_DOCK` `{ id: "island-dock", label: "Dock", x: 12, y: 62 }`, `LIGHTHOUSE` `{ x: 50, y: 28 }`, `HERMIT` `{ x: 58, y: 62 }`, `ISLAND_FIRE` `{ x: 44, y: 66 }`, `RUINS` `{ x: 28, y: 50 }`; landing points `SAIL_LANDING: Record<"foggaten" | "peaks", Point>` = `{ foggaten: { x: 18, y: 62 }, peaks: { x: 82, y: 62 } }`
  - `GameAction` gains `{ type: "sail"; to: ZoneId }`; `sail(state, to)` behaviour per Global Constraints; it sets `zone`, `player` to `SAIL_LANDING[to]`, `drone` 4 steps behind the player on the same row, clears `inspected`, and logs the matching line
  - `hermitLine(s: Pick<GameState, "hasLoot" | "clueDecoded" | "artifactFound">): string`: hints in quest order from the first stage not done (`hasLoot`, `clueDecoded`, `artifactFound`), then a closing line; no stage mentions the gate (the island is only reachable after it is open)
  - `LOG.enteredFoggaten`, `LOG.sailOut`, `LOG.sailBack`, `LOG.dockLocked` (the exact copy above)

- [ ] **Step 1: Write the failing tests.**
  - `zones.test.ts`: `ZONES.foggaten` exists with no exits, `wall/gate/river` all false and the five places; `ZONES.peaks.places` includes `dock`; the place list for the island contains no chest.
  - `island.test.ts`: `hermitLine` returns three different hints for `{hasLoot:false}`, `{hasLoot:true}`, `{hasLoot:true, clueDecoded:true}`, a closing line when all are true, and none of them contains the word `gate`.
  - `reducer.test.ts` (use the existing helpers for building a state next to a place): `sail` to `foggaten` from the Peaks next to the dock with `gateUnlocked: true` sets `zone: "foggaten"`, `player` to `SAIL_LANDING.foggaten`, logs `LOG.sailOut`, and leaves `hp`, `stamina`, `minutes`, `badges`, `hasLoot`, `gateUnlocked` and `towerPowered` unchanged; with `gateUnlocked: false` nothing changes except `LOG.dockLocked` is logged once; from far away from the dock, with the Codex or a challenge open, with `to: "village"` / `"forest"` / `"peaks"` from the Peaks, or from the island with `to: "foggaten"`, the state is returned untouched (`toBe` the same object); from the island next to `island-dock`, `sail` to `peaks` lands on `SAIL_LANDING.peaks` and logs `LOG.sailBack`; `interact` on `dock` and on `island-dock` does the same as `sail` (including the locked line); `interact` on `lighthouse`, `island-fire` and `ruins` sets `inspected` and logs a line; `interact` on `hermit` logs `Hermit: "<hermitLine>"`; stepping off any edge of the island's walkable area leaves the player where they are (there are no exits).
  - `cards.test.ts`: each new place yields a card (title is the place label; the hermit's card text is `hermitLine`).
- [ ] **Step 2: Run** `npx vitest run src/game` — Expected: FAIL (types, constants and `island.ts` missing).
- [ ] **Step 3: Implement** the types, constants, zone entry, `island.ts`, the reducer cases and the cards. `sail` must use the same reach rule `interact` already uses for places (read how `interact` decides a place is in range) and must be refused while `isModalOpen(state)`. Story text for the lighthouse (inspect): the lamp is dark and the door is shut; ruins and campfire: one atmospheric line each.
- [ ] **Step 4: Run** `npx vitest run src/game` and `npx tsc -b` — Expected: PASS and clean. Update only the exhaustive-list tests mentioned in Global Constraints.
- [ ] **Step 5: Commit** `feat: Foggaten Island zone and the sail rule`.

### Task 2: Teams and chat know the island

**Files:**
- Modify: `src/game/team.ts` (`parseZone`, the ping zone check), `src/chat/places.ts` (ping places), the command help text if it lists places, `src/hooks/useTeamSession.ts` only if its zone handling is not already generic
- Test: `src/game/team.test.ts`, `src/chat/places.test.ts`, the commands test, `src/hooks/useTeamSession.test.tsx`

**Interfaces:**
- Consumes: `ZoneId` incl. `"foggaten"`, the new places (Task 1).
- Produces: `parseZone` and the ping parser accept `"foggaten"` (anything else still `null` / rejected); ping places `dock` → the Peaks' `DOCK`, `pier` → `ISLAND_DOCK`, `lighthouse`, `hermit` (each with its zone), so `/ping dock` and the others work and `/help` lists them; `/where` shows a teammate on the island as `Foggaten Island`.

- [ ] **Step 1: Write the failing tests:** `parsePresence` and `parseMessage` keep `zone: "foggaten"` for a teammate on the island, and still give `null` for `"marsh"`, `42`, `{}`; a `ping` message for `lighthouse` parses with its zone and spot; `isPingPlace("dock" | "pier" | "lighthouse" | "hermit")` is true and a made-up place is false; `/ping lighthouse` produces a ping in zone `foggaten`; `/where` names the island; a session test with a raw teammate whose `zone: "foggaten"` shows `zone: "foggaten"` in `teammates`, and one with an unknown zone shows `zone: null` without errors (Review Focus 1).
- [ ] **Step 2: Run** `npx vitest run src/game/team.test.ts src/chat src/hooks` — Expected: FAIL.
- [ ] **Step 3: Implement** the parsing and places changes.
- [ ] **Step 4: Run** the three folders and `npx tsc -b` — Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat: teams and chat know Foggaten Island`.

### Task 3: Island sprites and terrain textures

**Files:**
- Modify: `src/render/sprites.ts` (`SpriteId`, `SPRITES`, `TextureId`, `TEXTURES`), `src/render/areas/area.ts` (`TerrainKind`)
- Test: `src/render/sprites.test.ts`

**Interfaces:**
- Produces: sprites `dock` (a short wooden pier, about 24 × 14, anchor `bottom`), `lighthouse` (about 22 × 44, anchor `bottom`, unlit lamp), `ruins` (a few broken pillars, about 22 × 16, anchor `bottom`); textures `sea` and `sand` (16 × 16 tiles like the others); `TerrainKind` gains `"sand" | "sea"`. The hermit is the existing `explorer-down` recoloured with a grey-green hood variant (as the ranger and Ada are), and the island campfire reuses `campfire`.

- [ ] **Step 1: Write the failing tests** in the style of the existing sprite tests: every new grid is rectangular, of its declared size, and uses only palette characters; `dock`, `lighthouse` and `ruins` have the declared `anchor`; the new textures are 16 × 16 using only their palette; `sea` and `sand` differ from each other and from every existing texture; the lighthouse has no lit-lamp colour (a later phase adds the lit lamp, so the unlit lamp is a single dark glass colour).
- [ ] **Step 2: Run** `npx vitest run src/render/sprites.test.ts` — Expected: FAIL.
- [ ] **Step 3: Draw and register** the three sprites and two textures in the existing hand-drawn style (outline `o`, the shared outline colour, a 3-tone palette per sprite; the sea tile has two shades of blue with a few light flecks; the sand tile two warm tans).
- [ ] **Step 4: Run** `npx vitest run src/render` and `npx tsc -b` — Expected: PASS and clean (other render tests that enumerate terrain kinds are extended for `sand` and `sea`).
- [ ] **Step 5: Commit** `feat: Foggaten Island sprites and textures`.

### Task 4: The island's art and the Peaks' east shore

**Files:**
- Create: `src/render/areas/foggaten.ts`
- Modify: `src/render/areas/index.ts` (`AREAS`), `src/render/areas/peaks.ts` (`terrainAt` east sea, the dock prop), `src/render/scene.ts` (anything keyed on a zone name), `src/render/terrain.ts` and `src/render/paint.ts` only if they enumerate zones or terrain kinds
- Test: `src/render/areas/areas.test.ts`, `src/render/scene.test.ts`, `src/render/terrain.test.ts`

**Interfaces:**
- Consumes: sprites and `TerrainKind` (Task 3); places (Task 1).
- Produces: `FOGGATEN_POINTS` (art points via `toArt` for `dock`, `lighthouse`, `hermit`, `fire`, `ruins`), `FOGGATEN: Area` with `id: "foggaten"`, `wall: false`, `mouths: []`, `corridors: []`, `gateBox: null`, `ice: null`, `props` (hermit with a grey-green hood variant, campfire, ruins, lighthouse, island dock), `paths` (a sand path from the dock to the lighthouse), and `protected` covering the paths and every prop's box; `terrainAt` returns `sand` along the shore strip and the dock side, `meadow` and `forest` inland (a few trees), and `sea` for every point outside `REACHABLE_RECT`. `AREAS` gains `foggaten`. `PEAKS.terrainAt` returns `sea` for the east shore strip beyond the walkable edge (x ≥ 300, rows 96–132 in art px) and `PEAKS.props` gains the `dock` sprite at the Peaks dock's art point, standing at the shore.

- [ ] **Step 1: Write the failing tests:** `AREAS.foggaten` exists with the declared fields; for every integer art point inside `REACHABLE_RECT`, `FOGGATEN.terrainAt` is not `sea` (Review Focus 3), and for points outside it the terrain is `sea`; no prop's box overlaps another prop or the path, and every prop is inside the walkable rect except the dock, which may reach the shore; the Peaks' east shore is `sea` outside the walkable rect and still `meadow`/`snow` as before everywhere else (compare against the previous results at a sample of points), the Peaks' dock prop is present and its box does not overlap the path, the tower, the gate or any chest box; `buildScene` for the island draws the hermit (with its variant), the campfire, the ruins, the lighthouse and the dock as upright sprites, sorted by feet row with the explorers like every other zone; `buildScene` for the Peaks draws the dock.
- [ ] **Step 2: Run** `npx vitest run src/render` — Expected: FAIL.
- [ ] **Step 3: Implement** `foggaten.ts`, the registrations and the Peaks changes. Follow `forest.ts` for structure (props, protected boxes). Island layout: dock at the west shore, a path east to the lighthouse in the north-east, the hermit and campfire in the middle clearing, the ruins in the south-west; a few trees, rocks and reeds along the walkable rect's edge in place of the hedge (use the existing scenery generator for edge decorations; the sea beyond it needs no hedge at the dock side).
- [ ] **Step 4: Run** `npx vitest run src/render` and `npx tsc -b` — Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat: Foggaten Island art and the Peaks' east shore`.

### Task 5: Labels, mist, the crossing fade and the mini-map

**Files:**
- Create: `src/hooks/useCrossingFade.ts`
- Modify: `src/screens/overworld/mapLayout.ts` (labels and captions for the island and the Peaks' dock), `src/screens/overworld/MapViewport.tsx` (zone caption, mist overlay, fade overlay), `src/screens/overworld/Overworld.tsx` (pass the zone and reduced-motion to the fade), `src/screens/overworld/MiniMap.tsx` (fourth cell)
- Test: `src/hooks/useCrossingFade.test.tsx`, `src/screens/overworld/mapLayout.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/screens/overworld/MiniMap.test.tsx`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Produces:
  - `useCrossingFade(zone: ZoneId, reduced: boolean): { fading: boolean }`: true for 700 ms after `zone` changes **between `peaks` and `foggaten` only** (not for edge exits, not on first render); always false when `reduced`
  - labels `[B] Dock` (Peaks, prefer below), `[B] Dock`, `[L] Lighthouse`, `[H] Hermit`, `[F] Campfire`, `[R] Ruins` (island), and a zone caption `(Foggaten Island Biome)` shown like the other biome captions
  - `MapViewport` draws a **mist** overlay (a semi-transparent pixel-pattern layer that drifts slowly, painted above the scene, `aria-hidden`, `pointer-events: none`) only on `foggaten`; the drift is off under reduced motion; a **fade** overlay (black, `aria-hidden`, `pointer-events: none`) whose opacity follows `fading`
  - `MiniMap` gains a fourth cell for `foggaten` to the right of the forest's cell, drawn in sea and land colours with the island's places, the player's outline and teammates like the other cells

- [ ] **Step 1: Write the failing tests:** `useCrossingFade`: false at first; becomes true for 700 ms (fake timers) when the zone goes `peaks → foggaten` or back, and not for `peaks → village`, `village → peaks` or `forest → peaks`; false throughout with `reduced`; the timer is cleared on unmount. `mapLayout.test.ts` (its existing no-overlap and in-bounds checks run for the new zone's labels, captions and the Peaks' new dock label). `MapViewport.test.tsx`: the mist is present only for `foggaten`, is `aria-hidden`, and its drift class is absent with reduced motion; the fade overlay's opacity is 0 normally and 1 while `fading`; the island caption appears. `MiniMap.test.tsx`: four cells, the island's cell has the island's places, a teammate on the island shows there and nowhere else, and the existing three cells are unchanged. `Overworld.test.tsx` (existing helpers): sailing from the Peaks' dock to the island (gate open) shows the island caption, the hermit's label and the entered line in the log, and sailing back returns; with the gate closed the locked line shows and the zone does not change.
- [ ] **Step 2: Run** `npx vitest run src/hooks src/screens/overworld` — Expected: FAIL.
- [ ] **Step 3: Implement** the hook, the labels and captions, the overlays and the mini-map cell. The mist reuses the existing `prefers-reduced-motion` handling the snow and fog-of-war already use; it hides nothing and changes no gameplay.
- [ ] **Step 4: Run** `npx vitest run` (the whole suite) and `npx tsc -b` — Expected: all pass, clean.
- [ ] **Step 5: Commit** `feat: Foggaten Island labels, mist, crossing fade and mini-map`.

### Task 6: README, browser check, final review

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README.** Document the island under the zone list in "How to play" (the dock, the locked message, what is on the island, that it changes nothing about the quest), the new places and `/ping` names, and the layout lines for the new files. Say that this is the first of several phases and what comes next.
- [ ] **Step 2: Browser check** at 1366 × 657 and 390 × 844 against `npm run build` + `vite preview` (kill by saved pid), Supabase blocked: as a guest in Solo Quest, find the Peaks' dock (inspect it: locked message); solve the Terminal Gate (the existing CSS fix; use the page's own UI, no cheats), return to the dock, sail, see the fade and the island with mist, the hermit's hint, the lighthouse and ruins, walk to every edge and confirm you cannot leave or reach the sea, sail back; check the mini-map's fourth cell; no horizontal scroll; no console errors. Take screenshots and look at them.
- [ ] **Step 3: Full verification:** `npx tsc -b`, `npx vitest run`, `npm run build` — Expected: clean and green.
- [ ] **Step 4: Commit and push** `docs: Foggaten Island in the README`.
- [ ] **Step 5: Final whole-branch review** on the most capable model with the Review Focus above; triage, one fix pass (each fix RED→GREEN), ledger the rest. Then write the Phase B plan (the sailing mini-game) when the owner asks for it.
