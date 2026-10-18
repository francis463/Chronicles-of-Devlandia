# Bigger areas — design

The Dense Forest, the Sunbaked Desert and the Sunny Beach grow from one screen to about 2 × 2 screens. The camera follows the player, and each of the three gets two hidden spots to find. The Peaks, the village and Foggaten Island stay one screen.

## What the player gets

- **Three bigger places to walk through.** Each of the forest, desert and beach is 640 × 360 art pixels (twice the width and height of today's 320 × 180). The sprites stay the same size, so the world looks the same, there is just more of it.
- **A camera that follows you.** In these three areas the map shows a window of the area (about the size of one of today's screens) that scrolls with the player. The zoom buttons added with the bigger-map work still apply: `−` all the way out shows the whole area ("Whole map"), `+` steps in.
- **The mini-map shows the whole area** with a small rectangle for what the main map shows now, and the dot for you.
- **Six hidden spots, two per area** (see below).
- **Nothing else changes for the player.** Same places, same exits, same chests and badges (still 11), same HP rules, same team features, same saved-game format apart from one new list.

## Why this is an architecture change

Everything in the map is built for a world of exactly 320 × 180 art pixels (`WORLD`). The game's own positions are percentages of the screen (0–100 in x and y), and `toArt` turns a percentage into art pixels using that fixed world. Props, paths, mouths, animal ranges, decorations, the sea edge, the ground painting and the mini-map all assume it. So this is a change to how coordinates work, not a content addition.

## Design

### 1. Coordinates stay percentages; the world size becomes per zone

- Game positions (players, places, chests, pings, exits, saves, the team protocol) stay **percent of the zone**. Nothing in the saved game or the network changes, and every existing place keeps its meaning.
- New `zoneWorld(zone): { width, height }`: 320 × 180 for every zone except `forest`, `desert` and `beach`, which get 640 × 360.
- `toArt(point)` becomes `toArt(point, zone)`. The zone is required in the three big zones' modules and defaults to the 320 × 180 world elsewhere, so small zones are untouched.
- `REACHABLE_RECT` becomes `reachableRect(zone)`: the same 6–94 % / 10–90 % band, scaled to the zone's world.
- **Walking speed and reach are kept in art pixels, not percent.** `STEP` (4 %) and `INTERACT_RADIUS` (13 %) are halved in the big zones (`stepFor(zone)`, `reachFor(zone)`), so a step is still the same number of art pixels and you can still use things from the same distance. Crossing an area now takes about twice as many steps, which is the point.
- **Everything authored in art pixels is rescaled once, in the area file:** prop positions, paths, mouths, the beach's sea edge (x ≥ 303 becomes x ≥ 606), animal ranges and the pier's lantern points. Props derived from places (`toArt(PLACE)`) move by themselves.
- **The extra room is filled by the existing decoration generator.** `decorations()` already fills any rectangle from a seed, so trees, cacti, palms and rocks fill the larger reachable rectangle without new art. Hand-placed additions are only the hidden spots, a few extra props and one extra animal per area.

### 2. Camera and view

- `fitWorld(size, zoom, focus)` takes the world size as a parameter. For a 640 × 360 zone the default scale is the one a 320 × 180 screen would get (same sprite size as today), so the area scrolls. `−` can go down to the scale that fits the whole zone (`Whole map`).
- The scene already draws into a canvas at any offset (the title backdrop uses it), and the map's buttons, captions and hit areas are all placed relative to the world rectangle, so they follow the camera. Hit areas and captions need the zone's world size instead of `WORLD`, and the existing collision tests run at both map sizes.
- Fog is already off in these three areas. The decoration-only effects that use `WORLD` (falling leaves, drifting sand, fireflies, gull lanes, the tumbleweed's path) take the zone's width and height, so they cover the bigger area.

### 3. Rendering cost

The ground is baked once per zone and cached, as now, so a 4× larger bake is a one-off cost on entering the area. Each frame still draws only what the camera shows, plus sprites sorted by feet. Target: no more frame time per frame than today on the same device, checked in the browser in the first phase and again once the beach is big.

### 4. Hidden spots (two per area, six in all)

- **What they are.** Each spot is a small landmark, far from the start and out of the way, in the new part of the area. They are drawn as normal sprites (so you can find them by looking) but have no map caption until you are close. Pressing `E` beside one opens a card with a short coding idea, like the existing landmarks, and a once-only reward: a small heal (2 hearts, like the other healing finds) for the first of each area, and just the card for the second.
- **Where.** Forest: *Moss Clearing* and *Fox Den*. Desert: *Hidden Cave* and *Dune Ridge*. Beach: *Tide Pool* and *Message in a Bottle*. Positions and card copy are fixed in the plan, not here.
- **Tracking.** `GameState` gains `secrets: SecretId[]` (found ones), personal like badges and not shared with the team. The Codex gets one line, "Secrets found: n/6". Old saves lack the list and read it as empty.
- **Not changed.** No new badge, no quest step, no effect on the finale.

### 5. The mini-map

The mini-map keeps its width and draws the zone's terrain at its real size, so a big area appears as the same box. It adds an outline of the camera's window. The `MiniMap` code that maps art pixels to cells uses the zone's size instead of `WORLD`.

## Team

Positions, pings, `/where` and the roster keep working because they are percentages. Each player has their own camera. The team protocol does not change.

## Out of scope

Enlarging the Peaks, the village or Foggaten Island; new chests or badges; new animals beyond one per area; water you can swim in; sounds. The hosted chests (each chest lives inside a landmark) keep their percentage positions and scale with the zone, so they need no work beyond re-checking caption overlaps.

## Phases (each one ships on its own and keeps the suite green)

1. **Infrastructure with no visible change:** `zoneWorld`, zone-aware `toArt` and `reachableRect`, `stepFor` / `reachFor`, zone-aware `fitWorld`, hit areas, captions, the mini-map and effect loops. Every zone is still 320 × 180, so the existing tests prove nothing broke. Add the camera and "Whole map" for zones larger than 320 × 180 using a test-only zone.
2. **Beach to 640 × 360** (the smallest layout): rescale its props and sea edge, check captions and collisions, measure the frame time.
3. **Desert to 640 × 360** (animals, jars, a longer storm path).
4. **Forest to 640 × 360** (the most props, the campfire, mushrooms, lore landmarks and the oak's chest).
5. **Hidden spots and the Codex line.**

## Risks and how they are handled

- **A missed `WORLD` use shows up as half-drawn or mis-placed effects in a big zone.** Phase 1 adds a test that grep-checks nothing outside `world.ts` and the small-zone defaults uses `WORLD` directly, and each later phase has a test that enters the zone and checks the effects cover its size.
- **Caption and hit-area collisions** are already tested exhaustively at two map sizes for every zone; those tests are extended to each zone's own world, and any collision is fixed by moving the new content, as before.
- **Gaps in the layout.** The existing places are now twice as far apart. The decoration generator fills the space, and each phase adds a few hand-placed props along the paths. Checked by screenshots in the browser before each phase is committed.
- **Touch and small screens.** On a phone the whole area at the default scale is much larger than the screen, so the camera matters most there; the full-screen and landscape layouts from the bigger-map work already give it the most room.
