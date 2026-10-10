# Chronicles of Devlandia

*"Solve the Map, Break the Code, Find the Treasure."*

A browser game for an HCI course project. Explore the snowy C++ Peaks with your AI drone, fix a CSS bug at the terminal gate to open the way north, survey the Frozen River, and walk west into Dev Village, where Ada the villager has hints.

Along the way, 10 language treasure chests ask questions in HTML, CSS, PHP, Python, Java, C#, SQL and C++, and each one you answer earns a badge. In the village, the Syntax Matcher at the Syntax Terminal prints an access code that unseals the Archive, and the Codex keeps every badge you've earned with the question behind it.

Built with Vite, React 19, TypeScript and Tailwind CSS 4. Play with a keyboard on a computer, or with on-screen touch controls on a phone or tablet. The layout fits screens down to 360px wide, and on a desktop the map fills most of the window.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit + component tests (Vitest)
npm run build    # type-check and build to dist/
```

## How to play

| Action | Keyboard | Touch screen |
|---|---|---|
| Move | `W` `A` `S` `D` or arrow keys | D-pad under the map (tap = one step, hold = keep moving) |
| Inspect / interact with a nearby point | `E` | `[E]` button (lights up when something is in range) |
| Open or close the Codex | `C` | `[C] Codex` in the top bar |
| Close the terminal or the Codex | `Esc` or `[X] CLOSE` | `[X] CLOSE` |

The touch controls only appear on touch screens; keyboard players never see them. To try the game on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the Network link it prints.

- **North wall:** a stone wall runs across the map at the snow line, and the Terminal Gate is the only way through. The gate stays locked until you solve its terminal, so the river, the Signal Tower and the Supply Cache are out of reach until then (clicking them only shows what they are).
- **Dev Village:** walk left off the map near base camp, through the gap in the hedge. Ada (`[V] Ada`, or `E` next to her) gives a hint for your next step. The signpost (`[P] Signpost`) points the way back east to the Peaks.
- **Terminal Gate:** press `E` next to it, or click `[G] Gate`. Fix the CSS property to open the gate. Stuck? Click `[ USE HINT ITEM ]`.
- **Code chests:** 6 in the Peaks (3 of them north of the wall, so they wait for the gate) and 4 in Dev Village (one inside the Archive). Press `E` next to a chest or click its button; on a phone a chest's name shows when you're next to it. Each chest asks one question, picked at random for each game from a bank of 3: fill the blank in a snippet, or pick one of four answers (some ask what a snippet prints). A right answer earns that language's badge, and the chest stays open so you can review it.
- **Typing or Blocks:** every code blank has a `Type` / `Blocks` switch. In Blocks mode, tap a tile to put it in the blank, drag it there with the mouse, or on a touch screen hold it and drag. `[ UNDO ]` and `[ RESET ]` step back through your edits.
- **Live syntax check:** as you type, a line under the code says when what's in the blank can't be valid there (an unclosed quote, a word that isn't an SQL keyword…). It never tells you whether the answer is right. `[ SUBMIT CODE ]` waits until the blank passes the check, and after two wrong answers the drone shows its tip.
- **Syntax Terminal and the Archive:** in Dev Village, use the Syntax Terminal (`Terminal`) and pair 5 snippets with their languages. Solving it prints a 4-character access code; type it at the Archive's keypad to unseal it and reach the C# chest.
- **Codex:** press `C` (or `[C] Codex`) to see all 10 badges, where each chest is, and for the ones you've earned, the question and its explanation.
- **Quest:** go through the gate and walk onto the Frozen River to survey it. Until the Signal Tower is powered, the ice drains 8 HP every 1.8 seconds while you stand on it.
- **Supply Cache:** open it for a Repair Patch.
- **Hidden artifact:** the Supply Cache also holds an encrypted scroll. Click `[ Decode Scroll ]` in the bottom bar and decode it (it uses ROT13: every letter is shifted 13 places). The decoded clue says where the **Golden Semicolon** is buried; walk there and press `E` (or the touch `[E]` button) to dig it up. The spot stays hidden until you've decoded the scroll.
- **Signal Tower:** press `E` next to the tower in the snowy top-left (or click `[T] Tower`). Flip switches A–D and press `[ RUN CIRCUIT ]`: every line (`A AND B`, `B XOR C`, `NOT D`) must output 1. The readout shows your switches as a binary and decimal number. Powering the tower lifts the fog of war and rebuilds the bridge, which makes the river safe to cross.
- **At 0 HP** you're downed. Click `[ Respawn ]` to return to base camp.
- The clock advances 5 in-game minutes every 2 seconds and cycles through day, dusk and night.

The map is drawn in pixel art on a canvas: snowy peaks, the frozen river, the meadow and the dense forest, with your hooded explorer and your AI drone. In team games your teammates are explorers in their own colours. Bushes, rocks and trees mark the edge of the walkable area, with a gap in the hedge where the path leads west, and a stone wall with a barred gate closes off the north. Dev Village has huts, a well and fences around a dirt square. The mini-map shows both zones side by side, with yours outlined. Pixels stay sharp at any screen size; on some laptop scaling settings (such as Windows at 125 %) the map is drawn a little smaller to keep them sharp. If your device is set to reduce motion, characters step instead of gliding and the blinking lights, pulses and glints stay still.

## Team Lobby (2–4 players)

From the main menu choose **TEAM LOBBY**, type a nickname and pick a connection:

- **Online**: players on different devices, over Supabase Realtime (needs internet and a configured project, see below).
- **Same computer**: browser windows on one device, no internet needed (handy for demos and testing).

One player presses **[ Create Room ]** and reads out the 4-letter room code; the others type it and press **[ Join ]**. The host (the creator) presses **[ Start Expedition ]** once at least 2 players are in. A player who joins after the start drops straight into the game.

In the game, teammates appear as colored dots with their names, and the top bar shows `ROOM <CODE> · <N> online`. A teammate in the other zone shows only on the mini-map.

- **Shared by the team:** surveying the river, the Supply Cache loot, the decoded clue, the Golden Semicolon, the north gate, the signal tower (its lifted fog and the bridge), the Archive, and the clock. Everyone's Syntax Terminal prints the same access code, so once one player unseals the Archive it's open for all.
- **Your own:** your zone, position, HP, stamina, terminals and badges. Badges are personal: each explorer opens their own chest.
- Your event log tells you what teammates did, for example *"Kai opened the gate."*, *"Kai went to Dev Village."* or *"Kai earned the SQL Badge."* **[=] Menu** leaves the room.

**Online setup.** Online play works out of the box with the game's own Supabase project (`chronicles-of-devlandia`, Realtime only: no tables, no stored data). To use a different project, put its URL and publishable key in a `.env` file (see `.env.example`):

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

If the server can't be reached, Online shows "Can't reach the team server…" and Same computer still works. The claude.ai preview link blocks outside connections, so there only Same computer works (between windows of the same browser).

## Project layout

```
src/game/      pure game rules: constants, geometry, clock, cipher, logic, challenges, roll, cards, team, wall, zones, village, reducer
src/learn/     the challenge engine and question bank: live check, shuffling, access codes, the 10 chests and their questions
src/hooks/     keyboard controls, game timers, team session
src/net/       team transports: Supabase (Online), BroadcastChannel (Same computer), in-memory (tests)
src/render/    the pixel-art map: world geometry, sprites, areas/ (each zone's art), terrain, motion, scene description and painting
src/screens/   MainMenu, TeamLobby, ChallengeTerminal + challenge/* (chests, gate, scroll, Matcher, keypad), Codex, LogicModal (tower), overworld/*
src/ui/        Panel, Button, Meter, TerminalDialog primitives
```

## Design sources

- Figma Make wireframe: https://www.figma.com/make/Um3mf7sQOJeCYGX5jdffnz/Create-Wireframe--Copy-
- Spec with exact values: [`docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md`](docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md)
- Visual mockup: [`docs/reference/game-ui-mockup.svg`](docs/reference/game-ui-mockup.svg)
- Implementation plan: [`docs/superpowers/plans/2026-10-07-devlandia-ui.md`](docs/superpowers/plans/2026-10-07-devlandia-ui.md)
