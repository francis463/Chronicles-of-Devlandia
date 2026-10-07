# Team Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the menu's TEAM LOBBY into real 2–4 player co-op: create or join a room by code, start together, see teammates move, and share world progress.

**Architecture:**
- Pure team rules live in `src/game/team.ts`.
- A `TeamTransport` interface has three implementations: in-memory (tests), BroadcastChannel ("Same computer") and Supabase Realtime ("Online").
- A `useTeamSession` hook, owned by `App`, exposes one `TeamSession` object to the lobby and the overworld.
- Shared progress is OR-merged one-way flags; membership comes from presence; the team clock comes from `startedAt`.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Vitest + Testing Library, Playwright (browser checks), `@supabase/supabase-js` (new).

**Spec:** `docs/superpowers/specs/2026-10-07-team-lobby-design.md`

## Global Constraints

- **Dependencies:** `@supabase/supabase-js` is the only new runtime dependency.
- **Solo Quest:** behaves exactly as today and never creates a transport.
- **Team size:** `TEAM_MAX = 4`; Start needs at least 2 players.
- **Player colors by join rank:** `["#22c55e", "#38bdf8", "#f472b6", "#a78bfa"]` (green, sky, pink, violet).
- **Nickname:** trimmed, matches `/^[A-Za-z0-9 _-]{1,12}$/`. Error copy: "Enter a nickname (1–12 letters, digits, spaces, - or _)."
- **Room code:** 4 letters from `ABCDEFGHJKLMNPQRSTUVWXYZ`, via `crypto.getRandomValues`. Channel/BroadcastChannel name: `devlandia-<CODE>`.
- **Timing:**
  - `NO_ROOM_TIMEOUT_MS = 3000`
  - positions are sent at most every `POS_INTERVAL_MS = 125`
  - presence updates are throttled to `PRESENCE_THROTTLE_MS = 1000`
  - the Same-computer heartbeat runs every `HEARTBEAT_MS = 1000`, with expiry `PRESENCE_EXPIRY_MS = 3500`
- **Copy (verbatim):**
  - "Can't reach the team server. Check your internet connection, or switch to Same computer mode."
  - "No room with that code."
  - "This room is full."
  - "Waiting for the host to start…"
  - "Connecting…" / "Reconnecting…"
  - top bar `ROOM <CODE> · <N> online`
  - "{name} joined the team." / "{name} left the team."
  - the six teammate log lines in the spec's table
- **Validation:** every incoming presence meta and message passes through `team.ts` validators. Invalid input is dropped, never thrown.
- **Security:** no Supabase tables, auth or RLS. The publishable key may be committed; secret keys never are.

## Decisions (beyond the spec)

1. **Team clock is display-only.** In team mode the overworld *displays* `teamMinutes(startedAt, now)` (refreshed by a `useNow(TICK_MS)` hook) instead of `state.minutes`. The reducer's `tick` is unchanged and still only regenerates stamina (paused while a terminal is open). This replaces the spec's "optional `minutes` on `tick`" with the same visible behavior and less coupling.
2. **Your own dot uses your team color** in team mode, so all players see consistent colors. In solo it stays green.
3. **Teammate labels always sit to the right of their dot** and are click-through. Collision-avoiding placement stays limited to your own player and drone (YAGNI for 1–3 teammates).
4. **Positions come from two sources:** `pos` messages, and the `x`/`y` in presence metas for late joiners. The latest received value wins.
5. **The Supabase project is created mid-plan (Task 7) only after the user confirms the cost**: a hard stop for the executor.

## Review Focus

1. **Host leaves the lobby before starting:** the next-earliest player becomes host and sees **[ Start Expedition ]**. Test: Task 4.
2. **Joining a room that already started:** the joiner goes straight into the overworld with the team's merged flags. Test: Task 6.
3. **Malformed teammate input** (`x: 500`, `flags.gateUnlocked: "yes"`, a 40-character name): dropped silently; the game keeps running and shows no bogus teammate. Test: Tasks 1 and 3.
4. **Connection drops mid-game:** you keep playing, the top bar shows "Reconnecting…", and flags set while offline merge for everyone after reconnect. Test: Task 6.
5. **Double-clicking Create Room:** only one room is created, because the buttons are disabled while connecting. Test: Task 5.

---

## File Structure

```
src/game/team.ts                 constants, flag helpers, codes, ranking/colors/host, clock, validators
src/net/transport.ts             TeamTransport interface, TeamMode, TeamError
src/net/memoryTransport.ts       createMemoryHub(): in-process rooms for tests
src/net/broadcastTransport.ts    createBroadcastTransport(): Same-computer mode
src/net/supabaseTransport.ts     createSupabaseTransport(client): Online mode
src/net/config.ts                SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (env override, defaults)
src/net/makeTransport.ts         makeTransport(mode): real factory used by App
src/hooks/useTeamSession.ts      TeamSession state machine over a transport
src/hooks/useNow.ts              ticking Date.now() for the team clock
src/screens/TeamLobby.tsx        lobby UI
.env.example                     VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
```

Modified: `src/App.tsx`, `src/screens/MainMenu.tsx`, `src/game/types.ts`, `src/game/reducer.ts`, `src/screens/overworld/{Overworld,MapViewport,MiniMap,TopHud}.tsx`, `README.md`, `package.json`.

---

### Task 1: Team rules

**Files:**
- Create: `src/game/team.ts`
- Test: `src/game/team.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type TeamFlags = { questComplete: boolean; hasLoot: boolean; clueDecoded: boolean; artifactFound: boolean; gateUnlocked: boolean; towerPowered: boolean };
  type FlagKey = keyof TeamFlags;
  type PresenceMeta = { id: string; name: string; joinedAt: number; startedAt: number | null; flags: TeamFlags; x: number; y: number };
  type TeamMessage = { type: "pos"; id: string; x: number; y: number } | { type: "progress"; id: string; name: string; flags: TeamFlags } | { type: "start"; startedAt: number };
  type RankedPlayer = PresenceMeta & { rank: number; color: string; isHost: boolean };
  const TEAM_MAX = 4, TEAM_COLORS: string[], ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ", NO_ROOM_TIMEOUT_MS = 3000, POS_INTERVAL_MS = 125, PRESENCE_THROTTLE_MS = 1000;
  const NO_FLAGS: TeamFlags  // all false
  flagsOf(s: GameState): TeamFlags
  mergeFlags(a: TeamFlags, b: TeamFlags): TeamFlags          // OR
  newlySet(before: TeamFlags, after: TeamFlags): FlagKey[]   // in TeamFlags key order
  teammateLog(name: string, key: FlagKey): string            // spec table copy
  normalizeNickname(raw: string): string | null              // trimmed or null if invalid
  normalizeRoomCode(raw: string): string | null              // upper-cased 4 letters from ROOM_ALPHABET or null
  makeRoomCode(random?: (n: number) => Uint32Array): string
  rankPlayers(metas: PresenceMeta[]): RankedPlayer[]         // sort by joinedAt, then id; dedupe by id (latest wins)
  teamStartedAt(metas: PresenceMeta[]): number | null        // first non-null
  teamFlags(metas: PresenceMeta[]): TeamFlags                // OR of all
  teamMinutes(startedAt: number, now: number): number
  parsePresence(raw: unknown, now: number): PresenceMeta | null
  parseMessage(raw: unknown, now: number): TeamMessage | null
  ```

- [ ] **Step 1: Write the failing tests** (`team.test.ts`; `meta(id, joinedAt, extra?)` is a small test builder):

```ts
expect(mergeFlags({ ...NO_FLAGS, gateUnlocked: true }, { ...NO_FLAGS, hasLoot: true })).toEqual({ ...NO_FLAGS, gateUnlocked: true, hasLoot: true })
expect(newlySet(NO_FLAGS, { ...NO_FLAGS, towerPowered: true, hasLoot: true })).toEqual(["hasLoot", "towerPowered"])
expect(teammateLog("Kai", "gateUnlocked")).toBe("Kai restored the bridge.")      // + one assertion per row of the spec table
expect(normalizeNickname("  Kai  ")).toBe("Kai"); expect(normalizeNickname("")).toBeNull()
expect(normalizeNickname("a".repeat(13))).toBeNull(); expect(normalizeNickname("<b>")).toBeNull()
expect(normalizeRoomCode("kqzm")).toBe("KQZM"); expect(normalizeRoomCode("KQZ")).toBeNull(); expect(normalizeRoomCode("KQIO")).toBeNull()
expect(makeRoomCode(() => new Uint32Array([0, 1, 2, 23]))).toBe("ABCZ")
const ranked = rankPlayers([meta("b", 20), meta("a", 10), meta("c", 20), meta("d", 30), meta("e", 40)])
expect(ranked.map((p) => p.id)).toEqual(["a", "b", "c", "d", "e"]); expect(ranked[0].isHost).toBe(true)
expect(ranked.map((p) => p.color).slice(0, 4)).toEqual(TEAM_COLORS)
expect(teamStartedAt([meta("a", 1), meta("b", 2, { startedAt: 500 })])).toBe(500)
expect(teamMinutes(0, 0)).toBe(1169); expect(teamMinutes(0, 2000)).toBe(1174); expect(teamMinutes(0, 2000 * 55)).toBe((1169 + 275) % 1440)
// Review Focus 3
expect(parsePresence({ ...meta("a", 1), x: 500 }, NOW)).toBeNull()
expect(parsePresence({ ...meta("a", 1), flags: { ...NO_FLAGS, gateUnlocked: "yes" } }, NOW)).toBeNull()
expect(parsePresence({ ...meta("a", 1), name: "x".repeat(40) }, NOW)).toBeNull()
expect(parsePresence({ ...meta("a", 1), startedAt: NOW + 2 * 86_400_000 }, NOW)).toBeNull()
expect(parseMessage({ type: "pos", id: "a", x: 50, y: 50 }, NOW)).toEqual({ type: "pos", id: "a", x: 50, y: 50 })
expect(parseMessage({ type: "pos", id: "a", x: 3, y: 50 }, NOW)).toBeNull()
expect(parseMessage({ type: "nope" }, NOW)).toBeNull(); expect(parseMessage(null, NOW)).toBeNull()
```

- [ ] **Step 2: Run** `npx vitest run src/game/team.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** to the signatures. Validation rules:
  - `id`: a string of 1–40 characters
  - `name`: must pass `normalizeNickname`
  - `x` in `[6, 94]`, `y` in `[10, 90]`, both finite numbers
  - `joinedAt`: a finite number
  - `startedAt`: null, or within ±86 400 000 ms of `now`
  - `flags`: an object with exactly the six boolean keys (extra keys ignored)
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `npm test && npx tsc -b`: all green.
- [ ] **Step 5: Commit** `feat: team rules (flags, codes, ranking, clock, validation)`

---

### Task 2: Reducer support for teammates' progress

**Files:**
- Modify: `src/game/types.ts`, `src/game/reducer.ts`
- Test: `src/game/reducer.test.ts`

**Interfaces:**
- Consumes: `TeamFlags`, `flagsOf`, `mergeFlags`, `newlySet`, `teammateLog` (Task 1).
- Produces: new `GameAction` members:
  - `{ type: "teamSync"; flags: TeamFlags; by: string }`: ORs the flags into state and pushes `teammateLog(by, key)` for each newly set key.
  - `{ type: "note"; text: string }`: pushes a log line.

- [ ] **Step 1: Write the failing tests**:

```ts
const s = gameReducer(s0, { type: "teamSync", flags: { ...NO_FLAGS, gateUnlocked: true, hasLoot: true }, by: "Kai" })
expect(s.gateUnlocked).toBe(true); expect(s.hasLoot).toBe(true)
expect(s.logs.slice(-2)).toEqual(["Kai opened the Supply Cache.", "Kai restored the bridge."])
expect(gameReducer(s, { type: "teamSync", flags: { ...NO_FLAGS, gateUnlocked: true }, by: "Kai" })).toBe(s)   // nothing new → same object
expect(gameReducer({ ...s0, towerPowered: true }, { type: "teamSync", flags: NO_FLAGS, by: "Kai" }).towerPowered).toBe(true) // never unsets
expect(lastLog(gameReducer(s0, { type: "note", text: "Kai joined the team." }))).toBe("Kai joined the team.")
```

- [ ] **Step 2: Run** `npx vitest run src/game/reducer.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both cases in `gameReducer`. `teamSync` returns the same state object when `newlySet` is empty.
- [ ] **Step 4: Run** `npm test && npx tsc -b`. Expected: all green.
- [ ] **Step 5: Commit** `feat: reducer merges teammates' progress`

---

### Task 3: Transports (interface, in-memory, Same computer)

**Files:**
- Create: `src/net/transport.ts`, `src/net/memoryTransport.ts`, `src/net/broadcastTransport.ts`
- Test: `src/net/memoryTransport.test.ts`, `src/net/broadcastTransport.test.ts`

**Interfaces:**
- Consumes: `PresenceMeta`, `TeamMessage`, `parsePresence`, `parseMessage` (Task 1).
- Produces:
  ```ts
  type TeamMode = "online" | "local";
  type TeamStatus = "connecting" | "online" | "reconnecting";
  class TeamError extends Error { kind: "unreachable" }
  interface TeamTransport {
    join(room: string, me: PresenceMeta): Promise<void>;
    leave(): Promise<void>;
    updatePresence(meta: PresenceMeta): void;
    send(msg: TeamMessage): void;                       // delivered to everyone else in the room, not to self
    onPresence(cb: (metas: PresenceMeta[]) => void): () => void;   // includes self; validated
    onMessage(cb: (msg: TeamMessage) => void): () => void;         // validated
    onStatus(cb: (s: TeamStatus) => void): () => void;
  }
  createMemoryHub(): { transport(): TeamTransport; setReachable(ok: boolean): void; drop(t: TeamTransport): void; restore(t: TeamTransport): void }
  createBroadcastTransport(opts?: { channel?: (name: string) => { postMessage(d: unknown): void; onmessage: ((e: { data: unknown }) => void) | null; close(): void }; now?: () => number }): TeamTransport
  ```

- [ ] **Step 1: Write the failing tests:**
  - `memoryTransport.test.ts`:
    - two transports joining "KQZM" each see both metas in `onPresence`
    - `send` reaches the other but not the sender
    - `leave` removes the meta for the other
    - `setReachable(false)` makes `join` reject with `TeamError` kind `"unreachable"`
    - `drop(t)` emits `"reconnecting"` to `t` and pauses delivery; `restore(t)` emits `"online"` and re-sends presence
    - a raw invalid message injected via the hub's internal broadcast is not delivered (Review Focus 3)
  - `broadcastTransport.test.ts`, using an in-test fake channel bus and a controllable `now` with fake timers:
    - two transports see each other after one heartbeat
    - after `PRESENCE_EXPIRY_MS` with no heartbeat, a peer disappears
    - messages arrive at the other peer only
    - channel name is `devlandia-KQZM`
- [ ] **Step 2: Run** `npx vitest run src/net`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Memory hub: rooms map → set of joined transports. Presence = their latest metas; notify on every change.
  - Broadcast transport: posts `{kind:"hb", meta}` every `HEARTBEAT_MS` (1000), `{kind:"bye", id}` on leave, and `{kind:"msg", msg}` for `send`. Keeps `lastSeen` per id and drops ids older than `PRESENCE_EXPIRY_MS` (3500) on each heartbeat tick. `join` resolves immediately with status `"online"`.
- [ ] **Step 4: Run** `npm test && npx tsc -b`. Expected: all green.
- [ ] **Step 5: Commit** `feat: team transports (in-memory, same computer)`

---

### Task 4: `useTeamSession`

**Files:**
- Create: `src/hooks/useTeamSession.ts`, `src/hooks/useNow.ts`
- Test: `src/hooks/useTeamSession.test.tsx` (`renderHook` with a memory hub)

**Interfaces:**
- Consumes: Task 1 helpers; `TeamTransport`, `TeamMode`, `TeamError` (Task 3).
- Produces:
  ```ts
  type TeamErrorKind = "unreachable" | "no-room" | "full";
  type TeamSession = {
    phase: "idle" | "connecting" | "lobby" | "playing" | "error";
    status: TeamStatus | null; error: TeamErrorKind | null;
    room: string | null; me: RankedPlayer | null; players: RankedPlayer[]; startedAt: number | null;
    teammates: Array<{ id: string; name: string; color: string; x: number; y: number }>;   // excludes me
    create(name: string, mode: TeamMode): void; join(name: string, code: string, mode: TeamMode): void;
    start(): void; leave(): void; retry(): void;
    publishPosition(x: number, y: number): void;     // throttled to POS_INTERVAL_MS
    publishFlags(flags: TeamFlags): void;             // updates presence + sends "progress"
    onProgress(cb: (flags: TeamFlags, by: string) => void): () => void;
    onRoster(cb: (joined: string[], left: string[]) => void): () => void;   // names, excluding me, after first sync
  };
  useTeamSession(makeTransport: (mode: TeamMode) => TeamTransport, now?: () => number): TeamSession
  useNow(intervalMs: number): number
  ```

- [ ] **Step 1: Write the failing tests** (two hooks share one hub):
  - **create:** phase goes `connecting` → `lobby`, and `room` matches `/^[A-HJ-NP-Z]{4}$/`.
  - **join:** the second hook joins that code; both see 2 players, the creator `isHost`, and colors `[TEAM_COLORS[0], TEAM_COLORS[1]]`.
  - **No room:** joining a code nobody is in, after `NO_ROOM_TIMEOUT_MS`, gives phase `error` with error `"no-room"`, and the transport has left.
  - **Room full:** a 5th joiner gets `"full"`; the other four still see 4 players.
  - **Unreachable:** `setReachable(false)`, then create gives error `"unreachable"`; `retry()` after `setReachable(true)` reaches `lobby`.
  - **Review Focus 1:** the host leaves in the lobby, and the remaining player becomes `isHost` with `me.isHost === true`.
  - **start:** the host's `start()` moves both sessions to phase `playing` with the same `startedAt`.
  - **progress:** `publishFlags` on one fires the other's `onProgress(flags, "Ana")`.
  - **position:** `publishPosition` updates the other's `teammates` entry (with fake timers past `POS_INTERVAL_MS`).
  - **roster:** `onRoster` reports joined and left names.
- [ ] **Step 2: Run** `npx vitest run src/hooks/useTeamSession.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** with `useReducer` for session state and refs for the transport and subscriptions.
  - **Ids:** `crypto.randomUUID()` per session.
  - **No-room check (joins only):** after the first presence sync, start a `NO_ROOM_TIMEOUT_MS` timer; if no other player has appeared when it fires, leave with error `no-room`.
  - **Room-full check:** runs on every presence update: if my rank is ≥ `TEAM_MAX`, leave with error `full`.
  - **Phase from presence:** a non-null `teamStartedAt` moves the session to `playing`.
  - **Cleanup:** every subscription is released on unmount.
- [ ] **Step 4: Run** `npm test && npx tsc -b`. Expected: all green.
- [ ] **Step 5: Commit** `feat: team session hook`

---

### Task 5: Lobby screen and menu

**Files:**
- Create: `src/screens/TeamLobby.tsx`
- Modify: `src/screens/MainMenu.tsx`, `src/App.tsx`
- Test: `src/screens/TeamLobby.test.tsx`; update `src/App.test.tsx`

**Interfaces:**
- Consumes: `TeamSession` (Task 4).
- Produces:
  - `TeamLobby({ session, onBack }: { session: TeamSession; onBack: () => void })`
  - `App({ makeTransport }?: { makeTransport?: (mode: TeamMode) => TeamTransport })`, defaulting to the real factory from Task 7. Until Task 7, the default is `() => createBroadcastTransport()`.
  - `MainMenu` gains `onTeamLobby: () => void`.

- [ ] **Step 1: Write the failing tests:**
  - `App.test.tsx`: TEAM LOBBY is enabled and opens a screen with heading "TEAM LOBBY"; SETTINGS is still disabled ("Coming soon" count becomes 1).
  - `TeamLobby.test.tsx`, with two `App`s rendered separately and sharing a memory hub:
    - **invalid nickname:** shows the nickname error copy, with no transport created
    - **create:** shows `ROOM ` + the code, "(you)" and "(host)"
    - **join:** the second app types the nickname and code and presses **[ Join ]**; both lists show 2 players
    - **start:** the host's **[ Start Expedition ]** is disabled with 1 player and enabled with 2; the non-host sees "Waiting for the host to start…"
    - **Start pressed:** both apps show `REGION: C++ PEAKS`
    - **error copy:** for `no-room`, `full` and `unreachable` (the last with **[ Retry ]**)
    - **Review Focus 5:** clicking **[ Create Room ]** twice quickly creates one room (buttons disabled while connecting)
    - **leaving:** **[ Leave Room ]** and **[ Back to Menu ]** return to the menu
- [ ] **Step 2: Run** `npx vitest run src/screens/TeamLobby.test.tsx src/App.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - App screens become `"menu" | "overworld" | "lobby" | "farewell"`. App owns `useTeamSession(makeTransport)`.
  - When `session.phase === "playing"`, App renders `<Overworld team={session} …/>`.
  - The lobby uses the existing `Panel` and `Button`, and the connection toggle is a two-button `role="radiogroup"`.
- [ ] **Step 4: Run** `npm test && npx tsc -b`. Expected: all green.
- [ ] **Step 5: Commit** `feat: team lobby screen`

---

### Task 6: Overworld in team mode

**Files:**
- Modify: `src/screens/overworld/Overworld.tsx`, `MapViewport.tsx`, `MiniMap.tsx`, `TopHud.tsx`
- Test: `src/screens/overworld/TeamOverworld.test.tsx`

**Interfaces:**
- Consumes: `TeamSession`, `useNow` (Task 4); `flagsOf`, `teamMinutes` (Task 1); `teamSync` and `note` actions (Task 2).
- Produces:
  - `Overworld({ onMenu, initial, team }: { …; team?: TeamSession })`
  - `MapViewport` gains `teammates` and `playerColor` props
  - `MiniMap` gains a `teammates` prop
  - `TopHud` gains `teamLabel?: string` and `reconnecting?: boolean`

- [ ] **Step 1: Write the failing tests** (two sessions on a memory hub, rendered as two Overworlds via a small harness that runs create/join/start first):
  - **Teammates on the map:** each side renders a `data-testid="teammate-<name>"` marker. It moves when the other walks (fake timers past `POS_INTERVAL_MS`) and also appears on the mini-map.
  - **Top bar:** shows `ROOM <CODE> · 2 online`.
  - **Shared progress:** when Ana solves the tower (dispatching `submitLogic` through the UI), Kai's log shows "Ana powered the signal tower. The fog lifts." and Kai's fog is lifted. Neither side gets duplicate log lines.
  - **Team clock:** shows `teamMinutes(startedAt, now)`, and keeps advancing while Kai has the gate terminal open (Decision 1).
  - **Review Focus 2:** a third session joining after start lands in the overworld with `gateUnlocked` already true (the Bridge label shows).
  - **Review Focus 4:** `hub.drop(kaiTransport)` shows "Reconnecting…". Kai opens the cache while dropped; after `hub.restore`, Ana's log shows "Kai opened the Supply Cache."
  - **Leaving:** **[=] Menu** in team mode calls `session.leave()`. Ana sees "Kai left the team." and the marker disappears.
  - **Solo unchanged:** an Overworld without `team` renders no teammate markers and no room label, and existing tests still pass.
- [ ] **Step 2: Run** `npx vitest run src/screens/overworld/TeamOverworld.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** In team mode, add:
  - an effect that calls `publishPosition` on `state.player` change
  - an effect that calls `publishFlags(flagsOf(state))` when any flag changes
  - `onProgress` → `dispatch({type:"teamSync", flags, by})`
  - `onRoster` → `note` lines
  - display minutes = `teamMinutes(startedAt, useNow(TICK_MS))`
  - teammate markers: 16px dots in their color with right-hand click-through labels
  - player dot color = `me.color`

  Effects are cleaned up on unmount.
- [ ] **Step 4: Run** `npm test && npx tsc -b`. Expected: all green.
- [ ] **Step 5: Commit** `feat: overworld team mode`

---

### Task 7: Online mode (Supabase)

**Files:**
- Create: `src/net/supabaseTransport.ts`, `src/net/config.ts`, `src/net/makeTransport.ts`, `.env.example`
- Modify: `package.json` (add `@supabase/supabase-js`), `src/App.tsx` (default factory)
- Test: `src/net/supabaseTransport.test.ts` (a fake client object, no network)

**Interfaces:**
- Consumes: `TeamTransport`, `TeamError` (Task 3).
- Produces:
  - `createSupabaseTransport(client: Pick<SupabaseClient, "channel" | "removeChannel">): TeamTransport`
  - `makeTransport(mode: TeamMode): TeamTransport`: `"local"` → broadcast transport; `"online"` → a Supabase transport, or a transport whose `join` rejects `unreachable` when the URL or key is empty.

- [ ] **Step 1: STOP and ask the user.** This is the external side effect gated by the spec.
  1. Look up the cost of a new project in the user's org (`get_cost`/`confirm_cost` if the MCP exposes them, otherwise the org plan).
  2. Tell the user the monthly cost, and that the free plan's 2-active-project limit is already reached.
  3. Wait for an explicit OK.
  4. On OK, create **chronicles-of-devlandia** in **ap-southeast-1** and read its URL and publishable key (`get_project_url`, `get_publishable_keys`).
  5. If the user declines, leave the defaults empty: Online then shows the unreachable error, and Same computer still works.
- [ ] **Step 2: Write the failing tests** (the fake client records calls):
  - **join:** `channel("devlandia-KQZM", { config: { presence: { key: me.id }, broadcast: { self: false } } })` is subscribed; `SUBSCRIBED` resolves `join` and emits `"online"`.
  - **Join failure:** `CHANNEL_ERROR` before the first `SUBSCRIBED` rejects with `TeamError("unreachable")`; after it, it emits `"reconnecting"`.
  - **Presence:** a `presence: sync` event emits validated metas from `presenceState()`; an invalid meta is dropped.
  - **send:** calls `channel.send({ type: "broadcast", event: msg.type, payload: msg })`.
  - **Throttling:** `updatePresence` calls `track` at most once per `PRESENCE_THROTTLE_MS` (trailing call kept).
  - **leave:** calls `untrack` and `removeChannel`.
- [ ] **Step 3: Run** `npx vitest run src/net/supabaseTransport.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement.** Install `@supabase/supabase-js`. In `config.ts`, export `SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "<project url>"`, and the same for the key. Create the client lazily in `makeTransport` (so Solo never loads it), with `realtime: { params: { eventsPerSecond: 20 } }`.
- [ ] **Step 5: Run** `npm test && npx tsc -b && npm run build`. Expected: all green, build OK.
- [ ] **Step 6: Commit** `feat: online team mode over Supabase Realtime`

---

### Task 8: Browser verification, README

**Files:**
- Modify: `README.md` (Team Lobby section: Online vs Same computer, room codes, what's shared, the preview-link limitation, the `.env.example` variables)

- [ ] **Step 1: Same-computer browser check.** With `npm run build`, `vite preview` and Playwright, open two pages in one browser context at 1280×800 and 375×812 (touch). Run:
  1. Ana creates a room (Same computer) and Kai joins with the code. Both lists show 2; Ana starts.
  2. Each sees the other's dot move.
  3. Kai powers the tower. Ana's log shows "Kai powered the signal tower. The fog lifts." and Ana's fog style is transparent.
  4. Ana leaves. Kai's log shows "Ana left the team." and the dot is gone.

  Also confirm no console errors and no sideways scroll at 375px. Expected: all checks PASS.
- [ ] **Step 2: Online check**, only if `*.supabase.co` is reachable from the environment: the same script with Online mode. Otherwise, record that it was skipped and give the user a two-device checklist (two phones or laptops, Online mode, steps 1–4 above).
- [ ] **Step 3: Regression.** `npm test`, `npx tsc -b`, and the existing browser suites (`run`, `touch`, `markers`, `clip`, `labels`, `sidequest`, `tower`). Expected: all pass.
- [ ] **Step 4: Commit** `docs: team lobby in README`
