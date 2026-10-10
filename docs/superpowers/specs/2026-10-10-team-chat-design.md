# Team Chat — Design

**Status:** where it appears, what can be sent, the command groups, safety, layout, approach A and all four design sections approved in chat (2026-10-10). Revised after the adversarial spec review wf_52550374-eae (safety, UX and code-fit lenses; 51 findings, 23 of them reported as blocking). Skeptics then tried to refute each blocking finding: 22 were confirmed real (7 still blocking, 15 regraded to minor), 1 was refuted. Every confirmed finding and the cheap minors are folded in; the skeptics' simpler fixes were taken where they gave one.
**Builds on:** the learning core on `claude/trusting-archimedes-64rvrc` (`2026-10-09-learning-core-design.md`), which builds on the team lobby, pixel-art map, north wall and zones specs.
**Why:** Group 2's proposal promises an *"Interactive In-Game Chatbox: a dual-purpose HUD window for real-time player messaging and live command-line execution. Players can coordinate in multiplayer and safely run predefined commands to manipulate game environment and mechanics."* The game has no chat at all. This is roadmap sub-project 4 (team play), moved ahead of 2 and 3 at the user's request; its other items (team-only puzzle variants, time limits) stay in sub-project 4 for later.

## Goal

1. **Team chat:** teammates message each other in the Team Lobby and, without a break, during the game: free text, filtered and rate-limited, plus one-tap quick replies.
2. **A command line:** the same input runs predefined `/commands` that answer questions (`/where`, `/time`, `/badges`), signal the team (`/ping`) and change how your own map looks (`/weather`, `/light`). No command ever skips a puzzle, opens a lock or changes anyone else's game.
3. **Classroom-safe:** rude words are masked (in messages and in nicknames), messages are short and slow enough not to flood, and anyone can mute a teammate.

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

### Names

One helper turns the roster into display names, and every place that shows a teammate's name in chat uses it (lines, ping lines and labels, command output, the lobby list and mute buttons):

- A name is the roster nickname passed through `maskRude` (see Safety rules).
- When two players share a nickname (compared in key form: lower case, runs of spaces collapsed), the first to join keeps it and the others read `Kai (2)`, `Kai (3)` in join order. Parentheses can't occur in nicknames, so the suffix can't be forged.
- Your own lines show your name without a suffix.

### The chat panel

One `ChatPanel` component serves the lobby and the game:

1. **Lines**, oldest first, in a plain list named `Team chat` (it is not a live region; see Announcements):
   - a teammate's message: their name in their team colour, then `: ` and the text (`Kai: meet at the gate`);
   - your message: your name in your colour, the same way;
   - a ping: a muted line (`Kai pinged the Terminal Gate.`);
   - a note: a muted line only you see, starting with a `>` glyph (`aria-hidden`) so private lines differ from shared ones without relying on colour (command results and notices such as `Slow down: one message a second.`).
   Text is always rendered as plain text: no links, no HTML. The message text sits in its own `<bdi>` so right-to-left text can't reorder the name or the colon, and every line is `overflow-hidden` with long words wrapping, so stacked combining marks can't draw over other lines. In notes and ping lines, badge names are shown as written and read by their spoken form (`C++ I` → "C++ 1", `C#` → "C sharp") as visually hidden text, the way the event log does; the shared `speak()` is extended to cover `the <Badge> Chest` and badge lists. A teammate's free text is never rewritten.
2. **Quick replies** (a group named `Quick replies`). In the game: `On my way`, `Need help`, `Meet at the gate`, `Found it!`, `Wait for me`, `Good job!`. In the lobby: `Ready!`, `Wait for me`, `Hi!`. A tap sends the phrase as a normal message (the rate limit applies). Hidden in solo games.
3. **The input line:** a `<form>` whose submit sends, holding an `<input type="text" enterKeyHint="send" autoComplete="off">` labelled `Message`, at most 120 characters (`maxLength`), and a `[ SEND ]` button. Placeholders are short enough for the 200 px sidebar: `Chat, or /help` (team) and `Command, or /help` (solo). From 101 characters a counter `<n>/120` shows under the box (it is the box's description); a visually hidden polite status also says `10 characters left` when you reach 110 and `Limit reached: 120 characters` at 120, and only then. On coarse pointers the input's font size is 16 px, so iOS Safari doesn't zoom the page on focus. Blank input sends nothing.

Behaviour that tests pin:

- After a send from the input (Enter or `[ SEND ]`), focus stays in the input. `[ SEND ]` ignores `mousedown`'s focus change, so tapping it never closes the phone keyboard. A quick-reply tap or click never moves focus.
- **Esc** in the input blurs it: focus goes to the page, the CHAT tab stays selected and the draft is kept.
- A pointer click (not the keyboard) on a tab or a quick reply blurs it afterwards, so arrow keys then move the explorer again.
- The draft survives a refused send, switching tabs and the switch from the lobby to the game.
- The list stays scrolled to the newest line while you are at the bottom; if you have scrolled up, new lines don't move it.
- Each new feed starts with one note: team `Chat with your team here. Type /help for commands.`; solo `Type /help for commands.`

### In the lobby

Once you are in a room (the `lobby` phase), a region named `Team chat` sits under the player list, above `[ Start Expedition ]` / `Waiting for the host to start…`. Each teammate's row in the player list gets a plain button: `[ Mute ]` (named `Mute <name>`) or, while muted, `[ Unmute ]` (named `Unmute <name>`), and a muted player's row reads `<name> (muted)`. Your own row has none. In the game, `/mute` is the way to mute.

### In the game

The event log panel (`EventLog`) gets two tabs following the ARIA tabs pattern with automatic activation: a `tablist` named `Side panel`; ArrowLeft/ArrowRight (wrapping), Home and End move focus and select; only the selected tab is in the Tab order; each tab has `aria-controls` and each `tabpanel` is labelled by its tab. Both panels stay mounted (the unselected one is `hidden`), so the draft and the chat's scroll position survive switching; selecting a tab scrolls its list to the newest line.

- **LOG** (selected when the game starts): the event log exactly as today.
- **CHAT** in team games, **COMMANDS** in solo games: the chat panel. While another tab is selected, each new teammate message or ping adds to an unread count shown as `CHAT (2)`, with the accessible name `CHAT, 2 new`. Selecting the tab clears it. Your own lines, notes, and muted teammates' messages and pings never count.
- **On phones** (below md) in team games the unread count also shows in the top bar's team label (`ROOM KQZM · 3 online · CHAT 2`), because the panel sits under the D-pad and may be out of view. No button and no automatic scrolling.

Layout:

- **At md and up** the tablist replaces the `Event Log / Live` heading, and both tabpanels fill the log's sidebar slot the way the log does (absolutely positioned, never growing the page, so the zones spec's "adds no height" holds). In CHAT the lines take all the height left and scroll; the input spans the panel width with `[ SEND ]` on the row below it. The quick replies sit behind a `[ Quick replies ]` button (`aria-expanded`, closed when the game starts) that opens them, wrapped, above the input.
- **Below md** (game and lobby) the lines list is at most 9rem tall (about six lines) and scrolls, with the quick replies (always shown, wrapping) and the input row directly under it. On a phone, focusing the input lets the browser scroll it above the keyboard; the map scrolling out of view while you type is accepted.
- **On coarse pointers** (`pointer-coarse:`, any width, lobby and game) the tabs, quick replies, `[ Quick replies ]`, the input, `[ SEND ]` and the lobby's mute buttons are at least 44 px tall.

### Announcements

The visible lists aren't live regions (so lines brought back by `/unmute` are never read out). One visually hidden polite status does the speaking: in the game it sits outside both tabpanels, in the lobby inside the chat region. It is fed by the feed's new-line events, not by DOM changes, and speaks:

- a teammate's message as `Kai says: meet at the gate` (so no teammate line can sound like a note), a ping line, and the notes from your own commands and refused sends (the same refusal at most once per 3 s);
- while CHAT/COMMANDS is selected, each new event-log entry too (the hidden log can't speak), with its badge name's spoken form. While LOG is selected, its own `role="log"` list speaks as today.

It never speaks your own sent message, the history present when a panel mounts, lines restored by `/unmute`, lines dropping off the cap, or anything from a muted player.

### Keys (the keyboard hook owns them)

While playing, with no terminal, Codex or confirmation open and not downed, ignoring held-key repeats and presses with Ctrl, Alt or Meta:

- **Enter** is taken only when the key event's target is the page itself or another non-interactive element, never a button, link, tab or form field, so Enter on a focused control keeps doing what it does today. It selects the CHAT/COMMANDS tab and focuses the input with the caret at the end of any draft.
- **/** does the same whenever the target is not a text field, and if the input is empty puts `/` in it.
- Both call `preventDefault`, so the key is never typed into the input or used to submit it.
- Arrow keys never move the explorer when the target is a `role="tab"` (the tablist handles them with `preventDefault` and `stopPropagation`; the hook also skips them, so neither relies on the other).

Keys typed in the chat input never move you, interact or open the Codex (the hook already skips text fields; a test pins `w a s d e c` and Enter there).

The Controls legend gains `Chat: [Enter]` (team) or `Commands: [/]` (solo), hidden on coarse pointers like the other key hints.

## Commands

A command is `/`, a word (any case), then optionally a space and an argument: the rest of the line, trimmed, with runs of spaces collapsed. A `/` followed by a space reads as `/` alone. Names are compared in key form (lower case, runs of spaces collapsed). `/help`, `/where` and `/time` ignore any argument; `/ping`, `/weather` and `/light` compare the whole argument; `/badges`, `/mute` and `/unmute` treat it as a nickname. Results are notes (only you see them); only `/ping` sends anything to teammates.

| Command | Result (exact copy) |
|---|---|
| `/help` | Lists only what runs where you are, as notes, one per line. Game: `Commands:` · `/where — where your teammates are` · `/time — the game clock` · `/badges [name] — your badges, or what you know of a teammate's` · `/ping [place] — mark your spot, or a place, for your team` · `/weather snow\|clear — snowfall on your map` · `/light day\|night\|auto — your map's lighting` · `/mute name, /unmute name — hide or show a teammate's messages`. Solo: `/time`, `/badges`, `/weather`, `/light`. Lobby: `/mute`, `/unmute`, then `More commands once the expedition starts.` |
| `/where` | Teammates in rank order from `session.teammates`, joined by ` · `: `Kai: Dev Village · Mia: C++ Peaks`; a teammate in a zone this version doesn't know reads `Kai: somewhere new`. Alone in the room: `No teammates here right now.` Solo: `Solo game: no teammates.` |
| `/time` | `<Phase>, <HH:MM>.` from the shared clock, e.g. `Dusk, 19:34.` |
| `/badges` | `Your badges: 3/10 (HTML, CSS, SQL).` in chest-table order; with none, `Your badges: 0/10.` |
| `/badges <name>` | Each teammate with that name on its own line: `Kai has earned 2 that you know of: HTML, SQL.`; with none, `Kai hasn't earned any that you know of.` Your own name (when no teammate shares it) gives the `/badges` line. Unknown: `No teammate called "<name>".` Solo: `Solo game: no teammates.` |
| `/ping` | Sends a ping at your position in your zone. You: `Ping sent: your spot in <Zone>.` Teammates: `<name> pinged their spot in <Zone>.` |
| `/ping <place>` | Sends a ping at the place (from any zone). You: `Ping sent: <the place>.` Teammates: `<name> pinged <the place>.` Unknown: `No place called "<x>". Try: gate, tower, cache, river, ada, signpost, terminal, archive, or a chest: html, css, java, cpp1, cpp2, py1, php, sql, py2, cs.` |
| `/weather snow` / `/weather clear` | `Snow is falling on your map.` / `Your map is clear.` Anything else: `Try /weather snow or /weather clear.` |
| `/light day` / `night` / `auto` | `Your map shows daylight.` / `Your map shows night.` / `Your map follows the clock.` Anything else: `Try /light day, /light night or /light auto.` |
| `/mute <name>` | `Kai is muted. /unmute Kai to see their messages again.` (mutes every player with that nickname) Already muted: `Kai is already muted.` Yourself: `You can't mute yourself.` Unknown: `No teammate called "<name>".` Solo: `No teammates to mute.` |
| `/unmute <name>` | `Kai is unmuted.` Not muted: `Kai isn't muted.` Unknown: `No teammate called "<name>".` Solo: `No teammates to mute.` |
| `/mute`, `/unmute` alone | `Type /mute and a teammate's name.` / `Type /unmute and a teammate's name.` |
| `/` alone | `Type /help for commands.` |
| anything else | `Unknown command /<word>. Type /help.` (`<word>` is the first word as typed, in lower case.) |

- **In the lobby** only `/help`, `/mute` and `/unmute` run; the others answer `Available once the expedition starts.`
- **Solo games:** `/ping` answers `Pings are for team games.`
- **Ping limits:** one ping every 5 s from you, the timer starting when a ping is actually sent (a refused ping doesn't start it): sooner answers `Wait a moment before pinging again.` A ping refused while reconnecting answers `Not sent: reconnecting.`
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

- On the map, if the ping is in the zone you are in: a ring that grows and fades once a second (never faster) for 5 s at the point, with the sender's name above it in their colour (`aria-hidden`; the chat line is what is announced). It never takes clicks. Under reduced motion it stands still.
- On the mini-map: a small ring in the ping's zone cell for 5 s, in the sender's colour.
- Your own pings show to you the same way. A new ping from the same player replaces their previous one.
- A muted teammate's pings still draw on the map and mini-map (they are team signals) but add no chat line, no unread count and nothing to the announcer.

### Your view: weather and light

- `/weather snow`: 60 white 1-art-pixel flakes over the 320 × 180 world, falling 12 art px a second and drifting 2 art px a second sideways, wrapping at the edges. Under reduced motion they are drawn still. Both zones. The mini-map is unchanged.
- `/light day|night`: your map draws as if the clock's phase were Day or Night (its tint and its lights); `auto` follows the clock. The top bar's clock, the shared clock and teammates' maps are unchanged.

## Safety rules

- **Cleaning** (`cleanChat`), in this order: (1) NFKC-normalise; (2) turn tab, LF, CR, U+2028 and U+2029 into a space; (3) delete (not replace) every other control (`\p{Cc}`, including C1 and U+0085) and every format character (`\p{Cf}`: zero-width space and joiners, soft hyphen, BOM, word joiner, LRM/RLM/ALM, all bidirectional embeddings, overrides and isolates, tag characters), so `fu<ZWSP>ck` becomes `fuck` and is masked; (4) delete the invisible fillers U+115F, U+1160, U+3164, U+FFA0 and U+2800; (5) keep at most two combining marks (`\p{M}`) in a row; (6) collapse runs of whitespace to one space and trim. Joined emoji fall apart into separate emoji: accepted.
- **Masking** (`maskRude`): each word (a run of letters, digits, `@` and `$`) is compared, after NFKD with combining marks removed (so `fúck` matches) and lower-cased, against the word list below. Leetspeak (`0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`) applies only to words that contain at least one letter (so `455` is never masked). A word matches if it is in the list after collapsing runs of 3+ identical letters to one, or after collapsing them to two (so `fuuuck` and `asssss` both match). A match is replaced by `***`; everything else is unchanged. Matching is whole-word, so `class`, `pass`, `assess`, `Scunthorpe` and `leche flan` are untouched. Look-alike letters from other scripts (Cyrillic, Greek) are not mapped. The list is tuned over time; whole-word matching is a deliberate trade-off against false positives.
  - English: `fuck fucks fucking fucked fucker fck fuk fuckyou fuckin fking fkn motherfucker motherfucking shit shits shitty shithead bullshit bitch bitches bastard asshole ass dick dickhead cock pussy cunt slut whore damn crap piss wanker twat retard nigger nigga fag faggot dumbass jackass stfu`
  - Filipino: `putangina putanginamo tangina tanginamo kingina kinginamo putang puta gago gagu ulol olol ulul tanga bobo tarantado tarantada punyeta punyetang pakyu pakshet kupal tite kantot jakol pekpek burat bilat`
  - Accepted false positives: `Dick` as a name, and `ass` and `cock` in their animal senses.
- **Names:** the create and join form (`TeamLobby` only, not `normalizeNickname`, which presence parsing shares) refuses a nickname that `maskRude` would change, with `Pick a different nickname.` under the field. As defence in depth (an older or modified game), every place that shows a roster name in chat runs it through `maskRude` (see Names). Commands still match on the real nickname's key form; typing a masked name to `/mute` isn't supported.
- **Sending:** you clean and mask your own text before it is shown or sent, so you see what teammates see. A message that is blank after cleaning is not sent. A message refused while reconnecting adds the note `Not sent: reconnecting.` and keeps your draft.
- **Solo games:** text that doesn't start with `/` is not sent anywhere; it adds the note `Solo game: start a command with /, for example /help.` and clears the input.
- **Receiving:** a chat message whose raw `text` is longer than 480 UTF-16 units is dropped before cleaning (a modified game could send far more). Otherwise it is cleaned and masked again, and dropped if it is blank or longer than 120 characters after cleaning.
- **Rates:** only text sent to teammates (typed messages and quick replies) counts toward your limit of one message a second (`Slow down: one message a second.`). Commands that only add notes are never limited; `/ping` has its own rule (above). A refusal note identical to the feed's newest line replaces it instead of adding another. On receipt, each roster sender has a bucket of 3 chat tokens that refills at 1 per second; a message that finds it empty is dropped silently (a burst after a network stall still shows). A ping arriving less than 4 s after the same sender's previous accepted ping is dropped. All rates use wall time (`Date.now()`), never the session's join-order clock.
- **Mute** (`/mute`, or the lobby button) stores nicknames in key form, not ids. Every roster player whose nickname has a muted key is muted, including one who leaves and rejoins under that nickname (a new connection has a new id) and anyone who joins later with it. Your own lines are never hidden. A muted player's messages are not added, their earlier lines are hidden, and their ping lines never appear; unmuting shows their earlier lines again but not what they sent while muted. The list lasts until the room is left; it survives reconnecting.
- **Known limits** (for the README's teacher note): broadcasts carry no authentication, so a modified game can still post under another roster player's id; anyone who has the room code can read that room's chat; nothing is stored anywhere. The filter is best effort and mute is the backstop.

## Rules (data and connection)

### Messages

`TeamMessage` gains:

- `{ type: "chat"; id: string; name: string; text: string }`
- `{ type: "ping"; id: string; name: string; zone: ZoneId; x: number; y: number; place: PingPlace | null }`

`parseMessage` accepts them only with a valid id and nickname (as today), and:

- **chat:** `text` is a string; it is cleaned and masked; the message is dropped if the raw text is longer than 480 UTF-16 units, or the result is empty or longer than 120 characters.
- **ping:** `zone` is exactly `"peaks"` or `"village"` (a missing or unknown zone drops the ping; `parseZone`'s lenient default is for `pos` and presence only), `x` and `y` are within `BOUNDS`, and `place` is `null` or one of the ping place names. For a place ping, the receiver ignores the sent zone, x and y and uses that place's zone and point from `places.ts`.

Older games ignore both types (`parseMessage` returns `null` for unknown types), so a mixed room keeps working without chat for the older players. The Online connection subscribes to every `TeamMessage["type"]` (the existing `SUBSCRIBED` record makes a missing one a compile error).

### Session (`useTeamSession`)

The session gains:

- `sendChat(text: string): "sent" | "offline"` and `sendPing(ping: { zone: ZoneId; x: number; y: number; place: PingPlace | null }): "sent" | "offline"`: `"offline"` while reconnecting or not in a room (nothing is sent).
- `onChat(cb: (from: ChatSender, text: string) => void)` and `onPing(cb: (from: ChatSender, ping: ...) => void)`, where `ChatSender = { id: string; name: string; color: string }`. They drop a message whose `id` is not a current roster player other than you; the sender's name and colour always come from that roster entry, never from the message's `name`; the receive-rate state is keyed by roster id. A message that arrives before its sender's presence does is lost (accepted). They never report your own messages, and stop at `leave()`.
- `onBadge` passes `(name: string, chest: ChestId, id: string)`, so the game can keep each teammate's known badges by id.

### The chat feed (`useChat`)

`useChat(session: TeamSession | null)` holds:

- the last 50 lines, each with a unique, increasing `seq`, a `kind` (`mine`, `teammate`, `ping`, `note`), a `senderId` (none for notes) and the colour it arrived with (a line keeps it even if ranks shift). React keys, new-line detection for scrolling, the unread count and the announcer all use `seq`;
- the draft;
- the mute list (nickname keys);
- the send-rate state (wall time).

It exposes `lines` (muted players' messages and ping lines filtered out), `unread(sinceSeq)`, `draft` and `setDraft`, `mute(name)`, `unmute(name)`, and `post(text, context): { status: "sent" | "refused" | "command"; effect: CommandEffect | null }`; the panel clears the input unless the status is `refused`. `post` cleans, rate-limits and sends a message, or runs a command through `runCommand` and adds its notes. The effect (`weather`, `light`, or a sent `ping` so the game can show your own marker) is applied by the caller.

- **Team feed:** `App` holds it, so the conversation carries from the lobby into the game. It is cleared (lines, draft, mute list, rate state) when the session's phase becomes `idle` or `error` (`error` keeps `room`, so don't watch `room` alone). It is not cleared when the expedition starts. Reconnecting doesn't clear it.
- **Solo feed:** each solo game has its own (a fresh `key={gameId}` mount), empty at the start, with `session` null.
- `Overworld` and `TeamLobby` take the feed as an optional prop, and `Overworld` still renders without `App` (as in the existing tests) with a solo feed of its own.

### Commands (`src/chat/commands.ts`)

`runCommand(text: string, context: CommandContext): { notes: string[]; effect: CommandEffect | null }` is a pure function. `CommandContext` says where you are (`solo`, `lobby` or `game`) and carries what the commands read: the clock minutes, your badges, teammates' known badges (by teammate id), `teammates` (id, name, zone, in rank order, from `session.teammates`), the mute list, and your id, zone and position. `CommandEffect` is one of `{ kind: "ping"; zone; x; y; place }`, `{ kind: "weather"; snow: boolean }`, `{ kind: "light"; light: "auto" | "day" | "night" }`, `{ kind: "mute" | "unmute"; key: string; name: string }`. Rate limits and the connection state are applied by `useChat`, not by `runCommand`.

### Game wiring

- `Overworld` owns the selected side tab and passes it to `EventLog` and the chat panel. It builds the command context from its state and the session, applies `weather` and `light` effects to a local view state (not the reducer), and keeps active pings (from `onPing` and your own) for 5 s.
- `useKeyboardControls(state, dispatch, paused, onChatKey?: (slash: boolean) => void)` calls the new callback for Enter and `/`.
- `MapViewport` gains `lightMode`, `snow` and `pings` props; `MiniMap` gains `pings`.
- `SceneInput` gains optional `lightMode?: "auto" | "day" | "night"` (default `auto`, so it doesn't clash with `Scene.light`) and `snow?: boolean` (default `false`), so the menu backdrop and existing fixtures need no change. `Scene` gains `snow: Pixel[]`, painted last, after `light`. Flake positions are a pure function of time from 60 fixed start points; under reduced motion they are drawn at time 0.
- Known badges are kept per teammate id from `onBadge`; `/badges <name>` reports each teammate of that name on its own line.

## Files

- **New:**
  - `src/chat/`: `filter.ts` (`cleanChat`, `maskRude`, the word list), `places.ts` (ping places), `commands.ts` (`runCommand`), `names.ts` (display names, key form), `types.ts`
  - `src/hooks/useChat.ts`
  - `src/screens/chat/ChatPanel.tsx` (with the announcer)
- **Changed:**
  - `src/game/team.ts` (message types, parsing)
  - `src/net/supabaseTransport.ts` (subscriptions)
  - `src/hooks/useTeamSession.ts` (send and receive, roster check, receive rates, `onBadge` id)
  - `src/hooks/useKeyboardControls.ts` (Enter, `/`, arrows on tabs)
  - `src/App.tsx` (the team feed)
  - `src/screens/TeamLobby.tsx` (chat region, mute buttons, nickname check)
  - `src/screens/overworld/EventLog.tsx` (tabs, shared `speak()`)
  - `src/screens/overworld/Overworld.tsx` (context, view state, pings, tab state)
  - `src/screens/overworld/TopHud.tsx` (unread count on phones)
  - `src/screens/overworld/MapViewport.tsx` and `MiniMap.tsx` (ping markers, light, snow, legend)
  - `src/render/scene.ts`, the canvas painting, `src/screens/MenuBackdrop.tsx`
  - `README.md` (chat, commands, and a "For teachers" note with the known limits, a reminder to keep room codes within each team, and the per-team message budget: 16 positions plus up to 4 chats and 0.8 pings per second)

## Testing

- **Unit:**
  - `cleanChat` (control, format and filler characters, zero-width splitting, combining-mark limit, whitespace);
  - `maskRude` (every listed word, leetspeak and repeated letters including `fuuuck` and `asssss`, `fúck`, fullwidth text; whole-word only: `class`, `pass`, `assess`, `Scunthorpe`, `leche flan`, `Lady Gaga`, `room 455` untouched; punctuation kept);
  - every command's exact copy in solo, lobby and game, including missing and extra arguments, names with spaces, unknown names, places and commands, and `/help` in each place;
  - display names with duplicate nicknames;
  - the ping place table against the constants;
  - `parseMessage` for chat and ping (valid, masked on receipt, too long raw and cleaned, blank, bad or missing zone, out-of-bounds, unknown place, a named ping with mismatched coordinates, missing fields).
- **Session:**
  - chat and pings over the in-memory hub, never echoed to yourself;
  - a chat from an id not in presence is dropped, and a chat whose `name` differs from the roster shows the roster name;
  - three chats sent 1 s apart but arriving within 50 ms all show, a fourth in the same burst is dropped, and a sustained 2 per second is held to about 1 per second;
  - the ping receive rule;
  - `"offline"` while reconnecting;
  - cleared at `leave()`.
- **Feed (`useChat`):**
  - the 50-line cap and `seq` keys;
  - mute hides earlier lines and drops new ones and ping lines; unmute brings the earlier ones back;
  - a muted player who rejoins with a new id stays muted; `Big  Kai` is muted by `/mute big kai`;
  - the send rate (`Slow down…`, draft kept, five rapid sends leave one note);
  - commands never count toward the message limit;
  - lobby-only commands;
  - cleared when the phase goes `idle` or `error`, not at the start of the expedition.
- **Components:**
  - the chat panel (Enter and `[ SEND ]`, quick replies in the lobby and the game, the counter and its spoken thresholds, blank does nothing, focus stays after a send, Esc blurs and keeps the draft, plain-text rendering of `<b>hi</b>`, spoken badge names in notes);
  - the announcer (a teammate message is spoken while LOG is selected, a log entry while CHAT is selected, never your own message, nothing for `/unmute` or a muted player);
  - the tabs (arrow keys, Home and End, unread count and its accessible name, clearing on select, COMMANDS in solo, both panels mounted);
  - the lobby region and mute buttons;
  - Enter on a focused map button opens that place and does not switch tabs; Enter and `/` from the page; a held Enter does nothing; ArrowRight on the focused LOG tab selects CHAT and the player doesn't move;
  - `w a s d e c` and Enter typed in the chat input;
  - a ping's ring on the map (only in its zone) and on the mini-map, gone after 5 s and standing still under reduced motion, and a muted teammate's ping draws without adding a line or unread count;
  - `/weather` and `/light` reaching the scene input; the scene tests for flake positions and `lightMode`.
- **App level** (two players on the memory hub):
  - Kai chats in the lobby, Ana sees it, a draft typed in the lobby is still there in the game, and the conversation continues after the start;
  - Ana mutes Kai in the lobby and after the start Kai's messages are still hidden;
  - a quick reply; a `/ping gate` shows on Ana's mini-map and in her chat;
  - two players named Kai read `Kai` and `Kai (2)`;
  - a rude nickname is refused in the form, and one arriving through presence shows masked in lines, ping labels and `/where`.
- **Browser check:** desktop (1366 × 657) and phone (390 × 844, touch): chat in the lobby and the game, a quick reply, `/ping`, `/weather snow`, `/light night`, `/where`, the tabs and unread count; at 1366 × 657 no page scroll with the CHAT tab open, the whole placeholder readable and at least five lines visible; on the phone the input stays visible above the keyboard, the page isn't zoomed after focusing it, and a teammate's message raises the top-bar count while the map is in view; two Same computer windows; Online where the network allows; no console errors.
