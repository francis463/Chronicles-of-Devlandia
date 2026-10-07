# Chronicles of Devlandia

*"Solve the Map, Break the Code, Find the Treasure."*

A browser game for an HCI course project. Explore the snowy C++ Peaks with your AI drone, survey the Frozen River, and fix a CSS bug at the terminal gate to restore the bridge.

Built with Vite, React 19, TypeScript and Tailwind CSS 4. Play with a keyboard on a computer, or with on-screen touch controls on a phone or tablet. The layout fits screens down to 360px wide.

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
| Close the terminal | `Esc` or `[X] CLOSE` | `[X] CLOSE` |

The touch controls only appear on touch screens; keyboard players never see them. To try the game on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the Network link it prints.

- **Quest:** walk onto the Frozen River to survey it. The ice drains 8 HP every 1.8 seconds while you stand on it.
- **Supply Cache:** open it for a Repair Patch.
- **Terminal Gate:** press `E` next to it, or click `[G] Gate`. Fix the CSS property to restore the bridge, which makes the river safe to cross. Stuck? Click `[ USE HINT ITEM ]`.
- **Hidden artifact:** the Supply Cache also holds an encrypted scroll. Click `[ Decode Scroll ]` in the bottom bar and decode it (it uses ROT13: every letter is shifted 13 places). The decoded clue says where the **Golden Semicolon** is buried; walk there and press `E` (or the touch `[E]` button) to dig it up. The spot stays hidden until you've decoded the scroll.
- **At 0 HP** you're downed. Click `[ Respawn ]` to return to base camp.
- The clock advances 5 in-game minutes every 2 seconds and cycles through day, dusk and night.

## Project layout

```
src/game/      pure game rules: constants, geometry, clock, puzzle, reducer
src/hooks/     keyboard controls and game timers
src/screens/   MainMenu, Farewell, TerminalModal (gate), CipherModal (scroll), overworld/*
src/ui/        Panel, Button, Meter, TerminalDialog primitives
```

## Design sources

- Figma Make wireframe: https://www.figma.com/make/Um3mf7sQOJeCYGX5jdffnz/Create-Wireframe--Copy-
- Spec with exact values: [`docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md`](docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md)
- Visual mockup: [`docs/reference/game-ui-mockup.svg`](docs/reference/game-ui-mockup.svg)
- Implementation plan: [`docs/superpowers/plans/2026-10-07-devlandia-ui.md`](docs/superpowers/plans/2026-10-07-devlandia-ui.md)
