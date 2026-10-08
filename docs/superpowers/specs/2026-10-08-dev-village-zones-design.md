# Zones, Dev Village and a Bigger View — Design

**Status:** approach (zones), all three design sections and the roadmap approved in chat (2026-10-08). Revised after the spec review wf_b9304c5d-135, which confirmed 16 findings: exit rows, button letters, the team zone log, layout in short windows and on laptops, the mini-map border, label checks, and the existing tests. Written spec awaiting review.
**Builds on:** the shipped game at `2a30cda` (pixel-art map, `2026-10-07-pixel-art-map-design.md`; team play, `2026-10-07-team-lobby-design.md`; north wall, `2026-10-08-north-wall-design.md`).
**Supersedes:** the pixel-art map spec's "out of scope: new areas" line. Its single-screen camera decision stays: every area is one screen, and nothing scrolls in this spec.

## Goal

The user said "the map is so small" and wants it bigger and more interactive. This spec does two things:

1. **More world.** The world becomes zones. Today's map is the zone **C++ Peaks**. A new zone, **Dev Village**, lies west of it. You walk off the Peaks' left edge into the village and back. The village has one villager, **Ada**, whose hints follow your progress.
2. **A bigger picture.** On desktop the map takes most of the window, so on common laptops (1366 × 768 and 1280 × 800 screens, whose browser viewports are about 1366 × 657 and 1280 × 689) it is drawn at 3× (960 × 540) instead of 2× (640 × 360) today.

## Decisions (from the chat)

| Question | Answer |
|---|---|
| How the world grows | Zones (screen by screen, Zelda-style), not one scrolling world |
| First new zone | Dev Village, to the west |
| What the village has now | Huts, a well, fences, a dirt square, a signpost, and one villager (Ada) who gives hints |
| When you can get there | From the start: a path off the Peaks' west edge near camp, south of the wall |
| Bigger view | Included: the map takes more of the window on desktop |
| The rest of the wish list | One roadmap of five specs (this is spec 1; see Roadmap) |

## Roadmap

Each spec ships something playable before the next starts. Specs 2–5 get their own questions, design and approval when their turn comes.

1. **This spec:** zones, Dev Village with Ada, and the bigger desktop view.
2. **Village life:** a merchant (trading), two or three more villagers, and collectibles.
3. **Saving progress:** solo progress survives a reload.
4. **More areas:** further zones (candidates from the chat: Frozen Lake, Ancient Ruins).
5. **Scrolling camera:** zoom in and follow the player inside an area, mainly so phones get a bigger picture.

## Rules (game logic)

Game coordinates stay percentages of one 320 × 180 screen: x 6–94, y 10–90, every step 4 along one axis. Each zone is one such screen with the same bounds. Players stand on even coordinates (the north-wall spec explains why). Both grids occur on each axis: x and y start on 4k (camp is (28, 72)), and clamping at an edge shifts them to 4k + 2.

### Zones

- `ZoneId = "peaks" | "village"`. The game state gains `zone: ZoneId`. It starts at `"peaks"` and is a separate field: the player's position stays `{ x, y }`.
- A zone registry (`src/game/zones.ts`, pure data) gives each zone:

| | C++ Peaks (`peaks`) | Dev Village (`village`) |
|---|---|---|
| Name (header, logs) | C++ Peaks | Dev Village |
| Exit | west edge, y 62–78 → `village` | east edge, y 62–78 → `peaks` |
| Wall | y 49, gate opening x 47–53 (today's rule) | y 49, no opening |
| Places | gate, cache, river, tower, plus the dig spot once revealed (today's) | `villager` (Ada), `signpost` |
| Hazard | the frozen river (today's) | none |

### Moving between zones

- A horizontal step whose target x is outside the bounds (x < 6 going left, x > 94 going right) leaves through the exit on that edge if the player's y is inside its span (62–78, inclusive). Otherwise it is clamped exactly as today: the player stays put and stamina still drops by 1.
- Leaving through an exit:
  - the zone changes to the exit's target;
  - the player arrives on the opposite edge on the same row: x 94 when entering the village, x 6 when entering the Peaks;
  - the drone moves 8 units (two steps) inward and 2 up from the player, the same offset as camp's drone start from the player start: (86, y − 2) in the village, (14, y − 2) in the Peaks;
  - an open inspection card closes (`inspected` becomes null);
  - stamina drops by 1, like any step;
  - the log adds **"Entered Dev Village."** or **"Entered C++ Peaks."**.
- Vertical steps never change zones. The village's west edge and every other edge have no exits.
- Exits are checked after the downed and puzzle-window guards and before the wall rule. Both exits are south of the wall (y 62–78 > 49), and the arrival points are too.
- **Lattice:** arrival x is 94 or 6, and y keeps its value, so every arrival point is even. Arriving at x 6 puts the player on the x = 4k + 2 grid, which passes the Peaks' gate at x 50.

### The wall in the village

- The wall runs across the village at y 49 with no opening. Any step across it is blocked with **"The wall is solid here. Go through the gate."**, following today's only-once log rule, whether or not the gate is open.
- So the village's north half is never reachable. The Peaks' gate stays the only way north.

### Places and talking

- `PoiId` gains `"villager"` and `"signpost"`:
  - **Ada:** label "Ada", at (34, 70);
  - **Signpost:** label "Signpost", at (86, 62).
- **Interacting only works with places in your zone.** `interact` with a place that isn't in the current zone changes nothing; for the dig spot, only while it is revealed, as today. This also removes today's fall-through, where an unknown place gave the river's message.
- **[E] and the touch button** look for the nearest place within reach (`INTERACT_RADIUS` 13) among the current zone's places only, plus the dig spot in the Peaks once revealed. A zone with no place in reach gives no target, and never an error. Both the keyboard's [E] and Overworld's `inRange` (which feeds the prompt and the touch button) use this.
- **Talking to Ada** (`interact` with `villager`) opens her card (`inspected: "villager"`). Her line goes in the card and in the log as `Ada: "<line>"`, using the only-once rule. Her line is the first unmet stage in this order:

| Stage (first one not done) | Ada's line |
|---|---|
| gate locked (`!gateUnlocked`) | Heading north? The gate's terminal wants one CSS fix. Get the display right and the wall lets you through. |
| tower dark (`!towerPowered`) | The gate's open! The signal tower in the snowy north-west is dark. Power it and the bridge over the river comes back. |
| river not surveyed (`!questComplete`) | The tower's beam is back and the bridge holds. Walk out onto the frozen river and survey it. |
| cache unopened (`!hasLoot`) | Explorers stash supplies in the cache in the north-east snow. Have a look inside. |
| scroll not decoded (`!clueDecoded`) | That scroll from the cache is scrambled. Decode it from your inventory: every letter is shifted. |
| artifact not found (`!artifactFound`) | The Dense Forest, you say? Look for the X south-east of camp and dig there. |
| everything done | You found the Golden Semicolon! Every statement in Devlandia can finally end. Thank you, explorer. |

- **Reading the signpost** opens its card (`inspected: "signpost"`) and logs nothing. Card text: **"C++ PEAKS → East through the hedge: base camp, the north gate and the frozen river."**
- **Ada and the signpost work from anywhere in the village** through their map buttons, as the Peaks' landmarks do in the Peaks.
- **Prompts and the touch button** read "[E] Talk to Ada" and "[E] Read Signpost". The Peaks' prompts are unchanged ("[E] Inspect Terminal Gate", "[E] Dig here"; the touch button keeps "[E] Terminal Gate" and the others).

### Hazards, respawn and timers

- The river (quest completion on entry, cold damage, the timer's draining check) applies only when the zone is `"peaks"`.
- **Respawn** returns the player to camp in the Peaks: zone `"peaks"`, player (28, 72), drone (36, 70). The village has no hazard, so a player can only be downed in the Peaks.
- No saved games exist yet (spec 3), so every game starts in the Peaks.

## Team play

- **Your zone is shared.** The `pos` broadcast becomes `{ type: "pos", id, x, y, zone }`, and presence meta gains `zone`. Positions are still sent at most every 250 ms, and a zone change rides the next one. x/y validation is unchanged because every zone has the same bounds.
- **Presence's zone is only a fallback.** Like presence x/y today, it is refreshed only by the existing flag and start updates, never by a move or a crossing, so it can be stale. It is used only to draw a teammate until their first `pos` arrives. A player who joins mid-game may therefore see a teammate in their last presence zone for about one round trip.
- **Parsing is lenient, and nobody is ever dropped because of the zone:**
  - missing zone (an older client) → `"peaks"`;
  - a known `ZoneId` → that zone;
  - anything else (for example a future zone) → `null`, meaning "elsewhere".
  - This holds for both presence and `pos`. A presence with an unknown zone keeps the teammate in the roster, and their flags still merge.
- `Teammate` gains `zone: ZoneId | null`, and `publishPosition(x, y, zone)` replaces `publishPosition(x, y)`.
- **Who you see:** the main map, the scene and the label layout show only teammates whose zone equals yours. The mini-map shows every teammate with a known zone in that zone's cell. Teammates with zone `null` are drawn nowhere.
- **Zone-change log** (driven by `pos` messages alone):
  - `useTeamSession` keeps each teammate's last `pos` zone (cleared on teardown).
  - When a later `pos` from the same id carries a different zone, and both zones are known, it notifies `onZoneChange(name, zone)` listeners from inside the transport's message callback. Listeners subscribe like `onRoster` and get an unsubscribe back.
  - A teammate's first `pos` is first sight and logs nothing, whatever their presence said. So does any change to or from `null`.
  - `Overworld` subscribes in an effect and logs **"{name} went to Dev Village."** or **"{name} went to C++ Peaks."** as a note.
  - Because the notice comes from the message callback, not from rendering, re-renders and React's double effects never repeat it.
- **Mixed versions during a deploy:** an older client ignores `zone` and draws a village teammate on its Peaks map until it reloads. This is accepted.
- Progress flags, the team clock and the lobby are unchanged.

## Drawing

Art coordinates as before: `toArt(p) = (round(p.x × 3.2), round(p.y × 1.8))`. Upright sprites are bottom-centre anchored and y-sorted by feet row, explorers last on ties.

### Areas

- **Today's data moves, unchanged, into a Peaks area.** That data is the terrain bands, ice, bridge, path, landmarks, wall, glints and lights. The village gets its own area.
- **Today's call signatures stay valid.** The terrain functions (`terrainAt`, `onPath`, `protectedBoxes`, `wallTiles`, `decorations`) take an optional area that defaults to the Peaks, and today's exported constants (`LANDMARK_POINTS`, `WALL_RECT`, `ICE_RECT`, `BRIDGE_RECT`, `PATH`) keep their names and values.
- **Every cache is per area:**
  - the decoration memo and its protected-box list;
  - the scene's interior-decoration and wall-tile lists;
  - the ground cache, whose key gains the area id.

### Exits on the map

- **Mouths:**
  - Peaks west: art x 0–31, rows 112–143.
  - Village east: art x 288–319, rows 112–143.
  - The explorer at y 62–78 stands on feet rows 112–140, inside the mouth. At y 60 (feet 108) and y 80 (feet 144) the feet are on a hedge piece left standing, which is drawn behind the explorer.
- **Hedge gaps:** barrier hedge pieces whose box intersects their area's mouth are left out: the left column at x 10 (Peaks) or the right column at x 311 (village), the cells with feet rows 127 and 143. That leaves a 32-px gap. The pieces with feet rows 111 and 159 stay.
- **Corridor beyond the edge:** scenery outside the world whose box intersects the mouth's rows (112–143) beyond that edge is left out. That is x < 0 for the Peaks and x ≥ 320 for the village.
- **The path runs out through the gap:**
  - Peaks: a second path piece from camp (90, 130) west to (−1000, 130), 6 px wide. Its rectangle is { x: −1003, y: 127, w: 1096, h: 6 }: rows 127–132, x −1003 to 92.
  - Village: a path from (1320, 130) west to (100, 130), 6 px wide. Its rectangle is { x: 97, y: 127, w: 1226, h: 6 }: rows 127–132, x 97 to 1322, so its west end lies inside the dirt square.
- **Decorations stay clear:** the mouth rectangles and the new path pieces join their area's protected boxes.
- **Exit signs** are map captions (not interactive), uppercase like the others, just below their mouth.
  - **"← Dev Village"**: Peaks, left-centre at (1, 88).
  - **"C++ Peaks →"**: village, right-centre at (99, 88).
  - Map captions gain two alignments for them, left-centre and right-centre (today there are centre and right-bottom).
  - They join the label layout's fixed boxes, so the [PLAYER] and [AI DRONE] labels avoid them when they can. As with today's landmark captions, a fixed box is a soft preference: the labels never land on each other or leave the world to avoid one. Measured with today's label code:
    - at 2× and 3×, no label touches an exit sign anywhere on the test grid;
    - at 1× (phones), labels sometimes do: near the bottom-left of the Peaks, and at the village's arrival rows y 72–78, where the only other placements land on the drone or the signpost.

### Dev Village

- **Terrain:**
  - mountains for y < 16, snow for y < 83 (as in the Peaks), meadow below;
  - a dirt square (the path texture) at art x 96–175, rows 116–159;
  - no ice and no forest.
  - Beyond the world: trees to the west and below, rocks above (today's scenery rules). The east margin is the corridor and the path toward the Peaks.
- **Wall:**
  - 20 tiles inside the world at (8 + 16k, 89), k = 0…19, all upright and y-sorted;
  - tiles beyond the edges are baked, as in the Peaks;
  - interior decorations stay off the wall band, as in the Peaks.
- **Props** (new sprites, upright and y-sorted; the plan may nudge an art point by a few px to fit a final sprite size, recording a ruling):

| Prop | Sprite (w × h, bottom anchor) | Art point(s) |
|---|---|---|
| Huts | `hut` 32 × 24 | (56, 116), (176, 116), (88, 162) |
| Well | `well` 16 × 16 | (150, 156) |
| Fence | `fence` 16 × 8 | (184, 150), (200, 150), (216, 150) |
| Signpost | `signpost` 16 × 16 | (275, 112) = toArt(86, 62) |
| Ada | `explorer-down`, hood `#b45309` (an earthy brown, distinct from the four team colours, the drone and the amber markers) | (109, 126) = toArt(34, 70) |

- Huts and props are walk-through, like trees today: no collision. The player is drawn behind or in front by feet row.
- Every prop's box joins the village's protected boxes, so decorations stay clear.
- The village has no glints, no lights and no planks. The day-phase tint applies as everywhere.
- **Captions:** "(Dev Village)" centred at (40, 4), like the Peaks' "(Snowy Peaks Biome)", plus the exit sign. Map captions gain a `zone` field. Each zone draws only its own, and the caption tests check each zone separately.
- **Buttons:** "[V] Ada" and "[P] Signpost", landmark buttons in the village only. They are at least 44 × 44 CSS px, with captions above when there is room, hidden while the prompt names that place. Their captions and drawings are the village's fixed boxes for the label layout, as the Peaks' landmark captions are today. A button's bracketed letter is a label, not a key binding, like [T], [X] and [G]. It is never W, A, S, D or E, which are the move and interact keys. The Peaks' [T], [X] and [G] buttons and the Peaks captions show only in the Peaks.

### Changing zones on screen

- The player's and the drone's sprites jump to their new spots instead of gliding, the same way they do after a respawn. Teammates who leave or enter your zone appear without a glide.
- **Fade:** the map (canvas and world layer) fades in over 200 ms when the zone changes, with no fade under `prefers-reduced-motion`. The world layer is keyed by zone, so labels never slide across the screen. The buttons and labels stay above the fog throughout.
- The header reads **"REGION: DEV VILLAGE"** in the village and **"REGION: C++ PEAKS"** in the Peaks (unchanged).
- The inspection card shows the inspected place's label and text: "Ada" with her current line, or "Signpost" with its text. It sits at the top when the place's y > 50 and at the bottom otherwise, as today.

### Mini-map: a small world map

- **Box:** two cells of 96 × 54 CSS px (16:9) side by side, Dev Village on the left and C++ Peaks on the right. Together they fill a 192 × 54 area inside the box's existing 1 px border, so the bordered box is 194 × 56 (Tailwind sizes are border-box). Each cell's canvas backing is round(96 × dpr) × round(54 × dpr).
- **Painting:** each cell is painted from its area's terrain, sampled like today's mini-map, with its wall line: the Peaks' line has the gap at the gate, the village's has none.
- **Markers:**
  - your zone's cell is outlined (`var(--accent)`, 1 px, inside the cell);
  - place markers sit in their zone's cell: the Peaks' four squares and the artifact diamond as today, and squares for Ada and the signpost in the village;
  - your dot sits in your zone's cell;
  - teammates' dots sit in their zone's cell (none for zone `null`).
- Accessible name "Mini-map", as today.

### Bigger view (desktop)

Applies at the `md` breakpoint and up (≥ 768 px wide), on the overworld screen only; the menu and the lobby are unchanged. Phones held upright (< 768 px wide) keep today's stacked layout: mini-map row, map, D-pad, event log, bottom bar with the quest lines. Phones held sideways are at `md` and get the layout below.

- **Less chrome, so the map gets the height:**
  - the page padding is 0.5 rem at `md` while the overworld is shown (today 2 rem; it lives on `App.tsx`'s `<main>`);
  - the three quest lines move from the bottom bar into the sidebar, so the bottom bar is one row (the inventory, about 43 px). They are rendered once and placed by the layout, so each quest line is still found once by text.
  - The vertical chrome becomes about 112 px: padding 16, panel border 4, header 49, bottom bar 43 (today about 188 px).
- **The panel widens** from `max-w-5xl` (1024 px) to `max-w-screen-2xl` (1536 px). Its **minimum** height is the window's height minus the page padding (100 dvh − 1 rem); it is never a fixed height. When the window is too short for the header, the map column and the bottom bar, the panel grows past the window and the page scrolls, as today, and nothing is clipped. The map column is the 360 px minimum map, plus the 178 px D-pad on touch screens.
- **One left sidebar, 224 px wide:** from the top, the mini-map and controls, the quest lines, and the event log.
  - The event log's list scrolls inside its slot and adds no height (an absolutely positioned scroller).
  - When it overflows it is kept scrolled to the newest entry each time an entry is added, so the latest line is always fully visible.
- **The map area** takes the rest of the width, and all the height between the header and the bottom bar (at least today's 360 px). On touch screens at `md` (tablets, phones held sideways) the D-pad stays under the map in the map column.
- **Resulting scale** (`fitWorld` is unchanged; measured on today's build, with the new layout injected as CSS):

| Browser viewport (CSS px, DPR 1) | Map area (about) | Map drawn |
|---|---|---|
| 1920 × 1080 | 1307 × 967 | 1280 × 720 (4×) |
| 1366 × 657 (a 1366 × 768 laptop) | 1121 × 545 | 960 × 540 (3×; 2× today) |
| 1280 × 689 (a 1280 × 800 laptop) | 1035 × 577 | 960 × 540 (3×; 2× today) |
| 1024 × 768 | 779 × 656 | 640 × 360 (2×; 1× today) |
| 390 × 844 phone | unchanged | 320 × 180 (1×, as today) |

3× needs a viewport at least about 653 px tall at DPR 1.

## Architecture

| Unit | Change |
|---|---|
| `src/game/zones.ts` (new) | `ZoneId`, `ZONES` (name, exit, wall opening or none, places, river or none), `exitFor(zone, from, to)`, `arrival(exit, y)` — pure |
| `src/game/types.ts` | `GameState.zone`; `PoiId` gains `villager`, `signpost` |
| `src/game/constants.ts` | Ada and signpost places (not in `POIS`, which stays the Peaks' four); `LOG.enteredVillage`, `LOG.enteredPeaks`; signpost card copy |
| `src/game/village.ts` (new) | `adaLine(state)` — the stage table, pure |
| `src/game/geometry.ts` | `nearestPoi` and `poiInRange(p, extra)` keep their signatures and behaviour; new `placeInReach(p, places)` returns the nearest of `places` within reach, or null (also for an empty list) |
| `src/game/reducer.ts` | `move`: exits, then the zone's wall rule, then the river only in the Peaks; `interact`: only the zone's places, Ada and the signpost; `riverDamage` only in the Peaks; `respawn` resets the zone; new `visiblePois(state)` (the zone's places plus the revealed dig spot) |
| `src/game/team.ts` | `zone` on `pos` and presence, parsed leniently (missing → peaks, unknown → null) |
| `src/hooks/useTeamSession.ts` | `Teammate.zone`, positions keep the zone, `publishPosition(x, y, zone)`, presence seeded with `"peaks"`, last `pos` zone per teammate, `onZoneChange(cb)` |
| `src/hooks/useGameTimers.ts`, `useKeyboardControls.ts` | draining only in the Peaks; [E] uses `placeInReach(player, visiblePois(state))` |
| `src/render/areas/` (new) | `Area` type; `peaks.ts` (today's data, moved), `village.ts`; lookup by `ZoneId` |
| `src/render/terrain.ts` | functions take an optional area (default Peaks); per-area memo; hedge gaps and corridors at mouths; second Peaks path piece |
| `src/render/scene.ts` | `SceneInput.zone`; per-area caches; Peaks props only in the Peaks; village props and Ada in `upright` |
| `src/render/paint.ts` | ground texture and cache key per area |
| `src/render/sprites.ts` | `hut`, `well`, `fence`, `signpost` sprites |
| `src/screens/overworld/MapCanvas.tsx` | sprites jump on a zone change |
| `src/screens/overworld/mapLayout.ts` | map captions gain `zone` and the left-centre / right-centre alignments; the village's button captions; `landmarkCaptions` takes the zone |
| `src/screens/overworld/MapViewport.tsx` | `zone` prop; per-zone captions, exit signs and buttons; prompt text for Ada and the signpost; Ada's current line (or what it needs, such as `questComplete`) for her card; the signpost card; zone fade; the world layer keyed by zone |
| `src/screens/overworld/MiniMap.tsx` | the two-cell world map |
| `src/screens/overworld/EventLog.tsx` | scroller that adds no height at `md`; kept scrolled to the newest entry |
| `src/screens/overworld/BottomHud.tsx` | the quest lines move into their own unit, placed in the sidebar at `md` and in the bottom bar below it |
| `src/screens/overworld/Overworld.tsx` | layout (sidebar, minimum full height, D-pad under the map at `md`); passes the zone; `inRange` uses `placeInReach(player, visiblePois(state))`; filters teammates by zone; subscribes to `onZoneChange`; publishes the zone |
| `src/screens/overworld/TopHud.tsx` | region name from the zone |
| `src/App.tsx` | 0.5 rem page padding at `md` while the overworld is shown |
| `src/screens/MenuBackdrop.tsx` | its scene gets `zone: "peaks"` |
| `README.md` | the village, Ada, the exit, the bigger view, the team zone behaviour |

## Testing

All new behaviour is written test-first (Vitest); each test is seen to fail before the code exists. Guards that already hold are marked as guards.

- **Zones (`zones.test.ts`, reducer):**
  - every exit has a matching exit back on the opposite edge of its target with the same span;
  - every arrival point is even, inside the bounds, south of the wall and outside the river;
  - left from (6, 72) in the Peaks → village (94, 72), drone (86, 70), stamina −1, log "Entered Dev Village.", card closed; right from (94, 72) in the village → Peaks (6, 72);
  - left from (6, 62) and from (8, 68) also leaves;
  - left from (6, 60), (8, 80) and (6, 50) does not (clamped, as today's "stays clamped at a map edge");
  - vertical steps at the edges never leave;
  - respawn from anywhere → Peaks (28, 72).
- **Only the gate leads north:** the reachability search runs over (zone, x, y) from the start, following real moves including exits:
  - locked: nothing with y < 49 is reachable in either zone, and the tower, cache and river are out of reach;
  - open: every reachable crossing is in the Peaks at x 48, 50 or 52, and the village's north is never reached.
- **Village wall:** a crossing step there is blocked with the solid line, gate locked or open, and logs it only once.
- **Places:**
  - [E], the prompt and the touch button find Ada at (34, 72) and the signpost at (90, 66) in the village;
  - nothing is found near Ada's spot in the Peaks, and nothing is found at camp (unchanged);
  - `placeInReach` with an empty list gives null;
  - the Peaks' places do nothing in the village, and Ada and the signpost do nothing in the Peaks;
  - `adaLine` gives each of the seven lines for its stage;
  - talking logs `Ada: "…"` once, and talking again adds nothing;
  - the signpost logs nothing and opens its card;
  - the river does nothing in the village.
- **Team:**
  - `pos` and presence carry the zone;
  - parsing: missing → peaks, "village" → village, "marsh" → null with the teammate kept, a non-string → null;
  - the map shows only same-zone teammates, and the mini-map puts each in their cell;
  - zone-change log, in a hook test with a stub transport:
    - presence with zone "village" arrives first, then the first `pos` with "peaks": no change is reported;
    - a later `pos` with "village" reports exactly one;
    - a change to or from null reports nothing;
    - each crossing is followed by `POS_INTERVAL_MS`, since crossings closer together than one position update can merge;
  - two clients in different zones in the team test (`TeamOverworld.test`).
- **Drawing:**
  - the village's game points and art points agree (Ada and the signpost are `toArt` of their places);
  - decorations in each area stay clear of its protected boxes, and the village has 20 wall uprights;
  - hedges cover the sides and bottom except exactly the mouth rows (112–143) on the exit side;
  - the Peaks' path pins are unchanged;
  - the new pieces are on the path: onPath(−1003, 127) and onPath(92, 132) are true, onPath(0, 133) and onPath(0, 126) are false, and the village's piece reaches the dirt square;
  - drawing the village after the Peaks never reuses the Peaks' ground or decorations;
  - the scene has the Peaks props only in the Peaks, and the village props and Ada only in the village;
  - sprites jump on a zone change;
  - each new sprite grid is rectangular and uses its palette (today's sprite invariant tests cover it).
- **Screen:**
  - per-zone buttons ("[V] Ada", "[P] Signpost" in the village only) and captions, and exit signs;
  - prompt and touch text for Ada and the signpost;
  - Ada's card shows her current line;
  - the header changes;
  - no fade class under reduced motion;
  - labels:
    - the label grid test runs per zone, at reachable points only (y ≥ 50 in the village), with that zone's fixed boxes: its landmark or button captions and drawings, and its exit sign;
    - it keeps today's checks: no label covers the other label or the other sprite, and none leaves the world;
    - a new test asserts that over the same grid, at 2× (668 × 360) and 3× (989 × 610), no label overlaps an exit sign.
- **Mini-map:** a 192 × 54 drawing area (194 × 56 with its border) with two 96 × 54 cells, the outline on your cell, dots in the right cells, every backing pixel painted once, and the wall lines (with the gate gap in the Peaks only).
- **Layout:**
  - in jsdom: at `md` the sidebar holds the mini-map, the quest lines and the event log; each quest line is found once; when new log entries arrive, the log's scrollTop is set to its scrollHeight;
  - the scale table is checked in the browser.
- **Existing tests that change** (the plan lists each by name):
  - terrain "the barrier closes the sides and bottom" (it now expects the mouth gap);
  - reducer "the gate is the only way north" (rewritten over zones);
  - team's two exact-shape parse tests (they gain `zone`);
  - every `pos` message literal and exact-shape `pos` assertion in `memoryTransport.test`, `broadcastTransport.test` and `supabaseTransport.test` (they gain `zone`);
  - `useTeamSession.test` "publishPosition moves the teammate for the others" (the teammate gains `zone: "peaks"`), and every `publishPosition(x, y)` call in that file (gains a zone);
  - mapLayout "at 320×180 and 640×360 worlds no caption box intersects another, a landmark sprite box or the dig spot": it runs per zone, and its caption texts are keyed by the new caption ids, exit signs included;
  - mapLayout "at the start the player and drone labels clear the landmark captions and drawings", and labelLayout "with the landmark captions and drawings MapViewport passes…": `landmarkCaptions` takes the zone;
  - the mini-map tests (new box);
  - BottomHud and Overworld tests that find the quest lines inside the bottom bar;
  - every fixture that builds a `SceneInput`, `Teammate`, `PresenceMeta` or MapViewport's props (gains `zone`; `npm run build` type-checks tests too).
- **Browser check (Playwright, scratchpad):**
  - desktop viewports 1366 × 657 and 1280 × 689:
    - the map is drawn at 960 × 540;
    - walk from camp to the village and back;
    - talk to Ada before and after the gate; the newest log line stays fully visible;
    - read the signpost;
  - 1920 × 1080: the map is drawn at 1280 × 720;
  - desktop 1280 × 520: the bottom bar is not covered, and the page scrolls;
  - phone 390 × 844 (touch): the same walk; the layout is unchanged;
  - phone held sideways, 844 × 390 (touch): the page scrolls to the D-pad, and the bottom bar is not covered;
  - team: two players in different zones (each sees only the other on the mini-map, plus the zone-change log);
  - no console errors; screenshots.

## Edge cases

- Holding left at the Peaks' west edge crosses once per step. A held key keeps walking into the village, as any held step does.
- A move while a puzzle window is open or while downed does nothing, so no zone change can happen then.
- Changing zones closes the inspection card. If Ada's card is open when the gate opens through team sync, the card shows her new line, because it is computed from the current state.
- A teammate crossing back and forth logs one line per zone change that their position updates carry. Crossings closer together than one update (250 ms) can merge into one update, or into none if they cancel out.
- An unknown zone from a newer client hides that teammate from both maps, but they stay in the team.
- The landing page's backdrop still shows the Peaks around camp. The west path and the hedge gap appear in its frame on wide screens.

## Out of scope (later specs)

The merchant, more villagers and collectibles (spec 2), saving progress (spec 3), more areas (spec 4), and a scrolling camera (spec 5). Also out of scope: walking NPCs, collision with huts, and any change to puzzles, quests or the team lobby.
