# North Wall — Design

**Status:** approach, all three design sections and this spec approved in chat (2026-10-08). Revised after approval: remote use of the north landmarks while the gate is locked (found while planning), and the confirmed fixes of the spec review wf_52ae9f3e-411 (the opening between the posts, depth at the map's edges, hedges, the mini-map line, the existing tests).
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
- **The gate's opening** is `GATE_OPENING = { minX: 47, maxX: 53 }` (inclusive): the archway between the gate's posts (art x 149–168), not the gate's whole width. Players pass at x 48, 50 or 52 (art x 154, 160, 166): 48 and 52 on the x = 4k grid, 50 on the x = 4k + 2 grid, so players on either grid have a way through. At x 46 and 54 (art 147 and 173) the explorer would stand on a post, so those are blocked like the rest of the wall. At x 48 and 52 the explorer's outline brushes a post by 2 and 4 px, which is accepted.
- **A step crosses the wall** when the side changes: `(from.y < 49) !== (to.y < 49)`. Steps are axis-aligned, so a crossing step keeps its x.
- **A crossing step is blocked** unless the gate is open (`gateUnlocked`) **and** the step's x is inside the opening. Steps along the wall never cross it, so they are never blocked.
- **A blocked step** is checked after the existing downed and terminal-open guards, using the step's x (`from.x`, which equals `to.x`). The player stays where they are, stamina is unchanged, and the log gets one line, unless the newest log line is already that same line, in which case `move` returns the same state object (so holding the key or tapping again adds nothing):
  - gate locked: **"The gate is locked. Solve its terminal to pass."**
  - gate open, step outside the opening: **"The wall is solid here. Go through the gate."**
- **Everywhere the same:** the rule lives in the game reducer's `move`, so the keyboard, the touch D-pad, solo and team play all follow it. Each player's own game enforces it for that player.
- **Using north landmarks from afar:** the map's landmark buttons work from anywhere (today you can click [T] Tower from camp). While the gate is locked, a player south of the wall who uses the tower, the cache or the river (click, tap or any other `interact`; only the tower and the cache have map buttons, and the river is only used with [E] within reach) gets that landmark's inspect card and the locked line in the log (same "only once" rule), but the tower's logic lock does not open, the cache is not looted and the river is not scanned. North of the wall, or once the gate is open, they work as today. The gate and the dig spot are south, so they are unaffected.
- **Team play:** opening the gate is a team flag that already syncs (`gateUnlocked`), so whoever opens it opens it for everyone, including players who join later.
- **The drone** flies; it keeps following across the wall.
- **Respawn** is at camp (28, 72), south of the wall. A player can only be downed on the ice, which is north, so the gate is already open when they walk back.
- **No saved games** exist, so no game can start with a player north of a locked gate.

## Story and progress

- **The bridge moves from the gate to the tower.** `towerPowered` now decides everything that `gateUnlocked` decided about the river:
  - cold damage applies while on the ice **and the tower is not powered**: both the reducer's `riverDamage` and the timer's draining check read `towerPowered`, so with the gate solved and the tower off the river still drains HP;
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
- **Wall tiles** sit at art points `(8 + 16k, 89)` for every integer k whose 16-px box does not overlap the gate's box (art x 144–175); `wallTiles(range)` returns every tile whose 16 × 10 box intersects `range`. Inside the world that is k = 0…8 and 11…19: 18 tiles covering x 0–143 and 176–319, rows 80–89 (`WALL_RECT` = x 0, y 80, w 320, h 10). Outside the world's left and right edges the tiles continue wherever scenery is drawn, as the terrain does, so the wall never visibly stops.
- **Depth:** all 18 tiles inside the world (k = 0…8 and 11…19) are upright sprites in the scene, y-sorted with feet row 89. An explorer's 16-px box reaches 8 px past `REACHABLE_RECT` (art x 11–308), so the edge tiles k = 0 and 19 must be uprights too, or an explorer behind the wall at x 6 or 94 would show in front of them. Only tiles beyond the world's edges (k ≤ −1 or k ≥ 20) are baked into the ground cache, drawn together with its baked decorations in feet-row order (a wall tile first on a tie). Players north of the wall (y ≤ 48 → feet row ≤ 86) are drawn behind it; players south (y ≥ 50 → feet row ≥ 90) in front.
- **Gate:** the `gate` sprite (32 × 16 at art (160, 90), box x 144–175, y 75–90) gets two frames:
  - frame 0, **open**: today's archway with its terminal on the right post;
  - frame 1, **locked**: the same archway with 2-px iron bars in sprite rows 4–13: a `#64748b` highlight in columns 5, 8, …, 23 and `#1e293b` in columns 6, 9, …, 24, with 1-px gaps in columns 7, 10, …, 22; plus one `#1e293b` cross bar across columns 5–24 in row 8. Row 14 of the opening stays transparent.
  - Both frames fill sprite columns 0 and 31 in rows 5–14 (art rows 80–89) by continuing the wall's 16-px brick pattern: art x 144 and 175 fall on the wall sprite's columns 0 and 15, so those columns are copied row by row (snow cap, highlight, stone, mortar and shadow rows run unbroken into the posts).
  - The scene draws frame 1 while the gate is locked and frame 0 once it is open. The terminal cursor and glow are unchanged.
- **Bridge planks** are drawn when `towerPowered` (was `gateUnlocked`). The opening leads straight onto them: the bridge spans art x 147–172, the opening x 149–168.
- **Decorations:** inside the reachable area, a decoration whose sprite box, grown by 4 px, intersects the wall's band (art rows 80–89) is left out (today that is one bush, at (41, 87)). Barrier hedges and the scenery outside the world are kept: without them the side hedges would have holes the wall does not cover. Outside the world, trees and baked wall tiles share the ground cache's feet-row order, so a tree whose feet are below row 89 stands in front of the wall. At the world's two side edges the hedge pieces with feet row 95 (art x 10 and 311) are baked into the ground while tiles k = 0 and 19 are uprights, so the wall's lowest rows are drawn over those two pieces' tops; that is the barrier strip outside the walkable area, and it is accepted.
- **Mini-map:** `paintMiniTerrain` colours the wall's rows `#1e293b` in place of the terrain (2.9:1 on the meadow; the slate `#475569` would be 1.5:1). They start at backing row `Math.round((WALL_Y / 100) × height)` (row 47 of 96, the wall's game line, so the dots of players at y 48 and y 50 fall on either side) and are `Math.max(1, Math.round(height / 96))` rows thick (about 1 CSS px at any pixel ratio). Columns whose sampled art x (`Math.round(x / width × 320)`) is 144–175 keep their terrain: that is the gap at the gate. Painting in place keeps every pixel filled exactly once. The amber gate marker already shows where the gate is.
- **Landing-page backdrop:** shows the world at the start of a quest with no extra code: the wall wherever it is framed, and the locked gate on wide screens. On a 390 × 844 phone it frames art x 51–129 around camp, so the gate is off-screen there.
- **Unchanged:** fog, character labels, map captions other than the river's, the [G] Gate button and caption, the "[E] Inspect Terminal Gate" prompt (reachable from the south: the gate's point (50, 50) is south of the wall, within reach from the path).

## Architecture

| Unit | Change |
|---|---|
| `src/game/wall.ts` (new) | `WALL_Y`, `GATE_OPENING`, `crossesWall(from, to)`, `wallBlock(from, to, gateOpen): "locked" \| "solid" \| null` — pure |
| `src/game/reducer.ts` | `move` asks `wallBlock` before moving (after the downed/terminal guards); `interact` refuses the tower, cache and river from south of a locked gate; `riverDamage` and the river's inspect log use `towerPowered`; new log lines for the gate and the tower |
| `src/game/constants.ts` | copy changes above, `INITIAL_LOGS[2]`, new `LOG.wallLocked` / `LOG.wallSolid`; `LOG.bridgeRestored` renamed `LOG.gateUnlocked`; `INSPECT_COPY.gate.bridged` renamed `opened`, and the copy type gains `opened?: string` |
| `src/game/team.ts` | team log strings for the gate and the tower |
| `src/hooks/useGameTimers.ts` | river draining uses `towerPowered` |
| `src/screens/TerminalModal.tsx` | instruction and code line |
| `src/screens/overworld/MapViewport.tsx` | card text = `(hasLoot && copy.looted) \|\| (gateUnlocked && copy.opened) \|\| (towerPowered && (copy.bridged ?? copy.powered)) \|\| copy.default`; river caption on `towerPowered` |
| `src/render/sprites.ts` | `wall` sprite; `gate` frame 1 and the filled outer columns |
| `src/render/terrain.ts` | `WALL_RECT`, `wallTiles(range)` (art points of the tiles whose box intersects the range), interior decorations kept off the wall band |
| `src/render/scene.ts` | the 18 wall tiles inside the world in `upright`; gate frame from `gateUnlocked`; planks from `towerPowered` |
| `src/render/paint.ts` | the ground cache bakes the wall tiles beyond the world's edges in its visible range, sorted together with its baked decorations by feet row (wall first on a tie) |
| `src/screens/overworld/MiniMap.tsx` | the wall line, painted in place of the terrain |
| `README.md` | the intro sentence (the gate opens the way north); "How to play": rewrite the quest, terminal gate and signal tower lines (the wall, the gate first, the tower rebuilds the bridge, the river drains HP until then); "Team Lobby": the gate in the shared-progress list and the example log line "Kai opened the gate." |

## Testing

All new behaviour is written test-first (Vitest); each test is seen to fail before the code exists. Guards that hold before and after the change (a step through the open gate; using the tower, cache or river with the gate open or from the north) are marked as guards and are not expected to fail first.

- **Wall rule (`wall.test.ts`):**
  - every crossing step outside the opening is blocked, locked or open (`"locked"` / `"solid"`);
  - inside the opening it is blocked while locked and allowed when open;
  - steps along the wall are never blocked;
  - x at the opening's edges: 46 and 54 are blocked; 48, 50 and 52 are allowed, each checked with both y parities (52 ↔ 48 and 50 ↔ 46).
- **Only one way through (reachability):** a breadth-first walk over the reducer's moves from the start.
  - Locked: the tower, cache and river POIs are out of reach (no reachable point within `INTERACT_RADIUS`), and the dig spot and the gate's terminal are in reach.
  - Open: all are in reach, and every reachable step across the wall has x 48, 50 or 52.
- **Moving (reducer):**
  - a blocked step leaves position and stamina unchanged and logs the locked line once (a second bump adds nothing);
  - with the gate open, a blocked step elsewhere logs the solid line;
  - a step through the open gate moves and costs stamina as usual;
  - while locked, using the tower, cache or river from the south opens only their card and logs the locked line (no logic lock, no loot, no scan); with the gate open, or from the north, they work as before.
- **Story (reducer, timers, components):**
  - solving the gate sets `gateUnlocked`, logs "Gate unlocked. The way north is open.", and the river still hurts;
  - powering the tower stops the cold damage, logs the new tower line, and the river's inspect copy and caption switch to their bridged texts;
  - the timer still drains after the gate is solved: Overworld with `initial={{ gateUnlocked: true, player: { x: 50, y: 33 } }}` shows HP 92 after 1.8 s; with `towerPowered: true` it stays 100 after 3.6 s;
  - the terminal shows the north-gate instruction and `.north-gate {`; a wrong answer shows "keeps the gate shut";
  - the opening objective mentions the gate.
- **Team play:** `teamSync` with `gateUnlocked` opens your gate and logs "{name} opened the gate."; the tower team line mentions the bridge.
- **Drawing (scene, terrain, paint, mini-map):**
  - the scene has 18 wall uprights (k 0–8 and 11–19), none overlapping the gate's box, at feet row 89;
  - an explorer at y 48 sorts before every wall tile and one at y 50 after them, including at x 6 and x 94;
  - an explorer at x 50 sorts after the gate at y 50 and before it at y 46;
  - the gate frame is 1 while locked and 0 when open;
  - planks only when the tower is powered;
  - no interior decoration's grown box touches the wall band, and the existing barrier test ("the barrier closes the sides and bottom") still passes unchanged;
  - the ground cache draws only the wall tiles beyond the world's edges (k ≤ −1 or ≥ 20, never k 0–19), in feet-row order with its decorations;
  - the mini-map paints row 47 of 96 `#1e293b` from x 0 to 50 and from 62 to 111, and every pixel is still filled once.
- **Existing tests:** three kinds change; the plan lists each test by name.
  - *Wall and remote use:* tests that walk across the wall, or use the tower, cache or river from south of it, start with the gate open (`gateUnlocked: true` in reducer state or Overworld's `initial`). Tests that render `<App/>` (App, TeamOverworld) solve the gate on screen first. A test that walks north must also walk through the opening: Overworld's "the drone keeps following…" starts at `{ x: 48, y: 72 }`. Setups that loot the cache or open the tower lock from camp move too, even where the test would still pass.
  - *New story:* tests asserting a replaced text (Copy changes table), or using `gateUnlocked` for the bridge, the cold, the river scan, the planks or the "Bridge" caption, take the new text and `towerPowered` (reducer, team, TerminalModal, MapViewport, scene, Overworld and TeamOverworld tests).
  - *Drawing:* scene.test "upright sprites sorted by feet row" reads each sprite's height from `SPRITES[d.sprite].h` instead of its hard-coded list (a wall tile is 10 rows). MiniMap.test "every pixel once" and terrain.test "the barrier closes the sides and bottom" are unchanged.
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
- The inventory's "Key" slot: it stays a placeholder; the locked line points players to the terminal.
- Closing your own open gate terminal when a teammate solves the gate first (today it stays open until you close it).
