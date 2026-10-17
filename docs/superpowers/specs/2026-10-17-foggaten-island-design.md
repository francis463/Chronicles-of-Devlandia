# Foggaten Island and beyond: design

**Date:** 2026-10-17 · **Status:** awaiting the owner's review of this written spec

## Goal

Add a separate island biome, **Foggaten Island**, reached by boat from the Peaks, and grow the game around it: a **sailing mini-game** for the crossing, a **lighthouse puzzle**, a **12th chest and badge** (TypeScript) that the lighthouse unlocks, and a **second island**, **Cinder Isle**. This is five pieces of work, so it is delivered in **phases**, each with its own implementation plan, each shippable on its own.

## Decisions already made with the owner

| Question | Decision |
|---|---|
| How to reach the island | A dock on the Peaks' east shore and a boat |
| What the island holds | A fog-themed zone with a hint NPC, decorations and inspectable places |
| When the dock opens | After the Terminal Gate is solved (a shared team flag) |
| Also in scope (asked for after the first design) | A 12th chest and badge, a new puzzle, a second island, a sailing mini-game |

## Decisions I made for the owner: please check these first

The owner asked for the four extras without details. These are my defaults; each one can change before a plan is written.

1. **The 12th chest is TypeScript** (`chest-ts`), standing on Foggaten Island, with a bank of 6 questions like every other chest. (Rust and Go were the alternatives; TypeScript matches the course stack.)
2. **The puzzle is the Lighthouse Lamp**: set 8 switches to the binary number that spells a letter, in the style of the Signal Tower's switch puzzle. Solving it lights the lighthouse, which opens the TypeScript chest and the way to Cinder Isle.
3. **The sailing mini-game replaces the fade crossing**: a short steering game across a foggy strait, always skippable.
4. **The second island is Cinder Isle** (volcanic, ash and embers), reached by a second boat from Foggaten once the lighthouse is lit. Like Foggaten it has a hint NPC (a blacksmith), a forge and landmarks, and no chest or puzzle of its own.
5. **Badges become 12 everywhere** (`n/12`). Saved badges, the leaderboard and the database all change. This is the riskiest part, so it is its own phase with its own deploy order (below).

## Phases

| Phase | What | Needs the owner's Supabase |
|---|---|---|
| A | Foggaten Island, the dock, `sail` with a fade crossing, fog, hermit, lighthouse (unlit), mini-map panel | No |
| B | The sailing mini-game replaces the fade (skippable) | No |
| C | The Lighthouse Lamp puzzle and the shared `lighthouseLit` flag | No |
| D | The 12th chest, its question bank, badges 11 → 12 everywhere | **Yes: one migration, applied before the app is deployed** |
| E | Cinder Isle and the second boat | No |

Phase order is A → B → C → D → E. B, C and D each build on A; E needs C (it unlocks when the lighthouse is lit). Every phase leaves the game working: until D ships, the lighthouse puzzle rewards a story line and a lit lighthouse, and until E ships the second boat is simply absent.

## Phase A: Foggaten Island

- **Zone.** `ZoneId` gains `"foggaten"` (name `Foggaten Island`). The island is one walkable screen surrounded by sea. It has no wall, no river and no gate. Zones are connected by their edges today; the island is connected by its **dock**, so a zone can also be entered by a `sail`.
- **Docks.** The Peaks get a pier on the east shore (`[B] Dock`, a place like the signpost), and the island gets its own dock. Before the gate is open the Peaks' dock reads `The boatman waits for the gate to open`. After that, `E` at the dock sails to the other island's dock.
- **`sail` action.** `{ type: "sail"; to: ZoneId }` in the reducer: allowed only when the player is within reach of a dock and, for the Peaks' dock, `gateUnlocked`. It moves the player to the destination dock's landing point, logs `You sail through the fog to Foggaten Island.` (or `You sail back to the Peaks.`), and changes no stat. In Phase A the crossing is a short fade that is skipped when reduced motion is on.
- **The island's places.** An unlit lighthouse (inspect: story text), a **hermit** (`[H] Hermit`, gives a hint for the next step in the same way Ada and the ranger do), a campfire and ruins to inspect, and trees and rocks. A thick, slowly drifting **fog** is painted over the island (a view effect only; it hides nothing and changes no gameplay). Reduced motion freezes the drift.
- **Mini-map.** The world map gains an island panel east of the Peaks, with the player's outline and teammates on it as for the other zones.
- **Teams.** `gateUnlocked` is already shared, so the dock opens for the whole team. A teammate's zone travels in position messages and presence as today. Older clients treat an unknown zone as null and simply do not show that teammate; nothing breaks. `/where`, `/ping` places and the mini-map learn the new zone and its places (`dock`, `lighthouse`, `hermit`).
- **Chat commands.** `/ping dock` and the other place names work on the island; `/help` lists them.
- **Not in this phase:** chests, puzzles, boats beyond the one pair of docks.

## Phase B: The sailing mini-game

- **What it is.** Choosing to sail opens a small full-panel screen, **Foggy Strait**: a boat moves forward automatically across a foggy sea while the player steers left and right to dodge a few rocks and reach the far dock. It lasts about 15–25 seconds. A hit pushes the boat back a little; nothing costs HP, items or time on the game clock, and nobody can fail. Reaching the dock completes the `sail`.
- **Controls.** `A`/`D` or the arrow keys steer; on a touch screen two large `◀` `▶` buttons (the existing touch-control style). `Esc` and a visible `[ Skip crossing ]` button are always available from the start, and skipping completes the `sail` exactly like finishing. With reduced motion on, the mini-game is skipped automatically and the Phase A fade rule applies.
- **Rules.** The mini-game is pure view logic: a deterministic function of elapsed time and steering, with no randomness in its outcome, tested without a browser. It runs on its own timer and does not advance the game clock or move teammates. It is never required for anything.
- **Teams.** Each player sails alone, on their own screen; nothing is sent to the team except the resulting zone change.

## Phase C: The Lighthouse Lamp puzzle

- **What it is.** At the lighthouse, `E` opens a puzzle terminal (the same look as the Signal Tower terminal): eight switches, a live binary and decimal readout, and the target text **"Make the lamp send the letter H"** (ASCII `H` = 72 = `01001000`). `[ RUN LAMP ]` checks the switches. A wrong setting says what the lamp sent instead (for example the letter or `?` if it is not a letter) and offers the same hint item behaviour as the other puzzles (the drone's tip after two wrong tries).
- **Reward.** A correct setting lights the lighthouse (`lighthouseLit`): the lamp is drawn lit with a beam that sweeps the fog, the log says so, and the second boat's dock stops being locked (Phase E). The 12th chest becomes reachable (Phase D).
- **State.** `GameState.lighthouseLit: boolean` and `TeamFlags.lighthouseLit`: a one-way shared flag like `towerPowered`. It is read leniently from older clients (missing means false), exactly like `archiveOpen`.
- **The puzzle's letter.** Fixed (`H`) in this version; a later version can roll one per game.

## Phase D: The 12th chest and badge (TypeScript)

- **The chest.** `chest-ts` ("TypeScript Chest") is added to the chest table and the chest ids. It stands on Foggaten Island near the lighthouse and opens only after the lighthouse is lit (until then it is drawn closed and says `The lighthouse keeps this chest shut`). It has a bank of 6 questions in the existing formats (fill the blank, or choose one of four; some ask what a snippet prints), each independently checked for a single correct answer, like every other bank.
- **Badges become 12.** Everything that says 11 becomes 12: the badge counter (`Badges: n/12`), the Codex, `/badges`, the leaderboard (`n/12 badges`), the badge-count limits in the leaderboard's reply parsing, the saved-badge restore and the README. The chest-id lists on the client, in the team messages and in the saved-badge restore all gain `chest-ts`.
- **Database (owner-gated, and order matters).** The `badges.chest` check lists the allowed chest ids. A new migration replaces that check with one that also allows `chest-ts`. **It must be applied before the new app is deployed**, otherwise a player's TypeScript badge would be refused by the database and the saver would keep retrying. Applying it first is harmless to the current app. The SQL tests are updated (the unknown-chest case changes from `chest-rust` to a name that will never exist) and re-run locally before the migration is offered.
- **Older clients.** An older app ignores a `chest-ts` badge in team messages and drops it when restoring saved badges (both already ignore unknown chests); it keeps working and simply shows 11.

## Phase E: Cinder Isle

- **Getting there.** A second dock on the south shore of Foggaten (`[B] Dock`) is locked (`The boatman won't sail into the ash until the lighthouse is lit`) until `lighthouseLit`. After that, `E` sails there (with the Phase B mini-game when it exists, the fade before that), and Cinder Isle's own dock sails back.
- **The island.** `ZoneId` gains `"cinder"` (name `Cinder Isle`). Volcanic terrain, a smouldering volcano landmark, ash and ember particles, a **blacksmith** (`[S] Blacksmith`, hints), a forge and anvil to inspect, and lava rock decorations. It has no chest and no puzzle. Reduced motion freezes the embers.
- **Mini-map and teams.** The world map gains a Cinder panel (south of Foggaten, so the map grows a row); teammates, pings, `/where` and `/ping` know the new zone and places (`forge`, `volcano`, `blacksmith`).

## Cross-cutting

- **No gameplay stats change.** HP, stamina, speed, the clock and the existing puzzles behave exactly as before. The island zones never drain HP.
- **Saving.** Quest state is still not saved; only badges are, as today. `lighthouseLit` is part of the game, not the account.
- **Accessibility.** Every new interaction works by keyboard and touch; the mini-game is always skippable; fog, embers and the lamp beam respect reduced motion; every new place has a text label and a log line.
- **Performance.** Fog and ember effects are pixel-art overlays drawn in the existing canvas painter and must not add per-frame allocation beyond the existing snow effect.

## Edge cases

- Gate not solved: the Peaks' dock is locked and `sail` is refused with the dock's message.
- `sail` from anywhere that is not at a dock, with an unknown zone, or while a terminal or the Codex is open: refused, no state change.
- Teammates in different islands: each sees only the teammates on their own screen, as with the village and forest.
- Leaving a team game or returning to the menu while sailing: the crossing is dropped and the game ends as usual.
- Reconnecting mid-crossing: the player lands where their last `sail` put them.
- A saved `chest-ts` badge restored into a game where the lighthouse is not lit: the badge counts as earned and the chest shows open (badges are personal); lighting the lighthouse still unlocks the chest for anyone who has not earned it.

## Testing

- **Unit:** the `sail` reducer rules (gate, range, zone, modals), the zone table and exits, island places, the shared `lighthouseLit` flag and its lenient parse, the lamp puzzle's check and messages, the mini-game's pure update function (steering, collisions, completion, skip), the new chest's bank (validity of every question), the 11 → 12 sweep, presence and message parsing with unknown zones and chests.
- **Render:** the new sprites, the fog and ember overlays, painting and caching, the mini-map panels.
- **SQL (Phase D):** the updated `policies.sql` and `leaderboard.sql` pass on a local Postgres with the new constraint, and a planted fault (the constraint left at 11) fails them.
- **Browser (1366 × 657 and 390 × 844), per phase:** reach each new zone, the locked and unlocked dock, the mini-game and its skip, the lamp puzzle, no horizontal scroll, no console errors.

## Out of scope

More than two new islands, boats you steer freely around a sea map, any combat or enemies, saving quest state to the account, per-game random lamp letters, and answer checking on the server.

## Review focus

1. A team never gets stuck or split by the new zones: a teammate on an unknown zone, the shared flags and the one-way `lighthouseLit` all behave.
2. The mini-game never traps a player: Skip, `Esc` and reduced motion always complete or cancel the crossing.
3. The 11 → 12 change leaves no stale "11" anywhere and never loses a saved badge, and the migration order is documented and tested.
4. No island changes any existing gameplay value or any existing puzzle.
5. No secret and no database change other than the one Phase D migration.
