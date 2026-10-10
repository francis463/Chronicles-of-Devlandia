# Team Chat — Design

**Status:** where it appears, what can be sent, the command groups, safety, layout, approach A and all four design sections approved in chat (2026-10-10).
**Builds on:** the learning core on `claude/trusting-archimedes-64rvrc` (`2026-10-09-learning-core-design.md`), which builds on the team lobby, pixel-art map, north wall and zones specs.
**Why:** Group 2's proposal promises an *"Interactive In-Game Chatbox: a dual-purpose HUD window for real-time player messaging and live command-line execution. Players can coordinate in multiplayer and safely run predefined commands to manipulate game environment and mechanics."* The game has no chat at all. This is roadmap sub-project 4 (team play), moved ahead of 2 and 3 at the user's request; its other items (team-only puzzle variants, time limits) stay in sub-project 4 for later.

## Goal

1. **Team chat:** teammates message each other in the Team Lobby and, without a break, during the game: free text, filtered and rate-limited, plus one-tap quick replies.
2. **A command line:** the same input runs predefined `/commands` that answer questions (`/where`, `/time`, `/badges`), signal the team (`/ping`) and change how your own map looks (`/weather`, `/light`). No command ever skips a puzzle, opens a lock or changes anyone else's game.
3. **Classroom-safe:** rude words are masked, messages are short and slow enough not to flood, and anyone can mute a teammate.

## Decisions (from the chat)

| Question | Answer |
|---|---|
| Where | The lobby and the game: one conversation that carries from the lobby into play. Solo games get the command line. |
| What can be sent | Free text plus quick replies |
| Command groups | Info (`/help`, `/where`, `/badges`, `/time`), Team signals (`/ping`), Environment for your view (`/weather`, `/light`). No movement command. |
| Safety | Word filter, 120 characters, one message a second, per-player mute |
| In-game layout | LOG \| CHAT tabs on the event log panel |
| Approach | A: chat and pings ride the existing team connection as new message types; the rules live in a pure `src/chat/` module; history lives above the lobby and the game |

## What players see

### The chat panel

One `ChatPanel` component serves the lobby and the game:

1. **Lines**, oldest first, in a list that is a polite live region named `Team chat`:
   - a teammate's message: their name in their team colour, then `: ` and the text (`Kai: meet at the gate`);
   - your message: your name in your colour, the same way;
   - a ping: a muted line (`Kai pinged the Terminal Gate.`);
   - a note: a muted line only you see (command results and notices such as `Slow down: one message a second.`).
   Text is always rendered as plain text: no links, no HTML. Long words wrap.
2. **Quick replies** (a group named `Quick replies`): `On my way`, `Need help`, `Meet at the gate`, `Found it!`, `Wait for me`, `Good job!`. A tap sends the phrase as a normal message (the rate limit applies). Hidden in solo games.
3. **The input line:** a text box labelled `Message` with the placeholder `Message your team, or /help` (solo: `Type a command, or /help`), at most 120 characters (`maxLength`), and a `[ SEND ]` button. Enter or `[ SEND ]` sends. From 101 characters a counter `<n>/120` shows under the box (it is the box's description). Blank input sends nothing.

The list stays scrolled to the newest line while you are at the bottom; if you have scrolled up, new lines don't move it. Your draft is kept when a send is refused (rate limit, reconnecting).

### In the lobby

Once you are in a room (the `lobby` phase), a region named `Team chat` sits under the player list, above `[ Start Expedition ]` / `Waiting for the host to start…`. Each teammate's row in the player list gets a mute toggle: a button named `Mute <name>`, reading `[ Mute ]` or, while muted, `[ Muted ]` (`aria-pressed`). Your own row has none.

### In the game

The event log panel (`EventLog`) gets two tabs (a real `tablist` named `Side panel`; arrow keys move between tabs; each tab controls its own `tabpanel`):

- **LOG** (selected when the game starts): the event log exactly as today.
- **CHAT** in team games, **COMMANDS** in solo games: the chat panel. While another tab is selected, each new teammate message or ping adds to an unread count shown as `CHAT (2)`, with the accessible name `CHAT, 2 new`. Selecting the tab clears it. Your own lines, notes and muted teammates' messages never count.

On phones the panel stays where the event log is (under the D-pad); tabs, quick replies, the input and `[ SEND ]` are at least 44 px tall, and quick replies wrap.

### Keys (the keyboard hook owns them)

While playing, with no terminal, Codex or confirmation open, not downed and not typing in a text box:

- **Enter** selects the CHAT/COMMANDS tab and focuses the input.
- **/** does the same and, if the input is empty, puts `/` in it (the key's own character is not typed twice).

In the input, **Esc** leaves it: focus returns to the page, so movement keys work again. Keys typed in the input never move you, interact or open the Codex (the hook already skips text fields; a test pins `w a s d e c` and Enter in the chat input).

## Commands

A line that starts with `/` is a command. Commands and names ignore case. Results are notes (only you see them); only `/ping` sends anything to teammates.

| Command | Result (exact copy) |
|---|---|
| `/help` | Notes, one per line: `Commands:` · `/where — where your teammates are` · `/time — the game clock` · `/badges [name] — your badges, or what you know of a teammate's` · `/ping [place] — mark your spot, or a place, for your team` · `/weather snow\|clear — snowfall on your map` · `/light day\|night\|auto — your map's lighting` · `/mute name, /unmute name — hide or show a teammate's messages` |
| `/where` | Teammates in rank order, joined by ` · `: `Kai: Dev Village · Mia: C++ Peaks`; a teammate whose zone is unknown reads `Kai: no news yet`. Alone in the room: `No teammates here right now.` Solo: `Solo game: no teammates.` |
| `/time` | `<Phase>, <HH:MM>.` from the shared clock, e.g. `Dusk, 19:34.` |
| `/badges` | `Your badges: 3/10 (HTML, CSS, SQL).` in chest-table order; with none, `Your badges: 0/10.` |
| `/badges <name>` | A teammate (case-insensitive): `Kai has earned 2 that you know of: HTML, SQL.`; with none, `Kai hasn't earned any that you know of.` Your own name gives the `/badges` line. Unknown: `No teammate called "<name>".` Solo: `Solo game: no teammates.` |
| `/ping` | Sends a ping at your position in your zone. You: `You pinged your spot in <Zone>.` Teammates: `<name> pinged their spot in <Zone>.` |
| `/ping <place>` | Sends a ping at the place (from any zone). You: `You pinged <the place>.` Teammates: `<name> pinged <the place>.` Unknown: `No place called "<x>". Try: gate, tower, cache, river, ada, signpost, terminal, archive, or a chest: html, css, java, cpp1, cpp2, py1, php, sql, py2, cs.` |
| `/weather snow` / `/weather clear` | `Snow is falling on your map.` / `Your map is clear.` Anything else: `Try /weather snow or /weather clear.` |
| `/light day` / `night` / `auto` | `Your map shows daylight.` / `Your map shows night.` / `Your map follows the clock.` Anything else: `Try /light day, /light night or /light auto.` |
| `/mute <name>` | `Kai is muted. /unmute Kai to see their messages again.` Already muted: `Kai is already muted.` Yourself: `You can't mute yourself.` Unknown: `No teammate called "<name>".` Solo: `No teammates to mute.` |
| `/unmute <name>` | `Kai is unmuted.` Not muted: `Kai isn't muted.` Unknown: `No teammate called "<name>".` Solo: `No teammates to mute.` |
| `/` alone | `Type /help for commands.` |
| anything else | `Unknown command /<word>. Type /help.` |

- **In the lobby** only `/help`, `/mute` and `/unmute` run; the others answer `Available once the expedition starts.`
- **Solo games:** `/ping` answers `Pings are for team games.`
- **Ping limits:** one ping every 5 s from you: sooner answers `Wait a moment before pinging again.` A ping refused while reconnecting answers `Not sent: reconnecting.`
- **Names in output** use the teammate's nickname as the roster has it, not as typed.
- `/weather` and `/light` last until the game ends (a new game starts clear and on `auto`); they never touch shared state.

### Ping places

| Name | Place (zone, game %) | In copy |
|---|---|---|
| `gate` | C++ Peaks (50, 50) | `the Terminal Gate` |
| `tower` | C++ Peaks (14, 18) | `the Signal Tower` |
| `cache` | C++ Peaks (82, 18) | `the Supply Cache` |
| `river` | C++ Peaks (54, 33) | `the Frozen River` |
| `ada` | Dev Village (34, 70) | `Ada` |
| `signpost` | Dev Village (86, 62) | `the Signpost` |
| `terminal` | Dev Village (68, 60) | `the Syntax Terminal` |
| `archive` | Dev Village (55, 66) | `the Archive` |
| `html` `css` `java` `cpp1` `cpp2` `py1` | C++ Peaks, each chest's place | `the <Badge> Chest` (e.g. `the C++ I Chest`) |
| `php` `sql` `py2` | Dev Village, each chest's place | `the <Badge> Chest` |
| `cs` | Dev Village, the Archive (55, 66) | `the C# Chest` |

Points come from the existing constants (`POIS`, `ADA`, `SIGNPOST`, `TERMINAL`, `ARCHIVE`, the chest table), never copies.

### What a ping looks like

- On the map, if the ping is in the zone you are in: a ring that pulses for 5 s at the point, with the sender's name above it in their colour (`aria-hidden`; the chat line is what is announced). It never takes clicks. Under reduced motion it stands still.
- On the mini-map: a small ring in the ping's zone cell for 5 s, in the sender's colour.
- Your own pings show to you the same way. A new ping from the same player replaces their previous one.

### Your view: weather and light

- `/weather snow`: 60 white 1-art-pixel flakes over the 320 × 180 world, falling 12 art px a second and drifting 2 art px a second sideways, wrapping at the edges. Under reduced motion they are drawn still. Both zones. The mini-map is unchanged.
- `/light day|night`: your map draws as if the clock's phase were Day or Night (its tint and its lights); `auto` follows the clock. The top bar's clock, the shared clock and teammates' maps are unchanged.

## Safety rules

- **Cleaning** (`cleanChat`): removes control characters (U+0000–U+001F, U+007F) and bidirectional overrides (U+202A–U+202E, U+2066–U+2069), collapses runs of whitespace to one space, and trims.
- **Masking** (`maskRude`): each word (a run of letters, digits, `@` and `$`) is compared, in a normalised form (lower case; `0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`; a letter repeated 3+ times counts once), against the word list below. A match is replaced by `***`; everything else is unchanged. Matching is whole-word only, so `class`, `pass`, `Scunthorpe` and `assess` are untouched.
  - English: `fuck fucks fucking fucked fucker fck fuk shit shits shitty bullshit bitch bitches bastard asshole ass dick cock pussy cunt slut whore damn crap piss wanker twat retard nigger nigga fag faggot`
  - Filipino: `putangina tangina putang puta gago gaga ulol olol tanga bobo tarantado punyeta leche pakyu kupal`
- **Sending:** you clean and mask your own text before it is shown or sent, so you see what teammates see. A message that is blank after cleaning is not sent. A message refused while reconnecting adds the note `Not sent: reconnecting.` and keeps your draft.
- **Solo games:** text that doesn't start with `/` is not sent anywhere; it adds the note `Solo game: start a command with /, for example /help.` and clears the input.
- **Receiving:** every incoming chat message is cleaned and masked again (an older or modified game might not), and dropped if it is blank or longer than 120 characters after cleaning.
- **Rates:** you can send one message a second (`Slow down: one message a second.`) and one ping every 5 s. On receipt, a sender's chat message less than 800 ms after their previous accepted one, or a ping less than 4 s after their previous accepted one, is dropped silently.
- **Mute** (`/mute`, or the lobby toggle): stores the ids of every player in the room with that nickname. Their lines already shown are hidden, their new messages are not added, and their pings still show (pings are rate-limited). Unmuting shows their earlier lines again, but not the ones sent while muted. Leaving the room clears the mute list.

## Rules (data and connection)

### Messages

`TeamMessage` gains:

- `{ type: "chat"; id: string; name: string; text: string }`
- `{ type: "ping"; id: string; name: string; zone: ZoneId; x: number; y: number; place: PingPlace | null }`

`parseMessage` accepts them only with a valid id and nickname (as today), and:

- **chat:** `text` is a string; it is cleaned and masked; the message is dropped if the result is empty or longer than 120 characters.
- **ping:** `zone` is a known zone (not `null`), `x` and `y` are within `BOUNDS`, and `place` is `null` or one of the ping place names.

Older games ignore both types (`parseMessage` returns `null` for unknown types), so a mixed room keeps working without chat for the older players. The Online connection subscribes to every `TeamMessage["type"]` (the existing `SUBSCRIBED` record makes a missing one a compile error).

### Session (`useTeamSession`)

The session gains:

- `sendChat(text: string): "sent" | "offline"` and `sendPing(ping: { zone: ZoneId; x: number; y: number; place: PingPlace | null }): "sent" | "offline"`: `"offline"` while reconnecting or not in a room (nothing is sent).
- `onChat(cb: (from: ChatSender, text: string) => void)` and `onPing(cb: (from: ChatSender, ping: ...) => void)`, where `ChatSender = { id: string; name: string; color: string }` (colour from the roster). They apply the receive-rate rule above, never report your own messages, and stop at `leave()`.

### The chat feed (`useChat`)

`useChat(session: TeamSession | null, clock: () => number)` lives in `App`, above both the lobby and the game, so the conversation carries from one to the other; a solo game gets its own feed with `session` null. It holds:

- the last 50 lines (older lines drop off);
- the mute list;
- the send-rate state.

It exposes `lines` (with muted senders' lines filtered out), `post(text, context)` and `muted`. `post` cleans, rate-limits and sends a message, or runs a command through `runCommand` and adds its notes. It returns the command's effect for the caller to apply, if any (`weather`, `light`, or a sent `ping` so the game can show your own marker). The feed is cleared when you leave a room and when a new game starts.

### Commands (`src/chat/commands.ts`)

`runCommand(text: string, context: CommandContext): { notes: string[]; effect: CommandEffect | null }` is a pure function. `CommandContext` says where you are (`solo`, `lobby` or `game`) and carries what the commands read: the clock minutes, your badges, teammates' known badges (from badge news), the roster (names, ids, zones, rank) and your id, zone and position. `CommandEffect` is one of `{ kind: "ping"; zone; x; y; place }`, `{ kind: "weather"; snow: boolean }`, `{ kind: "light"; light: "auto" | "day" | "night" }`, `{ kind: "mute" | "unmute"; ids: string[]; name: string }`. Rate limits and the connection state are applied by `useChat`, which owns the clock and the session, not by `runCommand`.

### Game wiring

- The game (`Overworld`) builds the command context from its state and the session, applies `weather` and `light` effects to a local view state (not the reducer), and keeps active pings (from `onPing` and your own) for 5 s for the map and mini-map.
- `SceneInput` gains `light: "auto" | "day" | "night"` (the phase used for tint and lights) and `snow: boolean`; the menu backdrop passes `"auto"` and `false`.
- Teammates' known badges come from the badge news the game already receives (`onBadge`), kept per teammate for `/badges <name>`.

## Files

- **New:**
  - `src/chat/`: `filter.ts` (`cleanChat`, `maskRude`, the word list), `places.ts` (ping places), `commands.ts` (`runCommand`), `types.ts`
  - `src/hooks/useChat.ts`
  - `src/screens/chat/ChatPanel.tsx`
- **Changed:**
  - `src/game/team.ts` (message types, parsing)
  - `src/net/supabaseTransport.ts` (subscriptions)
  - `src/hooks/useTeamSession.ts` (send and receive, receive rates)
  - `src/hooks/useKeyboardControls.ts` (Enter, `/`)
  - `src/App.tsx` (`useChat`)
  - `src/screens/TeamLobby.tsx` (chat region, mute toggles)
  - `src/screens/overworld/EventLog.tsx` (tabs)
  - `src/screens/overworld/Overworld.tsx` (context, view state, pings)
  - `src/screens/overworld/MapViewport.tsx` and `MiniMap.tsx` (ping markers)
  - `src/render/scene.ts`, the canvas painting (light override, snow), `src/screens/MenuBackdrop.tsx`
  - `README.md`

## Testing

- **Unit:**
  - `cleanChat` (control and bidi characters, whitespace);
  - `maskRude` (every listed word, leetspeak and repeated letters, whole-word only: `class`, `pass`, `assess`, `Scunthorpe` untouched, punctuation around words kept);
  - every command's exact copy in solo, lobby and game, including unknown names, places and commands;
  - the ping place table against the constants;
  - `parseMessage` for chat and ping (valid, masked on receipt, too long, blank, bad zone, out-of-bounds, unknown place, missing fields).
- **Session:**
  - chat and pings over the in-memory hub, never echoed to yourself;
  - the receive-rate drops (800 ms, 4 s);
  - `"offline"` while reconnecting;
  - cleared at `leave()`.
- **Feed (`useChat`):**
  - the 50-line cap;
  - mute hides earlier lines and drops new ones, unmute brings back the earlier ones;
  - the send rate (`Slow down…`, draft kept);
  - lobby-only commands;
  - cleared on leaving.
- **Components:**
  - the chat panel (Enter and `[ SEND ]`, quick replies, the counter from 101 characters, blank does nothing, the live region, plain-text rendering of `<b>hi</b>`);
  - the tabs (arrow keys, unread count and its accessible name, clearing on select, COMMANDS in solo);
  - the lobby region and mute toggles;
  - Enter, `/` and Esc;
  - `w a s d e c` and Enter typed in the chat input;
  - a ping's ring on the map (only in its zone) and on the mini-map, gone after 5 s and standing still under reduced motion;
  - `/weather` and `/light` reaching the scene input.
- **App level** (two players on the memory hub):
  - Kai chats in the lobby, Ana sees it, and the conversation continues after the start;
  - a quick reply; a `/ping gate` shows on Ana's mini-map and in her chat;
  - Ana mutes Kai and stops seeing their messages.
- **Browser check:** desktop (1366 × 657) and phone (390 × 844, touch): chat in the lobby and the game, a quick reply, `/ping`, `/weather snow`, `/light night`, `/where`, the tabs and unread count; two Same computer windows; Online where the network allows; no console errors.
