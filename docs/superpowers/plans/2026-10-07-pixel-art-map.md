# Pixel-Art Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wireframe overworld map with a 2D top-down pixel-art scene drawn on a canvas, keeping the layout, rules, HUD, controls and team play unchanged.

**Architecture:**
- Pure modules in `src/render/` hold the world geometry, pixel grids, sprites, terrain, per-entity motion and the scene description. Only `paint.ts` touches a 2D context.
- `MapCanvas` runs one `requestAnimationFrame` loop that turns the latest props into a `Scene` and paints it.
- `MapViewport` owns the map size (including DPR), computes the world rect once, and places the canvas, the fog and a world-aligned page layer (buttons, captions, labels, anchors) from that one rect.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Vitest + Testing Library (jsdom), Playwright (browser checks). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-07-pixel-art-map-design.md`

## Global Constraints

- **Dependencies:** none new. All art is pixel grids in code: no image files, no fonts beyond the existing JetBrains Mono.
- **Unchanged:** game rules, the reducer, puzzles, team sync, HUD, touch D-pad. Copy is verbatim, including button names `[G] Gate`, `[T] Tower` / `[T] Tower ✓`, `[X] Supply Cache` / `[X] Empty Cache`, captions `(Snowy Peaks Biome)`, `Frozen River` / `Bridge`, `(Dense Forests Biome)`, and prompts `[E] Inspect …` / `[E] Dig here`.
- **World:** 320 × 180 art px. `toArt(p) = (round(p.x × 3.2), round(p.y × 1.8))`. `REACHABLE_RECT` covers x 19–301, y 18–162.
- **Rect convention:** `{ x, y, w, h }` covers columns `x … x+w−1` and rows `y … y+h−1`.
- **Terrain, first match wins:**
  1. ice: `ICE_RECT = { x: 77, y: 50, w: 167, h: 21 }`
  2. mountains: y < 16
  3. snow: y < 83
  4. forest: x ≥ 186 and y ≥ 112
  5. meadow: everything else
- **Fixed rects:** `BRIDGE_RECT = { x: 147, y: 47, w: 26, h: 27 }`. Path: polyline (90,130) → (90,100) → (160,100) → (160,92), 6 px wide.
- **Anchors:** upright sprites are drawn bottom-centre, with top-left `(ax − floor(w/2), ay − h + 1)` and feet row `ay`. The dig X is centred. The drone is centred at `(ax, ay − 12)`.
- **Sprite sizes:** explorer 16×16, drone 12×12, tower 16×32 at (45,32), chest 16×16 at (262,32), gate 32×16 at (160,90), dig X 8×8 at (230,151), semicolon 8×12 at (230,151), pine/tree ≤ 16×24, rock/bush 16×16.
- **Motion:**
  - glide player 150 ms, teammates 250 ms, drone 300 ms, linear;
  - walking window = glide + 150 ms; walk frame `1 + floor((t − walkStart)/125) mod 2`;
  - snaps on first appearance and on respawn.
- **Canvas:** only `drawImage` and whole-art-pixel `fillRect`; never `arc`, gradients or `shadowBlur`. Every frame: `setTransform(1,0,0,1,0,0)`, `imageSmoothingEnabled = false`, `setTransform(s,0,0,s,ox,oy)`. Canvas CSS: `image-rendering: pixelated`.
- **fitWorld:**
  - `s = max(1, floor(min(w/320, h/180) × dpr))`, `scale = s/dpr`;
  - `ox = round((w − 320·scale)/2 × dpr)`, `oy` likewise;
  - `left = ox/dpr`, `top = oy/dpr`.
- **Fog:** as today: `circle farthest-corner` with stops 15 / 32 / 62 %, centred on `(left + ax·scale, top + (ay−8)·scale)` in px; opacity 1 → 0 when powered; `transition: opacity 1s linear`.
- **Tests:** all existing tests (261) pass, with only the edits named in Tasks 7–8. `npx tsc -b` and `npm run build` stay clean.
- **Commits:** every commit message ends with the session's two trailer lines (`Co-Authored-By: …` and `Claude-Session: …`). No model names in commits.

## Decisions (beyond the spec)

1. **Layout maths in one pure module:** `src/screens/overworld/mapLayout.ts` holds caption boxes, hit areas and the prompt position, so geometry tests don't need a DOM.
2. **Sprite variants:** palette variants are keyed by a string: `"base"`, a hood colour like `"#f472b6"`, or `"grey"`. The sprite cache builds each (sprite, frame, variant, flip, rotate) lazily.
3. **Ground cache:** drawn at art resolution, one canvas px per art px, covering the visible art range. It is then `drawImage`d under the `s` transform, so it stays crisp and cheap.
4. **Decorations inside `REACHABLE_RECT`** are computed once (module memo) and y-sorted every frame. Decorations entirely outside it are baked into the ground cache.

## Review Focus

1. **DPR changes without a resize** (window dragged to a 2× monitor, browser zoom) → the canvas and the world layer re-fit together and stay sharp. *Test: Task 8, "re-fits when the device pixel ratio changes with the size unchanged".*
2. **The reduced-motion setting toggled mid-game** → glides, ambient effects, label glides and the fog fade follow the new setting without a reload. *Test: Task 6, "useReducedMotion follows the media query's change event".*
3. **A teammate leaving, or coming back with a new colour, mid-game** → no ghost sprite; the new colour's sprites are built on demand. *Tests: Task 6, "drops motions of teammates who left"; Task 5, "builds a new colour variant lazily".*
4. **A very small view (width × dpr < 320)** → no crash and no negative sizes; the world is centred and clipped. *Test: Task 1, "fitWorld of a 300-px-wide view centres and clips".*
5. **A tab hidden for minutes, then shown** → poses settle at their targets with the standing frame, with no long glide replay. *Test: Task 3, "a pose long after the last move is at the target, standing".*

## File Structure

| File | Responsibility |
|---|---|
| `src/render/world.ts` (new) | `WORLD`, `REACHABLE_RECT`, `Rect`, `intersects`, `grow`, `toArt`, `fitWorld` |
| `src/render/pixels.ts` (new) | grid helpers: runs, mirror, rotate90, greyscale, shade, circle and diamond pixels |
| `src/render/sprites.ts` (new) | all sprite grids, palettes, tile textures, `explorerPalette`, `spriteBox` |
| `src/render/terrain.ts` (new) | `terrainAt`, `ICE_RECT`, `BRIDGE_RECT`, path, decorations, protected boxes |
| `src/render/motion.ts` (new) | per-entity glide, facing and walking poses |
| `src/render/scene.ts` (new) | `PHASE_TINT`, `buildScene` |
| `src/render/paint.ts` (new) | sprite cache, ground cache, `paintScene` |
| `src/hooks/useReducedMotion.ts` (new) | the `prefers-reduced-motion` media query as state |
| `src/screens/overworld/MapCanvas.tsx` (new) | canvas element, backing size, rAF loop |
| `src/screens/overworld/mapLayout.ts` (new) | caption boxes, hit areas, prompt position (pure) |
| `src/screens/overworld/labelLayout.ts` (modify) | world size, marker boxes, obstacles, teammate side |
| `src/screens/overworld/MapViewport.tsx` (modify) | size + DPR state, fitWorld, layers, landmark buttons, captions, prompt, anchors |
| `src/screens/overworld/MiniMap.tsx` (modify) | terrain canvas behind the dots |
| `src/screens/overworld/Overworld.tsx` (modify) | passes `clueDecoded` |
| `vitest.setup.ts` (modify) | `getContext` stub by assignment |

---

### Task 1: World geometry

**Files:** Create `src/render/world.ts`, `src/render/world.test.ts`

**Interfaces:**
- Produces:
  - `WORLD = { width: 320, height: 180 }`
  - `type Rect = { x: number; y: number; w: number; h: number }`
  - `REACHABLE_RECT: Rect = { x: 19, y: 18, w: 283, h: 145 }`
  - `intersects(a: Rect, b: Rect): boolean`
  - `grow(r: Rect, by: number): Rect`
  - `type ArtPoint = { x: number; y: number }`
  - `toArt(p: Point): ArtPoint`
  - `type ViewSize = { width: number; height: number; dpr: number }`
  - `type WorldRect = { s: number; scale: number; ox: number; oy: number; left: number; top: number; width: number; height: number; backingWidth: number; backingHeight: number }`
  - `fitWorld(view: ViewSize): WorldRect`, where backing = `round(width·dpr) × round(height·dpr)`

- [ ] **Step 1: Write the failing tests** `world.test.ts`:
  - `"fits the spec's examples"`: a table of `[width, height, dpr] → [s, worldWidth, worldHeight, left, top]` (rounded to 0.1):
    - 668×360×1 → 2, 640, 360, 14, 0
    - 668×360×2 → 4, 640, 360, 14, 0
    - 668×360×1.25 → 2, 512, 288, 78.4, 36
    - 668×360×0.9 → 1, 355.6, 200, 156.7, 80
    - 354×360×3 → 3, 320, 180, 17, 90
    - 600×360×1 → 1, 320, 180, 140, 90
    
    Also assert `ox`/`oy` are integers and backing is 835×450 for the 1.25 row.
  - `"fitWorld of a 300-px-wide view centres and clips"` (Review Focus 4): `fitWorld({width:300,height:360,dpr:1})` gives s 1, width 320, left −10, backing 300×360.
  - `"toArt rounds percentages to art pixels"`:
    - (24,28) → (77,50); (76,39) → (243,70); (14,18) → (45,32)
    - (82,18) → (262,32); (50,50) → (160,90); (72,84) → (230,151); (28,72) → (90,130)
  - `"REACHABLE_RECT covers BOUNDS"`: corners `toArt(6,10)` and `toArt(94,90)` are inside, and one step further out is not.
  - `"intersects and grow"`: touching rects (x 0 w 10 and x 10 w 5) don't intersect; `grow({x:5,y:5,w:2,h:2}, 1)` → `{4,4,4,4}`.
- [ ] **Step 2: Run** `npx vitest run src/render/world.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `world.ts`** with the signatures above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): world geometry and fitWorld`.

### Task 2: Pixel grids and sprites

**Files:** Create `src/render/pixels.ts`, `src/render/sprites.ts`, `src/render/pixels.test.ts`, `src/render/sprites.test.ts`

**Interfaces:**
- Consumes: `Rect`, `ArtPoint` (Task 1).
- Produces (`pixels.ts`):
  - `type PixelGrid = readonly string[]`, where `"."` is transparent
  - `type Palette = Readonly<Record<string, string>>`
  - `type Run = { x: number; y: number; w: number; color: string }`
  - `gridRuns(grid, palette): Run[]`: horizontal same-colour runs, row-major
  - `mirror(grid): PixelGrid`
  - `rotate90(grid): PixelGrid` (clockwise)
  - `greyscale(palette): Palette` (luma `round(0.299r + 0.587g + 0.114b)`)
  - `shade(hex, amount): string` (−1 black … +1 white)
  - `circlePixels(r): ArtPoint[]` (midpoint circle offsets, unique)
  - `diamondPixels(r): ArtPoint[]` (`|dx| + |dy| ≤ r`)
- Produces (`sprites.ts`):
  - `type Facing = "down" | "up" | "left" | "right"`
  - `type SpriteId = "explorer-down" | "explorer-up" | "explorer-right" | "drone" | "tower" | "chest-closed" | "chest-open" | "gate" | "x-mark" | "semicolon" | "pine" | "tree" | "rock" | "bush" | "snow-rock" | "plank"`
  - `type SpriteDef = { w: number; h: number; frames: PixelGrid[]; palette: Palette; anchor: "bottom" | "centre" | "hover" }`
  - `SPRITES: Record<SpriteId, SpriteDef>`. Explorer ids have 3 frames (stand, walkA, walkB); the drone has 2; the rest have 1.
  - `type TextureId = "ice" | "mountains" | "snow" | "forest" | "meadow" | "path" | "bank"`
  - `TEXTURES: Record<TextureId, { grid: PixelGrid; palette: Palette }>` (16×16 each)
  - `OUTLINE = "#0b1020"`
  - `explorerPalette(hood: string): Palette` (hood, `shade(hood, −0.3)`, outline, skin, cloak, eyes)
  - `spriteBox(id: SpriteId, at: ArtPoint): Rect`, following the spec's anchors
  - `LIGHTS = { towerLamp: ArtPoint, gateTerminal: ArtPoint }`: absolute art pixels of the light sources

- [ ] **Step 1: Write the failing tests:**
  - `pixels.test.ts`:
    - `gridRuns([".aab"], {a:"#111111", b:"#222222"})` → `[{x:1,y:0,w:2,color:"#111111"}, {x:3,y:0,w:1,color:"#222222"}]`
    - `mirror(["ab."])` → `[".ba"]`; `rotate90(["ab","cd"])` → `["ca","db"]`
    - `greyscale({a:"#ff0000"}).a` → `"#4c4c4c"`
    - `shade("#22c55e", −1)` → `"#000000"`; `shade("#000000", 1)` → `"#ffffff"`
    - `circlePixels(4)` contains (4,0), (0,4), (−4,0), (0,−4) with no duplicates; `diamondPixels(2)` has 13 points
  - `sprites.test.ts`:
    - `"every grid is rectangular, of its declared size, and uses only palette characters"` (all `SPRITES` frames and `TEXTURES`)
    - `"sizes match the spec"`: explorer 16×16, drone 12×12, tower 16×32, chests 16×16, gate 32×16, x-mark 8×8, semicolon 8×12, pine/tree h ≤ 24, rock/bush/snow-rock 16×16
    - `"explorer frames have a dark outline"`: every non-transparent pixel on a frame's silhouette edge is `OUTLINE`
    - `"explorer palette uses the hood colour and a darker shade"`
    - `"spriteBox anchors"`:
      - `spriteBox("tower", {x:45,y:32})` → `{x:37,y:1,w:16,h:32}`
      - `spriteBox("gate", {x:160,y:90})` → `{x:144,y:75,w:32,h:16}`
      - `spriteBox("x-mark", {x:230,y:151})` → `{x:226,y:147,w:8,h:8}`
      - `spriteBox("drone", {x:100,y:100})` → `{x:94,y:82,w:12,h:12}`
- [ ] **Step 2: Run** `npx vitest run src/render/pixels.test.ts src/render/sprites.test.ts`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement `pixels.ts`, then author `sprites.ts`.** Art is the implementer's choice within the sizes and the look the spec describes:
  - tower: mast with a lamp at its top row;
  - gate: stone arch with a small green terminal;
  - chest: closed and open-empty;
  - semicolon: gold;
  - the explorer's hood takes the palette key `h` (hood) and `H` (shade).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): pixel grid helpers and sprites`.

### Task 3: Terrain and motion

**Files:** Create `src/render/terrain.ts`, `src/render/motion.ts`, `src/render/terrain.test.ts`, `src/render/motion.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Rect`, `ArtPoint`, `REACHABLE_RECT`, `intersects`, `grow`, `toArt`), Task 2 (`SpriteId`, `spriteBox`, `Facing`).
- Produces (`terrain.ts`):
  - `type TerrainKind = "ice" | "mountains" | "snow" | "forest" | "meadow"`
  - `terrainAt(x: number, y: number): TerrainKind` (any integer)
  - `ICE_RECT`, `BRIDGE_RECT`
  - `PATH: ArtPoint[]`, `PATH_WIDTH = 6`, `onPath(x, y): boolean`
  - `LANDMARK_POINTS = { tower: {x:45,y:32}, chest: {x:262,y:32}, gate: {x:160,y:90}, dig: {x:230,y:151}, start: {x:90,y:130} }`
  - `type Decoration = { sprite: "pine" | "tree" | "rock" | "bush" | "snow-rock"; at: ArtPoint }`
  - `decorations(range: Rect): Decoration[]`: per 16×16 cell hash, deterministic, includes the barrier
  - `protectedBoxes(): Rect[]`
- Produces (`motion.ts`):
  - `type EntityKind = "player" | "teammate" | "drone"`
  - `GLIDE_MS = { player: 150, teammate: 250, drone: 300 }`, `WALK_EXTRA_MS = 150`, `WALK_FRAME_MS = 125`
  - `type Motion = { kind: EntityKind; from: ArtPoint; to: ArtPoint; start: number; facing: Facing; lastMove: number; walkStart: number; steps: number }`
  - `createMotion(kind, at, t): Motion` (a snap)
  - `retarget(m, to, t, reduced): Motion` (same object if `to` is unchanged)
  - `snap(m, to, t): Motion` (no facing change)
  - `type Pose = { x: number; y: number; facing: Facing; frame: 0 | 1 | 2 }`
  - `poseAt(m, t, reduced): Pose` (whole art px)

- [ ] **Step 1: Write the failing tests:**
  - `terrain.test.ts`:
    - `"regions by art pixel, inside and outside the world"`:
      - (77,50) and (243,70) are `"ice"`; (76,50), (244,70) and (100,71) are not
      - (10,15) mountains, (10,16) snow, (10,82) snow, (10,83) meadow
      - (186,112) forest, (185,112) meadow, (186,111) meadow
      - (−20,−40) mountains, (400,300) forest, (−20,150) meadow
    - `"path"`: `onPath(90,115)`, `onPath(125,100)`, `onPath(160,93)` are true; `onPath(120,115)` is false
    - `"decorations are deterministic"`: two calls over the same range are equal; a sub-range returns the subset
    - `"inside the reachable area no grown decoration box hits a protected box, trees ≤ 24 px tall and ≥ 24 px apart"`
    - `"barrier decorations lie outside REACHABLE_RECT"`: every decoration whose box touches the world but not the reachable rect is a bush or a rock, and its box doesn't intersect `REACHABLE_RECT`
  - `motion.test.ts`, all poses at whole art px:
    - `"player glides over 150 ms, linearly"`: from (0,0) to (12,0) at t 0 → x 6 at t 75, x 12 at t 150
    - `"a new target mid-glide starts from where the sprite is drawn"`
    - `"per-entity durations"`: teammate 250, drone 300
    - `"facing from the move in art px; horizontal wins ties; zero move keeps facing"`
    - `"walking frames alternate every 125 ms while moving and stop after glide + 150 ms"`
    - `"a teammate updated every 250 ms never shows the standing frame between updates"`
    - `"snap: no glide, facing kept"`
    - `"reduced motion: instant, walk frame alternates per step"`
    - `"a pose long after the last move is at the target, standing"` (Review Focus 5): t = start + 10 min
- [ ] **Step 2: Run** `npx vitest run src/render/terrain.test.ts src/render/motion.test.ts`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement `terrain.ts` and `motion.ts`.**
  - Hash: `h = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0`, then mulberry32 seeded by `h` to pick kind and offset within the cell.
  - Reject a candidate that breaks a keep-clear or spacing rule (spacing is checked against neighbouring cells' accepted candidates, so the result doesn't depend on range order).
  - Barrier cells (touching the world, outside `REACHABLE_RECT` grown by 1) get one bush or rock placed so its box stays outside.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): terrain and per-entity motion`.

### Task 4: Scene

**Files:** Create `src/render/scene.ts`, `src/render/scene.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3, plus `phaseOf` (`src/game/clock.ts`) and `Phase`.
- Produces:
  - `PHASE_TINT: Record<Phase, string>`: Night `"rgba(20,20,28,0.25)"`, Dusk `"rgba(40,40,32,0.12)"`, Day `"transparent"`
  - `type SceneInput = { player: Point; drone: Point; teammates: { id: string; name: string; color: string; x: number; y: number }[]; playerColor: string; downed: boolean; hasLoot: boolean; gateUnlocked: boolean; clueDecoded: boolean; artifactFound: boolean; towerPowered: boolean; minutes: number }`
  - `type Poses = { player: Pose; drone: Pose; teammates: Record<string, Pose> }`
  - `type Drawable = { sprite: SpriteId; frame: number; x: number; y: number; flip: boolean; rotate: boolean; variant: string }`, where x/y is the top-left in art px
  - `type Pixel = { x: number; y: number; color: string; alpha: number }`
  - `type Scene = { glints: Pixel[]; flat: Drawable[]; upright: Drawable[]; drone: Drawable; tint: string; light: Pixel[] }`
  - `buildScene(input, poses, t, reduced): Scene`

- [ ] **Step 1: Write the failing tests** `scene.test.ts`. Use a `base` input at the start, a `posesFor(input)` helper (poses at the art points, standing, facing down) and t = 0 unless stated.
  - `"chest open only when looted"`; `"bridge planks only when unlocked, covering BRIDGE_RECT"`
  - `"X only while decoded and not found; semicolon only when found"`
  - `"flat overlays come before every explorer whatever their rows"`: an explorer standing on the bridge (feet row 50) is in `upright`; planks are in `flat`
  - `"upright sprites sorted by feet row, explorers last on ties"`; `"the drone is separate and hovers 12 px up"`
  - `"teammates use their colour as the variant; the player uses playerColor"`
  - `"downed: the player is rotated and grey; teammates never are"`
  - `"tower lamp blinks red every 500 ms when unpowered, steady green when powered"`
  - `"ring radius and alpha"`: powered at t 0 → radius 4, alpha 1; t 500 → radius 16, alpha 0.5; t 1500 → no ring pixels
  - `"glow strength by phase"`: Day 0 (no lamp/terminal glow pixels), Dusk alphas 0.25/0.15/0.075, Night 0.5/0.3/0.15
  - `"semicolon glow steps 0.25, 0.5, 0.75, 1, 0.75, 0.5 every 267 ms"`
  - `"tint equals PHASE_TINT for the phase"`
  - `"reduced motion: steady lamp, no ring, no glints, cursor on, semicolon glow at 1, drone still"`
- [ ] **Step 2: Run** `npx vitest run src/render/scene.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `buildScene`.** Decorations inside the reachable area come from a module-level memo of `decorations(REACHABLE_RECT)`. Light pixels follow the spec's effects table, centred on `LIGHTS` and the semicolon's centre pixel.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): scene description`.

### Task 5: Painting

**Files:** Create `src/render/paint.ts`, `src/render/paint.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `type Ctx2D = { setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void; drawImage(image: CanvasImageSource, x: number, y: number): void; fillRect(x: number, y: number, w: number, h: number): void; clearRect(x: number, y: number, w: number, h: number): void; fillStyle: string | CanvasGradient | CanvasPattern; globalAlpha: number; imageSmoothingEnabled: boolean }`
  - `type MakeCanvas = (w: number, h: number) => { image: CanvasImageSource; ctx: Ctx2D } | null`
  - `createSpriteCache(make: MakeCanvas): SpriteCache`, with `get(sprite, frame, variant, flip, rotate): CanvasImageSource | null` (lazy, memoised)
  - `createGroundCache(make: MakeCanvas, sprites: SpriteCache): GroundCache`, with `get(world: WorldRect): { image: CanvasImageSource; x: number; y: number } | null`. Keyed by (backingWidth, backingHeight, s, ox, oy); x/y is the art coordinate of its top-left.
  - `paintScene(ctx: Ctx2D, scene: Scene, world: WorldRect, sprites: SpriteCache, ground: GroundCache): void`

- [ ] **Step 1: Write the failing tests** `paint.test.ts`, with a recording fake `Ctx2D`/`MakeCanvas` that logs calls:
  - `"every call resets the transform, turns smoothing off and applies s, ox, oy"`: first calls `setTransform(1,0,0,1,0,0)`, then `imageSmoothingEnabled === false`, then `setTransform(2,0,0,2,28,0)` for `fitWorld({668,360,2})`
  - `"draws ground, glints, flat, upright, drone, tint, light in that order"`
  - `"sprites land on whole art pixels"`
  - `"tint fills the whole canvas"`: under the identity transform, `fillRect(0,0,backingWidth,backingHeight)`
  - `"the ground cache is reused for the same key and rebuilt on a new one"`
  - `"builds a new colour variant lazily"` (Review Focus 3): `get("explorer-down",0,"#f472b6",false,false)` calls `make` once; a second get doesn't call it again
  - `"never draws arcs or gradients"`: the fake has no `arc`/`createRadialGradient`, and painting a full scene throws nothing
- [ ] **Step 2: Run** `npx vitest run src/render/paint.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `paint.ts`.**
  - Sprite canvases are drawn from `gridRuns` with `fillRect`.
  - The ground is an art-resolution canvas covering the visible art range `[floor(−ox/s), ceil((backingWidth − ox)/s))` × the same for y. It is painted from `terrainAt` + `TEXTURES` with one `fillRect` per same-colour horizontal run of art pixels, then the bank lines, the path and the baked decorations.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(render): sprite and ground caches, paintScene`.

### Task 6: MapCanvas and reduced motion

**Files:** Create `src/hooks/useReducedMotion.ts`, `src/screens/overworld/MapCanvas.tsx`, `src/hooks/useReducedMotion.test.tsx`, `src/screens/overworld/MapCanvas.test.tsx`. Modify `vitest.setup.ts`.

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `useReducedMotion(): boolean`
  - `MapCanvas({ input, world }: { input: SceneInput; world: WorldRect }): JSX.Element`: a `<canvas aria-hidden="true" data-testid="map-canvas">` with `position: absolute; left: 0; top: 0`, CSS size `backing/dpr` and `image-rendering: pixelated`

- [ ] **Step 1: Add the stub, then write the failing tests:**
  - `vitest.setup.ts`: `HTMLCanvasElement.prototype.getContext = (() => null) as never;` (assignment, not `vi.spyOn`).
  - `useReducedMotion.test.tsx`:
    - `"false without matchMedia"`
    - `"useReducedMotion follows the media query's change event"` (Review Focus 2): a fake `matchMedia` whose listener fires `matches: true` → the hook returns true
  - `MapCanvas.test.tsx`:
    - `"renders an aria-hidden canvas sized from the world rect and paints nothing without a context"` (no throw; width/height attributes equal backing)
    - `"with a fake context, paints on animation frames"`: temporarily assign `getContext` to return a recording `Ctx2D`; with fake timers (rAF faked), after `vi.advanceTimersByTime(16)` the recording has `setTransform`
    - `"assigns canvas.width/height only when the backing size changes"`
    - `"drops motions of teammates who left"` (Review Focus 3): rerender without a teammate, advance a frame, and the next scene (exposed via an `onScene` test prop) has no teammate drawable
    - `"snaps the player and drone when downed turns false"`
- [ ] **Step 2: Run** `npx vitest run src/hooks/useReducedMotion.test.tsx src/screens/overworld/MapCanvas.test.tsx`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement.**
  - MapCanvas keeps the props in a ref and keeps `Map<string, Motion>` for "player", "drone" and each teammate id.
  - Per frame: retarget or snap, `poseAt`, `buildScene`, `paintScene`.
  - The optional `onScene?: (s: Scene) => void` prop is for tests only.
  - The loop starts in an effect when `getContext("2d")` returns a context and cancels on unmount.
- [ ] **Step 4: Run** the same command, then `npm test`. Expected: PASS; full suite green.
- [ ] **Step 5: Commit** `feat(overworld): MapCanvas animation loop and reduced motion`.

### Task 7: Label layout with sprite boxes

**Files:** Modify `src/screens/overworld/labelLayout.ts`, `src/screens/overworld/labelLayout.test.ts`

**Interfaces:**
- Produces:
  - `type MarkerBox = { left: number; right: number; top: number; bottom: number }` (art px relative to the anchor)
  - `EXPLORER_BOX = { left: −8, right: 8, top: −16, bottom: 0 }`
  - `DRONE_BOX = { left: −6, right: 6, top: −18, bottom: −6 }`
  - `SEMICOLON_BOX = { left: −4, right: 4, top: −12, bottom: 0 }`
  - `type Obstacle = Point & { box: MarkerBox }`
  - `labelLayout(player, drone, world: MapSize, obstacles?: Obstacle[], scale = 1)`
  - `labelBoxes(player, drone, world, layout, scale = 1)`
  - `teammateLabelSide(x: number): "right" | "left"` (left when x > 80)
  - `LABEL_GAP = 8`: CSS px between a box edge and its label. Side labels are centred on the box's vertical middle; above and below labels sit outside the box.

- [ ] **Step 1: Rewrite the tests:**
  - `world320 = {320, 180}` at scale 1 and `world640 = {640, 360}` at scale 2 replace the phone/desktop map sizes.
  - Keep `"keeps both labels on the right when far apart"`, `"points the labels away at the spawn point"` (player (28,72), drone (36,70) at world320) and the full grid test over both worlds.
  - Change the obstacle test to `SEMICOLON_BOX` at scale 2.
  - Add `"keeps your labels off a teammate standing next to you"`: a teammate obstacle where the drone's right label would go, at world320.
  - Add `"teammate labels flip left in the right 20 %"`: `teammateLabelSide(81)` → "left", `(80)` → "right".
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld/labelLayout.test.ts`. Expected: FAIL, new signature and exports missing.
- [ ] **Step 3: Implement.** Replace `MARKERS` radii with boxes × scale. Keep the candidate search and cost function.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then update MapViewport's existing call to the new obstacle shape (the found artifact becomes `{ ...HIDDEN_ARTIFACT, box: SEMICOLON_BOX }`, scale left at the default) so `npx tsc -b` stays clean; Task 8 switches it to the world size and scale.
- [ ] **Step 5: Commit** `feat(overworld): label layout from sprite boxes, teammate obstacles`.

### Task 8: MapViewport on the canvas

**Files:**
- Create: `src/screens/overworld/mapLayout.ts`, `src/screens/overworld/mapLayout.test.ts`
- Modify: `src/screens/overworld/MapViewport.tsx`, `src/screens/overworld/Overworld.tsx`, `src/screens/overworld/Overworld.test.tsx` (line 311), `src/screens/overworld/TeamOverworld.test.tsx` (line 83)
- Test: `src/screens/overworld/MapViewport.test.tsx` (new)

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces (`mapLayout.ts`), with all rects in CSS px relative to the map area:
  - `CHAR_W = 7`, `LINE_H = 15`, `CHIP = { padX: 4, padY: 2, border: 1 }`
  - `type CssRect = { left: number; top: number; width: number; height: number }`
  - `hitArea(spriteBox: Rect, world: WorldRect): CssRect` (centred, `max(44, w·scale) × max(44, h·scale)`)
  - `captionRect(text: string, hit: CssRect, map: { width: number; height: number }): CssRect` (2 px under the hit area, clamped ≥ 2 px inside the map)
  - `MAP_CAPTIONS`:
    - `{ id: "peaks", at: {x:50,y:4}, align: "centre" }`
    - `{ id: "river", at: {x:42,y:22}, align: "centre" }`
    - `{ id: "forest", at: {x:97,y:98}, align: "right-bottom" }`
  - `mapCaptionRect(id, text, world): CssRect`
  - `promptRect(text: string, player: ArtPoint, world: WorldRect, map: { width: number; height: number }): CssRect & { below: boolean }` (bottom 4 px above the sprite top, 104 px horizontal clamp, or 4 px below the feet when it would end < 2 px from the top)
- Produces (`MapViewport.tsx`):
  - `useMapSize()` returns `{ width, height, dpr }`. It updates on ResizeObserver, window `resize`, and `matchMedia("(resolution: <dpr>dppx)")` change. It falls back to 600 × 360 and `devicePixelRatio || 1`.
  - New prop `clueDecoded: boolean`.

- [ ] **Step 1: Write the failing tests:**
  - `mapLayout.test.ts`:
    - `"hit areas are at least 44 px and centred on the drawing"` at `fitWorld({354,360,3})` and `fitWorld({668,360,1})`
    - `"at a 320×180 world no caption box intersects another, a landmark sprite box or the dig spot"`: all landmark captions (both texts of each) plus the three map captions, with sprite boxes converted to CSS
    - `"the cache caption stays ≥ 2 px inside a 324-px map"`: `fitWorld({324,360,3})`
    - `"the prompt never covers your sprite"`, at worlds 320×180 and 640×360 with the player at the gate, tower, cache and dig spot
    - `"the prompt goes below the feet when there is no room above"`
  - `MapViewport.test.tsx`, rendering MapViewport directly with fixed props (jsdom default 600×360, dpr 1 → world 320×180 at 140, 90):
    - `"places the world layer at the world rect"`: left 140px, top 90px, width 320px, height 180px
    - `"landmark buttons keep their names, are ≥ 44 px, and contain their caption"`
    - `"the canvas is aria-hidden"`
    - `"fog: gradient centred on the player in px, opacity 1, then 0 when powered, with a 1 s opacity transition"`
    - `"dig-spot anchor only while the clue is decoded and not found; artifact anchor when found"`
    - `"re-fits when the device pixel ratio changes with the size unchanged"` (Review Focus 1): set `devicePixelRatio` 2 and fire the fake `matchMedia` change, and the world layer stays 320×180 (s 2), the canvas backing doubles
    - `"nothing crashes without a 2D context"`
  - Edit `Overworld.test.tsx:311` and `TeamOverworld.test.tsx:83` to `expect(...getByTestId("fog").style.opacity).toBe("0")`.
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld/`. Expected: the new tests and the two edited assertions FAIL; the rest PASS.
- [ ] **Step 3: Implement `mapLayout.ts`, then restructure `MapViewport.tsx` per the spec's layers.**
  - Remove `CACHE_POSITION`, `TOWER_POSITION`, `PHASE_TINT` and the tint div.
  - Landmark buttons are plain `<button>`s with the two-tone ring (`focus-visible:outline-2 outline-[#0f172a]` plus `shadow-[0_0_0_4px_#f8fafc]`).
  - Captions get an 8-direction text-shadow utility class.
  - Label anchors use `transition-[left,top] ease-linear motion-reduce:transition-none` with `duration-150` / `duration-[250ms]` / `duration-300`.
  - The fog uses `transition-opacity duration-1000 ease-linear motion-reduce:transition-none`.
  - The prompt uses `promptRect`.
  - `labelLayout` gets the world size, `world.scale`, and obstacles: the semicolon when found, plus every teammate's `EXPLORER_BOX`.
  - Teammate labels use `teammateLabelSide(t.x)`.
  - Overworld passes `clueDecoded={state.clueDecoded}`.
- [ ] **Step 4: Run** `npm test` and `npx tsc -b`. Expected: all tests PASS (261 existing + new), tsc clean.
- [ ] **Step 5: Commit** `feat(overworld): pixel-art map on canvas with world-aligned page layer`.

### Task 9: Mini-map terrain

**Files:** Modify `src/screens/overworld/MiniMap.tsx`. Test: `src/screens/overworld/MiniMap.test.tsx` (new).

**Interfaces:**
- Consumes: `terrainAt` (Task 3).
- Produces: `MINI_COLORS: Record<TerrainKind, string>` and `paintMiniTerrain(ctx: Ctx2D, width: number, height: number): void`, which fills one rect per same-colour run of `terrainAt(round(x/width·320), round(y/height·180))`.

- [ ] **Step 1: Write the failing tests:**
  - `"paints flat terrain colours stretched to the box"`: a recording ctx at 112×96 gets fills in the ice colour around (56, 30) and the forest colour near (100, 90)
  - `"keeps the dots and renders an aria-hidden canvas behind them"`
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld/MiniMap.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** The canvas is absolute, behind the dots, backing = box × dpr, painted once per size. Remove the dashed river line.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(overworld): mini-map terrain`.

### Task 10: Browser verification and README

**Files:** Modify `README.md`. Browser scripts live in the session scratchpad (not committed).

- [ ] **Step 1: Build and serve:** `npm run build`, then `npx vite preview --port 4173 --strictPort` (background).
- [ ] **Step 2: Run a Playwright script covering the spec's browser list.**
  - **Screenshots:**
    - viewports 1280 (DPR 1), 1440 (DPR 2), 1280 (DPR 1.25), 390 (DPR 3) and 360 (DPR 3), by day and by night;
    - `page.clock.install()` before load, then `fastForward` to reach Day (≈ 254 s of play) and Night;
    - before and after the bridge (solve `block`) and the tower (A and B on), and with the dig spot (decode `DENSE FOREST`).
  - **Checks:**
    - the canvas isn't blank (pixel variance);
    - no blur: by day with the tower powered, on a page screenshot, every s × s device block in a meadow patch is a single colour;
    - the hood colour sampled from the screenshot equals `#22c55e`;
    - ≥ 50 fps over 2 s at 1280;
    - no console errors except the blocked `supabase.co` WebSocket;
    - Same computer team mode: two pages see each other's explorer (hood colour at the teammate's anchor).
  - Expected: all PASS; screenshots reviewed by eye.
- [ ] **Step 3: Re-run the existing browser suites** (team, touch, labels, markers, run) and update any check that depended on the old DOM markers or dashed captions. Expected: all PASS.
- [ ] **Step 4: README:** in "How to play", one paragraph on the pixel-art map and the reduced-motion setting. In the project layout, add `src/render/`.
- [ ] **Step 5: Commit** `docs: pixel-art map in README`, then push.
