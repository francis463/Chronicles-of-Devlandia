# Zones, Dev Village and a Bigger View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The world becomes two zones. Today's map is C++ Peaks, and Dev Village with Ada the villager lies west of it. You walk between them through a gap in the hedge near camp. On desktop the map takes most of the window, so common laptops draw it at 3×.

**Architecture:**
- **Game rules.** A pure zone registry (`src/game/zones.ts`) owns each zone's exit, wall and places. The reducer checks exits before clamping, applies each zone's wall and river, and only accepts places in your zone.
- **Rendering.** It moves today's Peaks data into an `Area` record with a sibling Village area. The terrain functions take an area (defaulting to the Peaks), and the scene, the ground cache and the canvas key everything by zone.
- **Team play.** The zone rides the existing `pos` broadcast. Zone-change notices come only from `pos` messages.
- **Screen.** The overlay layer, the mini-map (two cells) and the panel layout (one left sidebar at `md`) are the last steps.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Vitest 5 (jsdom 29), Playwright (browser check, scratchpad only).

**Spec:** `docs/superpowers/specs/2026-10-08-dev-village-zones-design.md`

## Global Constraints

- **Game coordinates** are percentages of one 320 × 180 screen per zone: x 6–94, y 10–90, steps of 4.
  - Exits: Peaks west edge and Village east edge, y **62–78** inclusive.
  - Arrival: x 94 entering the village, x 6 entering the Peaks, same y.
  - Drone on arrival: (86, y − 2) in the village, (14, y − 2) in the Peaks.
- **Places:**
  - Ada: `{ id: "villager", label: "Ada", x: 34, y: 70 }`
  - Signpost: `{ id: "signpost", label: "Signpost", x: 86, y: 62 }`
- **Copy is verbatim from the spec:**
  - Ada's seven lines.
  - Logs:
    - "Entered Dev Village." and "Entered C++ Peaks."
    - `Ada: "<line>"`
    - "{name} went to Dev Village." and "{name} went to C++ Peaks."
  - Signpost card: "C++ PEAKS → East through the hedge: base camp, the north gate and the frozen river."
  - Captions: "(Dev Village)", "← Dev Village", "C++ Peaks →".
  - Buttons: "[V] Ada", "[P] Signpost".
  - Prompts: "[E] Talk to Ada", "[E] Read Signpost".
  - Header: "REGION: DEV VILLAGE".
- **A button's bracketed letter is a label only**, never W, A, S, D or E.
- **Art:**
  - 320 × 180 per zone. Upright sprites are bottom-centre anchored and y-sorted by feet row, explorers last on ties.
  - Mouths: Peaks {0, 112, 32, 32}, Village {288, 112, 32, 32}. Village props as in the spec's table. Ada's hood is `#b45309`.
  - Only `drawImage` / `fillRect` on canvases.
- **No new dependencies.**
- **TDD:** every new test is run and seen to fail before the code it covers. The exception is tests marked **guard**, which hold before and after.
- **Each commit ends with the two trailer lines:**
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub`.
- **After every task:** `npm test` and `npx tsc -b` are green. `tsc -b` type-checks the tests too.

## Decisions (beyond the spec)

1. **Zone registry shape.** In `src/game/zones.ts`:
   - `Zone = { id: ZoneId; name: string; entered: string; exit: Exit; gate: boolean; places: Poi[]; river: boolean }`
   - `Exit = { edge: "west" | "east"; minY: 62; maxY: 78; to: ZoneId }`
   - `gate: true` means the wall there has the gate's opening (today's `wallBlock`). `false` means every crossing is `"solid"`.
2. **Ada's card copy is not in `INSPECT_COPY`.** It becomes `Record<Exclude<PoiId, "villager">, …>`. MapViewport gets a `villagerLine: string` prop, which Overworld computes with `adaLine(state)`.
3. **One helper names the [E] action:** `promptText(poi)` in `geometry.ts`. `interactLabel` gains "Talk to Ada" and "Read Signpost".
4. **Render areas.**
   - `src/render/areas/area.ts` defines `TerrainKind` (moved; `terrain.ts` re-exports it), `Prop = { sprite: SpriteId; at: ArtPoint; variant?: string }` and `Area`:
     ```ts
     type Area = {
       id: ZoneId;
       terrainAt(x, y): TerrainKind;
       paths: Rect[];
       mouth: Rect;
       corridor: Rect;
       gateBox: Rect | null;
       ice: Rect | null;
       props: Prop[];
       protected: Rect[];
     }
     ```
   - `props` are the static uprights the scene draws. The Peaks has none, because its landmarks depend on state and stay special-cased.
   - `Scene` gains `zone`, and `GroundCache.get(world, zone)` keys on it.
5. **Captions and fixed boxes.**
   - `MAP_CAPTIONS` and `LANDMARK_CAPTIONS` entries gain `zone`. `LANDMARK_CAPTIONS` entries also carry their art `point`.
   - `landmarkCaptions(world, map, state, zone = "peaks")` returns that zone's buttons only.
   - New `exitSignBox(world, zone)` returns the zone's exit sign as fixed-box edges. MapViewport passes both to `labelLayout`.
6. **Zone-change notices.**
   - `useTeamSession` keeps `lastPosZone: Map<id, ZoneId | null>`.
   - When a teammate's `pos` changes from one known zone to another, it notifies `onZoneChange` listeners inside the transport's message callback. The name comes from `knownNames`, falling back to `metas`.
7. **Layout.**
   - At `md` the Panel is a CSS grid with explicit placement (`grid-cols-[14rem_minmax(0,1fr)]`).
   - Its DOM order is the phone order: TopHud, MiniMap, map column, EventLog, BottomHud (inventory), QuestList. So phones need no `order` classes.
   - The quest lines move into a new `QuestList` component.
8. **Fade.** On a zone change, a `key={zone}` cover div sits above the canvas and under the fog. It is `z-[5]`, `pointer-events-none`, `aria-hidden` and `motion-reduce:hidden`, and fades opacity 1 → 0 over 200 ms. The world layer (`key={zone}`) fades 0 → 1. The keyframes `zone-fade` and `zone-in` live in `src/index.css`.

## Review Focus

1. **A held key or the D-pad at the exit** (keyboard repeat about 30/s, touch every 150 ms). It walks through the exit and keeps going into the village, and never bounces back. Pinned in Task 1 ("a held left from camp walks out through the exit and on into the village").
2. **A teammate in the other zone shows nowhere on your map:** no sprite, no label, no label obstacle. They show only in their mini-map cell. Pinned in Task 3 ("a teammate who walks into the village leaves your Peaks map and the log says so") and Task 8 ("puts each dot in its zone's cell").
3. **The zone fade never blocks a click or a key.** The cover is `pointer-events-none` and `aria-hidden`, and sits under the buttons' layer. Pinned in Task 7 ("the zone fade covers the map under the fog, never takes clicks, and is skipped under reduced motion").
4. **A Peaks button clicked the instant you cross, or a crafted action for a place in another zone,** changes nothing. Pinned in Task 2 ("places outside your zone do nothing").
5. **Short windows and phones held sideways** clip nothing, and the page scrolls to the D-pad and the bottom bar. Pinned in Task 10 (browser check at 844 × 390 touch and 1280 × 440).

## File Structure

- `src/game/zones.ts` (new): the zone registry and exit maths.
- `src/game/village.ts` (new): Ada's lines.
- `src/render/areas/area.ts`, `peaks.ts`, `village.ts`, `index.ts` (new): area data and the `AREAS` lookup.
- `src/screens/overworld/QuestList.tsx` (new): the three quest lines.
- Modified:
  - game: `types.ts`, `constants.ts`, `geometry.ts`, `reducer.ts`, `team.ts`
  - hooks: `useGameTimers.ts`, `useKeyboardControls.ts`, `useTeamSession.ts`
  - render: `terrain.ts`, `scene.ts`, `paint.ts`, `sprites.ts`
  - overworld screens: `MapCanvas`, `MapViewport`, `mapLayout`, `MiniMap`, `EventLog`, `BottomHud`, `TopHud`, `Overworld`
  - also `MenuBackdrop`, `App.tsx`, `index.css` and `README.md`
- The tests next to each file.

---

### Task 1: Zones and the way into the village (game rules)

**Files:**
- Create: `src/game/zones.ts`, `src/game/zones.test.ts`
- Modify: `src/game/types.ts` (`GameState.zone`), `src/game/constants.ts` (`LOG.enteredVillage`, `LOG.enteredPeaks`), `src/game/reducer.ts` (`initialState`, `move`, `riverDamage`, `respawn`, new `inRiver`), `src/hooks/useGameTimers.ts` (draining)
- Test: `src/game/reducer.test.ts`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Produces:
  - `export type ZoneId = "peaks" | "village";`
  - `export type Exit = { edge: "west" | "east"; minY: number; maxY: number; to: ZoneId };`
  - `export type Zone = { id: ZoneId; name: string; entered: string; exit: Exit; gate: boolean; places: Poi[]; river: boolean };`
  - `export const ZONES: Record<ZoneId, Zone>`:
    - peaks: name "C++ Peaks", entered `LOG.enteredPeaks`, exit `{ edge: "west", minY: 62, maxY: 78, to: "village" }`, `gate: true`, places `POIS`, `river: true`
    - village: name "Dev Village", entered `LOG.enteredVillage`, exit `{ edge: "east", minY: 62, maxY: 78, to: "peaks" }`, `gate: false`, places `[]` (Task 2 fills it), `river: false`
  - `export function exitFor(zone: ZoneId, from: Point, to: Point): Exit | null`: the zone's exit when `to.x` is beyond its edge (west: `< BOUNDS.minX`; east: `> BOUNDS.maxX`), `to.y === from.y`, and `from.y` is inside the span. Otherwise `null`.
  - `export function arrival(exit: Exit, y: number): { player: Point; drone: Point }`
    - west exit: player `{ x: BOUNDS.maxX, y }`, drone `{ x: BOUNDS.maxX - 8, y: y - 2 }`
    - east exit: player `{ x: BOUNDS.minX, y }`, drone `{ x: BOUNDS.minX + 8, y: y - 2 }`
  - `GameState.zone: ZoneId`; `initialState.zone = "peaks"`
  - `export const inRiver = (s: GameState): boolean => ZONES[s.zone].river && isInRiver(s.player)` in `reducer.ts`

- [ ] **Step 1: Write the failing tests.**
  - `src/game/zones.test.ts`, describe `zones`:
    - `"every exit has a matching exit back on the opposite edge, with the same span"`: for each zone `z`, `ZONES[z.exit.to].exit.to === z.id`, the edges differ, and minY and maxY are equal.
    - `"every arrival point is even, inside the bounds, south of the wall and outside the river"`: for each exit and each even y in 62…78, `arrival(exit, y).player` has even x and y, is inside BOUNDS, has y > 49 and `!isInRiver`. The drone is inside BOUNDS too.
    - `"exitFor: only a horizontal step off the exit edge inside the span"`:
      - `exitFor("peaks", {x:6,y:72}, {x:2,y:72})?.to` is `"village"`
      - `exitFor("peaks", {x:8,y:62}, {x:4,y:62})?.to` is `"village"`
      - `exitFor("peaks", {x:6,y:60}, {x:2,y:60})` is null
      - `exitFor("peaks", {x:8,y:80}, {x:4,y:80})` is null
      - `exitFor("peaks", {x:6,y:72}, {x:6,y:68})` is null
      - `exitFor("village", {x:94,y:72}, {x:98,y:72})?.to` is `"peaks"`
      - `exitFor("village", {x:6,y:72}, {x:2,y:72})` is null
  - `reducer.test.ts`, new describe `gameReducer: zones`. Any village state kept in a const (the `toBe` checks need one) is annotated `: GameState`, like `opened` at reducer.test.ts:9. An unannotated `{ ...s0, zone: "village" }` gets `zone: string` and fails `tsc -b`.
    - `"left from (6, 72) in the Peaks enters the village at (94, 72)"`: from `{ ...s0, player: {x:6,y:72}, inspected: "gate", stamina: 50 }`, move left gives zone `"village"`, player (94,72), drone (86,70), stamina 49, inspected null, and last log "Entered Dev Village.".
    - `"right from (94, 72) in the village enters the Peaks at (6, 72)"`: zone `"peaks"`, player (6,72), drone (14,70), and last log "Entered C++ Peaks.".
    - `"the exit spans y 62–78: (6, 62) and (8, 68) leave; (6, 60), (8, 80) and (6, 50) stay clamped"`:
      - The leaving cases end in zone "village".
      - The staying cases end in zone "peaks" with x 6.
    - `"vertical steps at an edge never change zones"`: (6,72) up and down stay in the Peaks.
    - `"a held left from camp walks out through the exit and on into the village"`: 7 × left from s0 gives zone "village", player (90,72).
    - `"respawn returns to camp in the Peaks"`: from `{ ...s0, zone: "village", hp: 0, player: {x:60,y:70} }` gives zone "peaks" and player (28,72).
    - `"the village wall is solid whether or not the gate is open, and logs once"`:
      - `{ ...s0, zone: "village", player: {x:30,y:52} }` and the same with `gateUnlocked: true`: up leaves the player in place, stamina is unchanged, and the last log is LOG.wallSolid.
      - A second up returns the same object (`toBe`).
    - `"the river does nothing in the village"`:
      - `riverDamage` on `{ ...s0, zone: "village", player: {x:50,y:33} }` returns the same object.
      - Moving up from `{ ...s0, zone: "village", player: {x:50,y:37} }` keeps `questComplete` false.
  - Rewrite `"the gate is the only way north (reachability)"`:
    - The search walks states `{ zone, player }`, keyed by `` `${zone},${x},${y}` ``. Each step computes `gameReducer({ ...s0, gateUnlocked, zone: p.zone, player: p.player }, move)` and reads `.zone` and `.player`.
    - Locked:
      - no reachable point with y < 49 in either zone;
      - tower, chest and river are out of reach, and gate and artifact are in reach, judged on Peaks points only;
      - some village point is reached.
    - Open:
      - every Peaks POI and the artifact are in reach (Peaks points);
      - every crossing step is in the Peaks, and `new Set(crossings.map(c => c.x))` equals `{48, 50, 52}`;
      - no village point has y < 49.
  - `Overworld.test.tsx`, describe `Overworld timers`: `"the village has no cold"`. With `initial={{ zone: "village", player: { x: 50, y: 33 } }}`, advance 3600 ms; the HP meter is still `"100"`.
- [ ] **Step 2: Run** `npx vitest run src/game/zones.test.ts src/game/reducer.test.ts src/screens/overworld/Overworld.test.tsx`. Expected: zones.test fails to resolve `./zones`; the new reducer and Overworld tests FAIL; everything else PASSES.
- [ ] **Step 3: Implement** per the Produces block.
  - `move`, after the downed/modal guard:
    1. `target` = position + delta × STEP;
    2. `const exit = exitFor(state.zone, state.player, target)`. If there is one, return `pushLog({ ...state, zone: exit.to, ...arrival(exit, state.player.y), inspected: null, stamina: max(0, stamina − 1) }, ZONES[exit.to].entered)`;
    3. otherwise clamp;
    4. `block = ZONES[state.zone].gate ? wallBlock(from, to, gateUnlocked) : crossesWall(from, to) ? "solid" : null`;
    5. the river quest check uses `inRiver({ ...state, player })`.
  - `riverDamage` uses `inRiver(state)`. `respawn` adds `zone: "peaks"`.
  - `useGameTimers`: `draining = !paused && !state.towerPowered && inRiver(state)`.
  - `LOG.enteredPeaks = "Entered C++ Peaks."` and `LOG.enteredVillage = "Entered Dev Village."`. `INITIAL_LOGS[0]` stays the literal "Entered C++ Peaks." (it already matches). Referencing `LOG` there would be a use-before-declaration: TS2448, and a TDZ error at load.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(game): zones, and the way west into Dev Village`.

### Task 2: Ada, the signpost and places per zone

**Files:**
- Create: `src/game/village.ts`, `src/game/village.test.ts`
- Modify:
  - `src/game/types.ts`: `PoiId` gains `"villager" | "signpost"`
  - `src/game/constants.ts`: `ADA`, `SIGNPOST`, `INSPECT_COPY` type and signpost entry
  - `src/game/zones.ts`: village places `[ADA, SIGNPOST]`
  - `src/game/geometry.ts`: `placeInReach`, `interactLabel`, `promptText`
  - `src/game/reducer.ts`: `visiblePois`, `interact`
  - `src/hooks/useKeyboardControls.ts`: [E]
  - `src/screens/overworld/Overworld.tsx`: `inRange`
  - `src/screens/overworld/MapViewport.tsx`: prompt text, INSPECT_COPY lookup guard
- Test: `src/game/geometry.test.ts`, `src/game/reducer.test.ts`, `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`ZONES`, `GameState.zone`).
- Produces:
  - `export const ADA: Poi = { id: "villager", label: "Ada", x: 34, y: 70 };` and `export const SIGNPOST: Poi = { id: "signpost", label: "Signpost", x: 86, y: 62 };` in `constants.ts`
  - `INSPECT_COPY: Record<Exclude<PoiId, "villager">, …>` with `signpost: { default: "C++ PEAKS → East through the hedge: base camp, the north gate and the frozen river." }`
  - `export function adaLine(s: Pick<GameState, "gateUnlocked" | "towerPowered" | "questComplete" | "hasLoot" | "clueDecoded" | "artifactFound">): string`: the spec's stage table, in its order, verbatim
  - `export function placeInReach(p: Point, places: Poi[]): Poi | null`: nearest within `INTERACT_RADIUS`, earlier entry on ties, null for `[]`
  - `interactLabel(poi)`: "Dig here" for artifact, "Talk to Ada" for villager, "Read Signpost" for signpost, otherwise `poi.label`
  - `export const promptText = (poi: Poi): string`: `[E] ${interactLabel(poi)}` for artifact, villager and signpost; `[E] Inspect ${poi.label}` otherwise
  - `export const visiblePois = (s: GameState): Poi[] => [...ZONES[s.zone].places, ...(s.zone === "peaks" ? revealedPois(s) : [])]` in `reducer.ts`
  - `nearestPoi` and `poiInRange(p, extra)` are unchanged (POIS stays the Peaks' four).

- [ ] **Step 1: Write the failing tests.**
  - `geometry.test.ts`:
    - `"placeInReach finds the nearest place within reach, or nothing (also for no places)"`:
      - `placeInReach({x:34,y:72}, [ADA, SIGNPOST])?.id` is `"villager"`
      - `placeInReach({x:90,y:66}, [ADA, SIGNPOST])?.id` is `"signpost"`
      - `placeInReach({x:60,y:80}, [ADA, SIGNPOST])` is null
      - `placeInReach({x:34,y:72}, [])` is null
    - `"interactLabel and promptText name what [E] does"`: ADA gives "Talk to Ada" / "[E] Talk to Ada"; SIGNPOST gives "Read Signpost" / "[E] Read Signpost"; the gate gives "Terminal Gate" / "[E] Inspect Terminal Gate"; HIDDEN_ARTIFACT gives "Dig here" / "[E] Dig here".
  - `village.test.ts`: `"adaLine gives the line of the first stage not done"`, with seven cases built on `initialState`. Each step sets one more flag, in order: gateUnlocked, towerPowered, questComplete, hasLoot, clueDecoded, artifactFound. Each expects the spec's line verbatim.
  - `reducer.test.ts`, describe `gameReducer: places and talking` (village consts annotated `: GameState`, as in Task 1):
    - `"visiblePois: your zone's places, plus the dig spot in the Peaks once revealed"`:
      - s0 gives the ids `["gate","chest","river","tower"]`;
      - `{ ...s0, zone: "village", clueDecoded: true }` gives `["villager","signpost"]`;
      - `{ ...s0, clueDecoded: true }` ends with `"artifact"`.
    - `"places outside your zone do nothing"`:
      - `gameReducer({ ...s0, zone: "village" }, interact gate)` is `toBe` its input;
      - so are tower and chest;
      - so is `gameReducer(s0, interact villager)`.
    - `"talking to Ada opens her card and logs her line once"`:
      - village state: inspected "villager", last log `Ada: "Heading north? The gate's terminal wants one CSS fix. Get the display right and the wall lets you through."`;
      - talking again adds nothing: with `twice = gameReducer(once, interact villager)`, `twice.logCount` equals `once.logCount` and `twice` `toEqual` `once`. Not `toBe`: the branch spreads a new object.
    - `"Ada's line follows your progress"`: with `gateUnlocked: true` the last log is the tower line.
    - `"the signpost opens its card and logs nothing"`: inspected "signpost"; logCount unchanged.
  - `Overworld.test.tsx`, describe `Overworld village`:
    - `"in the village [E] talks to Ada"`: `initial={{ zone: "village", player: { x: 34, y: 72 } }}`.
      - `getAllByText("[E] Talk to Ada")` has length 2 (prompt and touch button).
      - Pressing `e` puts `Ada: "Heading north?…"` (exact) in the event log.
    - `"by the signpost [E] reads it"`: `initial={{ zone: "village", player: { x: 90, y: 66 } }}` gives `getAllByText("[E] Read Signpost")` with length 2.
    - `"in the village the Peaks' places are out of reach"`: `initial={{ zone: "village", player: { x: 50, y: 58 } }}` gives `queryByText(/\[E\] Inspect/)` null.
- [ ] **Step 2: Run** `npx vitest run src/game src/screens/overworld/Overworld.test.tsx`. Expected: the new tests FAIL (village.ts is missing, placeInReach and promptText are undefined); the existing ones PASS.
- [ ] **Step 3: Implement** per the Produces block.
  - `interact`, after the downed/modal guard: `if (!visiblePois(state).some((p) => p.id === action.poi)) return state;` (the dig-spot guard stays). Then the north guard as today.
  - Then:
    - `villager` gives `pushLogOnce({ ...state, inspected: "villager" }, \`Ada: "${adaLine(state)}"\`)`;
    - `signpost` gives `{ ...state, inspected: "signpost" }`;
    - the river becomes an explicit branch, so nothing falls through.
  - `useKeyboardControls` [E] and `Overworld` `inRange` use `placeInReach(player, visiblePois(state))`.
  - MapViewport:
    - import the helper as `promptText as promptFor` (MapViewport already has a local `promptText`);
    - `const promptText = inRange ? promptFor(inRange) : "";` (drop `interactLabel` from the import if unused);
    - line 211 becomes `const copy = inspected && inspected !== "villager" ? INSPECT_COPY[inspected] : null;`. INSPECT_COPY no longer has a villager key, and Ada's card text arrives in Task 7 through `villagerLine`. Without this, `tsc -b` fails with TS7053.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(game): Ada, the signpost, and places that answer only in their zone`.

### Task 3: Teammates' zones

**Files:**
- Modify:
  - `src/game/team.ts`: `PresenceMeta.zone`, `pos.zone`, `parseZone`
  - `src/hooks/useTeamSession.ts`: `Teammate.zone`, positions, `publishPosition`, `onZoneChange`
  - `src/screens/overworld/Overworld.tsx`: publish the zone, filter the map's teammates, log zone changes
- Test:
  - `src/game/team.test.ts`
  - `src/hooks/useTeamSession.test.tsx`
  - `src/net/memoryTransport.test.ts`, `broadcastTransport.test.ts`, `supabaseTransport.test.ts`, `makeTransport.test.ts`
  - `src/screens/TeamLobby.test.tsx`
  - `src/screens/overworld/TeamOverworld.test.tsx`
  - the `MapViewport.test.tsx` and `MiniMap.test.tsx` teammate literals

**Interfaces:**
- Consumes: Task 1 (`ZoneId`, `ZONES`).
- Produces:
  - `PresenceMeta.zone: ZoneId | null` and `TeamMessage` pos `{ type: "pos"; id; x; y; zone: ZoneId | null }`.
  - Parsing: missing (`undefined`) gives `"peaks"`, `"peaks"`/`"village"` give themselves, anything else gives `null`. A presence or pos is never rejected because of the zone.
  - `Teammate = { id; name; color; x; y; zone: ZoneId | null }`.
  - `publishPosition(x: number, y: number, zone: ZoneId): void`. `me.current` is seeded with `zone: "peaks"`. `sendPos` sends `zone`.
  - `onZoneChange(cb: (name: string, zone: ZoneId) => void): () => void`, on `TeamSession`.

- [ ] **Step 1: Write the failing tests, and update the existing ones.**
  - Existing tests that change:
    - **team.test:**
      - `meta()` gains `zone: "peaks"`;
      - in "parses the three message types…", the pos expectation becomes `{ type: "pos", id: "a", x: 50, y: 50, zone: "peaks" }`.
    - **Transport tests:** every pos literal and exact pos expectation gains `zone: "peaks"`:
      - memoryTransport.test lines 28, 29, 74 and 88;
      - broadcastTransport.test lines 56–58;
      - supabaseTransport.test lines 156, 157, 160, 161, 190, 194 and 197.
    - **Meta fixtures** gain `zone: "peaks"`:
      - memory, broadcast and supabase `meta()` (already typed `PresenceMeta`);
      - makeTransport.test `me` and TeamLobby.test `me` are unannotated, so a bare literal widens to `string` and fails tsc. Type them `const me: PresenceMeta = …` (import the type from `../game/team`) and `const me: RankedPlayer = …`.
    - **The TeamLobby.test stub** gains `onZoneChange: vi.fn(() => () => {})`.
    - **useTeamSession.test:**
      - every `publishPosition(x, y)` gains `"peaks"` (lines 188, 259, 274, 288, 295);
      - "publishPosition moves the teammate for the others" expects `zone: "peaks"` in the teammate.
    - **Teammate literals** in MapViewport.test and MiniMap.test gain `zone: "peaks"`.
  - New tests:
    - team.test `"zones are parsed leniently and never drop a teammate"`:
      - `parsePresence({ ...meta("a",1), zone: undefined }, NOW)?.zone` is `"peaks"`, for `"village"` it is `"village"`, for `"marsh"` it is null, and the meta is kept;
      - `parseMessage({ type:"pos", id:"a", x:50, y:50, zone: 7 }, NOW)` is `{ …, zone: null }`.
    - useTeamSession.test, in `useTeamSession: in game`, with `vi.useFakeTimers()`:
      - `"publishPosition carries the zone to teammates"`: Ana calls `publishPosition(40, 60, "village")`; after `POS_INTERVAL_MS`, Kai's teammate Ana has `zone: "village"`.
      - `"reports a teammate's zone change from their position updates only, never on first sight"`. A raw hub member stands in for a teammate, so presence really arrives before the first `pos`; with real hooks the memory hub delivers a `pos` first.
        1. `const gil = hub.transport(); await act(() => gil.join(room, { id: "gil", name: "Gil", joinedAt: Date.now() + 1000, startedAt: kai.result.current.startedAt, flags: NO_FLAGS, x: 94, y: 72, zone: "village" }))`. Kai's teammates now show Gil in the village, from presence.
        2. Subscribe `seen = vi.fn()` on Kai through `onZoneChange`.
        3. `hub.inject(room, { type: "pos", id: "gil", x: 6, y: 72, zone: "peaks" })`. Expect `seen` not called: this is first sight.
        4. `hub.inject(room, { type: "pos", id: "gil", x: 94, y: 72, zone: "village" })`. Expect `seen` called once with `("Gil", "village")`.
        - This fails on a hook that seeds its baseline from presence.
      - `"a change to or from an unknown zone reports nothing"`:
        1. With Gil as above, and his first `pos` already seen in the Peaks: `hub.inject(room, { type: "pos", id: "gil", x: 50, y: 70, zone: "marsh" })`, then the same with `"village"`. Expect `seen` not called.
        2. Then with `"peaks"`. Expect it called once.
    - TeamOverworld.test `"a teammate who walks into the village leaves your Peaks map and the log says so"`:
      - Kai clicks "Move left" six times, then `act(() => vi.advanceTimersByTime(POS_INTERVAL_MS * 2))`.
      - In Ana's view, `queryByTestId("teammate-Kai")` is null.
      - `countIn(logText(ana), "Kai went to Dev Village.") === 1`.
- [ ] **Step 2: Run** `npx vitest run src/game/team.test.ts src/hooks src/net src/screens/TeamLobby.test.tsx src/screens/overworld/TeamOverworld.test.tsx`. Expected: the new tests FAIL. The updated existing tests also FAIL until `zone` exists; that is expected.
- [ ] **Step 3: Implement** per the Produces block.
  - Add `parseZone(v: unknown): ZoneId | null` (private) in team.ts.
  - The pos action and `State.positions` carry `zone`. Teammates fall back to `{ x: p.x, y: p.y, zone: p.zone }`.
  - `lastPosZone` ref:
    - set on every pos from others;
    - notify when the previous value exists, both values are non-null, and they differ;
    - clear it in `teardown`;
    - keep listeners in `zoneCbs`, like `rosterCbs`.
  - Overworld:
    - `useEffect(() => publishPosition?.(x, y, state.zone), [publishPosition, state.player, state.zone])`;
    - `useEffect(() => onZoneChange?.((name, zone) => dispatch({ type: "note", text: \`${name} went to ${ZONES[zone].name}.\` })), [onZoneChange])`;
    - MapViewport gets `team?.teammates.filter((t) => t.zone === state.zone)`;
    - MiniMap keeps getting all teammates (Task 8 places them by zone).
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(team): teammates' zones, and a log line when one changes zone`.

### Task 4: Village sprites

**Files:**
- Modify: `src/render/sprites.ts` (`SpriteId` gains `"hut" | "well" | "fence" | "signpost"`)
- Test: `src/render/sprites.test.ts`

**Interfaces:**
- Produces: four bottom-anchored, one-frame sprites. The grids are below and every row has exactly the stated width.

```
hut 32×24  palette { o: "#0b1020", R: "#c2410c", r: "#9a3412", w: "#d6b98c", W: "#b08d5e", d: "#5b3a1e", D: "#fbbf24", g: "#fde68a", k: "#64748b" }
..............oooo..............
............ooRRRRoo............
..........ooRRrrrrRRoo..........
........ooRRrrrrrrrrRRoo........
......ooRRrrrrrrrrrrrrRRoo......
....ooRRrrrrrrrrrrrrrrrrRRoo....
..ooRRrrrrrrrrrrrrrrrrrrrrRRoo..
ooRRrrrrrrrrrrrrrrrrrrrrrrrrRRoo
oooooooooooooooooooooooooooooooo
..owwwwwwwwwwwwwwwwwwwwwwwwwwo..
..owwoooowwwwoooooowwwwoooowwo..
..owwoggowwwwoddddowwwwoggowwo..
..owwoggowwwwoddddowwwwoggowwo..
..owwoooowwwwodddDowwwwoooowwo..
..owwwwwwwwwwoddddowwwwwwwwwwo..
..oWWWWWWWWWWoddddoWWWWWWWWWWo..
..oWWWWWWWWWWoddddoWWWWWWWWWWo..
..oWWWWWWWWWWoddddoWWWWWWWWWWo..
..oWWWWWWWWWWoddddoWWWWWWWWWWo..
..oWWWWWWWWWWoddddoWWWWWWWWWWo..
..oWWWWWWWWWWoddddoWWWWWWWWWWo..
.okkkkkkkkkkkkkkkkkkkkkkkkkkkko.
.okkkkkkkkkkkkkkkkkkkkkkkkkkkko.
..oooooooooooooooooooooooooooo..

well 16×16  palette { o: "#0b1020", T: "#9a5f2b", t: "#7c4a1e", s: "#94a3b8", S: "#64748b", b: "#38bdf8", B: "#0369a1" }
................
...oooooooooo...
..oTTTTTTTTTTo..
.oTTTTTTTTTTTTo.
.oooooooooooooo.
...ot......to...
...ot......to...
...ot..oo..to...
...ot..oo..to...
..oooooooooooo..
.oBbbbbbbbbbbBo.
.osssssssssssso.
.oSsSsSsSsSsSso.
.osssssssssssso.
.oSSSSSSSSSSSSo.
..oooooooooooo..

fence 16×8  palette { o: "#0b1020", f: "#b07a45", F: "#8f5f33" }
...oo......oo...
..offo....offo..
oooffooooooffooo
fffFFffffffFFfff
oooffooooooffooo
..offo....offo..
..oFFo....oFFo..
..oooo....oooo..

signpost 16×16  palette { o: "#0b1020", b: "#d6b98c", B: "#b08d5e", a: "#334155", p: "#7c4a1e", P: "#9a5f2b" }
................
................
.oooooooooooo...
.obbbbbbbbbbbo..
.obbbbbbbbabbbo.
.obaaaaaaaaabbbo
.obbbbbbbbabbbo.
.oBBBBBBBBBBBo..
.oooooooooooo...
......opo.......
......oPo.......
......opo.......
......oPo.......
......opo.......
......oPo.......
.....ooooo......
```

- [ ] **Step 1: Write the failing test.** In `sprites.test.ts`, `"village sprites: hut 32×24, well 16×16, fence 16×8, signpost 16×16, bottom-anchored, one frame"`:
  - each one's `w`, `h`, anchor and `frames.length === 1`;
  - `spriteBox("hut", {x:56,y:116})` is `{40,93,32,24}`;
  - `spriteBox("signpost", {x:275,y:112})` is `{267,97,16,16}`.
  - The existing "every grid is rectangular, of its declared size, and uses only palette characters" covers the grids.
- [ ] **Step 2: Run** `npx vitest run src/render/sprites.test.ts`. Expected: the new test FAILS.
- [ ] **Step 3: Implement** the four entries (key order w, h, anchor, palette, frames).
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(render): hut, well, fence and signpost sprites`.

### Task 5: Areas — the village's terrain and the exits

**Files:**
- Create: `src/render/areas/area.ts`, `src/render/areas/peaks.ts`, `src/render/areas/village.ts`, `src/render/areas/index.ts`
- Modify: `src/render/terrain.ts` (re-exports, `area` parameters, hedge gaps, corridors, per-area memo)
- Test: `src/render/terrain.test.ts`, new `src/render/areas/areas.test.ts`

**Interfaces:**
- Consumes: Task 1 `ZoneId`, Task 2 `ADA` / `SIGNPOST`, Task 4 sprites.
- Produces:
  - `area.ts`: `TerrainKind`, `Prop`, `Area` (Decision 4).
  - `peaks.ts`: `PEAKS: Area` with:
    - today's `terrainAt`;
    - `paths`: today's three PATH_RECTS plus `{ x: -1003, y: 127, w: 1096, h: 6 }`;
    - `mouth { x: 0, y: 112, w: 32, h: 32 }` and `corridor { x: -1000, y: 112, w: 1000, h: 32 }`;
    - `gateBox`: the gate's sprite box; `ice: ICE_RECT`; `props: []`;
    - `protected`: today's `protectedBoxes()` list plus the mouth and the new path rect.
  - It also exports today's constants (`ICE_RECT`, `BRIDGE_RECT`, `PATH`, `PATH_WIDTH`, `LANDMARK_POINTS`), which terrain.ts re-exports.
  - `village.ts`: `VILLAGE: Area` and `VILLAGE_POINTS = { villager: { x: 109, y: 126 }, signpost: { x: 275, y: 112 } }`, with:
    - `terrainAt`: mountains for y < 16, snow for y < 83, otherwise meadow;
    - `paths`: `[{ x: 97, y: 127, w: 1226, h: 6 }, { x: 96, y: 116, w: 80, h: 44 }]`;
    - `mouth { x: 288, y: 112, w: 32, h: 32 }` and `corridor { x: 320, y: 112, w: 1000, h: 32 }`;
    - `gateBox: null`; `ice: null`;
    - `props`, in order: huts (56,116), (176,116), (88,162); well (150,156); fences (184,150), (200,150), (216,150); signpost (275,112); `{ sprite: "explorer-down", at: (109,126), variant: "#b45309" }`;
    - `protected`: the paths, the mouth and every prop's sprite box.
  - `index.ts`: `export const AREAS: Record<ZoneId, Area> = { peaks: PEAKS, village: VILLAGE };`
  - terrain.ts:
    - `terrainAt(x, y, area = PEAKS)`, `onPath(x, y, area = PEAKS)` (any `area.paths` rect), `protectedBoxes(area = PEAKS)`;
    - `wallTiles(range, area = PEAKS)` skips tiles intersecting `area.gateBox` when it is set;
    - `decorations(range, area = PEAKS)`: memo and guarded boxes per area id. The barrier piece is left out when its box intersects `area.mouth`. Scenery outside the world is left out when its box intersects `area.corridor`. The snow-rock choice uses the area's terrain.

- [ ] **Step 1: Write the failing tests, and change one.**
  - Change the terrain.test `"barrier decorations lie outside REACHABLE_RECT, and the barrier closes the sides and bottom"`:
    - It runs for both areas, using `decorations(VIEW, area)`.
    - The bottom stays covered.
    - On the exit side, `covers(x, y)` is false for y 112–143 (step 4 from 112) and true for every other y in 24–170.
    - The other side stays covered everywhere.
    - x is 9 for the Peaks' left side and 311 for the village's right side.
  - New in terrain.test:
    - `"no scenery stands in the corridor beyond an exit"`: no decoration of `decorations(VIEW, PEAKS)` with `box.x + box.w <= 0` intersects the Peaks corridor; the same for the village with `box.x >= 320`.
    - `"the Peaks' path runs west out of the map"`: onPath(−1003,127) and onPath(92,132) are true; onPath(0,133) and onPath(0,126) are false. The existing path pins are unchanged.
    - `"the village: bands, its dirt square and its path"`:
      - `terrainAt(10,15,VILLAGE)` is mountains, `(10,82)` snow, `(10,83)` meadow, `(250,150)` meadow;
      - `onPath(100,120,VILLAGE)`, `onPath(175,159,VILLAGE)`, `onPath(176,130,VILLAGE)` and `onPath(330,130,VILLAGE)` are true;
      - `onPath(176,159,VILLAGE)` and `onPath(200,140,VILLAGE)` are false.
    - `"the village wall has 20 tiles and no gate"`: `wallTiles(WALL_RECT, VILLAGE).map(t => t.x)` equals 8 + 16k for k 0–19.
    - `"village decorations stay clear of its protected boxes, even after the Peaks were computed"`:
      1. Call `decorations(REACHABLE_RECT, PEAKS)` first.
      2. Then every interior decoration of `decorations(VIEW, VILLAGE)` has its 4-px-grown box clear of `protectedBoxes(VILLAGE)`. Trees are ≥ 24 px apart, and none touches the wall band.
  - `areas.test.ts`, `"village art points are the game places' art points"`: `VILLAGE_POINTS.villager` equals `toArt(ADA)`, `VILLAGE_POINTS.signpost` equals `toArt(SIGNPOST)`, and `AREAS.peaks.id === "peaks"`.
- [ ] **Step 2: Run** `npx vitest run src/render`. Expected: the new and changed tests FAIL; the others PASS.
- [ ] **Step 3: Implement** per the Produces block. Move the data; do not re-derive it.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS.
  - If an existing scene or paint test pinned a decoration that the new protected boxes now remove (expected: bush (29,133) and tree (70,138)), update only that pin. Record it as `Ruling:` in the ledger.
- [ ] **Step 5: Commit** `feat(render): areas — the village's terrain and a gap in the hedge at each exit`.

### Task 6: Scene, ground and canvas per zone

**Files:**
- Modify:
  - `src/render/scene.ts`: `SceneInput.zone`, `Scene.zone`, per-area caches, village drawables
  - `src/render/paint.ts`: `GroundCache.get(world, zone)`, ground texture per area
  - `src/screens/overworld/MapCanvas.tsx`: jump on a zone change
  - `src/screens/overworld/MapViewport.tsx`: new `zone: ZoneId` prop, passed into the scene
  - `src/screens/overworld/Overworld.tsx`: passes `zone`
  - `src/screens/MenuBackdrop.tsx`: `zone: "peaks"`
- Test: `scene.test.ts`, `paint.test.ts`, `MapCanvas.test.tsx`, the `MapViewport.test.tsx` `props()` fixture (`zone: "peaks"`)

**Interfaces:**
- Consumes: Task 5 `AREAS`, `wallTiles`, `decorations`, `onPath`, `terrainAt` with an area.
- Produces:
  - `SceneInput.zone: ZoneId`; `Scene.zone: ZoneId` (copied from the input).
  - `buildScene` for the village:
    - `glints: []`, `flat: []`, `light: []`;
    - `upright` = village interior decorations + its 20 wall tiles + `AREAS.village.props` (placed with their variant) + teammates + player, sorted as today.
  - The Peaks scene is unchanged.
  - `GroundCache.get(world: WorldRect, zone: ZoneId)`:
    - the key appends `zone`;
    - the texture and the baked decorations and wall tiles come from `AREAS[zone]`;
    - the ice and bank only when `area.ice` is set.
  - `paintScene` calls `ground.get(world, scene.zone)`.

- [ ] **Step 1: Write the failing tests, and update the fixtures.**
  - Fixtures gain `zone: "peaks"`:
    - scene.test `base`, paint.test `input`, and the hand-built `Scene` literal in "draws ground, glints, flat…";
    - MapCanvas.test `input`;
    - the MapViewport.test `props()`.
  - paint.test: the existing direct cache calls gain `"peaks"`. These are `ground.get(a)` at L163 and L165, `ground.get(fitWorld(…354…))` at L167 and `ground.get(fitWorld(…668…))` at L178, and `createGroundCache(() => null, sprites).get(…)` at L204. Otherwise tsc reports TS2554 and the bake tests throw on an undefined area.
  - scene.test:
    - `"the village draws its huts, well, fences, signpost and Ada, and none of the Peaks' landmarks"`. `scene({ zone: "village", player: {x:60,y:70}, drone: {x:68,y:68} })` gives:
      - `upright` with 3 `hut`, 1 `well`, 3 `fence`, 1 `signpost`, 20 `wall`, and one `explorer-down` with variant `"#b45309"`;
      - no `tower`, `chest-closed`, `chest-open`, `gate`, `semicolon`;
      - `flat`, `glints` and `light` empty even with `towerPowered: true, clueDecoded: true`.
    - `"the Peaks draw none of the village's props"` (**guard**: holds before and after): no `hut`, `well`, `fence` or `signpost` in `scene()`.
    - `"the village scene's interior decorations are the village's own, even after a Peaks scene"`:
      1. `DECOR = ["pine","tree","rock","bush","snow-rock"]`, and `drawn(s)` is the set of `` `${d.sprite}@${d.x},${d.y}` `` for the upright DECOR drawables.
      2. Build `peaks = drawn(scene())` first, then `village = drawn(scene({ zone: "village", player: {x:60,y:70}, drone: {x:68,y:68} }))`.
      3. `village` equals the same set built from `decorations(REACHABLE_RECT, AREAS.village)`, keeping those whose sprite box intersects REACHABLE_RECT and keying each by its sprite box's x,y.
      4. `village` does not equal `peaks`.
  - paint.test `"the ground cache is rebuilt when the zone changes and reused when it doesn't"`, with `w = fitWorld({ width: 668, height: 360, dpr: 1 })` and `setup()`:
    1. `a = ground.get(w, "peaks")`; record `n = made.length`.
    2. `b = ground.get(w, "village")`: `b` is not `a`, and `made.length > n`. Record `m`.
    3. `ground.get(w, "village")` is `b` (`toBe`), and `made.length === m`.
    - Do not assert an absolute count: the shared `make` also counts sprite canvases.
  - MapCanvas.test `"jumps the player and drone when the zone changes"`:
    1. Render with `{ ...input, player: {x:6,y:72}, drone: {x:14,y:70} }`, then call `frame()`.
    2. Rerender with `{ ...input, zone: "village", player: {x:94,y:72}, drone: {x:86,y:70} }`, then call `frame()` once.
    3. The player (the explorer with variant `"#22c55e"`) is at `spriteBox("explorer-down", toArt({x:94,y:72}))` x/y, and the drone at its arrival box. Do not select `explorers(s)[0]`: Ada is an explorer too.
- [ ] **Step 2: Run** `npx vitest run src/render src/screens/overworld/MapCanvas.test.tsx`. Expected: the new tests FAIL; the guard "the Peaks draw none of the village's props" PASSES.
- [ ] **Step 3: Implement** per the Produces block.
  - Turn the caches into `Map<ZoneId, Drawable[]>`.
  - In MapCanvas, keep `let lastZone = latest.current.input.zone`; for each frame, `jump = respawned || now.zone !== lastZone`, then update `lastZone`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(render): the scene, the ground and the canvas follow your zone`.

### Task 7: The map's overlay per zone

**Files:**
- Modify:
  - `src/screens/overworld/mapLayout.ts`: caption zones and alignments, `LANDMARK_CAPTIONS` zone and point, `landmarkCaptions(…, zone)`, `exitSignBox`
  - `src/screens/overworld/MapViewport.tsx`: captions and buttons per zone, cards, fade, keyed world layer, new `villagerLine` prop
  - `src/screens/overworld/TopHud.tsx`: `region` prop
  - `src/screens/overworld/Overworld.tsx`: passes `villagerLine={adaLine(state)}` and `region={ZONES[state.zone].name}`
  - `src/index.css`: keyframes
- Test: `mapLayout.test.ts`, `labelLayout.test.ts`, `MapViewport.test.tsx`, `Overworld.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`ADA`, `SIGNPOST`, `adaLine`), Task 5 (`VILLAGE_POINTS`), Task 6 (MapViewport `zone`).
- Produces:
  - `MAP_CAPTIONS` entries: `{ id, zone: ZoneId, at, align: "centre" | "right-bottom" | "left-centre" | "right-centre" }`:
    - peaks, river, forest: zone peaks, unchanged positions;
    - `"village"`: zone village, (40,4), centre;
    - `"west-exit"`: zone peaks, (1,88), left-centre;
    - `"east-exit"`: zone village, (99,88), right-centre.
  - `mapCaptionRect` alignments: left-centre gives `{ left: x, top: y − LINE_H/2 }`; right-centre gives `{ left: x − width, top: y − LINE_H/2 }`.
  - `LANDMARK_CAPTIONS` entries: `{ id, zone, sprite, point: ArtPoint, texts, prefer }`. The Peaks three are as today, with `point: LANDMARK_POINTS[id]`. Added:
    - `{ id: "villager", zone: "village", sprite: "explorer-down", point: VILLAGE_POINTS.villager, texts: ["[V] Ada"], prefer: "above" }`
    - `{ id: "signpost", zone: "village", sprite: "signpost", point: VILLAGE_POINTS.signpost, texts: ["[P] Signpost"], prefer: "above" }`
  - `landmarkCaptions(world, map, state, zone: ZoneId = "peaks"): Edges[]`: that zone's caption and drawing pairs only.
  - `exitSignBox(world, zone): Edges`: the zone's exit-sign rect as world-layer edges, using `textWidth` of its text ("← Dev Village" / "C++ Peaks →").
  - MapViewport:
    - new props `villagerLine: string`;
    - `labelLayout(…, [...landmarkCaptions(world, map, state, zone), exitSignBox(world, zone)])`;
    - Peaks captions and [T], [X], [G] buttons only when `zone === "peaks"`;
    - village: "(Dev Village)", "C++ Peaks →", and the buttons "[V] Ada" (colour `var(--accent-border)`) and "[P] Signpost" (colour `var(--text)`), which call `onInteract("villager")` / `onInteract("signpost")`;
    - Peaks also shows "← Dev Village";
    - dig spot and artifact anchors only in the Peaks, and the found semicolon is a label obstacle only when `zone === "peaks" && artifactFound`;
    - card: `inspectedPoi` is found in `[...POIS, HIDDEN_ARTIFACT, ADA, SIGNPOST]`, and its text is `villagerLine` for the villager, otherwise today's `INSPECT_COPY` rule;
    - fade per Decision 8, with `data-testid="zone-fade"`.
  - TopHud: `region: string` prop rendered as `` `REGION: ${region.toUpperCase()}` ``.

- [ ] **Step 1: Write the failing tests, and change the existing ones.**
  - Change mapLayout `"at 320×180 and 640×360 worlds no caption box intersects another, a landmark sprite box or the dig spot"`:
    - It loops over zones and checks only that zone's captions. First, right after `captions` is built, it asserts `new Set(captions.map((c) => c.group))` equals `peaks: tower, chest, gate, peaks, river, forest, west-exit` or `village: villager, signpost, village, east-exit`. So the test fails until entries carry `zone`, instead of passing with zero assertions.
    - The captions are:
      - map captions with `MAP_TEXTS` keyed by every id, adding `village: ["(Dev Village)"]`, `"west-exit": ["← Dev Village"]` and `"east-exit": ["C++ Peaks →"]`;
      - landmark captions.
    - Blockers:
      - Peaks: as today;
      - village: every `AREAS.village.props` sprite box.
  - Change mapLayout `"at the start the player and drone labels clear the landmark captions and drawings"` to pass zone `"peaks"` and add `exitSignBox(world, "peaks")` to the fixed boxes.
  - Change labelLayout `"with the landmark captions and drawings MapViewport passes, your labels still never cover each other or the other sprite"`:
    - It loops over zones `["peaks","village"]`, with fixed boxes `[...landmarkCaptions(world, view, state, zone), exitSignBox(world, zone)]`.
    - It uses py from 50 in the village.
    - The assertions are unchanged.
  - New labelLayout `"at 2× and 3× no label overlaps an exit sign"`:
    - Views `{668,360,1}` and `{989,610,1}`, both zones, the same grid and drone offsets.
    - Expect neither label to overlap `exitSignBox(world, zone)`.
    - The spec's measurement found 0 hits with the sign at y 88.
  - New mapLayout `"exit signs: left-centre and right-centre at y 88"`:
    - At the desktop world, `mapCaptionRect("west-exit", "← Dev Village", desktop).left` equals `desktop.left + 0.01 * desktop.width`.
    - East's right edge equals `desktop.left + 0.99 * desktop.width`.
    - Both have vertical centre `desktop.top + 0.88 * desktop.height`.
  - MapViewport.test `props()` gains `villagerLine: "Hi"`. New tests:
    - `"each zone shows its own buttons and captions"`:
      - With the default zone peaks: "[G] Gate", "[T] Tower", "[X] Supply Cache" and the text "← Dev Village" are present; "[V] Ada" is absent.
      - With `zone: "village"`: buttons "[V] Ada" and "[P] Signpost", texts "(Dev Village)" and "C++ Peaks →"; no "[G] Gate" and no "(Snowy Peaks Biome)".
    - `"the village buttons talk to Ada and read the signpost"`: clicking them calls `onInteract` with `"villager"` then `"signpost"`.
    - `"Ada's card shows her current line; the signpost's shows its text"`:
      - `{ zone: "village", inspected: "villager", villagerLine: "Line X" }` gives a POI Inspection region with "Ada" and "Line X".
      - `inspected: "signpost"` gives the signpost copy.
    - `"the zone fade covers the map under the fog, never takes clicks, and is skipped under reduced motion"`:
      - `getByTestId("zone-fade")` has `aria-hidden="true"` and its className contains `pointer-events-none`, `z-[5]` and `motion-reduce:hidden`.
      - After rerendering with another zone it is a new element (`not.toBe` the old one).
    - `"in the village the found semicolon neither shows nor moves your labels"`:
      - Render `props({ zone: "village", player: { x: 52, y: 80 }, drone: { x: 44, y: 78 } })` and record the player label's style (`getByTestId("player").firstElementChild!.getAttribute("style")`).
      - Rerender with `artifactFound: true, clueDecoded: true`.
      - The style is unchanged, and `queryByTestId("artifact")` and `queryByTestId("dig-spot")` are null.
    - `"the world layer is replaced, not moved, when the zone changes"`: `getByTestId("world-layer")` before and after a zone rerender are different elements.
  - Overworld.test `"walking west from camp enters Dev Village"`:
    - `initial={{ player: { x: 6, y: 72 } }}`, then ArrowLeft.
    - Expect "REGION: DEV VILLAGE", "Entered Dev Village.", and the button "[V] Ada".
    - Then press `d`: "REGION: C++ PEAKS".
  - Overworld.test `"in the village [E] opens Ada's card with her hint"`:
    - `initial={{ zone: "village", player: { x: 34, y: 72 } }}`, then press `e`.
    - The region "POI Inspection" contains "Ada" and the gate-locked line.
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld`. Expected: the new and changed tests FAIL; the others PASS.
- [ ] **Step 3: Implement** per the Produces block. Add to `src/index.css`:

```css
@keyframes zone-fade { from { opacity: 1; } to { opacity: 0; } }
@keyframes zone-in { from { opacity: 0; } to { opacity: 1; } }
```

  - Cover: `<div key={zone} data-testid="zone-fade" aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] bg-[var(--panel)] opacity-0 animate-[zone-fade_200ms_ease-out] motion-reduce:hidden" />`
  - World layer: `key={zone}` and `animate-[zone-in_200ms_ease-out] motion-reduce:animate-none`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS. If a village caption box hits a prop box at 1× or 2×, nudge the caption's `prefer` or the prop's art point by the fewest px that clears it, and record a `Ruling:`.
- [ ] **Step 5: Commit** `feat(overworld): the map's captions, buttons, cards and fade per zone`.

### Task 8: The mini-map as a world map

**Files:**
- Modify: `src/screens/overworld/MiniMap.tsx` (`paintMiniTerrain(…, zone)`, two cells, new `zone` prop), `src/screens/overworld/Overworld.tsx` (passes `zone` and all teammates)
- Test: `src/screens/overworld/MiniMap.test.tsx`, `src/screens/overworld/TeamOverworld.test.tsx`

**Interfaces:**
- Consumes: Task 3 `Teammate.zone`, Task 5 `AREAS` / `terrainAt(x, y, area)`.
- Produces:
  - `paintMiniTerrain(ctx, width, height, zone: ZoneId = "peaks")`:
    - samples `AREAS[zone]`;
    - the wall gap only where `AREAS[zone].gateBox` is set;
    - today's output is unchanged for the Peaks.
  - `MiniMap` props: `{ zone: ZoneId; player; artifactFound; teammates?: Teammate[]; playerColor? }`.
  - Box: `role="img" aria-label="Mini-map"`, 194 × 56 with its 1 px border (`h-14 w-[194px]`). Inside it are two cells, `data-testid="minimap-cell-village"` (left 0) and `"minimap-cell-peaks"` (left 96 px), each `absolute top-0 h-[54px] w-24`.
  - Each cell holds:
    - an `aria-hidden` canvas whose backing is `round(96·dpr) × round(54·dpr)`, painted with its zone;
    - place markers: the Peaks get `POIS` and the artifact diamond, the village gets ADA and SIGNPOST;
    - dots for teammates in that zone (`minimap-teammate-${name}`);
    - in your zone's cell only:
      - your dot `data-testid="minimap-player"`;
      - `data-current="true"` on the cell;
      - straight after the canvas, `<div aria-hidden="true" data-testid="minimap-current" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_var(--accent)]" />`. Do not put the shadow on the cell itself: its opaque canvas paints over the cell's own inset shadow.
  - The legend is unchanged.

- [ ] **Step 1: Write the failing tests, and change the existing ones.**
  - Change `"keeps the dots and renders an aria-hidden canvas behind them, without the old dashed river"`:
    - Render with `zone="peaks"`.
    - The box is `getByRole("img",{name:"Mini-map"})` and holds two aria-hidden canvases.
    - `minimap-teammate-Kai` is inside the Peaks cell. No `.border-dashed`.
  - New:
    - `"paints a village cell: meadow below the snow and a wall line with no gap"`: `paintMiniTerrain(ctx, 96, 54, "village")`:
      - the `#1e293b` fills are exactly `[{x:0,y:26,w:96,h:1}]` (row `round(0.49·54)`);
      - `colorAt(10,50)` is meadow;
      - the fills cover 96 × 54 once.
    - `"draws two cells, Village on the left and Peaks on the right, and outlines yours"`: with `zone="village"`, the village cell has `style.left === "0px"`, `data-current="true"` and contains `minimap-current`; the Peaks cell has `"96px"`, no `data-current` and no `minimap-current`.
    - `"puts each dot in its zone's cell"`:
      - teammates Kai (village), Mia (peaks) and Zed (`zone: null`);
      - `within(villageCell).getByTestId("minimap-teammate-Kai")` and `within(peaksCell).getByTestId("minimap-teammate-Mia")`;
      - `queryByTestId("minimap-teammate-Zed")` is null;
      - `minimap-player` is in your zone's cell.
  - Extend TeamOverworld `"a teammate who walks into the village leaves your Peaks map and the log says so"`: `within(ana.getByTestId("minimap-cell-village")).getByTestId("minimap-teammate-Kai")` is present.
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld/MiniMap.test.tsx src/screens/overworld/TeamOverworld.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** per the Produces block. Paint each canvas in an effect keyed on `[]`; both cells are always painted.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(overworld): the mini-map shows both zones and who is where`.

### Task 9: The bigger desktop layout

**Files:**
- Create: `src/screens/overworld/QuestList.tsx`
- Modify:
  - `src/screens/overworld/BottomHud.tsx`: inventory only; drops `questComplete` and `towerPowered`
  - `src/screens/overworld/Overworld.tsx`: grid placement per Decision 7
  - `src/screens/overworld/EventLog.tsx`: scroller and keep newest in view
  - `src/screens/overworld/MiniMap.tsx`: optional `className` for its placement
  - `src/App.tsx`: padding while the overworld is shown
- Test: `src/screens/overworld/Overworld.test.tsx`, `src/screens/overworld/EventLog.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Produces:
  - `QuestList({ questComplete, artifactFound, towerPowered, className = "" })`: ``<section aria-label="Quests" className={`bg-[var(--bg)] px-3 pb-2 md:border-r-2 md:border-dashed md:border-[var(--panel-border)] md:bg-transparent md:p-3 ${className}`}>``. Inside it is today's lines `div` (`flex flex-col items-end gap-1 text-[10px] uppercase tracking-widest text-[var(--accent)]`) with the three spans, verbatim.
    - Below md it continues the bottom bar's band right under the inventory row.
    - At md it is a padded sidebar block whose dashed right border joins the mini-map's and the log's.
  - Overworld Panel:
    - `className="mx-auto w-full max-w-screen-2xl overflow-hidden md:grid md:min-h-[calc(100dvh-1rem)] md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-[auto_auto_auto_1fr_auto]"`
    - children in this DOM order: TopHud (`md:col-span-2`), MiniMap (`md:col-start-1 md:row-start-2`), the map column (`flex min-w-0 flex-col md:col-start-2 md:row-start-2 md:row-span-3`, holding MapViewport and TouchControls), EventLog (`md:col-start-1 md:row-start-4`), BottomHud (`md:col-span-2 md:row-start-5`), QuestList (`md:col-start-1 md:row-start-3`)
    - the modals stay where they are (they are fixed overlays)
  - The MiniMap root drops only `md:w-36` (the grid column sets its width). It keeps `md:flex-shrink-0 md:flex-col md:border-r-2 md:border-b-0`, so at md the 194 px box sits above the legend; in a row it would overflow into the map column. The placement classes are passed in through `className`.
  - EventLog:
    - root `md:relative md:min-h-0 md:border-r-2`;
    - the `ol` is wrapped in `<div data-testid="event-log-scroller" className="md:absolute md:inset-x-3 md:top-10 md:bottom-3 md:overflow-y-auto">`;
    - a `useLayoutEffect` on `logCount` sets the scroller's `scrollTop = scrollHeight`.
  - App `<main>`: `"min-h-screen p-4 sm:p-8 md:p-2"` while the overworld is shown (`screen === "overworld" || (screen === "lobby" && team.phase === "playing")`); otherwise today's classes.

- [ ] **Step 1: Write the failing tests.**
  - Overworld.test:
    - `"the quest lines sit in their own Quests section, once each, outside the inventory bar"`: `within(getByRole("region",{name:"Quests"}))` finds the three lines. Each `getAllByText(line)` has length 1, and `getByRole("contentinfo")` does not contain them.
    - `"at md the sidebar holds the mini-map, the quests and the event log, with the map beside them"`:
      - The className of the mini-map root (the parent element of the "Mini-map" box), the Quests region and the log's `aside` contains `md:col-start-1`.
      - The map viewport's column contains `md:col-start-2`.
      - The Panel contains `md:min-h-[calc(100dvh-1rem)]` and `max-w-screen-2xl`.
      - The mini-map root's className still contains `md:flex-col`, and the Quests region's contains `bg-[var(--bg)]` and `md:border-r-2`.
  - EventLog.test `"keeps the newest entry in view"`:
    1. Stub `HTMLElement.prototype.scrollHeight` with a getter returning 500, and restore it afterwards.
    2. Render `<EventLog logs={["a"]} logCount={1} />`, then set `getByTestId("event-log-scroller").scrollTop = 0`.
    3. Rerender with `logs={["a","b"]} logCount={2}`.
    4. `scrollTop` is 500.
    5. Set it to 123 and rerender with the same props; it stays 123. That pins the effect to `logCount`.
  - App.test `"the overworld uses the slim page padding at md; the menu keeps its own"`: the menu's `<main>` className has no `md:p-2`. After Solo Quest it contains `md:p-2`.
  - Existing quest-line, Patch, Scroll, Semicolon and "[ Decode Scroll ]" queries stay as they are (**guards**).
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld src/App.test.tsx`. Expected: the new tests FAIL; the guards PASS.
- [ ] **Step 3: Implement** per the Produces block. Check that TerminalModal, CipherModal and LogicModal render a fixed overlay. If one doesn't, keep it outside the grid's flow with `md:col-span-2` and record a `Ruling:`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(overworld): a bigger map — one sidebar and the full window height on desktop`.

### Task 10: README, browser check, final review

**Files:**
- Modify: `README.md`
- Create (scratchpad only): `…/scratchpad/zones/check.cjs`

- [ ] **Step 1: README.**
  - Intro L5: add "…, and walk west into Dev Village, where Ada the villager has hints".
  - L7: the map fills most of the window on desktop.
  - After the North wall bullet, add a **Dev Village** bullet: walk left off the map near camp, through the gap in the hedge. Ada (`[V] Ada`, or `E` next to her) gives a hint for your next step. The signpost (`[P] Signpost`) points the way back.
  - L37 map paragraph: the hedge gap, the village (huts, well, fences), and the two-cell mini-map.
  - Team Lobby:
    - teammates in the other zone show only on the mini-map;
    - add the example "Kai went to Dev Village.";
    - add "your zone" to **Your own**.
  - Project layout:
    - `src/game/` adds wall, zones and village;
    - `src/render/` adds `areas/`.
- [ ] **Step 2: Build and serve:** `npm run build`, then `npx vite preview --port 4173 --strictPort` in the background.
- [ ] **Step 3: Playwright checks** (`require("/opt/node22/lib/node_modules/playwright")`). Print PASS/FAIL per check and take screenshots:
  - **1366 × 657 and 1280 × 689:**
    - the world layer is 960 × 540;
    - walk left 6 times from camp, then "REGION: DEV VILLAGE", "[V] Ada" and the hedge gap screenshot;
    - walk to Ada and press E: her gate-locked line is in the card, and the newest log line is fully inside the log's visible box;
    - solve the gate in the Peaks, return and talk again: the tower line;
    - read the signpost.
  - **1920 × 1080:** the world layer is 1280 × 720.
  - **1280 × 440:** the page scrolls (`document.scrollingElement.scrollHeight > 440`; expect 472 = 16 + 4 + 49 + 360 + 43). The bottom bar's box starts at or below the map column's bottom and is not overlapped. After scrolling to the bottom, the bar is fully in view.
  - **1280 × 520:** fits without scrolling (`scrollHeight === 520`). The world layer is 640 × 360, and the bottom bar is not overlapped.
  - **Mini-map outline:** a pixel on the inner 1 px edge of the current zone's cell is the accent colour, not terrain.
  - **390 × 844, touch, DPR 3:** the same walk with the D-pad; the stacked order is mini-map, map, D-pad, log, then the bottom bar: the inventory row, then the quest lines in the same `--bg` band with 12 px side padding.
  - **844 × 390, touch:** the page scrolls to the D-pad, and the D-pad and bottom bar are both reachable by scrolling and not covered.
  - **Team, Same computer mode, two pages:** Kai walks into the village; Ana's map has no Kai; Ana's mini-map village cell has Kai; Ana's log has "Kai went to Dev Village." once.
  - **No console errors** (the blocked supabase.co WebSocket excepted).
  - Ledger `Ruling:` spec line 330's "1280 × 520 … the page scrolls" cannot happen on a non-touch desktop: the page needs at most 472 px. The scroll case is checked at 1280 × 440.
- [ ] **Step 4: Run** `npm test`, `npx tsc -b` and `npm run build`. Expected: all PASS.
- [ ] **Step 5: Commit** `docs: Dev Village and the bigger view in the README`, then push. Then the executor's final whole-branch review (per the executing skill), and the finishing-a-development-branch menu.
