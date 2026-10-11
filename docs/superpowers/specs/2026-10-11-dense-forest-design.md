# Dense Forest — design

Status: draft for review. Branch: `claude/trusting-archimedes-64rvrc`. Builds on `2026-10-08-dev-village-zones-design.md`, `2026-10-09-learning-core-design.md`, `2026-10-10-team-chat-design.md` and `2026-10-11-bigger-question-bank-design.md`.

## Intent

Add a third biome, the **Dense Forest**, that works like Dev Village: you walk into it from the C++ Peaks, it has its own pixel-art map, places to visit and a guide, and it shows on the mini-map and for teammates. It also holds an 11th code chest (JavaScript) and the Golden Semicolon's new burial place. For a course project played by classmates in solo or 2–4 player team games. Success: the forest feels like a real place to explore, nothing that exists today breaks, and every number and line of copy that said "10 badges" is right for 11.

Decided with the user: the forest hangs **south of the Peaks**; it offers **exploring plus a guide**; its puzzle is a **JavaScript chest** with a 6-question bank; the **Golden Semicolon moves into the forest**. A **fourth zone is out of scope here** and gets its own design afterwards.

## Rules (game logic)

### Zones and exits

- `ZoneId` becomes `"peaks" | "village" | "forest"`. A zone has a **list** of exits (today one): `Zone.exits: Exit[]`. An exit has an edge (`"west" | "east" | "south" | "north"`), a span (rows `minY..maxY` for west/east, columns `minX..maxX` for south/north, inclusive) and a target zone.
- Exits: Peaks west (rows 62–78, to the village, as today); village east (rows 62–78, to the Peaks, as today); **Peaks south** (columns 42–58, to the forest); **forest north** (columns 42–58, to the Peaks). Columns are even numbers so every arrival point stays on the movement lattice (the Peaks' gate is at x 50).
- Leaving through a south or north exit is a **vertical** step off the zone's edge (`y > BOUNDS.maxY` or `y < BOUNDS.minY`) from a column inside the span; the column keeps its value. Arrival is on the opposite edge (`y` 90 or 10), same column, and the drone lands two steps in (and 2 columns over, as the horizontal case does 2 rows up). `exitFor` and `arrival` handle all four edges; today's west and east behaviour and tests are unchanged.
- The Peaks' south exit is open from the start (it is on the camp side of the north wall). Crossing it logs the new zone's `entered` line once per entry, like the village.

### The forest

- **Places** (all interactable only from inside the forest, like the village's): `[R] Ranger` (the guide), `[F] Campfire`, `[O] Old Oak`, `[P] Signpost`, and the JavaScript chest. A button's bracketed letter is a label, never W, A, S, D or E.
- **The ranger** talks like Ada: her line is the first unmet stage in a fixed order, shown in her card and logged as `Ranger: "<line>"` using the only-once rule. Stages: before the scroll is decoded, point the player at the Supply Cache and the gate; once decoded and before the artifact is found, say where to dig; after it is found, congratulate and mention the chests still unopened. The exact lines are fixed in the plan.
- **Campfire and Old Oak** open an inspection card (flavour text, no log line). **The signpost** reads "C++ PEAKS → North through the trees: base camp, the north gate and the frozen river."
- The forest has **no hazard, no fog, no wall and no river**. Respawn still returns you to the Peaks camp (zone `"peaks"`, player (28, 72), drone (36, 70)). Only the Peaks has hazards, so a player can only be downed there.
- `visiblePois` and `reachPlaces` use the current zone's places plus, in the forest only, the dig spot once revealed.

### The JavaScript chest

- A new `ChestId` `"chest-js"`, `Lang` `"javascript"`, badge `JavaScript`, spoken `JavaScript`, language `JavaScript`, zone `forest`, caption `above`, `north: false`, placed in the forest. It is appended to the chest table, so the table order for the first 10 is unchanged and the 11th is JavaScript.
- Its bank follows the bigger-question-bank rules: `BANK_SIZE` (6) questions, one `blank` plus two `choice` entries repeated twice (so 2 blanks and 4 choices), every field the same as the other banks, ids `js-<topic>`. The 6 topics are chosen in the plan (variables, `console.log`, functions, arrays, `===`, template strings are the candidates). Each blank's live check is either a complete `legal` list for its position or a `notLegal` list that flags no real name.
- Everything that is derived from the chest table (picks, the roll, Codex, cards, badges, team badge messages, quest line) takes the 11th chest without special cases. `rollGame` draws one more pick, **after** the ten existing ones and before the seed, so the access code and seed shift by one draw; the roll test pins the new order.
- **Copy that changes from 10 to 11:** the Codex title (`CODEX: n/11 BADGES`), the quest line (`Badges: n/11`, bold at 11), `/badges` (`Your badges: 3/11 (...)`, already counted from the table), the README, and comments. A grep for `10` in source and docs is part of the plan.
- Chat: a new ping place `js` (the chest) and `ranger`, `campfire`; `PING_PLACE_NAMES` grows by three and the unknown-place line lists them. Ping places follow the "points come from existing constants" rule.

### The Golden Semicolon moves

- `HIDDEN_ARTIFACT` moves from the Peaks (72, 84) to a forest point (the plan picks it and records it, away from the path and the other places). `clueDecoded && !artifactFound` still reveals it, now **only in the forest**. The Peaks no longer has a dig spot or an "X" mark.
- The scroll's decoded clue and every line that points at it change: the decoded clue says where to dig in the Dense Forest, the log lines (`LOG.clueDecoded`, the team line), Ada's line (`village.ts`: "Look for the X south-east of camp…") and the ranger's stage lines are updated so they all agree: the artifact is south of the camp, down through the trees. The `artifact` flag is shared by the team as today.
- The inspection card and the dig prompt (`[E] Dig here`) work as today, in the forest.

## Team play

- Zone sync is already generic. `parseMessage` and presence accept `"forest"` as a zone; an unknown zone from a newer client still shows as "somewhere new" and is never dropped. An older client treats a forest teammate as in an unknown zone (accepted, as for the village's rollout).
- The zone-change log reads `Kai went to Dense Forest.` The mini-map and chat `/where` use the zone's name (`Dense Forest`).
- The 11th chest and its badge reach teammates through the existing `badge` message (chest ids are validated against the chest table).

## Drawing

- **Area:** `src/render/areas/forest.ts` is a new area: dense dark-green tree bands at the sides and top and bottom, mossy ground, a winding dirt path from the north exit to a clearing in the middle (campfire, ranger, chest), a few boulders and stumps, with a mouth (opening) in the north edge's hedge where the exit is, and a `(Dense Forest)` caption. New sprites: ranger (an explorer-sized figure with a distinct hood colour, like Ada), campfire (2 frames: flame flicker, still under reduced motion), old oak (a large tree), forest signpost (reuses the signpost art if it fits), pine and bush variants as needed. The plan fixes sizes and art points and may nudge points by a few px, recording a ruling.
- **Peaks' south edge:** a mouth in the bottom hedge at the exit columns, a path piece running out through it, and an exit sign `DENSE FOREST ↓` under it; the existing `(Dense Forests Biome)` caption stays. Scenery that intersects the mouth is left out, as for the west exit.
- **Light:** the forest draws a little darker (a fixed cool tint on top of the phase tint, none under `/light day`'s transparent override is *not* applied: the tint is part of the area, not the phase); the campfire adds a small warm glow at night, like the Peaks' lights. `/weather snow` works here too.
- **Mini-map:** three cells of 64 × 36 CSS px (16:9) in a row, Village, Peaks, Forest, filling the same 194 × 56 box (so the sidebar is no taller). Each is painted from its area's terrain; yours is outlined; teammates and ping rings appear in their zone's cell; the chest diamonds show the JavaScript chest in the forest cell. The Peaks cell's wall line has the gate gap; the others have no wall line.
- **Map buttons:** `[R] Ranger`, `[F] Campfire`, `[O] Old Oak`, `[P] Signpost` and the `JavaScript chest` button, each at least 44 × 44 CSS px, captions above when there is room, as the village's. All Peaks and village buttons show only in their own zones.
- **Changing zones:** the 200 ms fade (none under reduced motion) and the zone-keyed world layer apply to the new zone and the vertical exits.

## Testing

- **Geometry:** `exitFor` and `arrival` for all four edges, with the exit spans' edges, rows/columns just outside the span, diagonal steps, and today's west/east cases unchanged; every arrival point is on the lattice.
- **Reducer:** crossing south and north, the `entered` log lines once, interaction only with the current zone's places, the dig spot only in the forest and only while revealed, respawn at the Peaks, the artifact flag syncing.
- **Chest table and bank:** 11 chests, 66 questions, `BANK_SIZE` per chest, 66 distinct ids; every existing bank invariant (gap count, live data, tiles, choices) over the JavaScript bank; the roll's new draw order; the Codex, cards and quest line at `n/11`; `/badges` at `n/11`.
- **Rendering:** area, terrain, scene and wall tests for the forest (stable positions, protected boxes, mouth rules), sprite sizes, the mini-map's three cells and markers, the caption and button tests for each zone separately, and the label layout with the forest's fixed boxes.
- **Team and chat:** a teammate in the forest on the mini-map and `/where`, the zone-change line, the JavaScript badge message, the new ping places.
- **Content:** the 6 JavaScript questions are verified by independent agents that run the code (`node` is installed).
- **Browser (Playwright):** walk Peaks → forest → Peaks at 1366 × 657 and 390 × 844 (touch), talk to the ranger, open the JavaScript chest, decode the scroll and dig up the Semicolon in the forest; no page scroll, no console errors.

## Out of scope

A fourth zone (its own design); a puzzle in the forest other than the JavaScript chest; changing the Signal Tower, the river, the wall, the gate, the Matcher or the Archive.
