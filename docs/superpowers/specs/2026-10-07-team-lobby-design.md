# Team Lobby — Design

**Status:** design approved in chat (scope, backend, team size, approach, both sections); this document awaits review.
**Builds on:** `docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md` and the shipped game (solo overworld, gate puzzle, scroll cipher, signal tower).

## Goal

Make the main menu's **TEAM LOBBY** real: 2–4 players create or join a room with a short code, start together, and play the same map, seeing each other move. World progress is shared by the team. This covers the genre description's "team-based exploration".

## Decisions (from the brainstorm)

| Question | Answer |
|---|---|
| Scope | Lobby + play together, with shared progress |
| Backend | A **new** Supabase project for Devlandia, Realtime only (no tables, no stored data). Cost is checked and confirmed with the user before it is created. |
| Team size | 2–4 players |
| Sync approach | Shared one-way flags merged by OR; presence for membership; broadcast for positions; team clock from the room start time. No host-authoritative state. |

## Player experience

### Lobby (`screen: "lobby"`)
- Main menu **TEAM LOBBY** is enabled (no longer "Coming soon"); **SETTINGS** stays disabled.
- Fields and controls, in order:
  - **Nickname**: text input, 1–12 characters from letters, digits, space, `-` and `_`, trimmed. Invalid → "Enter a nickname (1–12 letters, digits, spaces, - or _)."
  - **Connection**: two-option toggle, **Online** (default) or **Same computer** (browser windows on this device, works offline).
  - **[ Create Room ]**: creates a room with a new code and joins it as host.
  - **Room code** input (4 letters, upper-cased as typed) + **[ Join ]**.
  - **[ Back to Menu ]**.
- In a room, the lobby shows `ROOM KQZM`, the player list (nickname, color swatch, "(you)", "(host)") and:
  - host: **[ Start Expedition ]**, disabled until 2+ players are present;
  - others: "Waiting for the host to start…";
  - everyone: **[ Leave Room ]**.
- Status line: "Connecting…", then the room view; errors replace it:
  - unreachable server or blocked connection: "Can't reach the team server. Check your internet connection, or switch to Same computer mode." + **[ Retry ]**
  - joining a code nobody is in (no other player seen within 3000 ms): "No room with that code."
  - fifth player or later: "This room is full."
- **Start** sends everyone in the room into the overworld. A player who joins a room that has already started goes straight into the overworld with the team's current progress.

### Overworld in team mode
- Teammates appear as colored dots with their nickname label, on the map and the mini-map. You see only **your own** AI drone.
- Player colors by join order: 1 green `#22c55e` (existing `--success`), 2 snow `#e2e8f0`, 3 pink `#f472b6`, 4 violet `#a78bfa`.
  - *Change from the chat summary: amber became violet, because amber is already the gate, cache and artifact color.*
  - *Change during implementation: sky `#38bdf8` became snow `#e2e8f0`, because sky is your own AI drone's color and a sky teammate looked identical to it.*
- Top bar adds `ROOM KQZM · 3 online` (and "Reconnecting…" while the connection is down).
- **Shared by the team (flags):** `questComplete` (river surveyed), `hasLoot` (cache opened: Patch + Scroll), `clueDecoded`, `artifactFound`, `gateUnlocked`, `towerPowered`. Once any player sets one, it is set for everyone and never unset.
- **Per player:** position, HP, stamina, downed/respawn, which terminal is open, hint reveals, inspection card.
- When a teammate sets a flag, your event log shows:

  | Flag | Log line |
  |---|---|
  | `questComplete` | "{name} surveyed the Frozen River." |
  | `hasLoot` | "{name} opened the Supply Cache." |
  | `clueDecoded` | "{name} decoded the scroll: the artifact rests in the Dense Forest." |
  | `artifactFound` | "{name} found the Golden Semicolon!" |
  | `gateUnlocked` | "{name} restored the bridge." |
  | `towerPowered` | "{name} powered the signal tower. The fog lifts." |

  Also "{name} joined the team." and "{name} left the team."
- **Clock:** shared, computed from the room's `startedAt`: `minutes = (START_MINUTES + floor((now − startedAt) / TICK_MS) × TICK_MINUTES) mod 1440`.
  - *Deviation from solo:* in team mode the clock keeps running while **you** have a terminal open, because it's the team's clock. Your river damage and stamina still pause for you as in solo.
- **[=] Menu** leaves the room and returns to the main menu. **Solo Quest** is unchanged and never touches the network.
- If the connection drops, you keep playing locally; on reconnect, flags merge again. When everyone leaves, the room is gone.

### Where it works
- `npm run dev` and any hosted copy: **Online** and **Same computer**.
- claude.ai preview link: its sandbox blocks outside connections, so **Online** shows the "Can't reach the team server…" error; **Same computer** works between windows of the same browser.

## Architecture

```
src/game/team.ts            pure team rules (flags, merge, log lines, codes, colors, host, clock, validation)
src/net/transport.ts        TeamTransport interface + message types
src/net/memoryTransport.ts  in-memory hub for tests (two simulated players in one process)
src/net/broadcastTransport.ts  same-computer mode over BroadcastChannel (heartbeat presence)
src/net/supabaseTransport.ts   online mode over a Supabase Realtime channel
src/net/config.ts           Supabase URL + publishable key (env override, committed defaults)
src/hooks/useTeam.ts        connects a transport to React: roster, teammate positions, status, send helpers
src/screens/TeamLobby.tsx   the lobby screen
```
- Modified: `App.tsx` (lobby screen; team session into the overworld), `screens/MainMenu.tsx` (enable TEAM LOBBY), `game/reducer.ts` + `types.ts` (`teamSync` action; optional `minutes` on `tick`), `screens/overworld/*` (teammate markers, room code in the top bar, mini-map dots, flag broadcasting).

### Transport interface
```ts
interface TeamTransport {
  join(room: string, me: PresenceMeta): Promise<void>;  // rejects with TeamError("unreachable")
  leave(): Promise<void>;
  updatePresence(meta: PresenceMeta): void;              // throttled by the implementation
  send(msg: TeamMessage): void;
  onPresence(cb: (metas: PresenceMeta[]) => void): () => void;
  onMessage(cb: (msg: TeamMessage) => void): () => void;
  onStatus(cb: (s: "connecting" | "online" | "reconnecting") => void): () => void;
}
type PresenceMeta = {
  id: string;          // random per tab
  name: string;
  joinedAt: number;    // ms epoch
  startedAt: number | null;
  flags: TeamFlags;
  x: number; y: number;
};
type TeamMessage =
  | { type: "pos"; id: string; x: number; y: number }          // ≤ 8/s while moving
  | { type: "progress"; id: string; name: string; flags: TeamFlags }
  | { type: "start"; startedAt: number };
```
- Channel / room key: `devlandia-<CODE>` (Supabase channel name; BroadcastChannel name).
- Presence is the source of truth for membership, host (earliest `joinedAt`, ties broken by `id`), color (join rank), room-full (rank ≥ 4 leaves), late-join progress (OR of every member's `flags`) and `startedAt` (any member's non-null value).
- Every incoming message and presence meta is validated by `team.ts`: `id` ≤ 40 chars, nickname rules, `x ∈ [6, 94]`, `y ∈ [10, 90]`, flags all booleans, `startedAt` within 24 h of now. Invalid input is dropped, never thrown.

### Room codes
4 letters from `ABCDEFGHJKLMNPQRSTUVWXYZ` (no I or O), generated with `crypto.getRandomValues`.

### Supabase
- New project **chronicles-of-devlandia**, region **ap-southeast-1**, created only after the user confirms the cost.
- Realtime public channels (presence + broadcast). No tables, no RLS policies, no auth.
- `src/net/config.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, falling back to committed defaults for the Devlandia project. The publishable key is designed to be public; the only exposure is Realtime quota use. `.env.example` documents the variables.
- New dependency: `@supabase/supabase-js` (the one exception to the original plan's dependency limit).

## Testing
- **Unit (`team.test.ts`):** merge, log lines for newly set flags, codes, colors, host, room-full ranking, clock, validation (rejects out-of-range positions, bad names, non-boolean flags).
- **Integration (Vitest + memory transport):**
  - lobby create/join/start between two simulated players
  - errors (no room, full, unreachable)
  - flags set by one player appear for the other with the log line
  - teammate dots move
  - late joiner gets current progress
  - leaving removes the dot
- **Browser (Playwright, Same computer mode):** two pages in one browser context run lobby → start → both see each other move → one powers the tower → the other sees the fog lift and the log line.
- **Online:** tested from this environment only if `*.supabase.co` is allowed in the environment's network settings; otherwise the user gets a two-device checklist.

## Out of scope
Persistent rooms, accounts, chat, kicking players, teammates' drones, spectators, more than 4 players.
