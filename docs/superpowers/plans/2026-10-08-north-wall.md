# North Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A wall across the map at the snow line whose locked gate is the only way north, with the Signal Tower taking over rebuilding the bridge.

**Architecture:** One pure rule module (`src/game/wall.ts`) decides whether a step crosses the wall and whether it is blocked; the game reducer applies it to every move and to remote landmark use. The renderer draws the wall from the same line: wall tiles are y-sorted upright sprites where explorers can reach them and baked into the ground elsewhere, the gate gets a locked frame, and the bridge planks follow `towerPowered`.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Vitest (jsdom), Playwright (browser check, scratchpad only).

**Spec:** `docs/superpowers/specs/2026-10-08-north-wall-design.md`

## Global Constraints

- Game coordinates are percentages, x 6–94, y 10–90, steps of 4: `WALL_Y = 49`, `GATE_OPENING = { minX: 45, maxX: 55 }` inclusive.
- Every copy string is the spec's "New" column, verbatim (Copy changes table).
- Art: 320 × 180; upright sprites bottom-centre anchored, y-sorted by feet row, explorers last on ties; only `drawImage` / `fillRect` on canvases.
- Wall tiles at art points `(8 + 16k, 89)`, k skipping the gate's box (art x 144–175); `WALL_RECT = { x: 0, y: 80, w: 320, h: 10 }`.
- No new dependencies. TDD: every test is run and seen to fail before the code it covers.
- Each commit ends with the two trailer lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub`.
- After every task: `npm test` and `npx tsc -b` green.

## Review Focus

1. **Holding a key or the D-pad against the wall** (keyboard repeat, touch repeat every 150 ms): one log line, no stamina loss, no jitter. Pinned in Task 2 ("a held key against the wall logs once").
2. **A teammate opens the gate while you push against it:** your next step through the opening passes, without leaving and coming back. Pinned in Task 2 ("a teammate's gate opens your way through").
3. **Using the tower, cache or river by clicking their buttons from the south while the gate is locked** must not power the tower, loot the cache or scan the river. Pinned in Task 2 ("remote use of north landmarks waits for the gate").
4. **Standing in the gate's opening** (x 48–52 at y 50 or 46): the explorer is drawn in front of the gate from the south and behind it from the north. Pinned in Task 5 ("an explorer in the gate opening sorts around the gate").
5. **The bridge and the cold after the gate is solved but before the tower:** the river still hurts, no planks are drawn, and the caption still reads "Frozen River". Pinned in Task 3 ("solving the gate leaves the river icy").

---

### Task 1: The wall rule

**Files:**
- Create: `src/game/wall.ts`, `src/game/wall.test.ts`

**Interfaces:**
- Produces:
  - `export const WALL_Y = 49;`
  - `export const GATE_OPENING = { minX: 45, maxX: 55 } as const;`
  - `export type WallBlock = "locked" | "solid";`
  - `export function crossesWall(from: Point, to: Point): boolean` (side change across `y = WALL_Y`)
  - `export function isNorthOfWall(p: Point): boolean` (`p.y < WALL_Y`)
  - `export function wallBlock(from: Point, to: Point, gateOpen: boolean): WallBlock | null`

- [ ] **Step 1: Write the failing tests** in `src/game/wall.test.ts`:

```ts
const EVEN_X = Array.from({ length: 45 }, (_, i) => 6 + 2 * i); // 6 … 94
const CROSSINGS: Array<[number, number]> = [[52, 48], [48, 52], [50, 46], [46, 50]];

it("a step crosses the wall only when it changes side", () => {
  expect(crossesWall({ x: 50, y: 50 }, { x: 50, y: 46 })).toBe(true);
  expect(crossesWall({ x: 50, y: 48 }, { x: 50, y: 52 })).toBe(true);
  expect(crossesWall({ x: 50, y: 48 }, { x: 50, y: 44 })).toBe(false);
  expect(crossesWall({ x: 50, y: 52 }, { x: 50, y: 56 })).toBe(false);
  expect(crossesWall({ x: 46, y: 48 }, { x: 50, y: 48 })).toBe(false);
  expect([isNorthOfWall({ x: 50, y: 48 }), isNorthOfWall({ x: 50, y: 50 })]).toEqual([true, false]);
});

it("while the gate is locked every crossing is blocked as locked, wherever it is", () => {
  for (const x of EVEN_X) for (const [a, b] of CROSSINGS)
    expect(wallBlock({ x, y: a }, { x, y: b }, false), `${x}: ${a}→${b}`).toBe("locked");
});

it("once open, crossings pass inside the opening and are solid outside it", () => {
  for (const x of [46, 48, 50, 52, 54]) for (const [a, b] of CROSSINGS) expect(wallBlock({ x, y: a }, { x, y: b }, true)).toBeNull();
  for (const x of [6, 44, 56, 94]) for (const [a, b] of CROSSINGS) expect(wallBlock({ x, y: a }, { x, y: b }, true)).toBe("solid");
});

it("steps along the wall and steps that stay on one side are never blocked", () => {
  for (const open of [false, true]) {
    expect(wallBlock({ x: 44, y: 48 }, { x: 48, y: 48 }, open)).toBeNull();
    expect(wallBlock({ x: 30, y: 52 }, { x: 30, y: 56 }, open)).toBeNull();
    expect(wallBlock({ x: 30, y: 46 }, { x: 30, y: 42 }, open)).toBeNull();
  }
});
```

- [ ] **Step 2: Run** `npx vitest run src/game/wall.test.ts`. Expected: FAIL, cannot resolve `./wall`.
- [ ] **Step 3: Implement** `src/game/wall.ts` with the Produces block. `wallBlock`: `null` unless `crossesWall`; `"locked"` when the gate is closed; `"solid"` when open and `from.x` is outside `GATE_OPENING`; else `null`.
- [ ] **Step 4: Run** the same command. Expected: PASS (4 tests).
- [ ] **Step 5: Commit** `feat(game): the north wall rule`.

### Task 2: Moving and reaching past the wall

**Files:**
- Modify: `src/game/reducer.ts` (`move`, `interact`), `src/game/constants.ts` (`LOG.wallLocked`, `LOG.wallSolid`)
- Test: `src/game/reducer.test.ts`, `src/screens/overworld/Overworld.test.tsx` (the continuous-move drone test)

**Interfaces:**
- Consumes: Task 1 (`wallBlock`, `isNorthOfWall`).
- Produces: `LOG.wallLocked = "The gate is locked. Solve its terminal to pass."`, `LOG.wallSolid = "The wall is solid here. Go through the gate."`

- [ ] **Step 1: Write the failing tests** in `src/game/reducer.test.ts`, in a new `describe("gameReducer: the north wall")`:
  - `"a step into the locked wall stays put, costs no stamina and logs the locked line"`: from `{ ...s0, player: { x: 30, y: 52 } }`, `move up` → player `{ x: 30, y: 52 }`, stamina 100, `lastLog` = `LOG.wallLocked`, `logCount` + 1.
  - `"a held key against the wall logs once"`: five `move up` in a row from there → `logCount` + 1 in total, `logs` ends with exactly one `LOG.wallLocked`.
  - `"through the open gate's opening a step moves and costs stamina"`: `{ ...s0, gateUnlocked: true, player: { x: 48, y: 52 } }` `move up` → `{ x: 48, y: 48 }`, stamina 99.
  - `"with the gate open the wall is solid elsewhere"`: `{ ...s0, gateUnlocked: true, player: { x: 30, y: 52 } }` `move up` → stays, `lastLog` = `LOG.wallSolid`.
  - `"a teammate's gate opens your way through"`: from `{ ...s0, player: { x: 48, y: 52 } }`: `move up` (blocked) → `teamSync` with `{ ...NO_FLAGS, gateUnlocked: true }` by `"Ana"` → `move up` → player `{ x: 48, y: 48 }`.
  - `"remote use of north landmarks waits for the gate"`: from `s0` (south, locked): `interact tower` → `logicOpen` false, `inspected` `"tower"`, `lastLog` `LOG.wallLocked`; `interact chest` → `hasLoot` false, `inspected` `"chest"`, `lastLog` `LOG.wallLocked`; `interact river` → `inspected` `"river"`, `lastLog` `LOG.wallLocked`. With `gateUnlocked: true` the tower opens its lock and the chest loots as before; from the north side (`player: { x: 14, y: 26 }`, locked) the tower opens its lock.
  - `"the gate is the only way north (reachability)"`: breadth-first walk over `gameReducer(state, { type: "move", dir })` from `PLAYER_START`, positions only (stamina ignored), once with `gateUnlocked` false and once true:

```ts
function reachable(gateUnlocked: boolean) {
  const seen = new Map<string, Point>();
  const queue: Point[] = [PLAYER_START];
  seen.set("28,72", PLAYER_START);
  const crossings: Array<[Point, Point]> = [];
  while (queue.length) {
    const p = queue.shift()!;
    for (const dir of ["up", "down", "left", "right"] as const) {
      const q = gameReducer({ ...s0, gateUnlocked, player: p }, { type: "move", dir }).player;
      if (isNorthOfWall(q) !== isNorthOfWall(p)) crossings.push([p, q]);
      const k = `${q.x},${q.y}`;
      if (!seen.has(k)) { seen.set(k, q); queue.push(q); }
    }
  }
  return { points: [...seen.values()], crossings };
}
const inReach = (points: Point[], poi: Point) => points.some((p) => Math.hypot(p.x - poi.x, p.y - poi.y) <= INTERACT_RADIUS);
```

  Assertions — locked: `inReach` is false for the tower, chest and river POIs, true for the gate POI and `HIDDEN_ARTIFACT`; no point has `y < 49`. Open: all five in reach, and every crossing has `x` in 45–55.
- [ ] **Step 2: Run** `npx vitest run src/game/reducer.test.ts`. Expected: the new tests FAIL (walls don't block; the tower opens remotely); the rest PASS.
- [ ] **Step 3: Implement.**
  - `move`: after the downed/modal guard, compute the clamped `player` as now, then `const block = wallBlock(state.player, player, state.gateUnlocked)`. If blocked: `const line = block === "locked" ? LOG.wallLocked : LOG.wallSolid;` return `state.logs.at(-1) === line ? state : pushLog(state, line)`.
  - `interact` for `"tower"`, `"chest"` and `"river"`: when `!state.gateUnlocked && !isNorthOfWall(state.player)`, return `{ ...state, inspected: action.poi }` with `LOG.wallLocked` pushed (same "unless newest" rule); otherwise unchanged.
- [ ] **Step 4: Move the existing tests that walk through the wall or use the tower, cache or river from camp to an open gate.** Each keeps its assertions; only the setup changes.
  - `reducer.test.ts`: add `const opened = { ...s0, gateUnlocked: true };` and start from it (instead of `s0`) in "chest: loots once, then reports empty", "river: logs the scan", "keeps only the last six log entries but counts every entry", the hidden-artifact `looted` setup, and every "signal tower logic lock" test that interacts with the tower ("interacting with the tower opens…", "does not reopen the lock once the tower is powered" as `{ ...opened, towerPowered: true }`, "the solved circuit powers…", "a failing circuit…", "closeLogic…", "ignores movement while the logic lock is open").
  - `Overworld.test.tsx`: `initial={{ gateUnlocked: true }}` in "looting the supply cache logs…", "shows an inspection card that can be closed", "looting the cache adds the encrypted scroll…" and "the tower button opens the logic lock…"; "the drone keeps following while the player moves continuously" uses `initial={{ gateUnlocked: true, player: { x: 48, y: 72 } }}` (player top 32 %, drone moved > 15).
  - `App.test.tsx` "[=] Menu returns to the main menu and Solo Quest starts a fresh game": after Solo Quest, click "[G] Gate" and type `block{Enter}` before looting the cache.
  - `TeamOverworld.test.tsx`: in "shares progress: a teammate powering the tower…" Ana first clicks "[G] Gate" and types `block{Enter}`; in "keeps playing through a dropped connection…" Kai does the same before the connection drops.
- [ ] **Step 5: Run** `npm test` and `npx tsc -b`. Expected: all PASS, tsc clean.
- [ ] **Step 6: Commit** `feat(game): the wall blocks every way north but the open gate`.

### Task 3: The Signal Tower rebuilds the bridge; new story text

**Files:**
- Modify: `src/game/reducer.ts` (`riverDamage`, river `interact`, `submitCode`, `submitLogic`, open-gate `interact`), `src/game/constants.ts`, `src/game/team.ts`, `src/hooks/useGameTimers.ts`, `src/screens/TerminalModal.tsx`, `src/screens/overworld/MapViewport.tsx`
- Test: `src/game/reducer.test.ts`, `src/game/team.test.ts`, `src/screens/overworld/Overworld.test.tsx`, `src/screens/overworld/TeamOverworld.test.tsx`

**Interfaces:**
- Consumes: Task 2's `LOG` additions.
- Produces:
  - `LOG.gateUnlocked` (replaces `LOG.bridgeRestored`), `LOG.gateOpen`, `LOG.towerPowered` with the spec's new text;
  - `INSPECT_COPY` type `{ default: string; looted?: string; opened?: string; bridged?: string; powered?: string }`; the gate's open text moves to `opened`.

- [ ] **Step 1: Change the existing tests to the new story first** (they are the failing tests of this task):
  - reducer: initial log line 3 → `"Objective: open the north gate, then survey the frozen river."`; `riverDamage` "does nothing once the bridge is restored…" uses `towerPowered: true` instead of `gateUnlocked`; the river scan's safe-crossing test uses `towerPowered: true`; the correct-answer test expects `lastLog` `"Gate unlocked. The way north is open."`; inspecting the open gate logs `"Gate open. The way north is clear."`; the solved circuit logs `"Signal tower online: the fog lifts and the bridge returns."`.
  - reducer, new `"solving the gate leaves the river icy"`: `{ ...s0, gateUnlocked: true, player: { x: 50, y: 33 } }` `riverDamage` → hp 92.
  - team: `TEAMMATE_LOG` lines `"Ana opened the gate."` and `"Ana powered the signal tower. The fog lifts and the bridge returns."`.
  - Overworld: the river label test becomes "labels the river as a bridge once the tower is powered" (`initial={{ towerPowered: true }}` → `"Bridge"`; `initial={{ gateUnlocked: true }}` → still `"Frozen River"`); gate cards: locked `"A locked compiler gate in the north wall. Its terminal leads to the code puzzle."`, open `"The compiler gate stands open. The way north is clear."`; river card bridged under `towerPowered: true`; terminal wrong answer `"Compile error: display: flex keeps the gate shut."`; solving logs `"Gate unlocked. The way north is open."` and the caption stays `"Frozen River"`; the terminal shows `"Fix the CSS styling property below to open the north gate."` and `"1 | .north-gate {"`.
  - Overworld "the tower button opens the logic lock…": the log line becomes `"Signal tower online: the fog lifts and the bridge returns."`, the card `"The signal tower hums. Its beam keeps the fog away and holds the bridge."`, and the river caption now reads `"Bridge"`.
  - TeamOverworld: in "a player joining after the start…" Zed's log contains `"Ana opened the gate."` and Zed still sees `"Frozen River"`; in "shares progress: a teammate powering the tower…" the counted lines become `"Ana powered the signal tower. The fog lifts and the bridge returns."` and `"Signal tower online: the fog lifts and the bridge returns."`.
  - timers, new in "Overworld timers", mirroring "the river drains 8 HP every 1.8 seconds": `"solving the gate does not stop the cold"` (`initial={{ gateUnlocked: true, player: { x: 50, y: 33 } }}`, advance 1800 → the first meter's `aria-valuenow` is `"92"`) and `"a powered tower stops the cold"` (`initial={{ towerPowered: true, player: { x: 50, y: 33 } }}`, advance 3600 → `"100"`).
- [ ] **Step 2: Run** `npm test`. Expected: exactly those tests FAIL.
- [ ] **Step 3: Implement** the copy table in `constants.ts`, `team.ts` and `TerminalModal.tsx`; `riverDamage`, the river `interact` and `useGameTimers`'s `draining` read `towerPowered`; `MapViewport`'s card picks `(hasLoot && copy.looted) || (gateUnlocked && copy.opened) || (towerPowered && (copy.bridged ?? copy.powered)) || copy.default` and the river caption reads `towerPowered ? "Bridge" : "Frozen River"`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(game): the Signal Tower rebuilds the bridge`.

### Task 4: Wall and gate sprites

**Files:**
- Modify: `src/render/sprites.ts`
- Test: `src/render/sprites.test.ts`

**Interfaces:**
- Produces: `SpriteId` gains `"wall"`; `SPRITES.wall` (16 × 10, `anchor: "bottom"`); `SPRITES.gate.frames` = `[open, locked]`.

- [ ] **Step 1: Write the failing tests:**
  - `"wall: 16 × 10, bottom-anchored, fully opaque, snow cap on top and shadow below"`: no `"."` in any row; row 0 is all `#e2e8f0`, row 9 all `#334155`.
  - `"gate: an open and a locked frame; bars only when locked"`: two frames; frame 0 columns 5–24 rows 4–13 all `"."`; frame 1 columns 6, 9, …, 24 rows 4–13 and columns 5–24 row 8 are `#1e293b`.
  - `"both gate frames meet the wall without a gap"`: for rows 5–14 and both frames, the colour at column 0 equals `SPRITES.wall` row `r − 5` column 0's colour, and column 31 equals wall column 15's.
  - Update `"sizes and frame counts match the spec"`: gate 32 × 16 with 2 frames; wall 16 × 10 with 1.
- [ ] **Step 2: Run** `npx vitest run src/render/sprites.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with these exact grids.

`wall`, palette `{ c: "#e2e8f0", h: "#94a3b8", S: "#64748b", m: "#475569", K: "#334155" }`:

```
cccccccccccccccc
hhhhhhhhhhhhhhhh
SSSSSSSmSSSSSSSm
SSSSSSSmSSSSSSSm
mmmmmmmmmmmmmmmm
SSSmSSSSSSSmSSSS
SSSmSSSSSSSmSSSS
mmmmmmmmmmmmmmmm
SSSSSSSmSSSSSSSm
KKKKKKKKKKKKKKKK
```

`gate`, palette adds `c: "#e2e8f0"`, `w: "#64748b"`, `b: "#1e293b"`. Frame 0 (open) is today's grid with columns 0 and 31 of rows 5–14 filled; frame 1 (locked) is frame 0 with rows 4–13 columns 5–24 replaced by `wb.wb.wb.wb.wb.wb.wb`, and row 8 columns 5–24 by `bbbbbbbbbbbbbbbbbbbb`. Rows 5–14 of frame 0:

```
cSssS....................SttttSc
sSssS....................StgGtSs
wSsSS....................StggtSS
wSssS....................SttttSS
SSssS....................SssssSS
wSsSS....................SSsssSw
wSssS....................SssssSw
SSssS....................SssssSS
wSSSS....................SSSSSSS
KKKKK....................KKKKKKK
```

- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): wall sprite and a locked gate frame`.

### Task 5: The wall in the world

**Files:**
- Modify: `src/render/terrain.ts`, `src/render/scene.ts`
- Test: `src/render/terrain.test.ts`, `src/render/scene.test.ts`

**Interfaces:**
- Consumes: Task 4's `wall` sprite and gate frames.
- Produces:
  - `export const WALL_RECT: Rect = { x: 0, y: 80, w: 320, h: 10 };`
  - `export function wallTiles(range: Rect): ArtPoint[]` — art points `(8 + 16k, 89)` of every tile whose box intersects `range` and does not overlap the gate's box.

- [ ] **Step 1: Write the failing tests:**
  - terrain `"wall tiles: 18 inside the world at feet row 89, none over the gate"`: `wallTiles({ x: 0, y: 0, w: 320, h: 180 })` has 18 points, all `y` 89, `x` = 8, 24, …, 136, 184, …, 312; no tile box intersects `spriteBox("gate", LANDMARK_POINTS.gate)`.
  - terrain `"wall tiles continue outside the world and only where the range reaches"`: `wallTiles({ x: -48, y: 0, w: 416, h: 180 })` includes x −40, −24, −8, 328, 344, 360; `wallTiles({ x: 0, y: 0, w: 320, h: 70 })` is empty.
  - terrain `"no decoration comes near the wall"`: for `decorations(VIEW)`, no `grow(spriteBox(d), 4)` overlaps rows 80–89.
  - scene `"the wall stands where explorers can reach; north of it is behind, south in front"`: `scene()` has 16 `"wall"` uprights (k 1–8 and 11–18); with the player at `{ x: 30, y: 48 }` the explorer's index is below every wall tile's, at `{ x: 30, y: 52 }` above.
  - scene `"an explorer in the gate opening sorts around the gate"`: player `{ x: 50, y: 50 }` after the gate, `{ x: 50, y: 46 }` before it.
  - scene `"the gate is barred while locked and open once solved"`: gate frame 1 with `gateUnlocked: false`, 0 with `true`.
  - scene: replace `"bridge planks only when unlocked…"` with `"bridge planks only when the tower is powered, covering BRIDGE_RECT"` (`towerPowered: true`, `gateUnlocked: false` → planks; `gateUnlocked: true` alone → none).
- [ ] **Step 2: Run** `npx vitest run src/render/terrain.test.ts src/render/scene.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `candidate()` in `terrain.ts` drops any decoration whose box grown by 4 overlaps rows 80–89 (every kind: barrier, outside, mountains, interior). `scene.ts`: a memoised list of `placed("wall", at)` for `wallTiles(REACHABLE_RECT)` whose box intersects `REACHABLE_RECT`, added to `upright`; the gate `placed("gate", P.gate, { frame: input.gateUnlocked ? 0 : 1 })`; planks on `input.towerPowered`.
- [ ] **Step 4: Run** the same command, then `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): the north wall and the barred gate on the map`.

### Task 6: Wall in the ground cache and on the mini-map

**Files:**
- Modify: `src/render/paint.ts` (`createGroundCache`), `src/screens/overworld/MiniMap.tsx` (`paintMiniTerrain`)
- Test: `src/render/paint.test.ts`, `src/screens/overworld/MiniMap.test.tsx`

**Interfaces:**
- Consumes: Task 5's `wallTiles`, Task 4's `wall` sprite.

- [ ] **Step 1: Write the failing tests:**
  - paint `"the ground cache bakes the wall tiles outside the reachable area"`: with the existing `maker()` and `fitWorld({ width: 668, height: 360, dpr: 1 })` (visible art x −7…326), the ground canvas receives `drawImage` of the wall sprite at the tiles k = −1, 0, 19, 20 (art x −16, 0, 304, 320; y 80), offset by the area's origin, and at no tile with k 1–18.
  - mini-map `"paints the wall as a line with a gap at the gate"`: `paintMiniTerrain` on a recording context at 112 × 96 makes `fillRect(0, 45, 50, 1)` and `fillRect(62, 45, 50, 1)` with `fillStyle` `"#475569"` (row `round(85 / 180 × 96)`, gap from `floor(144 × 112 / 320)` to `ceil(176 × 112 / 320)`).
- [ ] **Step 2: Run** `npx vitest run src/render/paint.test.ts src/screens/overworld/MiniMap.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement:** after the baked decorations, the ground cache draws `wallTiles(area)` whose box misses `REACHABLE_RECT`; `paintMiniTerrain` ends with the two wall segments.
- [ ] **Step 4: Run** the same command, then `npm test` and `npx tsc -b`. Expected: PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(render): wall in the ground cache and on the mini-map`.

### Task 7: README and browser check

**Files:**
- Modify: `README.md` ("How to play")
- Scratchpad only: a Playwright script.

- [ ] **Step 1: README:** one paragraph in "How to play": a wall closes the north; solve the gate's terminal to open it; the river stays icy until the Signal Tower is powered, which rebuilds the bridge and lifts the fog.
- [ ] **Step 2: Build and serve:** `npm run build`, then `npx vite preview --port 4173 --strictPort` in the background.
- [ ] **Step 3: Playwright checks** at 1280 × 800 and 390 × 844 @3 (touch), all expected to PASS:
  - walk from camp into the wall (Up × 6 at x 28): position stays at y 52, the log shows the locked line once;
  - click [T] Tower from camp: no logic lock dialog, the locked line in the log;
  - solve the gate on screen (`block`), walk to x 48 and through: top < 49 %;
  - screenshots: locked gate, open gate, explorer in front of and behind the wall, the bridge absent after the gate and present after the tower (Switch A, Switch B, RUN);
  - touch: the D-pad up at the wall is blocked the same way;
  - Same computer team mode: Ana opens the gate, Kai walks through;
  - the landing page at both sizes shows the wall and the barred gate behind the menu;
  - no console errors (the blocked supabase.co WebSocket excepted).
- [ ] **Step 4: Run** `npm test`, `npx tsc -b`, `npm run build`. Expected: all green.
- [ ] **Step 5: Commit** `docs: the north wall in the README`, then push.
