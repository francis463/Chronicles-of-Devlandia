# Pixel-Art Map — Design

**Status:** design approved in the preview's comment thread (style, approach and all three parts) and the first draft of this spec approved in chat. This revision closes the 40 findings of an adversarial review (wf_4a03afa5-293); the user-visible changes from the draft are listed at the end.
**Builds on:** `docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md`, `docs/superpowers/specs/2026-10-07-team-lobby-design.md` and the shipped game (including b0f0880: 4 positions a second, 250 ms teammate glides).

## Goal

Replace the wireframe look of the overworld map (dashed boxes, text labels, a dashed river line, coloured dots) with a 2D top-down pixel-art scene, while keeping the layout, puzzles, HUD, controls, touch D-pad and team play as they are.

## Decisions (from the comment thread)

| Question | Answer |
|---|---|
| Art style | Pixel art: retro 16-bit tiles and sprites |
| Rendering | HTML canvas redrawn every animation frame. The landmark buttons, labels, captions, prompt, inspection card, fog and DOWNED screen stay page elements over the canvas. |
| Assets | All art is pixel grids in code; no image files, no licences. Works in the claude.ai preview, on Vercel and offline. |
| Camera | The whole map fits on one screen; no scrolling. |

## The world

- **Size:** 320 × 180 art pixels. Game coordinates stay percentages (x 6–94, y 10–90) of the world; the **art point** of a game point is `toArt(p) = (round(p.x × 3.2), round(p.y × 1.8))`.
- **Reachable area:** `REACHABLE_RECT` = art x 19–301, y 18–162 (the existing `BOUNDS`).
- **Terrain** is defined per art pixel by `terrainAt(x, y)` for any integer x, y (inside or outside the world). 16 × 16 tile textures only colour the regions: a region's texture is sampled at `(mod(x, 16), mod(y, 16))`, `mod(n, m) = ((n % m) + m) % m`, grid origin at world (0, 0).

| Region (first match wins) | Art pixels | Look |
|---|---|---|
| Ice | `ICE_RECT` = x 77–243, y 50–70 inclusive (x 77, y 50, w 167, h 21) — exactly `RIVER_ZONE` | cracked ice; a 1 px darker bank just outside the rect |
| Mountains | y < 16 | grey rock with snowy peaks |
| Snow | y < 83 | snow |
| Forest | x ≥ 186 and y ≥ 112 | dark forest floor |
| Meadow | everything else | grass |

- **Path:** dirt, 6 px wide, centred on the polyline (90, 130) → (90, 100) → (160, 100) → (160, 92): from the start up to just under the gate.
- **Bridge:** wooden planks over x 147–172, y 47–73 (26 × 27), drawn only when `gateUnlocked`. Rules don't change: once the bridge is restored the whole river is safe, as now.
- **Edge of the walkable area:** just outside `REACHABLE_RECT`, inside the world, a one-tile natural barrier: 16 × 16 bushes (meadow, forest) or rocks (snow) whose boxes lie entirely outside `REACHABLE_RECT`; the mountains already close the top. Outside the world the regions continue as more scenery with dense trees on the sides and bottom, never black bars.
- **Decorations** (pines, trees, rocks, bushes) come from a hash of each 16 × 16 cell's coordinates, so they are deterministic at any coordinate and stable across resizes. Inside `REACHABLE_RECT`: trees are at most 24 px tall and at least 24 px apart, and no decoration's sprite box, grown by 4 px, intersects a **protected box**: `ICE_RECT`, the bridge, the path, any landmark's sprite box, or a 16 × 16 explorer box standing on the start, the dig spot or a landmark's art point.

### Anchors and sizes
Every **upright sprite** (explorers, landmarks, decorations, the semicolon) is drawn **bottom-centre** on its art point `(ax, ay)`: top-left = `(ax − floor(w / 2), ay − h + 1)`, and its **feet row** (the y-sort key) is `ay`. This makes the ice match the damage: you take cold damage exactly when your feet are on the ice. The **dig X** is flat and centred on its point. The **drone** is centred at `(ax, ay − 12)`, hovering at head height.

| Sprite | Size (w × h art px) | Art point |
|---|---|---|
| Explorer | 16 × 16 | its game position |
| Drone | 12 × 12, 2 frames | its game position (drawn centred 12 px above) |
| Signal Tower | 16 × 32 (rows 1–32) | (14, 18) → (45, 32) |
| Supply Cache | 16 × 16, closed / open-and-empty | (82, 18) → (262, 32) |
| Gate | 32 × 16 (rows 75–90, across the snowline) with a green code terminal | (50, 50) → (160, 90) |
| Dig X | 8 × 8, flat | (72, 84) → (230, 151) |
| Golden Semicolon | 8 × 12 | (72, 84) → (230, 151) |
| Pine / tree | 16 × 24 at most | per decoration |
| Rock / bush | 16 × 16 | per decoration |

## Characters and motion
- **Explorer** (you and teammates): a 1 px dark outline; a hood in the player's colour (solo: green `#22c55e`; team: the join-order colour) with a darker hood shade; faces down/up/left/right; a standing frame and two walking frames per direction; left is the mirrored right. The outline keeps the snow-coloured teammate visible on snow.
- **Facing** comes from the latest movement (target − previous target, compared in art pixels; horizontal wins ties; no change on a zero move). Initial facing: down. Teammates face correctly without new network data.
- **Glide:** a new target slides from where the sprite is drawn to the target, linearly, over the entity's glide time, rounded to whole art pixels each frame:

| Entity | Glide | Matches |
|---|---|---|
| Player | 150 ms | `TOUCH_REPEAT_MS` (today's `duration-150`) |
| Teammates | 250 ms | `POS_INTERVAL_MS` (today's 250 ms, b0f0880) |
| Drone | 300 ms | today's `duration-300`; moves every `DRONE_DELAY_MS` |

- **Snaps** (no glide, no facing change): an entity's first appearance, and the player and drone when you respawn (`downed` goes from true to false).
- **Walking frames:** an explorer is walking while it is gliding or moved less than (its glide + 150 ms) ago, so a teammate updated every 250 ms never flashes its standing frame. Walk frame = `1 + floor((t − walkStart) / 125) mod 2` (8 fps), where `walkStart` is the first move after standing. Holding the D-pad, or a key once the OS auto-repeats it, gives a continuous walk.
- **Downed:** your explorer lies flat (the standing-down frame rotated 90° clockwise, same anchor) in greys. It shows only faintly under the unchanged DOWNED overlay. Teammates' health isn't shared, so they are never shown downed.
- **Drone:** sky blue `#38bdf8`; propeller frame `floor(t / 125) mod 2`; y offset −1 when `floor(t / 400)` is odd. It follows with the same delay as now.

## Drawing (canvas)
Each frame, in order:
1. **Ground** from a cache: terrain textures, banks, path, and decorations whose boxes lie entirely outside `REACHABLE_RECT`. Cache key: (backing width, backing height, s, ox, oy). Nothing that depends on game state or time goes in the cache.
2. **Flat overlays**, never sorted: ice glints, the bridge (when unlocked), the dig X (when `clueDecoded` and not `artifactFound`).
3. **Upright sprites sorted by feet row:** decorations inside the reachable area, tower, cache, gate, the semicolon (when `artifactFound`), explorers. Ties: explorers last.
4. **Drone.**
5. **Tint:** the phase colour (`PHASE_TINT`, moved from MapViewport to `scene.ts` and exported: Night `rgba(20,20,28,0.25)`, Dusk `rgba(40,40,32,0.12)`, Day transparent) over the whole canvas. It switches instantly at phase changes (the old 700 ms crossfade is dropped).
6. **Light:** glows and the tower ring, after the tint so they stay bright.

All canvas drawing is `drawImage` of sprite canvases or whole-art-pixel `fillRect`s: no `arc`, gradients or `shadowBlur`.

| Effect | Rule |
|---|---|
| Ice glints | 3 spots at (100, 56), (160, 62), (220, 58); spot i shows a 3 px sparkle when `(t + i × 1000) mod 3000 < 250` |
| Tower, unpowered | lamp pixel red `#ef4444`, lit when `floor(t / 500)` is even |
| Tower, powered | lamp steady green `#4ade80`; ring centred on (45, 32) when `p = (t mod 2000) / 1000 < 1`: radius `4 + floor(24p)`, the midpoint-circle pixels, alpha `1 − floor(4p) / 4` |
| Gate terminal | cursor pixel lit when `floor(t / 530)` is even |
| Dig X | glint when `t mod 1500 < 250` |
| Glows | three nested pixel diamonds (`|dx| + |dy| ≤ r`) of r 2, 4, 6 around the light pixel, alpha 0.5, 0.3, 0.15 × strength. Tower lamp and gate terminal: strength Day 0, Dusk 0.5, Night 1. Golden Semicolon (gold `#fbbf24`): strength 0.25, 0.5, 0.75, 1, 0.75, 0.5 repeating, 267 ms each (1.6 s), at every phase. |

### Reduced motion
If `prefers-reduced-motion: reduce`: glides are instant; a walking frame alternates once per step instead of on a timer; the drone neither bobs nor spins; the lamp is steady (red or green); no ring, glints or blinking cursor; the semicolon glow stays at strength 1; label glides and the fog fade have no transition (`motion-reduce:transition-none`).

## Page layer
### Map area layers (bottom to top)
1. `<canvas aria-hidden="true">` at the map area's top-left, CSS size = backing / DPR.
2. **Fog** `<div data-testid="fog">` covering the map area, **as now**: `radial-gradient(circle farthest-corner at <px>px <py>px, transparent 0%, transparent 15%, rgba(15,23,42,0.35) 32%, rgba(15,23,42,0.7) 62%)`, centred on the middle of the player's sprite (`world.left + ax·scale`, `world.top + (ay − 8)·scale`), computed in px in JS (no `calc()`). `opacity` is 1, or 0 once the tower is powered, with `transition: opacity 1s linear`. Sprites under it are darkened like the terrain (distant teammates included); the labels above it stay readable.
3. **World layer**, a div placed and sized at the world rect: map captions, landmark buttons, character label anchors, the artifact anchor and the dig-spot anchor.
4. **Map-area overlays** as now: the prompt, the inspection card, the DOWNED screen.

### Landmark buttons
- Plain `<button>`s (not the shared `Button`), keeping their accessible names: `[G] Gate`, `[T] Tower` / `[T] Tower ✓`, `[X] Supply Cache` / `[X] Empty Cache`. `CACHE_POSITION` and `TOWER_POSITION` are removed.
- The **hit area** is transparent, centred on the sprite box, `max(44, w·scale) × max(44, h·scale)` CSS px.
- The **caption** is a child of the button and its only text (so it is the accessible name, with no `aria-label`): 10 px uppercase bold on a dark chip `rgba(15,23,42,0.8)`, gate and cache amber, tower sky. It sits 2 px under the hit area, centred, shifted sideways only as far as needed to stay ≥ 2 px inside the map area. Clicking the drawing or the caption activates the button.
- **Hover and keyboard focus:** a 2 px `#0f172a` outline plus a 2 px `#f8fafc` outer ring, which reaches 3:1 against snow and grass. Disabled while downed, as now.

### Map captions
Plain text, 10 px uppercase, muted colour, with a 1 px `#0f172a` text-shadow in 8 directions, `pointer-events-none`, no box. Positions are relative to the world rect:
- `(Snowy Peaks Biome)` centred at (50 %, 4 %), over the mountains;
- `Frozen River` / `Bridge` centred at (42 %, 22 %), above the ice and clear of the tower and cache captions;
- `(Dense Forests Biome)` with its right edge at 97 % and bottom at 98 %, below the dig spot.

### Character labels
- `[Player]`, `[AI Drone]` and teammates' names in their colours, with the same 1 px dark text-shadow.
- Label anchors (`data-testid` `player`, `drone`, `teammate-<name>`) keep `left`/`top` percentages of the world layer and move with `transition: left, top <the entity's glide> linear`.
- `labelLayout(player, drone, world, obstacles, scale)` receives the world rect's CSS size and `scale` = CSS px per art px. Marker boxes are relative to the anchor, in art px × scale:
  - explorer `{ left: −8, right: 8, top: −16, bottom: 0 }`;
  - drone `{ left: −6, right: 6, top: −18, bottom: −6 }`.
  
  Side labels are centred on the box's middle; above and below labels sit outside the box. Obstacles are the semicolon's box (when found) and every teammate's explorer box, so your labels stay off them.
- Teammates' labels go to the right of their box, or to the left when the teammate is in the right 20 % of the world.

### Prompt
`[E] Inspect …` / `[E] Dig here` stays in the map-area layer. Its bottom edge is 4 px above the top of your sprite: `top = world.top + ay·scale − 16·scale − 4` with `translate(−50%, −100%)`, keeping today's 104 px horizontal clamp. If it would end less than 2 px from the map area's top, it goes 4 px below your feet instead. On phones it can use the scenery above the world.

### Anchors for screen readers
- When `artifactFound`: an anchor at (72, 84) with `data-testid="artifact"`, title and sr-only text "Golden Semicolon".
- When `clueDecoded` and not `artifactFound`: an anchor at (72, 84) with `data-testid="dig-spot"` and sr-only text "Dig spot".

### Mini-map
A small canvas behind the existing dots paints `terrainAt` as flat colours (snow, ice, meadow, forest, mountains), stretched to the mini-map box the way the dots are placed today. POI squares, teammate dots and your dot stay as they are.

## Sharp pixels
- MapViewport owns `{ width, height, dpr }` (map-area CSS size from `useMapSize`, `devicePixelRatio`). It updates on its ResizeObserver, on window `resize`, and on a `matchMedia("(resolution: <dpr>dppx)")` change.
- MapViewport computes `world = fitWorld(size, dpr)` once and passes it to MapCanvas, the fog, the world layer and the prompt:
  - `s = max(1, floor(min(width / 320, height / 180) × dpr))` device px per art px;
  - `scale = s / dpr` CSS px per art px;
  - world CSS size `320·scale × 180·scale`;
  - `ox = round((width − 320·scale) / 2 × dpr)` and `oy` likewise, in device px;
  - CSS `left = ox / dpr`, `top = oy / dpr`.
- **Canvas:**
  - backing size `round(width × dpr) × round(height × dpr)`, assigned only when it changes;
  - CSS `image-rendering: pixelated`;
  - every frame starts with `setTransform(1,0,0,1,0,0)`, `imageSmoothingEnabled = false`, then `setTransform(s, 0, 0, s, ox, oy)`.
- Sharpness wins over size. Just below a whole step the world can be about half the fitted size. When `width × dpr < 320`, the world is centred and clipped (the reachable area keeps the player visible).

| Map area, DPR | s | World (CSS px) | At (left, top) |
|---|---|---|---|
| 668 × 360, 1 | 2 | 640 × 360 | (14, 0) |
| 668 × 360, 2 | 4 | 640 × 360 | (14, 0) |
| 668 × 360, 1.25 (Windows 125 %) | 2 | 512 × 288 | (78.4, 36) |
| 668 × 360, 0.9 (zoomed out) | 1 | 355.6 × 200 | (156.7, 80) |
| 354 × 360, 3 (phone) | 3 | 320 × 180 | (17, 90) |
| 600 × 360, 1 (test default) | 1 | 320 × 180 | (140, 90) |

## Architecture

```
src/render/world.ts      WORLD, REACHABLE_RECT, toArt(point), fitWorld(size, dpr) → WorldRect
src/render/pixels.ts     pixel-grid helpers: runs, mirror, rotate90, greyscale, shade, midpoint circle, diamond
src/render/sprites.ts    every sprite and tile texture as a pixel grid + palette, with the sizes above
src/render/terrain.ts    terrainAt(x, y), ICE_RECT, BRIDGE_RECT, PATH, decorations(range), protected boxes
src/render/motion.ts     per-entity glide / facing / walking tracker
src/render/scene.ts      PHASE_TINT, buildScene(input, motions, t, reducedMotion) → Scene (no canvas)
src/render/paint.ts      sprite cache, ground cache, paintScene(ctx, scene, world, ...)
src/hooks/useReducedMotion.ts
src/screens/overworld/MapCanvas.tsx   canvas element and animation loop
```
Modified:
- `MapViewport.tsx`: size state, fitWorld, canvas + fog + world layer, landmark buttons, captions, prompt placement.
- `labelLayout.ts`: world size, marker boxes, obstacles.
- `MiniMap.tsx`: terrain canvas.
- `Overworld.tsx`: passes `clueDecoded`.
- `vitest.setup.ts`: canvas stub.

### Data flow
- Game rules, the reducer, puzzles and team sync are unchanged.
- `MapCanvas` keeps the latest props in a ref. One `requestAnimationFrame` loop reads them and updates `motion` for the player, drone and each teammate (dropping teammates who left). It then calls `buildScene` and then `paintScene`.
- The loop starts only when a 2D context exists and stops on unmount. Browsers already pause it in hidden tabs.
- `scene.ts` is pure: same input and time, same scene. `paint.ts` only draws what the scene lists.
- Sprite canvases are built once per sprite, frame and colour (team colours, greys for downed) through an injected `makeCanvas`, so tests can pass fakes.

### Fallback
- If `getContext("2d")` returns null (old browsers, jsdom), there is no loop: the map area keeps its plain `--panel` background and the page layer works fully.
- `vitest.setup.ts` stubs `HTMLCanvasElement.prototype.getContext` **by assignment** to return null, not with `vi.spyOn` (which `restoreAllMocks` would undo).
- `useReducedMotion` returns false where `matchMedia` is missing.

## Testing
- **Unit:**
  - `world.test.ts`: every `fitWorld` row above, `toArt` rounding.
  - `pixels.test.ts`: run merging, mirror, rotate90 clockwise, greyscale, midpoint circle, diamond.
  - `sprites.test.ts`: every grid rectangular and of the size in the table, only palette characters, explorer frames with an outline.
  - `terrain.test.ts`:
    - `ICE_RECT` = x 77, y 50, w 167, h 21;
    - `terrainAt` at sample points, including negative and beyond-world coordinates;
    - path pixels;
    - decorations are deterministic; inside the reachable area, no grown decoration box intersects a protected box, and trees are ≤ 24 px tall and ≥ 24 px apart;
    - barrier boxes lie outside `REACHABLE_RECT`.
  - `motion.test.ts`:
    - glide timing and interruption, per-entity durations;
    - facing (art-pixel comparison, horizontal ties);
    - walking window and frames;
    - a teammate updated every 250 ms never shows the standing frame between updates;
    - snaps on first appearance and respawn;
    - reduced motion.
  - `scene.test.ts`:
    - chest open when looted; bridge only when unlocked; X only when decoded and not found; semicolon when found;
    - flat overlays (bridge, X) precede every explorer whatever their rows;
    - y-sort with explorers last on ties; drone after the sorted sprites;
    - downed pose for the player only; teammate colours;
    - lamp blink, ring radius and alpha at given times, glow strength by phase, semicolon glow steps;
    - tint equals `PHASE_TINT`;
    - reduced motion turns ambient effects off.
  - `paint.test.ts`, with a recording fake context:
    - smoothing off and the transform from `fitWorld` on every call;
    - the ground cache reused for the same key and rebuilt on a new one;
    - sprites at whole art pixels; tint over the whole canvas;
    - no `arc` or gradient calls.
  - `labelLayout.test.ts`:
    - the existing grid at world sizes 320 × 180 (scale 1) and 640 × 360 (scale 2) with the new boxes;
    - teammate and semicolon obstacles;
    - the right-edge teammate rule.
- **Existing tests:** all of them (261 at the time of writing) pass, with these edits:
  - `Overworld.test.tsx:311` and `TeamOverworld.test.tsx:83` assert fog `opacity` "0" instead of "no gradient";
  - `labelLayout.test.ts` moves to the new signature;
  - marker positions are still read from `left`/`top`.
- **New component tests:**
  - landmark hit areas ≥ 44 px (inline width/height), each caption inside its button;
  - at world 320 × 180 the caption boxes (7 px per character, 15 px lines, chip padding) don't intersect each other, a landmark sprite box or the dig spot, and the cache caption stays ≥ 2 px inside a 324 px map;
  - the prompt box doesn't intersect your sprite box at world 320 × 180 and 640 × 360;
  - the fog has a 1 s opacity transition;
  - the canvas is `aria-hidden`; the dig-spot anchor appears only while the clue is decoded and not found;
  - nothing crashes when `getContext` returns null.
- **Browser (Playwright, built preview):**
  - **Screenshots:**
    - 1280 (DPR 1), 1440 (DPR 2), 1280 (DPR 1.25), 390 (DPR 3) and 360 (DPR 3);
    - by day (reached with `page.clock` fast-forward) and by night;
    - before and after the bridge and the tower, and with the dig spot showing.
  - **Checks:**
    - a canvas pixel sample proves it isn't blank;
    - "no blur": inside a terrain patch away from glows, glints and captions, on a page screenshot taken by day with the tower powered (no fog, no tint), every s × s device-pixel block is a single colour;
    - the hood colour sampled under the same conditions equals the player's colour;
    - frame rate ≥ 50 fps over 2 s on desktop;
    - no console errors except the blocked supabase.co connection in this environment;
    - in Same computer mode, two pages see each other's explorer.

## Out of scope
Scrolling camera, collisions with trees or walls, new areas, sound, character customisation, teammates' drones, flowing water, weather, spreading teammates' spawn points.

## Changes from the approved draft (user-visible)
1. **Glides:** player 150 ms, teammates 250 ms, drone 300 ms, matching how often each moves (the draft said 120 ms for all, which would have made teammates and the drone hop).
2. **Fog:** exactly as today; the draft's numbers made it noticeably lighter.
3. **Biome captions** lose their dashed boxes and move to fixed spots: Snowy Peaks over the mountains, Dense Forests in the bottom-right corner, the river label just above the ice. Otherwise on phones they would cover the tower and the dig spot.
4. **The [E] prompt** sits just above your character instead of a fixed distance; otherwise it covers your character on phones.
5. **A visible edge** around the walkable area: bushes and rocks just outside it, with trees beyond.
6. **Your labels avoid teammates**, and teammates' names flip left near the right edge, where they used to be cut off. Teammates who spawn on the same spot still overlap until someone moves.
7. **Map buttons** get a two-tone focus ring that shows on snow.
8. **The downed pose** shows only faintly under the DOWNED screen.
9. **At Windows 125 % scaling** the map is drawn at 512 × 288 to stay sharp.
10. **The day/night tint** switches instantly instead of fading over 0.7 s.
