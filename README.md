# Chronicles of Devlandia

*"Solve the Map, Break the Code, Find the Treasure."*

A browser game for an HCI course project. Explore the snowy C++ Peaks with your AI drone, fix a CSS bug at the terminal gate to open the way north, survey the Frozen River, walk west into Dev Village, where Ada the villager has hints, go south into the Dense Forest, where a ranger keeps a campfire, walk west out of the forest into the Sunbaked Desert, or east to Sunny Beach.

Along the way, 11 language treasure chests ask questions in HTML, CSS, PHP, Python, Java, C#, SQL, C++ and JavaScript, and each one you answer earns a badge. In the village, the Syntax Matcher at the Syntax Terminal prints an access code that unseals the Archive, and the Codex keeps every badge you've earned with the question behind it. Team games have a chat box, and every game has a small command line.

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
| Chat (team) or type a command (solo) | `Enter` or `/` from the map, then `Esc` to go back to walking | the `CHAT` / `COMMANDS` tab beside the log |

The touch controls only appear on touch screens; keyboard players never see them. To try the game on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the Network link it prints.

- **Snowy Peaks:** the whole map is snow. It snows by default (turn it off for your view with `/weather clear`), the snow sparkles, you leave footprints that fade after a few seconds, your breath puffs in the cold and a gust of snow sweeps across now and then. At night an aurora ripples across the sky. Base camp has a ski lodge with smoke and a glowing window and a campfire with two benches; a frozen waterfall and two ice caves sit along the mountain edge; a fox, a mountain goat and three birds live on the map (the fox and goat drift away if you get close); wooden trail posts line the way from camp to the gate, from the gate toward the tower and east toward the dock; and a bouncing arrow marks the ski lodge (the HTML chest) until you earn your first badge. On the east road, `[P] Signpost` lists where everything is and what is still locked, and `[W] Weather Station` shows the time of day. Once the signal tower is powered (for the whole team), a hidden `[C] Cave` appears in the north-west with a short story card. All of this is decoration or a read-only card: nothing changes your HP, quest or badges, and the footprints, breath, gusts, aurora, birds and animals stand still if your device is set to reduce motion.
- **North wall:** a stone wall runs across the map at the snow line, and the Terminal Gate is the only way through. The gate stays locked until you solve its terminal, so the river, the Signal Tower and the Supply Cache are out of reach until then (clicking them only shows what they are).
- **Dev Village:** walk left off the map near base camp, through the gap in the hedge. Ada (`[V] Ada`, or `E` next to her) gives a hint for your next step. The signpost (`[P] Signpost`) points the way back east to the Peaks.
- **Dense Forest:** walk down off the map at the south of the Peaks, through the gap in the trees (the `Forest ↓` sign). The forest has no wall and no fog. The ranger (`[R] Ranger`) gives hints for your next step, and the campfire and the signpost (`[F]`, `[P]`) can be inspected, and the old oak holds the JavaScript chest. The signpost lists where everything nearby is (and, once you've decoded the scroll, which way the treasure lies), and it and the north gap lead back to the Peaks. A winding dirt trail runs from the north gap through the clearing, and leaves drift down through patches of sunlight (the light fades at night, and everything holds still if your device is set to reduce motion). Birches, ferns, stumps, logs, toadstools and flowers fill the woods over a mossy floor; a deer, a rabbit and a squirrel wander and shy away when you come near; morning mist drifts by day, and at dusk and night fireflies come out and an owl blinks in the old oak. Five landmarks (inspect them with `E` or a click; their captions show on hover on a small map) each link something in the woods to a coding idea: the Hunter's Cabin (`if`), the Stone Well (recursion), the Log Bridge (an API), the Fairy Ring (a loop) and the Hollow Tree (a variable). The ranger also asks for three glow mushrooms (violet, pulsing, in the north-west, north and east): pick each with `E` beside it (each pick teaches a fact about arrays, counted from 0), then talk to her and she cooks a stew that restores your HP in full, once. 
- **Terminal Gate:** press `E` next to it, or click `[G] Gate`. Fix the CSS property to open the gate. Stuck? Click `[ USE HINT ITEM ]`.
- **Sunbaked Desert:** walk off the Dense Forest's west edge, through the gap in the trees (the `← Desert` sign). Golden dunes, cacti, dry bushes, a few palms, an oasis with a footbridge and an old pyramid. A nomad (`[N] Nomad`) tells you where things are, the pyramid and the oasis hold the Java and Python II chests, and the signpost (`[S]`) points back to the forest; the east edge (the `Forest →` sign) leads back. Heat haze wavers, sand blows slowly across, a tumbleweed rolls through and a lizard suns itself on a rock (all still if your device is set to reduce motion). Ripples mark the dunes, with flowering saguaros, bleached skulls and rock arches among the cacti. A scorpion scuttles by the sand road, the nomad's camel shifts its weight, a snake slithers away from you, vultures circle overhead and a fennec fox trots out at dusk. A mirage shivers in the far dunes by day, sand devils spin across, the sand sparkles under the moon, and every two minutes a sandstorm sweeps across for a few seconds (never if your device is set to reduce motion). Five landmarks (inspect them with `E` or a click; captions show on hover on a small map) each link something in the dunes to a coding idea: the Caravan Camp (classes), the Old Well (async), the Buried Door (a password check), the Dry Riverbed (null) and the Obelisk (a cipher). The nomad also asks for three lost water jars: pick each up with `E` beside it (each teaches a string method), then talk to her and she shares water that restores your HP in full, once. The desert has no fog and no snow and changes none of your stats. `/ping nomad` works in team games, as do `/ping java` and `/ping py2` for the pyramid and the oasis.
- **Sunny Beach:** walk off the Dense Forest's east edge, through the gap in the trees (the `Beach →` sign). Pale sand, palms, rocks, umbrellas, a sandcastle, shells, a beached boat, a shipwreck and a pier running into the sea (you can't walk into the water). A fisher (`[F] Fisher`) tells you where things are, the pier and the shipwreck hold the C++ I and C++ II chests, and the signpost (`[S]`) points back to the forest; the west edge (the `← Forest` sign) leads back. Foam washes along the shore, the sea glints, gulls fly over and a crab scuttles along the sand (all still if your device is set to reduce motion). The beach has no fog and no snow and changes none of your stats. `/ping fisher` works in team games, as do `/ping cpp1` and `/ping cpp2` for the pier and the shipwreck.
- **Foggaten Island:** once the Terminal Gate is solved, the boatman at the Peaks' east dock (`[B] Dock`, on the shore) sails you across (until then it only says he is waiting for the gate). The island is one foggy screen: a hermit (`[H]`) gives hints for your next step, and an unlit lighthouse, a campfire and some ruins (`[L]`, `[F]`) can be inspected; the ruins hold the Python I chest. The island's own dock sails you back. A slow mist drifts over it (still if your device is set to reduce motion) until the lighthouse is lit, when the mist fades away, and the crossing fades to black for under a second. Nothing on the island changes your HP, speed or the quest. **The lighthouse lamp:** press `E` beside the lighthouse (`[L]`, `Light the Lamp`) to open its lamp lock. Set the eight switches (128 on the left down to 1 on the right) to the binary for the letter `H` and press `[ RUN LAMP ]`. A wrong setting says which letter the lamp sent instead, and after two wrong tries the drone's tip appears. Lighting it is shared with the whole team: the lamp glows and a beam sweeps the fog (steady if your device is set to reduce motion). It changes no stats. A sailing mini-game, a 12th chest and a second island come in later phases.
- **Code chests:** there are no chests lying on the ground: each of the 11 is inside a landmark, and the landmark is the chest. HTML is in the Ski Lodge and CSS in the Ice Cave (Peaks; the cave is north of the wall, so it waits for the gate), PHP in a hut and SQL in the windmill (Dev Village), C# in the Archive, JavaScript in the Old Oak (Dense Forest), Java in the Pyramid and Python II at the Oasis (Sunbaked Desert), C++ I on the Pier and C++ II in the Shipwreck (Sunny Beach), and Python I in the Ruins (Foggaten Island). Press `E` next to a landmark (`Search Windmill`) or click it; its caption gets a ✓ once you've earned its badge. Each chest asks one question, picked at random for each game from a bank of 6: fill the blank in a snippet, or pick one of four answers (some ask what a snippet prints). A right answer earns that language's badge, and the chest stays open so you can review it.
- **Typing or Blocks:** every code blank has a `Type` / `Blocks` switch. In Blocks mode, tap a tile to put it in the blank, drag it there with the mouse, or on a touch screen hold it and drag. `[ UNDO ]` and `[ RESET ]` step back through your edits.
- **Live syntax check:** as you type, a line under the code says when what's in the blank can't be valid there (an unclosed quote, a word that isn't an SQL keyword…). It never tells you whether the answer is right. `[ SUBMIT CODE ]` waits until the blank passes the check, and after two wrong answers the drone shows its tip.
- **Syntax Terminal and the Archive:** in Dev Village, use the Syntax Terminal (`Terminal`) and pair 5 snippets with their languages. Solving it prints a 4-character access code; type it at the Archive's keypad to unseal it and reach the C# chest.
- **Help and tutorial:** press `?` (or `[?] Help` in the top bar, or `[?] HCI Help / Tutorials` on the main menu) for a Help window with four tabs: Controls (every key and its touch equivalent), How to play (the goal, where the chests are, the world, the story), a six-step Tutorial with a "Try it" line each, and Tips. The game pauses while it is open, and `?` or `Esc` closes it.
- **Codex:** press `C` (or `[C] Codex`). It shows a badges bar with a hint at the nearest chest you haven't opened, a Story checklist (north gate, frozen river, signal tower, Supply Cache, scroll, Golden Semicolon, lighthouse lamp, Archive) with where to look for what's left, and all 11 badges grouped by zone with a coloured language tag each. Filter by All, Earned or To find. `[ Go there ]` on an unearned badge closes the Codex, writes where it is and how to get there (the gate, a boat) in the event log, and rings the landmark on your map if you're in its zone. Earned badges open to the question, your answer and its explanation, and `[ Practice ]` lets you answer that language's other questions as a study sheet, which never changes your badges or game.
- **Quest:** go through the gate and walk onto the Frozen River to survey it. Until the Signal Tower is powered, the ice drains 8 HP every 1.8 seconds while you stand on it.
- **Supply Cache:** open it for a Repair Patch.
- **Hidden artifact:** the Supply Cache also holds an encrypted scroll. Click `[ Decode Scroll ]` in the bottom bar and decode it (it uses ROT13: every letter is shifted 13 places). The decoded clue says where the **Golden Semicolon** is buried; take the boat to Foggaten Island and walk to its south-east corner (the dig spot is only there) and press `E` (or the touch `[E]` button) to dig it up. The spot stays hidden until you've decoded the scroll.
- **Signal Tower:** press `E` next to the tower in the snowy top-left (or click `[T] Tower`). Flip switches A–D and press `[ RUN CIRCUIT ]`: every line (`A AND B`, `B XOR C`, `NOT D`) must output 1. The readout shows your switches as a binary and decimal number. Powering the tower lifts the fog of war and rebuilds the bridge, which makes the river safe to cross.
- **At 0 HP** you're downed. Click `[ Respawn ]` to return to base camp.
- The clock advances 5 in-game minutes every 2 seconds and cycles through day, dusk and night.
- **Commands:** the side panel has a `LOG` tab and a `CHAT` tab (`COMMANDS` in a solo game). Type `/help` to see what runs where you are:
  - `/where` where your teammates are · `/time` the game clock · `/badges [name]` your badges, or what you know of a teammate's
  - `/ping [place]` mark your spot, or a place (`gate`, `tower`, `cache`, `river`, `dock`, `pier`, `lighthouse`, `hermit`, `ada`, `signpost`, `terminal`, `archive`, `ranger`, `campfire`, `nomad`, `fisher`, or a chest such as `html`, `cpp1`, `sql`), for your team
  - `/weather snow|clear` snowfall and `/light day|night|auto` lighting, on your own map only
  - `/mute name` and `/unmute name` hide or show a teammate's messages (in the lobby, use the `[ Mute ]` button on their row)

  Commands answer only you (and `/ping` shows a ring on everyone's maps for 5 seconds). None of them can skip a puzzle or change anyone else's game.

The top bar shows the time with a small pixel icon: a sun by day, a sunset at dusk and a moon at night. The map is drawn in pixel art on a canvas: snowy peaks, the frozen river, the meadow and the dense forest, with your hooded explorer and your AI drone. In team games your teammates are explorers in their own colours. Bushes, rocks and trees mark the edge of the walkable area, with a gap in the hedge where the path leads west, and a stone wall with a barred gate closes off the north. Dev Village has huts, a well and fences around a dirt square, and the whole village is one big meadow (no snow and no wall, so you can walk its north half too): a windmill whose sails turn, a pond with a footbridge, a town square with a fountain and benches, an orchard, a fenced crop field and three more huts, joined to the main road by a new dirt road. The huts have smoke curling from their chimneys, windows and a lantern that glow from dusk, three villagers who pace the road and square, a pecking chicken, two garden plots in the south and a market stall (all decoration: only Ada talks, and nothing in the village changes your stats). The smoke and the villagers stand still if your device is set to reduce motion. The mini-map shows the village, the Peaks, the desert, the forest, the beach and Foggaten Island side by side, with yours outlined. Pixels stay sharp at any screen size; on some laptop scaling settings (such as Windows at 125 %) the map is drawn a little smaller to keep them sharp. If your device is set to reduce motion, characters step instead of gliding and the blinking lights, pulses and glints stay still.

## Accounts and saved badges

The game opens on a login screen. **Log in** or **Sign up** with a name (3–12 letters, digits, `-` or `_`) and a password (8 or more characters), **Sign in with Google**, or **Play as guest**. Signed-in players keep their 11 badges, and the answers behind them, on any computer: each new game starts with them earned, and the Codex shows the question you actually answered. Guests can play Solo Quest and Team Lobby too, but nothing of theirs is saved. Quest progress, your position and your inventory are not saved.

The menu shows who is playing, with **[ Log out ]** (or **[ Log in ]** for a guest). A signed-in player can add an optional email with **[ Add email ]**; once it is confirmed, **Forgot your password?** sends a reset link to it (an account with no email can't reset its password). A Google player picks a name the first time. In a team game your team name is your account name.

**Accounts setup (for whoever runs the Supabase project).** Accounts use the same Supabase project as Online play, with two tables (`profiles`, `badges`) locked so a player can only read and write their own rows, and one Edge Function (`account`) that signs players up and in by name. In `supabase/`: apply `migrations/20261017000000_accounts.sql`, deploy `functions/account` (`supabase functions deploy account --no-verify-jwt`, which `supabase/config.toml` also sets; set the secret `SITE_URLS` to the comma-separated sites a reset link may return to, for example `https://your-game.example,http://localhost:5173`, never a wildcard such as `*.vercel.app`; it reads its service key from the platform's environment, never from this repo), and check the row rules with `tests/policies.sql`. For Google sign-in, enable the Google provider in Supabase and Google Cloud and list the redirect URLs (the production site, Vercel previews and `http://localhost:5173`). Turn **off** "Secure email change" in Supabase Auth settings, or [ Add email ] can never be confirmed (the hidden sign-in address can't receive mail). Password-reset emails go through Supabase's built-in sender, which is heavily rate-limited: add a custom SMTP sender for real use. If the account server can't be reached, the login screen says so and **Play as guest** still works.

## Team Lobby (2–4 players)

From the main menu choose **TEAM LOBBY**, type a nickname and pick a connection:

- **Online**: players on different devices, over Supabase Realtime (needs internet and a configured project, see below).
- **Same computer**: browser windows on one device, no internet needed (handy for demos and testing).

One player presses **[ Create Room ]** and reads out the 4-letter room code; the others type it and press **[ Join ]**. The host (the creator) presses **[ Start Expedition ]** once at least 2 players are in. A player who joins after the start drops straight into the game. 

In the game, teammates appear as colored dots with their names, and the top bar shows `ROOM <CODE> · <N> online`. A teammate in another zone (Peaks, Dev Village, Dense Forest, Sunbaked Desert, Sunny Beach or Foggaten Island) shows only on the mini-map.

- **Shared by the team:** surveying the river, the Supply Cache loot, the decoded clue, the Golden Semicolon, the north gate, the signal tower (its lifted fog and the bridge), the Archive, and the clock. Everyone's Syntax Terminal prints the same access code, so once one player unseals the Archive it's open for all.
- **Your own:** your zone, position, HP, terminals and badges. Badges are personal: each explorer opens their own chest.
- **Team chat:** the lobby and the game share one conversation. Type a message and press `Enter` (or `[ SEND ]`), or tap a quick reply (`On my way`, `Need help`, `Meet at the gate`, `Found it!`, `Wait for me`, `Good job!`). Messages are 120 characters at most, one a second; rude words are masked and a nickname that would be masked is refused when you create or join. Two players with the same nickname read as `Kai` and `Kai (2)`. The `CHAT` tab shows how many messages you haven't read, and on a phone the top bar does too. `/ping` marks the map for the whole team.
- Your event log tells you what teammates did, for example *"Kai opened the gate."*, *"Kai went to Dev Village."* or *"Kai went to Dense Forest."* or *"Kai earned the SQL Badge."* **[=] Menu** leaves the room.

**For teachers.** The chat is filtered (rude words in English and Filipino are masked, invisible characters are removed) and rate-limited (one message a second and one ping every 5 seconds per player, checked again on receipt), and a player can mute any teammate; a mute lasts while you are in the room. It is a classroom aid, not a moderated service: a modified copy of the game can still post under another player's roster name, anyone who has the room code can read that room's chat, and nothing is stored anywhere (a refresh or leaving the room clears it). Keep room codes within each team. A team's traffic is at most about 16 position updates, 4 chat messages and 0.8 pings per second.

**Online setup.** Online play works out of the box with the game's own Supabase project (`chronicles-of-devlandia`; team play itself uses Realtime only and stores nothing, while accounts add the two tables above). To use a different project, put its URL and publishable key in a `.env` file (see `.env.example`):

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

If the server can't be reached, Online shows "Can't reach the team server…" and Same computer still works. The claude.ai preview link blocks outside connections, so there only Same computer works (between windows of the same browser).

## Character classes

Before Solo Quest and before a team game, **Choose your class**: Warrior, Archer, Mage, Assassin, Tank or Healer. A class is a look only (an outfit colour and a small item such as a helm, bow, hat, mask, shield or staff); it changes no stat, speed or puzzle. In a team everyone sees each other's class, two players may pick the same one, and the hood colour still tells teammates apart. A signed-in player's last choice is saved in their account's own profile data and preselected next time (no database change); guests start on Warrior and nothing is saved. A class value that is missing or not one of the six is shown as Warrior.

## Leaderboards

The menu's **Leaderboards** button shows the top 20 players by badges earned (out of 11). Players with the same count share a rank, and the one who earned their latest badge first is listed first. Anyone can open it, guests included. A signed-in player sees their own row (or their rank if they are outside the top 20) and a **Hide me from the leaderboard** switch; a hidden player disappears from the list but still sees their own rank. Only names, ranks and counts leave the database: two read-only functions (`leaderboard_top`, `leaderboard_me`) do the counting, so the badge and profile tables stay private to their owners. The server stamps each badge's time, so nobody can back-date one to win a tie; badge counts are still self-reported (nothing checks a saved answer), which is fine for a friendly board but not for prizes. It needs `supabase/migrations/20261017010000_leaderboards.sql` applied after the accounts migration (check it locally with `supabase/tests/leaderboard.sql`); until then the screen says "Can't reach the leaderboard." and everything else works as before.

## Project layout

```
src/game/      pure game rules: constants, classes, geometry, clock, cipher, logic, challenges, roll, cards, team, wall, zones, village, forest, island, lamp, reducer
src/learn/     the challenge engine and question bank: live check, shuffling, access codes, the 11 chests and their questions
src/chat/      chat rules and commands: text cleaning and masking, display names, ping places, the command line
src/hooks/     keyboard controls, game timers, team session, chat feed, pings
src/net/       team transports: Supabase (Online), BroadcastChannel (Same computer), in-memory (tests); the shared Supabase client
src/auth/      accounts: name and password rules, the auth client (Supabase and in-memory), useAuth, add-email
src/leaderboard/ the leaderboard: types and parsing, the store (Supabase and in-memory)
src/progress/  saved badges: the store (Supabase and in-memory), restoring a game from them, the saver
supabase/      the accounts and leaderboards migrations, the `account` Edge Function and the SQL checks
src/render/    the pixel-art map: world geometry, sprites, areas/ (each zone's art), terrain, motion, scene description and painting
src/screens/   AuthScreen, ChooseName, SetPassword, ClassPicker, Leaderboard, MainMenu, TeamLobby, ChallengeTerminal + challenge/* (chests, gate, scroll, Matcher, keypad), Codex, LogicModal (tower), chat/* (chat panel and announcer), overworld/*
src/ui/        Panel, Button, Meter, TerminalDialog primitives
```

## Design sources

- Figma Make wireframe: https://www.figma.com/make/Um3mf7sQOJeCYGX5jdffnz/Create-Wireframe--Copy-
- Spec with exact values: [`docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md`](docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md)
- Visual mockup: [`docs/reference/game-ui-mockup.svg`](docs/reference/game-ui-mockup.svg)
- Implementation plan: [`docs/superpowers/plans/2026-10-07-devlandia-ui.md`](docs/superpowers/plans/2026-10-07-devlandia-ui.md)
