# Pixel-Art Map — Design

**Status:** design approved in the preview's comment thread (style, approach and all three parts); this document awaits review.
**Builds on:** `docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md`, `docs/superpowers/specs/2026-10-07-team-lobby-design.md` and the shipped game.

## Goal

Replace the wireframe look of the overworld map (dashed boxes, text labels, a dashed river line, coloured dots) with a 2D top-down pixel-art scene, while keeping the layout, puzzles, HUD, controls, touch D-pad and team play exactly as they are.

## Decisions (from the comment thread)

| Question | Answer |
|---|---|
| Art style | Pixel art: retro 16-bit tiles and sprites |
| Rendering | HTML canvas redrawn every animation frame (chosen over SVG grids and asset packs). The landmark buttons, labels, prompt, inspection card, fog and DOWNED screen stay page elements over the canvas. |
| Assets | All art is pixel grids in code; no image files, no licences. Works in the claude.ai preview, on Vercel and offline. |
| Camera | The whole map fits on one screen; no scrolling. |

## Player experience

### The scene
- **World:** 320 × 180 art pixels, built from 16 × 16 tiles. Game coordinates stay percentages (x 6–94, y 10–90) of this world; art position = `(x / 100 × 320, y / 100 × 180)`, rounded to whole art pixels.
- **Fit:** the world keeps its shape and scales by a whole number of *device* pixels per art pixel, so pixels stay square and sharp (see "Sharp pixels"). The canvas fills the whole map area; space around the world shows more scenery (mountains, snow, meadow, forest continuing past the edges), never black bars.
  - Desktop map 668 × 360 → world 640 × 360 CSS px (2× at DPR 1 or 2).
  - Phone map 354 × 360 or 324 × 360 at DPR 3 → world 320 × 180 CSS px (1×), with scenery above and below.
- **Places** (positions unchanged):
  | Place | Where | Art |
  |---|---|---|
  | Mountains | top band, y < 9 % (above the reachable area) | grey rock with snowy peaks |
  | Snowy Peaks | y < 46 % | snow tiles, snowy pines, rocks |
  | Signal Tower | (14, 18) | metal radio mast with a lamp |
  | Supply Cache | (82, 18) | wooden chest; open and empty once looted |
  | Frozen River | exactly `RIVER_ZONE` (x 24–76 %, y 28–39 %) → art rect x 77–243, y 50–70 | cracked ice with banks |
  | Bridge | x 46–54 %, from 2 % above to 2 % below the river; only when `gateUnlocked` | wooden planks over the ice |
  | Gate | (50, 50), straddling the snowline | stone archway with a small green code terminal |
  | Meadow | y ≥ 46 % outside the forest; the start (28, 72) is here | grass, a dirt path from the start to the gate |
  | Dense Forest | x ≥ 58 % and y ≥ 62 %, continuing past the right and bottom edges | dark forest floor and trees |
  | Dig spot | (72, 84); only when `clueDecoded` and not `artifactFound` | a glinting X |
  | Golden Semicolon | (72, 84); only when `artifactFound` | a glowing golden `;` |
- What hurts matches what you see: the ice covers exactly the cold-damage zone. Rules don't change: once the bridge is restored the whole river is safe, as now.
- Trees, rocks and bushes are decorations at fixed positions (generated once from a fixed seed). None sits on the ice, the path, the bridge, or within 6 % of a landmark, the dig spot or the start.
- **Day / dusk / night:** the existing `PHASE_TINT` colours are painted over the whole canvas. Light sources are drawn after the tint so they stay bright: the gate terminal and tower lamp glow at dusk (half strength) and night (full); the artifact glows at all times.
- **Fog:** until the tower is powered, darkness covers the map except a circle around you (clear to 17 % of the world width, 0.35 alpha at 37 %, 0.7 at 72 %). It covers the whole map area, scenery included. Powering the tower fades it out over 1 s.

### Characters
- **Explorer** (you and teammates): 16 × 16, a 1-pixel dark outline, a hood in the player's colour (solo: green `#22c55e`; team: the join-order colour), faces down/up/left/right, a standing frame and two walking frames per direction. Left is the mirrored right.
- **Facing** comes from the latest movement: compare the move in art pixels; horizontal wins ties. Initial facing: down. Teammates face correctly without new network data.
- **Glide:** a position change slides to the new spot over 120 ms (linear); a change mid-glide starts from where the sprite is drawn. Step size and movement rules are unchanged.
- **Walking frames:** while the explorer moved within the last 200 ms, frames alternate every 125 ms (8 fps); otherwise the standing frame. Holding a key or the D-pad gives a continuous walk.
- **Downed:** your explorer lies flat (the standing-down frame rotated 90°) in greys. Teammates' health isn't shared, so they are never shown downed.
- **Drone:** 12 × 12, sky blue `#38bdf8`, a two-frame propeller (125 ms) and a 1-pixel bob every 400 ms. It is drawn above everything else on the ground. It follows with the same delay as now.
- **Draw order:** ground, then decorations, landmarks and explorers sorted by the y of their feet, then the drone, tint and glows.

### Scenery animation
| Thing | Animation |
|---|---|
| Ice | three fixed glint spots, each sparkling for 250 ms every 3 s, staggered by 1 s |
| Tower, unpowered | lamp blinks red `#ef4444`, 500 ms on / 500 ms off |
| Tower, powered | lamp steady green `#4ade80`; a pixel ring grows from 4 to 28 art px and fades over 1 s, every 2 s |
| Gate terminal | cursor blinks every 530 ms |
| Dig spot X | glints for 250 ms every 1.5 s |
| Golden Semicolon | glow steps through 4 brightness levels over 1.6 s |
| Fog | fades out over 1 s when the tower is powered |

### Reduced motion
If `prefers-reduced-motion: reduce`, glides are instant, a walking frame alternates once per step instead of on a timer, the drone doesn't bob and its propeller stays still, the lamp is steady (red or green), and there are no pulses, glints, blinking cursor, glow steps or fog fade.

### Labels and buttons (page layer)
- **Landmark buttons** keep their accessible names: `[G] Gate`, `[T] Tower` / `[T] Tower ✓`, `[X] Supply Cache` / `[X] Empty Cache`. Each is a transparent hit area over its drawing, at least 44 × 44 CSS px. Its name is a small caption under the drawing (10 px uppercase on a dark chip, in the current colours: gate amber, tower sky, cache amber). Hover and keyboard focus show an outline. Disabled while downed, as now.
- **Map captions:** `(Snowy Peaks Biome)`, `Frozen River` / `Bridge` and `(Dense Forests Biome)` stay as small text captions with a dark outline.
- **Character labels:** `[Player]`, `[AI Drone]` and teammates' names, with a dark outline so they're readable on snow or grass. The rule that keeps the player and drone labels apart still applies, using the sprites' sizes at the current scale. Labels glide in step with the sprites (120 ms).
- **Unchanged:** `[E] Inspect …` / `[E] Dig here` prompt, inspection card, DOWNED screen with `[ Respawn ]`.
- Top bar, objectives, event log, terminal puzzles and the touch D-pad keep their terminal style.

### Mini-map
A small canvas behind the existing dots paints the terrain as flat colours (snow, ice, meadow, forest, mountains) stretched to the mini-map box, the way the dots are placed today. POI squares, teammate dots and your dot stay as they are.

## Architecture

```
src/render/world.ts      WORLD size, toArt(point), fitWorld(mapSize, dpr) → WorldRect
src/render/pixels.ts     pixel-grid helpers: runs, mirror, rotate90, greyscale, shade
src/render/sprites.ts    every sprite and tile as a pixel grid + palette
src/render/terrain.ts    terrain regions, terrainAt(col, row), ICE_RECT, path, decorations
src/render/motion.ts     per-entity glide / facing / walk-frame tracker
src/render/scene.ts      buildScene(input, t, reducedMotion) → Scene (no canvas)
src/render/paint.ts      paintScene(ctx, scene, ...) and the sprite cache
src/hooks/useReducedMotion.ts
src/screens/overworld/MapCanvas.tsx   canvas, sizing, animation loop
```
Modified: `MapViewport.tsx` (canvas + fog + world-aligned page layer), `MiniMap.tsx` (terrain canvas), `labelLayout.ts` (sprite radii scale with the world), `Overworld.tsx` (passes `clueDecoded`), `vitest.setup.ts` (canvas stub).

### Sharp pixels
`fitWorld({ width, height }, dpr)`:
- `s = max(1, floor(min(width / 320, height / 180) × dpr))` device px per art px;
- world CSS size = `320 × s / dpr` by `180 × s / dpr`, centred, with `left` and `top` rounded to whole device pixels.

The canvas backing store is the map area × DPR (rounded); drawing uses `imageSmoothingEnabled = false` and the transform `s, 0, 0, s, left × dpr, top × dpr`, so one art pixel is always `s` device pixels. All sprite positions are whole art pixels. Size is recomputed on resize.

Examples: (668 × 360, 1) → s 2, world 640 × 360 at (14, 0). (668 × 360, 2) → s 4, same CSS size. (354 × 360, 3) → s 3, world 320 × 180 at (17, 90). (600 × 360, 1), the test default → s 1, world 320 × 180 at (140, 90).

### Map area layers (bottom to top)
1. `<canvas aria-hidden>` covering the map area: ground (cached offscreen per size), sorted sprites, drone, tint, glows.
2. Fog `<div data-testid="fog">` covering the map area: a radial gradient centred on the player's CSS position; `opacity` 1, or 0 when the tower is powered, with a 1 s transition (none under reduced motion).
3. World-aligned page layer, sized and placed at the world rect: captions, landmark buttons, character label anchors (`data-testid` `player`, `drone`, `teammate-<name>`, still positioned with `left`/`top` percentages), the artifact anchor (`data-testid="artifact"`, title "Golden Semicolon", screen-reader text), and the prompt.
4. Inspection card and DOWNED screen, relative to the map area, as now.

### Data flow
- Game rules, the reducer, puzzles and team sync are unchanged. `MapViewport` additionally receives `clueDecoded`.
- `MapCanvas` keeps the latest props in a ref. One `requestAnimationFrame` loop reads them, updates `motion` for the player, drone and each teammate, calls `buildScene`, then `paintScene`. The loop starts only when a 2D context exists and stops on unmount; browsers already pause it in hidden tabs.
- `scene.ts` is pure: same input and time, same scene. `paint.ts` only draws what the scene lists. Sprite canvases are built once per sprite and colour (team colours, greys for downed) through an injected `makeCanvas`, so tests can pass fakes.

### Fallback
If `getContext("2d")` returns null (old browsers, jsdom), there is no loop; the map area keeps its plain `--panel` background and the page layer works fully. `vitest.setup.ts` stubs `HTMLCanvasElement.prototype.getContext` to return null so jsdom doesn't log "not implemented". `useReducedMotion` returns false where `matchMedia` is missing.

## Testing
- **Unit:**
  - `world.test.ts`: the four `fitWorld` examples above, `toArt` rounding.
  - `pixels.test.ts`: run merging, mirror, rotate90, greyscale.
  - `sprites.test.ts`: every grid rectangular and of its declared size, only palette characters, explorer frames 16 × 16 with an outline.
  - `terrain.test.ts`: `ICE_RECT` = x 77, y 50, w 166, h 20; regions at sample points, including outside the world; decorations deterministic and clear of the ice, path, bridge, landmarks, dig spot and start.
  - `motion.test.ts`: glide timing and interruption, facing (art-pixel comparison, ties horizontal), walking window and 125 ms frames, reduced motion.
  - `scene.test.ts`: chest open when looted, bridge only when unlocked, X only when decoded and not found, semicolon when found, lamp blink and pulse timing, y-sort order, drone after the sorted sprites, downed pose for the player only, teammate colours, glow strength by phase, tint equals `PHASE_TINT`, reduced motion turns ambient effects off.
  - `paint.test.ts`: with a recording fake context: smoothing off, the transform from `fitWorld`, ground first, sprites at whole art pixels, tint over the whole canvas.
- **Existing tests (252)** keep passing. Marker positions are still read from `left`/`top`. The fog test changes from "no gradient" to "opacity 0". `labelLayout` tests take the new radius parameter. New tests: landmark hit areas ≥ 44 px, the canvas is `aria-hidden`, and nothing crashes when `getContext` returns null.
- **Browser (Playwright, built preview):**
  - screenshots at 1280 (DPR 1), 1440 (DPR 2), 390 (DPR 3) and 360 (DPR 3), by day and night, before and after the bridge and the tower;
  - a canvas pixel sample proves it isn't blank;
  - inside a terrain patch, no colours outside the palette (no blur);
  - frame rate ≥ 50 fps over 2 s on desktop;
  - no console errors;
  - in Same computer mode, two pages see each other's sprite in the right hood colour.

## Out of scope
Scrolling camera, collisions with trees or walls, new areas, sound, character customisation, teammates' drones, flowing water, weather.
