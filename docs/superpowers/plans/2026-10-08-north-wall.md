# North Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A wall across the map at the snow line whose locked gate is the only way north, with the Signal Tower taking over rebuilding the bridge.

**Architecture:** One pure rule module (`src/game/wall.ts`) decides whether a step crosses the wall and whether it is blocked. The game reducer applies it to every move and refuses remote use of the north landmarks from south of a locked gate. The renderer draws the wall on the same line: the 18 tiles inside the world are y-sorted upright sprites, tiles beyond the world's edges are baked into the ground in feet-row order with the scenery, the gate gets a barred frame, and the bridge planks follow `towerPowered`.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Vitest (jsdom), Playwright (browser check, scratchpad only).

**Spec:** `docs/superpowers/specs/2026-10-08-north-wall-design.md`

## Global Constraints

- Game coordinates are percentages, x 6–94, y 10–90, steps of 4: `WALL_Y = 49`, `GATE_OPENING = { minX: 47, maxX: 53 }` inclusive (players pass at x 48, 50, 52).
- Every copy string is the spec's "New" column, verbatim (Copy changes table).
- Art: 320 × 180; upright sprites bottom-centre anchored, y-sorted by feet row, explorers last on ties; only `drawImage` / `fillRect` on canvases.
- Wall tiles at art points `(8 + 16k, 89)`, k skipping the gate's box (art x 144–175); inside the world k = 0–8 and 11–19; `WALL_RECT = { x: 0, y: 80, w: 320, h: 10 }`.
- No new dependencies. TDD: every new test is run and seen to fail before the code it covers, except tests marked **guard** (they hold before and after).
- Each commit ends with the two trailer lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub`.
- After every task: `npm test` and `npx tsc -b` green.

## Review Focus

1. **Holding a key or the D-pad against the wall** (keyboard repeat, touch repeat every 150 ms): one log line, no stamina loss, the same state object. Pinned in Task 2 ("a held key against the wall logs once").
2. **A teammate opens the gate while you push against it:** your next step through the opening passes. Pinned in Task 2 ("a teammate's gate opens your way through").
3. **Clicking the tower or cache from camp while the gate is locked** must not power the tower or loot the cache. Pinned in Task 2 ("remote use of north landmarks waits for the gate").
4. **Standing at the gate or the map's side edges** (x 50 at y 50/46; x 6 or 94 at y 48): the explorer is in front of the gate and wall from the south and behind them from the north. Pinned in Task 5 ("…including at the edges" and "an explorer in the gate opening sorts around the gate").
5. **After the gate, before the tower:** the river still drains HP through the real timer, no planks, caption "Frozen River". Pinned in Task 3 ("solving the gate does not stop the cold").

---

### Task 1: The wall rule

**Files:**
- Create: `src/game/wall.ts`, `src/game/wall.test.ts`

**Interfaces:**
- Produces:
  - `export const WALL_Y = 49;`
  - `export const GATE_OPENING = { minX: 47, maxX: 53 } as const;`
  - `export type WallBlock = "locked" | "solid";`
  - `export function crossesWall(from: Point, to: Point): boolean` — `(from.y < WALL_Y) !== (to.y < WALL_Y)`
  - `export function isNorthOfWall(p: Point): boolean` — `p.y < WALL_Y`
  - `export function wallBlock(from: Point, to: Point, gateOpen: boolean): WallBlock | null` — `null` unless crossing; `"locked"` when closed; `"solid"` when open and `from.x` outside `GATE_OPENING`

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

it("once open, crossings pass between the posts (x 48, 50, 52) and are solid elsewhere, posts included", () => {
  for (const x of [48, 50, 52]) for (const [a, b] of CROSSINGS) expect(wallBlock({ x, y: a }, { x, y: b }, true)).toBeNull();
  for (const x of [6, 44, 46, 54, 56, 94]) for (const [a, b] of CROSSINGS) expect(wallBlock({ x, y: a }, { x, y: b }, true)).toBe("solid");
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
- [ ] **Step 3: Implement** `src/game/wall.ts` per the Produces block.
- [ ] **Step 4: Run** the same command. Expected: PASS (4 tests).
- [ ] **Step 5: Commit** `feat(game): the north wall rule`.

### Task 2: Moving and reaching past the wall

**Files:**
- Modify: `src/game/reducer.ts` (`move`, `interact`), `src/game/constants.ts` (`LOG.wallLocked`, `LOG.wallSolid`)
- Test: `src/game/reducer.test.ts`; existing tests in `src/screens/overworld/Overworld.test.tsx`, `src/App.test.tsx`, `src/screens/overworld/TeamOverworld.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`wallBlock`, `isNorthOfWall`).
- Produces: `LOG.wallLocked = "The gate is locked. Solve its terminal to pass."`, `LOG.wallSolid = "The wall is solid here. Go through the gate."`

- [ ] **Step 1: Write the new tests** in `src/game/reducer.test.ts`, in `describe("gameReducer: the north wall")` (`opened = { ...s0, gateUnlocked: true }`):
  - `"a step into the locked wall stays put, costs no stamina and logs the locked line"`: from `{ ...s0, player: { x: 30, y: 52 } }`, `move up` → player `{ x: 30, y: 52 }`, stamina 100, `lastLog` = `LOG.wallLocked`, `logCount` + 1.
  - `"a held key against the wall logs once"`: a second `move up` from that result returns the very same state object (`toBe`), and four more leave `logCount` + 1 in total.
  - **guard** `"through the open gate's opening a step moves and costs stamina"`: `{ ...opened, player: { x: 48, y: 52 } }` `move up` → `{ x: 48, y: 48 }`, stamina 99.
  - `"with the gate open the wall is solid elsewhere, posts included"`: `{ ...opened, player: { x: 30, y: 52 } }` and `{ ...opened, player: { x: 54, y: 52 } }` `move up` → stay, `lastLog` = `LOG.wallSolid`.
  - `"a teammate's gate opens your way through"`: from `{ ...s0, player: { x: 48, y: 52 } }`: `move up` (blocked) → `teamSync` with `{ ...NO_FLAGS, gateUnlocked: true }` by `"Ana"` → `move up` → player `{ x: 48, y: 48 }`.
  - `"remote use of north landmarks waits for the gate"`: from `s0` (camp, locked): `interact tower` → `logicOpen` false, `inspected` `"tower"`, `lastLog` `LOG.wallLocked`; `interact chest` → `hasLoot` false, `inspected` `"chest"`; `interact river` → `inspected` `"river"`, `lastLog` `LOG.wallLocked`. **guard:** from `opened` the tower opens its lock and the chest loots; from the north side (`{ ...s0, player: { x: 14, y: 26 } }`, locked) the tower opens its lock.
  - `"the gate is the only way north (reachability)"`: a breadth-first walk over the reducer's moves from `PLAYER_START`, positions only:

```ts
function reachable(gateUnlocked: boolean) {
  const seen = new Map<string, Point>([["28,72", PLAYER_START]]);
  const queue: Point[] = [PLAYER_START];
  const crossings: Point[] = [];
  while (queue.length) {
    const p = queue.shift()!;
    for (const dir of ["up", "down", "left", "right"] as const) {
      const q = gameReducer({ ...s0, gateUnlocked, player: p }, { type: "move", dir }).player;
      if (isNorthOfWall(q) !== isNorthOfWall(p)) crossings.push(p);
      const k = `${q.x},${q.y}`;
      if (!seen.has(k)) { seen.set(k, q); queue.push(q); }
    }
  }
  return { points: [...seen.values()], crossings };
}
const inReach = (points: Point[], poi: Point) => points.some((p) => Math.hypot(p.x - poi.x, p.y - poi.y) <= INTERACT_RADIUS);
```

  Locked: `inReach` false for the tower, chest and river POIs, true for the gate POI and `HIDDEN_ARTIFACT`; no point has `y < 49`. Open: all five in reach; every crossing has `x` 48, 50 or 52.
- [ ] **Step 2: Run** `npx vitest run src/game/reducer.test.ts`. Expected: the new non-guard tests FAIL; the guards and the rest PASS.
- [ ] **Step 3: Implement.**
  - `move`: after the downed/modal guard, compute the clamped `player` as now, then `const block = wallBlock(state.player, player, state.gateUnlocked)`. If blocked: `const line = block === "locked" ? LOG.wallLocked : LOG.wallSolid;` return `state.logs.at(-1) === line ? state : pushLog(state, line)`.
  - `interact` for `"tower"`, `"chest"` and `"river"`, after the downed/modal guard: when `!state.gateUnlocked && !isNorthOfWall(state.player)`, return `{ ...state, inspected: action.poi }` with `LOG.wallLocked` pushed unless it is already the newest line.
- [ ] **Step 4: Move the existing tests that walk through the wall or use the tower, cache or river from camp to an open gate** (setups only; assertions unchanged):
  - `reducer.test.ts`, start from `opened`: "chest: loots once, then reports empty", "river: logs the scan", "keeps only the last six log entries but counts every entry", the hidden-artifact `looted` setup (used by "the Supply Cache also yields…", "opens the cipher only once…", "a correct decode…", "a wrong decode…", "closeCipher…", "ignores movement while the cipher is open"), and every "signal tower logic lock" test that interacts with the tower ("interacting with the tower opens…", "does not reopen the lock once the tower is powered" as `{ ...opened, towerPowered: true }`, "the solved circuit…", "a failing circuit…", "closeLogic…", "ignores movement while the logic lock is open").
  - `Overworld.test.tsx`, `initial={{ gateUnlocked: true }}`: "looting the supply cache logs…", "shows an inspection card that can be closed", "looting the cache adds the encrypted scroll…", "the tower button opens the logic lock…"; "the drone keeps following while the player moves continuously" uses `initial={{ gateUnlocked: true, player: { x: 48, y: 72 } }}` (player top 32 %, drone moved > 15).
  - `App.test.tsx` "[=] Menu returns to the main menu and Solo Quest starts a fresh game": after Solo Quest, click "[G] Gate" and type `block{Enter}` before looting the cache.
  - `TeamOverworld.test.tsx`: in "shares progress: a teammate powering the tower…" Ana first clicks "[G] Gate" and types `block{Enter}`; in "keeps playing through a dropped connection…" Kai does the same before the connection drops.
- [ ] **Step 5: Run** `npm test` and `npx tsc -b`. Expected: all PASS, tsc clean.
- [ ] **Step 6: Commit** `feat(game): the wall blocks every way north but the open gate`.

### Task 3: The Signal Tower rebuilds the bridge; new story text

**Files:**
- Modify: `src/game/reducer.ts` (`riverDamage`, river `interact`, `submitCode`, `submitLogic`, open-gate `interact`), `src/game/constants.ts`, `src/game/team.ts`, `src/hooks/useGameTimers.ts`, `src/screens/TerminalModal.tsx`, `src/screens/overworld/MapViewport.tsx`, `src/render/scene.ts` (planks)
- Test: `src/game/reducer.test.ts`, `src/game/team.test.ts`, `src/screens/TerminalModal.test.tsx`, `src/screens/overworld/MapViewport.test.tsx`, `src/screens/overworld/Overworld.test.tsx`, `src/screens/overworld/TeamOverworld.test.tsx`, `src/render/scene.test.ts`

**Interfaces:**
- Consumes: Task 2's `LOG` additions and test setups.
- Produces:
  - `LOG.gateUnlocked` (renamed from `LOG.bridgeRestored`), `LOG.gateOpen`, `LOG.towerPowered` with the spec's new text;
  - `INSPECT_COPY` type `{ default: string; looted?: string; opened?: string; bridged?: string; powered?: string }`; the gate's open text is `opened`.

- [ ] **Step 1: Change the existing tests to the new story, and add two** (these are this task's failing tests):
  - `reducer.test.ts`: "starts at the spec's positions…" expects line 3 `"Objective: open the north gate, then survey the frozen river."`; "does nothing once the bridge is restored…" uses `towerPowered: true`; "gate: does not reopen the terminal once unlocked" expects `"Gate open. The way north is clear."`; "river: the scan reports a safe crossing once the bridge is restored" starts from `{ ...opened, towerPowered: true }`; "a correct answer unlocks the gate…" expects `"Gate unlocked. The way north is open."`; "a wrong answer keeps the terminal open…" expects `"… keeps the gate shut."`; "the solved circuit powers the tower…" expects `"Signal tower online: the fog lifts and the bridge returns."`; "teamSync ORs teammates' flags in…" takes the new team lines. New: `"solving the gate leaves the river icy"`: `{ ...opened, player: { x: 50, y: 33 } }` `riverDamage` → hp 92.
  - `team.test.ts`: `"Ana opened the gate."` and `"Ana powered the signal tower. The fog lifts and the bridge returns."`.
  - `TerminalModal.test.tsx` "renders a labelled modal dialog…": `"Fix the CSS styling property below to open the north gate."` and `"1 | .north-gate {"`.
  - `MapViewport.test.tsx` "keeps the map captions, without dashed boxes": the rerender uses `towerPowered: true` for `"Bridge"`, and `gateUnlocked: true` alone still shows `"Frozen River"`.
  - `Overworld.test.tsx`: "labels the river as a bridge once the gate is unlocked" becomes "…once the tower is powered" (`towerPowered: true` → `"Bridge"`; `gateUnlocked: true` → `"Frozen River"`); "describes the locked gate…" expects `"A locked compiler gate in the north wall. Its terminal leads to the code puzzle."`; "describes the open gate and the safe bridge…" expects `"The compiler gate stands open. The way north is clear."` and renders the river with `{ gateUnlocked: true, towerPowered: true }`; "updates the open gate card the moment the puzzle is solved" expects the new open text; "a wrong answer keeps the terminal open with an error" expects `"Compile error: display: flex keeps the gate shut."`; "solving the puzzle closes the terminal and restores the bridge" becomes "…opens the gate", expects `"Gate unlocked. The way north is open."` and `"Frozen River"`; "the tower button opens the logic lock…" expects `"Signal tower online: the fog lifts and the bridge returns."`, the card `"The signal tower hums. Its beam keeps the fog away and holds the bridge."` and `"Bridge"`. New in "Overworld timers", mirroring "the river drains 8 HP every 1.8 seconds": `"solving the gate does not stop the cold"` (`initial={{ gateUnlocked: true, player: { x: 50, y: 33 } }}`, advance 1800 → first meter `aria-valuenow` `"92"`) and **guard** `"a powered tower stops the cold"` (`initial={{ towerPowered: true, player: { x: 50, y: 33 } }}`, advance 3600 → `"100"`).
  - `TeamOverworld.test.tsx`: "shares progress: a teammate powering the tower…" counts `"Ana powered the signal tower. The fog lifts and the bridge returns."` and `"Signal tower online: the fog lifts and the bridge returns."`; "a player joining after the start…" expects Zed to see `"Frozen River"` and `"Ana opened the gate."`.
  - `scene.test.ts`: "bridge planks only when unlocked, covering BRIDGE_RECT" becomes "…only when the tower is powered…" (`towerPowered: true` → planks; `gateUnlocked: true` alone → none); "flat overlays come before every explorer whatever their rows" uses `towerPowered: true` for its planks.
- [ ] **Step 2: Run** `npm test`. Expected: exactly those tests FAIL (the guard passes).
- [ ] **Step 3: Implement** the copy table in `constants.ts`, `team.ts` and `TerminalModal.tsx`; `riverDamage`, the river `interact` and `useGameTimers`'s `draining` read `towerPowered`; `MapViewport`'s card is `(hasLoot && copy.looted) || (gateUnlocked && copy.opened) || (towerPowered && (copy.bridged ?? copy.powered)) || copy.default` and the river caption `towerPowered ? "Bridge" : "Frozen River"`; `scene.ts` draws the planks on `input.towerPowered`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(game): the Signal Tower rebuilds the bridge`.

### Task 4: Wall and gate sprites

**Files:**
- Modify: `src/render/sprites.ts`
- Test: `src/render/sprites.test.ts`

**Interfaces:**
- Produces: `SpriteId` gains `"wall"`; `SPRITES.wall` (16 × 10, `anchor: "bottom"`); `SPRITES.gate.frames` = `[open, locked]`.

- [ ] **Step 1: Write the failing tests:**
  - `"wall: 16 × 10, bottom-anchored, fully opaque, snow cap on top and shadow below"`: no `"."` in any row; every pixel of row 0 is `#e2e8f0`, of row 9 `#334155`.
  - `"gate: an open and a locked frame; bars only when locked"`: frame 0 columns 5–24 of rows 4–14 are all `"."`; in frame 1 rows 4–13, columns 6, 9, …, 24 are `#1e293b`, columns 5, 8, …, 23 are `#64748b`, columns 7, 10, …, 22 are `"."` (except row 8, where columns 5–24 are all `#1e293b`), and row 14 columns 5–24 are `"."`.
  - `"both gate frames continue the wall's brick pattern"`: for rows 5–14 and both frames, column 0's colour equals the wall's row `r − 5` column 0 and column 31's equals the wall's column 15.
  - Update `"sizes and frame counts match the spec"`: gate 32 × 16 with 2 frames; wall 16 × 10 with 1.
- [ ] **Step 2: Run** `npx vitest run src/render/sprites.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with these grids. `wall`, palette `{ c: "#e2e8f0", h: "#94a3b8", S: "#64748b", m: "#475569", K: "#334155" }`:

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

  `gate` palette adds `c: "#e2e8f0"`, `w: "#64748b"`, `b: "#1e293b"`. Frame 0 (open) is today's grid with rows 5–14 replaced by:

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

  Frame 1 (locked) is frame 0 with columns 5–24 of rows 4–13 set to `wb.wb.wb.wb.wb.wb.wb`, except row 8, which gets `bbbbbbbbbbbbbbbbbbbb`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): wall sprite and a barred gate frame`.

### Task 5: The wall in the world

**Files:**
- Modify: `src/render/terrain.ts`, `src/render/scene.ts`
- Test: `src/render/terrain.test.ts`, `src/render/scene.test.ts`

**Interfaces:**
- Consumes: Task 4's `wall` sprite and gate frames.
- Produces:
  - `export const WALL_RECT: Rect = { x: 0, y: 80, w: 320, h: 10 };`
  - `export function wallTiles(range: Rect): ArtPoint[]` — art points `(8 + 16k, 89)` of every tile whose 16 × 10 box intersects `range` and does not overlap the gate's box (art x 144–175).

- [ ] **Step 1: Write the failing tests:**
  - terrain `"wall tiles: 18 inside the world at feet row 89, none over the gate"`: `wallTiles(WALL_RECT)` has 18 points, all `y` 89, `x` = 8, 24, …, 136, 184, …, 312; none of their boxes intersects `spriteBox("gate", LANDMARK_POINTS.gate)`.
  - terrain `"wall tiles continue beyond the world, by box"`: `wallTiles({ x: -7, y: 0, w: 334, h: 180 })` includes x −8 and 328 (boxes −16…−1 and 320…335, partly in range); `wallTiles({ x: 0, y: 0, w: 320, h: 70 })` is empty.
  - terrain `"no interior decoration comes near the wall"`: for `decorations(REACHABLE_RECT)` whose box intersects `REACHABLE_RECT`, no `grow(box, 4)` overlaps rows 80–89. The existing "barrier … closes the sides and bottom" test stays unchanged and passing.
  - scene `"the wall stands across the world; north of it is behind, south in front, including at the edges"`: `scene()` has 18 `"wall"` uprights; with the player at `{ x: 30, y: 48 }`, `{ x: 6, y: 48 }` and `{ x: 94, y: 48 }` the explorer's index is below every wall tile's; at `{ x: 30, y: 52 }` above.
  - scene `"an explorer in the gate opening sorts around the gate"`: player `{ x: 50, y: 50 }` after the gate, `{ x: 50, y: 46 }` before it.
  - scene `"the gate is barred while locked and open once solved"`: the gate's frame is 1 with `gateUnlocked: false`, 0 with `true`.
  - Update scene "upright sprites sorted by feet row, explorers last on ties" to take each height from `SPRITES[d.sprite].h` instead of its hard-coded table.
- [ ] **Step 2: Run** `npx vitest run src/render/terrain.test.ts src/render/scene.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** `candidate()` in `terrain.ts`: an **interior** candidate whose box grown by 4 overlaps rows 80–89 returns `null` (barrier, outside and mountain candidates are unchanged). `scene.ts`: a memoised list of `placed("wall", at)` for `wallTiles(WALL_RECT)` added to `upright`; the gate `placed("gate", P.gate, { frame: input.gateUnlocked ? 0 : 1 })`.
- [ ] **Step 4: Run** the same command, then `npm test` and `npx tsc -b`. Expected: PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(render): the north wall and the barred gate on the map`.

### Task 6: Wall beyond the world's edges and on the mini-map

**Files:**
- Modify: `src/render/paint.ts` (`createGroundCache`), `src/screens/overworld/MiniMap.tsx` (`paintMiniTerrain`)
- Test: `src/render/paint.test.ts`, `src/screens/overworld/MiniMap.test.tsx`

**Interfaces:**
- Consumes: Task 5's `wallTiles`, Task 4's `wall` sprite, Task 1's `WALL_Y`.

- [ ] **Step 1: Write the failing tests:**
  - paint `"the ground cache bakes only the wall tiles beyond the world, in feet-row order with the scenery"`: keep each made canvas's recorder in `maker()`. With `fitWorld({ width: 668, height: 360, dpr: 1 })` (visible art x −7…326), the ground canvas draws the wall image (`sprites.get("wall", 0, "base", false, false)`) exactly at the tiles k = −1 and 20 (art x −16 and 320, y 80, offset by the area's origin) and at no tile k 0–19; and its `drawImage` sequence is sorted by feet row (decoration `at.y`, wall 89), a wall tile first on a tie.
  - mini-map `"paints the wall as a dark line with a gap at the gate"`: `paintMiniTerrain` on a recording context at 112 × 96 makes `fillRect(0, 47, 51, 1)` and `fillRect(62, 47, 50, 1)` with `fillStyle` `"#1e293b"`; at 336 × 288 the wall rows are 141–143. The existing "paints flat terrain colours stretched to the box" (every pixel once) stays unchanged and passing.
- [ ] **Step 2: Run** `npx vitest run src/render/paint.test.ts src/screens/overworld/MiniMap.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** Ground cache: build one list of baked decorations and `wallTiles(area)` whose box is beyond the world (box x < 0 or ≥ 320), sort by feet row (wall first on a tie), draw in that order. `paintMiniTerrain`: rows `Math.round((WALL_Y / 100) * height)` … `+ Math.max(1, Math.round(height / 96)) − 1` use `#1e293b` for every column whose sampled art x (`Math.round((x / width) * 320)`) is outside 144–175, in place of the terrain colour, inside the existing run loop.
- [ ] **Step 4: Run** the same command, then `npm test` and `npx tsc -b`. Expected: PASS, tsc clean.
- [ ] **Step 5: Commit** `feat(render): the wall beyond the edges and on the mini-map`.

### Task 7: README and browser check

**Files:**
- Modify: `README.md`
- Scratchpad only: a Playwright script.

- [ ] **Step 1: README:** the intro sentence (fixing the CSS bug at the terminal gate opens the way north); "How to play": rewrite the quest, terminal gate and signal tower lines (a wall closes the north; open the gate first; the river drains HP until the Signal Tower is powered, which rebuilds the bridge and lifts the fog); "Team Lobby": the gate in the shared-progress list and the example line *"Kai opened the gate."*
- [ ] **Step 2: Build and serve:** `npm run build`, then `npx vite preview --port 4173 --strictPort` in the background.
- [ ] **Step 3: Playwright checks** at 1280 × 800 and 390 × 844 @3 (touch), all expected to PASS:
  - from camp press Up × 6: the player stops at top 52 %, the log shows the locked line once;
  - click [T] Tower from camp: no logic lock dialog, the locked line in the log;
  - solve the gate on screen (`block`), walk to x 48 and up through it: top below 49 %; at x 54 the step up is refused with the solid line;
  - screenshots: barred gate, open gate, an explorer in front of and behind the wall, at the far left edge behind the wall, no bridge after the gate, the bridge after the tower (Switch A, Switch B, RUN);
  - touch: the D-pad up at the wall is blocked the same way;
  - Same computer team mode: Ana opens the gate, Kai walks through;
  - the landing page at 1280 shows the wall and the barred gate behind the menu;
  - no console errors (the blocked supabase.co WebSocket excepted).
- [ ] **Step 4: Run** `npm test`, `npx tsc -b`, `npm run build`. Expected: all green.
- [ ] **Step 5: Commit** `docs: the north wall in the README`, then push.
