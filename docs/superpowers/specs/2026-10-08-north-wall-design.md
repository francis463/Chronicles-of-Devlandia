# North Wall — Design

**Status:** approach, all three design sections and this spec approved in chat (2026-10-08). Revised after approval: remote use of the north landmarks while the gate is locked (found while planning).
**Builds on:** the shipped game at `650f3a1` (pixel-art map, `docs/superpowers/specs/2026-10-07-pixel-art-map-design.md`; team play, `docs/superpowers/specs/2026-10-07-team-lobby-design.md`).

## Goal

Add a wall across the map so that the gate is the only way north. The gate stays locked until its terminal puzzle is solved. To keep the icy river dangerous, the Signal Tower now rebuilds the bridge.

## Decisions (from the chat)

| Question | Answer |
|---|---|
| What the gate does | Locked until its terminal puzzle is solved; then it is the only way through the wall |
| The icy river | Stays dangerous until the Signal Tower is powered; powering the tower now rebuilds the bridge (and still lifts the fog) |
| How the wall is built | One wall rule in the game logic, used by every move, plus a stone wall drawn on the same line |

Quest order after this change: solve the gate → go north → river (survey; it hurts until the bridge is back), tower (lifts the fog, rebuilds the bridge) and cache (scroll) in any order → decode the scroll → dig in the forest, which is south of the wall.

## Rules (game logic)

Game coordinates are the existing percentages: x 6–94, y 10–90; every step moves 4 along one axis.

- **The wall** is the line `y = WALL_Y = 49` across the full width. Players stand on even coordinates only (the start is (28, 72); clamping at the edges shifts the grid to 10 + 4k / 6 + 4k), so no one ever stands on the line. **North** means `y < 49`, **south** means `y > 49`.
- **The gate's opening** is `GATE_OPENING = { minX: 45, maxX: 55 }` (inclusive), the gate's width; players can pass at x 46, 48, 50, 52 or 54.
- **A step crosses the wall** when the side changes: `(from.y < 49) !== (to.y < 49)`. Steps are axis-aligned, so a crossing step keeps its x.
- **A crossing step is blocked** unless the gate is open (`gateUnlocked`) **and** the step's x is inside the opening. Steps along the wall never cross it, so they are never blocked.
- **A blocked step:** the player stays where they are, stamina is unchanged, and the log gets one line, unless the newest log line is already that same line (so holding the key or tapping again adds nothing):
  - gate locked: **"The gate is locked. Solve its terminal to pass."**
  - gate open, step outside the opening: **"The wall is solid here. Go through the gate."**
- **Everywhere the same:** the rule lives in the game reducer's `move`, so the keyboard, the touch D-pad, solo and team play all follow it. Each player's own game enforces it for that player.
- **Using north landmarks from afar:** the map's landmark buttons work from anywhere (today you can click [T] Tower from camp). While the gate is locked, a player south of the wall who uses the tower, the cache or the river (click, tap or any other `interact`) gets that landmark's inspect card and the locked line in the log (same "only once" rule), but the tower's logic lock does not open, the cache is not looted and the river is not scanned. North of the wall, or once the gate is open, they work as today. The gate and the dig spot are south, so they are unaffected.
- **Team play:** opening the gate is a team flag that already syncs (`gateUnlocked`), so whoever opens it opens it for everyone, including players who join later.
- **The drone** flies; it keeps following across the wall.
- **Respawn** is at camp (28, 72), south of the wall. A player can only be downed on the ice, which is north, so the gate is already open when they walk back.
- **No saved games** exist, so no game can start with a player north of a locked gate.

## Story and progress

- **The bridge moves from the gate to the tower.** `towerPowered` now decides everything that `gateUnlocked` decided about the river:
  - cold damage applies while on the ice **and the tower is not powered** (the reducer's `riverDamage` and the timer's draining check);
  - the bridge planks are drawn, the river caption reads "Bridge", and the river's inspect copy and log use their "bridged" text, when the tower is powered.
- `gateUnlocked` now only opens the wall's gate (and picks the gate's own open texts and look).
- Puzzle answers and hints, HP and cold damage per tick, the three quests and the bottom bar's three quest lines are unchanged.

### Copy changes

| Where | Now | New |
|---|---|---|
| Opening objective (third initial log line) | Objective: survey the frozen river. | Objective: open the north gate, then survey the frozen river. |
| Gate terminal instruction | Fix the CSS styling property below to reveal the missing bridge path. | Fix the CSS styling property below to open the north gate. |
| Gate terminal code, line 1 | `.frozen-bridge {` | `.north-gate {` |
| Gate terminal wrong answer | Compile error: display: X keeps the bridge hidden. | Compile error: display: X keeps the gate shut. |
| Log: gate puzzle solved | Bridge restored. The river can be crossed safely. | Gate unlocked. The way north is open. |
| Log: inspecting the open gate | Gate unlocked. The bridge holds. | Gate open. The way north is clear. |
| Gate card, locked | A locked compiler gate. Its terminal leads to the code puzzle. | A locked compiler gate in the north wall. Its terminal leads to the code puzzle. |
| Gate card, open | The compiler gate stands open. The bridge beyond it holds. | The compiler gate stands open. The way north is clear. |
| Log: tower powered | Signal tower online: the fog lifts across C++ Peaks. | Signal tower online: the fog lifts and the bridge returns. |
| Tower card, powered | The signal tower hums. Its beam keeps the fog away. | The signal tower hums. Its beam keeps the fog away and holds the bridge. |
| Team log: gate | {name} restored the bridge. | {name} opened the gate. |
| Team log: tower | {name} powered the signal tower. The fog lifts. | {name} powered the signal tower. The fog lifts and the bridge returns. |
| Log: blocked, gate locked | — | The gate is locked. Solve its terminal to pass. |
| Log: blocked, gate open | — | The wall is solid here. Go through the gate. |

The river's texts ("River scan: unstable ice, thermal damage." / "River scan: bridge stable, crossing is safe." and its two card texts) stay as they are; only what switches them changes (the tower instead of the gate).

## Drawing

Art coordinates are the pixel-art map's (320 × 180; `toArt(p) = (round(p.x × 3.2), round(p.y × 1.8))`; upright sprites are bottom-centre anchored and y-sorted by their feet row, explorers last on ties).

- **Wall sprite** `wall`: 16 × 10, bottom anchor, grey stone blocks (`#64748b` with `#475569` mortar, a `#94a3b8` top highlight, a light snow cap `#e2e8f0` on the top row and a `#334155` shadow on the bottom row). Fully opaque, so nothing shows through.
- **Wall tiles** sit at art points `(8 + 16k, 89)` for every integer k whose 16-px box does not overlap the gate's box (art x 144–175). Inside the world that is k = 0…8 and 11…19: 18 tiles covering x 0–143 and 176–319, rows 80–89 (`WALL_RECT` = x 0, y 80, w 320, h 10). Outside the world's left and right edges the tiles continue wherever scenery is drawn, as the terrain does, so the wall never visibly stops.
- **Depth:** tiles whose box intersects `REACHABLE_RECT` are upright sprites in the scene, y-sorted with feet row 89; the others are baked into the ground cache, like the barrier decorations. Players north of the wall (y ≤ 48 → feet row ≤ 86) are drawn behind it; players south (y ≥ 50 → feet row ≥ 90) in front.
- **Gate:** the `gate` sprite (32 × 16 at art (160, 90), box x 144–175, y 75–90) gets two frames:
  - frame 0, **open**: today's archway with its terminal on the right post;
  - frame 1, **locked**: the same archway with vertical iron bars (`#1e293b` with a `#64748b` highlight) every 3 px across the opening (sprite columns 5–24) in sprite rows 4–13, joined by one cross bar in sprite row 8.
  - Both frames fill sprite columns 0 and 31 in rows 5–14 (art rows 80–89) with wall stone, so the wall meets the posts with no gap.
  - The scene draws frame 1 while the gate is locked and frame 0 once it is open. The terminal cursor and glow are unchanged.
- **Bridge planks** are drawn when `towerPowered` (was `gateUnlocked`). The opening leads straight onto them: the bridge spans art x 147–172, the opening x 149–168.
- **Decorations:** any decoration whose sprite box, grown by 4 px, intersects the wall's band (art rows 80–89, any x) is left out, inside and outside the reachable area (barrier hedges included). The hedges only decorate the edge, since movement is clamped to the bounds, so the gap they leave is filled by the wall.
- **Mini-map:** a 1-px `#475569` line across the full width at the wall's middle row (art row 85, scaled to the mini-map's height), with a gap over the gate (art x 144–175). It is part of the static terrain painting; the amber gate marker already shows where the gate is.
- **Landing-page backdrop:** shows the world at the start of a quest, so it shows the wall and the locked gate with no extra code.
- **Unchanged:** fog, character labels, map captions other than the river's, the [G] Gate button and caption, the "[E] Inspect Terminal Gate" prompt (reachable from the south: the gate's point (50, 50) is south of the wall, within reach from the path).

## Architecture

| Unit | Change |
|---|---|
| `src/game/wall.ts` (new) | `WALL_Y`, `GATE_OPENING`, `crossesWall(from, to)`, `wallBlock(from, to, gateOpen): "locked" \| "solid" \| null` — pure |
| `src/game/reducer.ts` | `move` asks `wallBlock` before moving; `interact` refuses the tower, cache and river from south of a locked gate; `riverDamage` and the river's inspect log use `towerPowered`; new log lines for the gate and the tower |
| `src/game/constants.ts` | copy changes above, `INITIAL_LOGS[2]`, new `LOG.wallLocked` / `LOG.wallSolid`; `INSPECT_COPY.gate.bridged` renamed `opened` |
| `src/game/team.ts` | team log strings for the gate and the tower |
| `src/hooks/useGameTimers.ts` | river draining uses `towerPowered` |
| `src/screens/TerminalModal.tsx` | instruction and code line |
| `src/screens/overworld/MapViewport.tsx` | inspect copy: gate `opened` on `gateUnlocked`, river `bridged` on `towerPowered`; river caption on `towerPowered` |
| `src/render/sprites.ts` | `wall` sprite; `gate` frame 1 and the filled outer columns |
| `src/render/terrain.ts` | `WALL_RECT`, `wallTiles(range)` (art points of the tiles in a range), decorations kept off the wall band |
| `src/render/scene.ts` | wall tiles inside `REACHABLE_RECT` in `upright`; gate frame from `gateUnlocked`; planks from `towerPowered` |
| `src/render/paint.ts` | the ground cache bakes the wall tiles outside `REACHABLE_RECT` in its visible range |
| `src/screens/overworld/MiniMap.tsx` | the wall line |
| `README.md` | "How to play": the wall, the gate first, the tower rebuilds the bridge |

## Testing

All new behaviour is written test-first (Vitest); each test is seen to fail before the code exists.

- **Wall rule (`wall.test.ts`):**
  - every crossing step outside the opening is blocked, locked or open (`"locked"` / `"solid"`);
  - inside the opening it is blocked while locked and allowed when open;
  - steps along the wall are never blocked;
  - both grid parities: y 52 ↔ 48 and 50 ↔ 46; x at the opening's edges (44 and 56 blocked, 46 and 54 allowed).
- **Only one way through (reachability):** a breadth-first walk over the reducer's moves from the start.
  - Locked: the tower, cache and river POIs are out of reach (no reachable point within `INTERACT_RADIUS`), and the dig spot and the gate's terminal are in reach.
  - Open: all are in reach, and every reachable step from south to north has x in the opening.
- **Moving (reducer):**
  - a blocked step leaves position and stamina unchanged and logs the locked line once (a second bump adds nothing);
  - with the gate open, a blocked step elsewhere logs the solid line;
  - a step through the open gate moves and costs stamina as usual;
  - while locked, using the tower, cache or river from the south opens only their card and logs the locked line (no logic lock, no loot, no scan); with the gate open, or from the north, they work as before.
- **Story (reducer, timers, components):**
  - solving the gate sets `gateUnlocked`, logs "Gate unlocked. The way north is open.", and the river still hurts;
  - powering the tower stops the cold damage (reducer and the timer's draining), logs the new tower line, and the river's inspect copy and caption switch to their bridged texts;
  - the terminal shows the north-gate instruction and `.north-gate {`; a wrong answer shows "keeps the gate shut";
  - the opening objective mentions the gate.
- **Team play:** `teamSync` with `gateUnlocked` opens your gate and logs "{name} opened the gate."; the tower team line mentions the bridge.
- **Drawing (scene, terrain, paint, mini-map):**
  - 18 wall tiles inside the world, none overlapping the gate's box, at feet row 89;
  - an explorer at y 48 sorts before the wall and one at y 50 after it;
  - the gate frame is 1 while locked and 0 when open;
  - planks only when the tower is powered;
  - no decoration's grown box touches the wall band;
  - the ground cache draws the outside tiles;
  - the mini-map paints the wall line with its gap.
- **Existing tests:** tests that walk across the wall, or use the tower, cache or river from camp, before solving the gate start with the gate open (or solve it first through the UI), so what they check is unchanged. The plan lists each one.
- **Browser check (Playwright, scratchpad):**
  - at 1280 × 800 and 390 × 844 @3, walk into the wall while locked (stay put, one log line);
  - solve the terminal on screen and walk through;
  - screenshots of the locked and open gate, an explorer in front of and behind the wall, and the bridge appearing only after the tower;
  - the touch D-pad is blocked the same way;
  - Same computer team play: one player opens the gate and the other walks through;
  - no console errors.

## Out of scope

- Making rocks, trees or the tower solid.
- A fourth quest line for the gate in the bottom bar.
- Re-locking the gate, or a key/item that opens it.
- Changing any puzzle's answer or hint.
