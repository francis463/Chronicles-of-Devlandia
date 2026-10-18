# Bigger Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Dense Forest, Sunbaked Desert and Sunny Beach become 640 × 360 art pixels (2 × 2 screens) with a camera that follows the player, and each gets two hidden spots.

**Architecture:** Game positions stay percentages of the zone. Each zone gets its own world size (`ZONE_SCALE` in the game layer, `Area.world` in the render layer); `toArt`, the reachable rectangle, the decoration generator, the effects, the mini-map and the view all take that size instead of the fixed `WORLD`. Walking step and reach are kept in art pixels, so they halve (in percent) in a 2× zone. Phase 1 changes no zone's size, so the existing tests prove nothing broke; phases 2–4 flip one zone each.

**Tech Stack:** Vite 8, React 19, TypeScript strict, Tailwind 4, Vitest 5 with jsdom.

**Spec:** `docs/superpowers/specs/2026-10-18-bigger-areas-design.md`

## Global Constraints

- Game positions (player, drone, places, chests, pings, exits, saves, team messages) stay **percent of the zone**: no change to saved games or the team protocol, apart from the new `secrets` list.
- Zone world sizes: 320 × 180 everywhere except `forest`, `desert`, `beach` = 640 × 360 (`ZONE_SCALE` 2).
- The first and last phases must leave `tsc -b` clean and the whole suite green; every commit keeps the suite green.
- The art keeps whole-pixel scaling: sprites are never resized; zoom steps stay whole device pixels.
- The default view scale in a 2× zone equals the scale a 320 × 180 screen gets (sprites the same size as today); zoom `−` can go down to the scale that fits the whole zone ("Whole map").
- Reduced motion, `/light`, day and night, the health display, the full-screen map and the zoom controls keep working in every zone.
- Hidden spots: 2 per area, 6 in all; found spots are personal (not shared with the team); no new badge, no change to the 11 badges or the finale.
- Test commands: `npx tsc -b` and `timeout 250 npx vitest run > /tmp/v.log 2>&1; grep -E "^ *×|Tests " /tmp/v.log`. A browser check uses `npx vite build`, `npx vite preview --port 4173` and a Playwright script (`/opt/node22/lib/node_modules/playwright`, chromium at `/opt/pw-browsers/chromium`); never use `pkill`.

## Review Focus

Inputs and conditions the spec implies that no single task's tests cover; each gets a test in the task that owns the code.

1. **A teammate's ping outside the camera's window** must not vanish: it shows as an arrow on the nearest edge (Task 7).
2. **Entering a big zone from a neighbour** lands you on the same row (percent), the camera centres on you immediately, and the first frame shows no jump (Tasks 4, 8).
3. **A saved game made before this change** resumes in a big zone at the same percent position (Task 8).
4. **A phone in portrait and landscape** shows a usable window of the area (the default scale is the same sprite size as today); `Whole map` stays readable (Tasks 4, 8).
5. **Holding a move key or the touch pad** crosses a big area in about twice the steps, never skips a place's reach, and the drone keeps up (Task 3).
6. **Effects (leaves, sand, gulls, storm, fireflies) cover the whole big area**, not only its top-left screen (Tasks 2, 8, 9, 10).
7. **A frame in a big zone is no slower than today's** (measured in Task 8).

---

## Phase 1 — infrastructure (no visible change)

### Task 1: Zone world sizes and zone-aware coordinates

**Files:**
- Create: `src/game/zoneSize.ts`
- Modify: `src/render/world.ts` (add `WorldSize`, `zoneWorld`, `reachableRect`; `toArt` takes an optional world), `src/render/areas/area.ts` (`Area.world`), the six area files (`world: zoneWorld("<zone>")`)
- Test: `src/render/world.test.ts`, `src/game/zoneSize.test.ts`

**Interfaces:**
- Produces:
  - `ZONE_SCALE: Record<ZoneId, number>` in `zoneSize.ts` (all `1` in this task) — the game layer owns the scale; tests may set an entry temporarily.
  - `stepFor(zone: ZoneId): number` = `STEP / ZONE_SCALE[zone]`; `reachFor(zone: ZoneId): number` = `INTERACT_RADIUS / ZONE_SCALE[zone]`.
  - `type WorldSize = { width: number; height: number }`; `zoneWorld(zone: ZoneId): WorldSize` = `WORLD` × `ZONE_SCALE[zone]`.
  - `toArt(p: Point, world: WorldSize = WORLD): ArtPoint`.
  - `reachableRect(world: WorldSize = WORLD): Rect`: x from `toArt(minX)` to `toArt(maxX)` inclusive, y from `toArt(minY)` to `toArt(maxY)` inclusive (BOUNDS from constants); `REACHABLE_RECT` becomes `reachableRect()`.
  - `Area.world: WorldSize`; `AREAS[zone].world` equals `zoneWorld(zone)`.

- [ ] **Step 1: Write the failing tests.** `reachableRect()` equals `{ x: 19, y: 18, w: 283, h: 145 }`; `reachableRect({ width: 640, height: 360 })` equals `{ x: 38, y: 36, w: 565, h: 289 }`; `toArt({ x: 50, y: 50 }, { width: 640, height: 360 })` equals `{ x: 320, y: 180 }`; `zoneWorld` of every zone is 320 × 180 while all scales are 1; `stepFor`/`reachFor` equal `STEP`/`INTERACT_RADIUS` at scale 1 and half at scale 2 (set `ZONE_SCALE.beach = 2` inside the test and restore it in `afterEach`); every `AREAS[z].world` equals `zoneWorld(z)`.
- [ ] **Step 2: Run them; expect failures** (missing exports).
- [ ] **Step 3: Implement** the interfaces above. `world.ts` imports `ZONE_SCALE` from `../game/zoneSize` and `type ZoneId` only.
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: per-zone world sizes (all still 320 × 180)`.

### Task 2: Terrain, ground painting, effects and the mini-map read the zone's world

**Files:**
- Modify: `src/render/terrain.ts` (hedge, `WORLD_RECT`, `LAST_ROW/LAST_COL`, `candidate` use `area.world`; `REACHABLE_RECT` becomes `reachableRect(area.world)`), `src/render/paint.ts` (`beyondTheWorld`, `REACHABLE_RECT`), `src/render/scene.ts` (every effect function takes `world: WorldSize`; `decorations` range), `src/screens/overworld/MiniMap.tsx` (`paintMiniTerrain` uses the zone's world), `src/render/areas/foggaten.ts` (its `REACHABLE_RECT` use)
- Test: `src/render/terrain.test.ts`, `src/render/scene.test.ts`, `src/screens/overworld/MiniMap.test.tsx`, `src/render/worldGuard.test.ts` (new)

**Interfaces:**
- Consumes: Task 1's `Area.world`, `reachableRect`.
- Produces: `snowfall`, `forestLeaves`, `forestAir`, `desertAir`, `desertSky`, `aurora`, `coldFeel`, `snowSparkles`, `birds` (and any other function in `scene.ts` that uses `WORLD`) take `world: WorldSize` as a parameter, passed from `AREAS[input.zone].world`.

- [ ] **Step 1: Write the failing tests.**
  - `terrain.test.ts`: with a test-only area `{ ...AREAS.forest, world: { width: 640, height: 360 } }`, `decorations({ x: 0, y: 0, w: 640, h: 360 }, big)` returns decorations in the east half (x ≥ 320) and in the south half (y ≥ 180), has a bottom hedge on row `floor(359 / 16)` and side hedges at `x = 10` and `x = 631`, and none of them lies in the exit corridors; the same call with the real forest area is unchanged (compare to a stored count from before the change in the test).
  - `scene.test.ts`: for the test area, each effect function returns pixels whose x spans past 320 and y past 180 (use the pixel list at several `t`), and none outside `0 ≤ x < width`.
  - `worldGuard.test.ts`: read every `src/**/*.ts(x)` file with `node:fs`, and assert the only non-test files that mention the identifier `WORLD` are `src/render/world.ts` and files on a short allow-list (`MenuBackdrop.tsx`, which draws the 320 × 180 title world).
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.** Replace each `WORLD` with the area's world, each `REACHABLE_RECT` with `reachableRect(area.world)`. Keep `WORLD` itself as the default only inside `world.ts`.
- [ ] **Step 4: Run the whole suite; expect green** (every real zone still 320 × 180 so results are identical).
- [ ] **Step 5: Commit** `refactor: terrain, painting, effects and mini-map use the zone's world`.

### Task 3: Walking and reach in art pixels

**Files:**
- Modify: `src/game/geometry.ts` (`placeInReach(p, places, radius = INTERACT_RADIUS)`, `nearestPoi` likewise), `src/game/reducer.ts` (the `move` action uses `stepFor(state.zone)`; every `> INTERACT_RADIUS` check uses `reachFor(state.zone)`), `src/hooks/useKeyboardControls.ts` and `src/screens/overworld/Overworld.tsx` (`placeInReach(..., reachFor(zone))`, the water neighbour check), `src/learn/codexModel.ts` (`Math.ceil(nearest.d / stepFor(zone))`)
- Test: `src/game/reducer.test.ts`, `src/game/geometry.test.ts`, `src/learn/codexModel.test.ts`

**Interfaces:**
- Consumes: `stepFor`, `reachFor`.
- Produces: `placeInReach(p: Point, places: Poi[], radius?: number): Poi | null`.

- [ ] **Step 1: Write the failing tests** (set `ZONE_SCALE.forest = 2`, restore after): a `move right` in the forest changes x by 2; in the village by 4; a place 7 percent away is in reach in the forest and one 8 percent away is not (via `placeInReach` with `reachFor("forest")`); interacting with a mushroom 8 percent away only inspects it (not picked), 6 percent away picks it; `codexModel`'s "N steps" hint in the forest counts in 2-percent steps. At scale 1 every existing test passes unchanged.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: walking step and reach are kept in art pixels per zone`.

### Task 4: Camera, view and zoom range for any world size

**Files:**
- Modify: `src/render/world.ts` (`fitStep`, `fitWorld`, `autoZoom`, `zoomLabel`, new `zoomRange`), `src/screens/overworld/MapViewport.tsx` (uses the zone's world; `−` goes down to `min`), `src/screens/overworld/Overworld.tsx` (zoom state may be negative; stored value clamped per zone)
- Test: `src/render/world.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Consumes: `WorldSize`, `zoneWorld`.
- Produces:
  - `fitStep(size: ViewSize, world: WorldSize = WORLD): number` (whole device pixels per art pixel at which `world` fits `size`, at least 1).
  - `fitWorld(size: ViewSize, zoom = 0, focus?: ArtPoint, world: WorldSize = WORLD): WorldRect`: `s = max(1, fitStep(size) + zoom)` where `fitStep(size)` is for the 320 × 180 **screen**, so zoom is always relative to today's scale; the world is centred while it is smaller than the view in a dimension and scrolls with `focus` (clamped to its edges) when larger. `WorldRect.width/height` are the world's size in CSS px.
  - `zoomRange(size: ViewSize, world: WorldSize): { min: number; max: number }`: `max` = `MAX_ZOOM` (3); `min` = `min(0, fitStep(size, world) − fitStep(size))` (0 for a 320 × 180 world, negative for a big one).
  - `zoomLabel(size, zoom)` unchanged (a multiple of the screen fit); `autoZoom` unchanged (never negative).
- MapViewport passes `AREAS[zone].world`, clamps `zoom` to `zoomRange`, disables `−` at `min` and labels it with `zoomLabel`; at `min` the label reads "Whole map".

- [ ] **Step 1: Write the failing tests.** `zoomRange({ width: 1100, height: 540, dpr: 1 }, { width: 640, height: 360 })` has `min` 1 − 3 = −2 (screen fit 3, whole-zone fit 1) and `max` 3, and `{ 320, 180 }` gives `min` 0; `fitWorld(size, 0, { x: 320, y: 180 }, big)` has `s` equal to the 320 × 180 fit and a `left` that centres the focus; at the west edge (`focus.x = 0`) `left` is 0, at the east edge `left = backingWidth − 640·s`; `fitWorld(size, min, undefined, big)` fits the whole zone centred; MapViewport renders a 640 × 360 test zone with `zoom 0` as a scrolling window (world layer `width` = 640 × scale) and with `zoom = min` as the whole zone, with the label "Whole map"; Overworld clamps a stored zoom of −5 to the zone's `min` and a stored zoom of 0 in a small zone stays 0.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.** In MapViewport use a test seam (an optional `world?: WorldSize` prop defaulting to `AREAS[zone].world`) so the test can pass a big world before any real zone is enlarged.
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: the view follows the player in zones larger than a screen, with a Whole map zoom`.

### Task 5: Everything on the map uses the zone's world

**Files:**
- Modify: `src/screens/overworld/MapCanvas.tsx` (`toArt(player, world)`, poses), `src/screens/overworld/MapViewport.tsx` (the two `toArt` uses: `me`, `inWorld`), `src/screens/overworld/mapLayout.ts` (`zoneHitAreas`, `landmarkCaptions`, `mapCaptionRect`, `exitSignBox`, `promptRect` already work from the `WorldRect`; make `LANDMARK_CAPTIONS` points come from the zone modules' own art points), `src/screens/overworld/labelLayout.ts` (uses the world rect's CSS size), `src/render/areas/remedies.ts` (`REMEDY_SPOTS` use each zone's world)
- Test: `src/screens/overworld/mapLayout.test.ts`, `src/screens/overworld/MapCanvas.test.tsx`, `src/screens/overworld/labelLayout.test.ts`

**Interfaces:**
- Consumes: Task 1–4. Produces: `zoneToArt(p: Point, zone: ZoneId): ArtPoint` = `toArt(p, AREAS[zone].world)` exported from `src/render/areas/index.ts`, used by every module that builds art points for one zone.

- [ ] **Step 1: Write the failing tests.** In `mapLayout.test.ts` make the "no caption box intersects another, a landmark or chest drawing…" collision test run per zone at both map sizes using `fitWorld(size, 0, focus, AREAS[zone].world)` (the existing test passes `fitWorld(size)`); add a test that, for a zone with `ZONE_SCALE` 2, every landmark's hit area lies inside the world rect and its centre is at `zoneToArt(point, zone) × scale`; `MapCanvas.test`: the explorer is drawn at `zoneToArt(player, zone)`.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.** Replace the remaining `toArt(` calls in non-small-zone modules with `zoneToArt(…, zone)` or `toArt(…, area.world)`.
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Commit** `refactor: map overlays and canvas place things by the zone's world`.

### Task 6: The mini-map shows the camera's window

**Files:**
- Modify: `src/screens/overworld/MapViewport.tsx` (`onView?: (view: { x: number; y: number; w: number; h: number }) => void`, fractions 0–1 of the zone, reported from an effect when it changes), `src/screens/overworld/Overworld.tsx` (state `view`, passed to `MiniMap`), `src/screens/overworld/MiniMap.tsx` (prop `view?`; draws a 1 px outline rectangle when it is smaller than the whole zone)
- Test: `src/screens/overworld/MiniMap.test.tsx`, `MapViewport.test.tsx`

**Interfaces:** `MiniMap` prop `view?: { x: number; y: number; w: number; h: number } | null`.

- [ ] **Step 1: Write the failing tests.** MapViewport reports `{ x: 0, y: 0, w: 1, h: 1 }` for a zone that fits and the visible fraction (for example `w` ≈ 0.5) for a zoomed big zone; the MiniMap draws no outline for `w = h = 1` and an outline for a smaller window.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement** the callback and the outline (a dashed rectangle over the zone's terrain bake in the existing box).
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: the mini-map outlines what the main map shows`.

### Task 7: Off-screen pings show as edge arrows

**Files:**
- Modify: `src/screens/overworld/MapViewport.tsx` (ping rings already drawn per zone; add an arrow for a ping whose art position lies outside the visible rectangle), `src/screens/overworld/labelLayout.ts` or a new `src/screens/overworld/pingArrow.ts` (pure function `pingArrow(art: ArtPoint, world: WorldRect, map: { width: number; height: number }): { left: number; top: number; angle: number } | null`)
- Test: `src/screens/overworld/pingArrow.test.ts`, `MapViewport.test.tsx`

- [ ] **Step 1: Write the failing tests.** `pingArrow` returns `null` for a point inside the map area, and for a point outside returns a position clamped 12 px inside the map's nearest edge with the angle pointing at the point (cases: left, right, top, bottom, and a corner); MapViewport renders one arrow (role `img`, name "Ping: <name>, off screen") for a ping in a 640 × 360 test zone outside the window and none when it is inside.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: pings outside the camera window show as edge arrows`.

---

## Phase 2 — the Sunny Beach

### Task 8: Enlarge the beach

**Files:**
- Modify: `src/game/zoneSize.ts` (`beach: 2`), `src/render/areas/beach.ts` (rescale), `src/render/scene.ts` (the beach branch: `birds`, `crab`, `pierLife` points, `beachWater`, `tideTiles`/shells), `src/render/areas/remedies.ts` (nothing to change if Task 5 used `zoneToArt`), `README.md`
- Test: `src/render/areas/areas.test.ts`, `src/render/scene.test.ts`, `src/screens/overworld/mapLayout.test.ts`, `src/game/tide.test.ts`

**Interfaces:** consumes everything above. Produces nothing new.

- [ ] **Step 1: Write the failing tests** (they fail once `ZONE_SCALE.beach = 2` is set at the top of the step): `AREAS.beach.world` is 640 × 360; every beach prop and shell lies inside the reachable rectangle's surroundings; the sea starts at x ≥ 606 and y < 20 (terrain test); the pier's lanterns, rowboat and fishing line stand on the planks (their art points inside the pier's box); the crab's lane spans the whole width (`x` reaches past 320 at some `t`); the gulls cross the whole width; the tide strips and tide shells follow the sea edge (`TIDE_SHELLS` x ≥ 590); every beach place's hit area is inside the world and none collide (the mapLayout collision test, now at 2×); entering the beach from the forest (percent row 70) puts the camera on that row; a saved game in the beach resumes at the same percent position.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.** Set `beach: 2`. In `beach.ts` define the layout in the existing 320 × 180 numbers and scale with `up = (p) => ({ x: p.x * 2, y: p.y * 2 })` / `upRect` for: `PROPS` literals (umbrellas, boat, palms), `BEACH_SHELLS`, `TIDE_SHELLS`, `PATHS`, `MOUTH`, `CORRIDOR` (the mouth stays at percent rows 62–78, so `MOUTH` is y 224–288), the sea edge in `terrainAt` (`x ≥ 606`, `y < 20`), `crabLane`; places derived from percent (`toArt(FISHER)` and the rest) use `zoneToArt`. Add a few extra props along the paths (two palms, two rocks, a driftwood log) so the empty spaces read as a beach; keep them in `PROPS` so they are protected and tested. `README.md`: replace the beach's one-screen description with the bigger area and the camera.
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Browser check.** Build, preview and drive a Playwright script that enters the beach, walks the length of it, zooms to Whole map and takes screenshots (default view, Whole map, phone portrait 390 × 844, phone landscape 740 × 360); look at each image; also measure the frame time of 120 frames (`performance.now` around `requestAnimationFrame`) at the default view and compare with the forest (still 1×); the average frame time must be within 25% of the forest's.
- [ ] **Step 6: Commit** `feat: the Sunny Beach is 2 × 2 screens`.

---

## Phase 3 — the Sunbaked Desert

### Task 9: Enlarge the desert

**Files:**
- Modify: `src/game/zoneSize.ts` (`desert: 2`), `src/render/areas/desert.ts`, `src/render/scene.ts` (the desert branch: `desertAir`, `desertSky`, `vultures`, `tumbleweed` path width, `stormStrength` unchanged), `README.md`
- Test: same files as Task 8 plus `src/game/desertLore.test.ts`

- [ ] **Step 1: Write the failing tests:** world 640 × 360; the scorpion, camel, snake and fennec pose zones (`DESERT_WILDLIFE`) and the lizard's rock lie inside the area, inside the reachable part, away from every place and from each other's box; the tumbleweed crosses the full width; the vultures circle the whole width; sand, heat haze, mirage and sparkle effects cover the whole area; jars, remedy and lore places keep their percent positions and every hit area is inside the world and collision-free at both map sizes; the storm tint still covers the whole view.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement** with the same method as Task 8 (define in 320 × 180 numbers and scale ×2: `PROPS`, `PATHS`, `MOUTH`, `lizardRock`, `DESERT_WILDLIFE` homes and zones, `vultures` centres and radii, `tumbleweed` line `y = 160 → 320`); add a few extra props (two cacti groups, a dune arch, a camel skull) in `PROPS`.
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Browser check** as in Task 8 (default, Whole map, phone portrait and landscape); frame time within 25% of the forest's.
- [ ] **Step 6: Commit** `feat: the Sunbaked Desert is 2 × 2 screens`.

---

## Phase 4 — the Dense Forest

### Task 10: Enlarge the forest

**Files:**
- Modify: `src/game/zoneSize.ts` (`forest: 2`), `src/render/areas/forest.ts`, `src/render/scene.ts` (the forest branch: `forestLeaves`, `forestAir`, the owl's branch point, `FOREST_WILDLIFE` poses, mushroom and campfire light), `README.md`
- Test: same as Task 8 plus `src/game/forestLore.test.ts`

- [ ] **Step 1: Write the failing tests:** world 640 × 360; the oak, campfire, ranger, signpost, lore landmarks and mushrooms keep their percent positions and their art points are `zoneToArt` of them; `FOREST_WILDLIFE` zones inside the reachable part and clear of places; falling leaves and fireflies cover the whole area; the three forest mouths (west, east, north gap) are at their percent rows/columns and their corridors stay clear of decorations; the hedge surrounds the whole area; every forest place's hit area is inside the world and collision-free at both map sizes; the campfire glow and flame still follow day/night (Task: day/night tests keep passing).
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement** with the same method (scale `PROPS`, `PATHS`, `MOUTHS`/`CORRIDORS`, wildlife homes/zones, owl, leaves and fireflies lanes ×2); add extra props along the trail (two logs, a stump, ferns).
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Browser check** as in Task 8, plus walking forest → beach and forest → desert to check the arrival rows and the camera.
- [ ] **Step 6: Commit** `feat: the Dense Forest is 2 × 2 screens`.

---

## Phase 5 — hidden spots

### Task 11: Secrets: data, state and rules

**Files:**
- Create: `src/game/secrets.ts`
- Modify: `src/game/types.ts` (`SecretId`, `PoiId` includes it, `GameState.secrets`), `src/game/reducer.ts` (`initialState.secrets = []`, interact), `src/game/zones.ts` (places per zone), `src/game/geometry.ts` (verbs), `src/game/cards.ts` (cards), `src/game/constants.ts` (log lines)
- Test: `src/game/secrets.test.ts`, `src/game/reducer.test.ts`, `src/game/zones.test.ts`

**Interfaces:**
- Produces: `SecretId` = `"secret-moss" | "secret-den" | "secret-cave" | "secret-ridge" | "secret-pool" | "secret-bottle"`; `SECRETS: Array<Poi & { id: SecretId; zone: ZoneId; label: string; text: string; heal: boolean }>` in the order forest, desert, beach with the first of each zone `heal: true`; `isSecret(id: PoiId): id is SecretId`; `secretsIn(zone)`; `GameState.secrets: SecretId[]`.
- Rules: Interact beside a secret (within `reachFor(zone)`) records it in `secrets` once, logs `Found <label>.` plus the card text's first sentence, and, for `heal: true`, heals `REMEDY_HEAL` hearts when hurt (a full-health find gives no heal and does not return it later); from farther away the map button only shows the card; a found secret stays on the map, with its card saying you already found it.
- Positions (percent, chosen for far corners of the new part of each area, checked by the collision tests in Task 12): forest `secret-moss` (14, 14), `secret-den` (88, 88); desert `secret-cave` (10, 86), `secret-ridge` (90, 16); beach `secret-pool` (14, 88), `secret-bottle` (86, 16). Card text: one to two sentences each linking the spot to a coding idea (moss: `const` versus `let`; den: a `null` value; cave: a stack trace; ridge: `Array.sort` order; pool: a loop's `break`; bottle: a `return` value).

- [ ] **Step 1: Write the failing tests.** `SECRETS` has six entries, two per zone, each id in `ZONES[zone].places`; interacting beside one sets `secrets`, logs once, heals only the `heal: true` ones and only when hurt; a second interact does not heal or log again; from far away it only inspects; `secrets` defaults to `[]` on an old save (`loadGame` merge) and `visiblePois` keeps a found secret.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Commit** `feat: six hidden spots (rules and data)`.

### Task 12: Secrets: sprites, captions, scene, Codex line

**Files:**
- Modify: `src/render/sprites.ts` (six new sprites `moss`, `fox-den`, `desert-cave`, `dune-ridge`, `tide-pool`, `bottle`, each drawn with `creature()`, on the `SpriteId` union), `src/render/areas/secrets.ts` (new: `SECRET_SPOTS` with `zoneToArt`, per-zone), the three area files' `protected` lists, `src/render/scene.ts` (draw each unfound-or-found secret sprite; found ones draw with a small sparkle pixel), `src/screens/overworld/mapLayout.ts` (captions: `quiet`; the button's caption is hidden unless in reach), `src/screens/overworld/MapViewport.tsx` (buttons per zone, `hideCaption={inRange?.id !== id}`, `peek` off), `src/screens/Codex.tsx` + `src/learn/codexModel.ts` (the line "Secrets found: n/6"), `README.md`
- Test: `src/render/sprites.test.ts`, `src/render/scene.test.ts`, `src/screens/overworld/mapLayout.test.ts`, `src/screens/overworld/MapViewport.test.tsx`, `src/screens/Codex.test.tsx`

- [ ] **Step 1: Write the failing tests.** Each of the six sprites has its declared size and an outlined edge; each is drawn exactly once in its own zone and nowhere else; its hit area is inside the world and collision-free at both map sizes; its caption is hidden until `inRange` and shown then; the Codex shows "Secrets found: 0/6" at the start, "2/6" after two finds, and the line is not shown to a team member for teammates' finds (found spots are personal).
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.** If the collision test finds an overlap with a decoration or prop, move the secret one cell in percent (and update the Task 11 table in the same commit).
- [ ] **Step 4: Run the whole suite; expect green.**
- [ ] **Step 5: Browser check:** walk to each of the six spots in a Playwright script, press `E`, check the card, the log line and the heal; screenshot each.
- [ ] **Step 6: Commit** `feat: sprites, captions and Codex line for the hidden spots`.

---

## Final

### Task 13: Final review and push

- [ ] **Step 1:** `npx tsc -b` and the whole suite; both clean.
- [ ] **Step 2:** Read the branch diff against `claude/trusting-archimedes-64rvrc`'s previous head as a fresh reviewer would; check each Review Focus item has its test; fix findings with a failing test first.
- [ ] **Step 3:** Update `README.md`'s zone descriptions and controls (zoom and Whole map, the camera, the hidden spots) so they match; commit; `git push -u origin claude/trusting-archimedes-64rvrc`.
