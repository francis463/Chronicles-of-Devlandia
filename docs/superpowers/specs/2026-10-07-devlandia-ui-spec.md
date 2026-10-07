# Chronicles of Devlandia — UI Spec (from Figma Make)

**Source:** https://www.figma.com/make/Um3mf7sQOJeCYGX5jdffnz/Create-Wireframe--Copy-
- `src/App.tsx` in the Make file: lo-fi interactive wireframe (layout + behavior). **Authoritative for layout and game rules.**
- `docs/reference/game-ui-mockup.svg` (copied from the Make file): colored mockup. **Authoritative for visual style.**

Product: a browser game where the player explores a map and unlocks gates by fixing small code snippets ("Solve the Map, Break the Code, Find the Treasure."). It's an HCI course project and works offline.

## Visual tokens (from the SVG)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0f172a` | page / HUD bars |
| `--panel` | `#1e293b` | panels |
| `--panel-border` | `#334155` | panel stroke |
| `--editor-bg` | `#090d16` | code editor |
| `--text` | `#f8fafc` | primary text |
| `--text-muted` | `#94a3b8` | secondary text |
| `--primary` / `--primary-border` | `#0284c7` / `#38bdf8` | default buttons, river, drone, subtitle |
| `--danger` / `--danger-border` | `#ef4444` / `#f87171` | Exit Game |
| `--accent` / `--accent-border` | `#f59e0b` / `#fbbf24` | gate, HP/STA text, quest, terminal header |
| `--success` / `--success-border` | `#22c55e` / `#4ade80` | player, Submit, code text (`#4ade80`) |
| `--neutral` / `--neutral-border` | `#64748b` / `#94a3b8` | Use Hint Item |

Font: JetBrains Mono (monospace). Panel radius 6px, button radius 4px. Menu buttons are 200×35.

## Screen 1 — Main Menu
- Title "CHRONICLES OF DEVLANDIA", tagline "\"Solve the Map, Break the Code, Find the Treasure.\""
- A centered 200px stack of buttons with 8px gaps: SOLO QUEST, TEAM LOBBY, SETTINGS, EXIT GAME (danger).
- Footer: left "[?] HCI Help / Tutorials", right "v1.0 | Online Network" or "v1.0 | Offline Network", following the browser's connection status (the wireframe showed "Offline Network" as fixed text from before team play went online).

## Screen 2 — Overworld (region "C++ PEAKS (SNOW)")
- **Top HUD:** HP bar + value, STA bar + value, "REGION: C++ PEAKS", phase/time ("Day|Dusk|Night / HH:MM"), "[=] Menu".
- **Left panel:** mini-map (POIs as squares, player as a dot, river line) and the controls legend: "Move: WASD / Arrows", "Interact: [E]".
- **Viewport (min-height 360px):** biome labels "(Snowy Peaks Biome)" (top-left third) and "(Dense Forests Biome)" (bottom-right); the Frozen River as a dashed horizontal line from 25% to 75% at y≈33%; a "[G] Gate" button at the center; "[X] Supply Cache" at (82%,18%); the player marker and an AI drone marker; a day/night tint overlay; a fog-of-war radial gradient centered on the player; an "[E] Inspect <POI>" prompt above the player when near a POI; and a POI inspection card in the bottom-left.
- **Right panel:** "Event Log / Live", numbered entries.
- **Bottom HUD:** "Inventory:" with 4 slots `Key, Food, —, —` (slot 3 becomes "Patch" after looting), and "Quest: Survey Frozen River (0/1 | 1/1 Complete)".

### Rules (exact values)
- Coordinates are percentages of the viewport. The player starts at (28,72) and the drone at (36,70).
- Movement: WASD/arrows move 4 units. The player is clamped to x∈[6,94] and y∈[10,90]. Each move costs 1 stamina, floored at 0.
- Clock: starts 19:29 (1169 min). Every 2000 ms, +5 min (wraps at 1440) and +2 stamina (capped at 100).
- Phase: Night if `<06:00` or `≥20:00`; Dusk if `18:00–19:59`; otherwise Day. Tint: night `rgba(20,20,28,0.25)`, dusk `rgba(40,40,32,0.12)`.
- Drone: 320 ms after the player moves, it moves 58% of the way toward the player.
- POIs: gate "Terminal Gate" (50,50), chest "Supply Cache" (82,18), river "Frozen River" (54,33). The interact radius is ≤13 (Euclidean distance) to the nearest POI.
- River zone: x∈[24,76] and y∈[28,39]. Entering it the first time completes the quest and logs "Quest complete: Frozen River surveyed." While inside, the player takes −8 HP every 1800 ms, logs "Cold exposure: -8 HP.", and HP stops at 0.
- Interact results (log text):
  - gate: "Gate terminal ready. Puzzle link found."
  - chest: first time "Supply cache opened: +1 Repair Patch.", after that "Supply cache already collected."
  - river: "River scan: unstable ice, thermal damage."
- Inspection copy:
  - gate: "A locked compiler gate. Its terminal leads to the code puzzle."
  - chest: looted "Cache recovered. Repair Patch added to inventory." / not looted "A sealed field cache. Move closer and press [E] to open."
  - river: "Ice integrity: 42%. Exposure drains HP while crossing."
- Log keeps the last 6 entries. The initial entries are "Entered C++ Peaks.", "Drone link established.", "Objective: survey the frozen river."

## Screen 3 — Terminal Puzzle (modal over the overworld)
- Header "< TERMINAL GATE LOCK: C++ PEAKS >" with a "[X] CLOSE" button.
- "PUZZLE INSTRUCTIONS:" "Fix the CSS styling property below to reveal the missing bridge path."
- Editor lines: `1 | .frozen-bridge {`, `2 |     width: 100%;`, `3 |     display: [input, default "none"];  <-- TYPE CORRECT VALUE HERE`, `4 | }`
- Hint box "SMART AI DRONE DIAGNOSTIC HINT:" with the text "\"Setting display to 'none' hides the object. Try 'block' instead!\""
- Buttons "[ SUBMIT CODE ]" (success) and "[ USE HINT ITEM ]" (neutral).
- Correct answer: `block`.
