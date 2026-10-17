# Leaderboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The main menu's Leaderboards button opens a screen listing the top 20 players by badges earned, with the player's own rank and a switch to hide themselves.

**Architecture:** Two read-only Postgres functions (`leaderboard_top`, `leaderboard_me`, security definer) plus one small table (`leaderboard_hidden`) expose only name, rank and badge count; the existing private tables stay private. The client gets a `LeaderboardStore` (Supabase and in-memory versions), a `Leaderboard` screen and a real menu button.

**Tech Stack:** Postgres 16 / Supabase (RLS, `rpc`), Vite 8, React 19, TypeScript strict (`tsc -b` also checks tests; `noUnusedLocals/Parameters`), Tailwind 4, Vitest 5 + jsdom, Testing Library + user-event.

**Spec:** `docs/superpowers/specs/2026-10-17-leaderboards-design.md`

## Global Constraints

- The ranking is **most badges (out of 11)**. Players with the same badge count share a rank (`rank() over (order by badges desc)`); within a rank they are listed by `last_earned asc`, then `name`. (The spec states this twice in slightly different words; this is the reading used: ties are equal badge counts.)
- The list is at most 20 rows; `leaderboard_top` clamps `max_rows` to 1…50 (null means 20) and returns **no user id and no email**.
- Hidden players (rows in `leaderboard_hidden`) never appear in `leaderboard_top`. A hidden player still sees their own rank.
- `leaderboard_me()` returns one row for any signed-in caller who has a profile: `rank` is null when the caller has no badges (refinement of the spec, so a player with no badges can still read and keep their hidden state). `rank` is `1 + the number of non-hidden players with more badges than the caller`.
- Both functions are `security definer` with `set search_path = ''` and fully qualified names; `revoke all … from public`; `leaderboard_top` is granted to `anon, authenticated`, `leaderboard_me` to `authenticated` only.
- The existing `profiles` and `badges` row rules do not change. No secret, no key, no Edge Function change.
- Names are shown through `maskRude`. Copy: `LEADERBOARD`, `Loading the leaderboard…`, `No badges yet. Be the first!`, `Can't reach the leaderboard.`, `Couldn't save that. Try again.`, `Hide me from the leaderboard`, `Earn a badge to join the leaderboard.`, `Your rank: R · n/11 badges`, `You're hidden. Your rank: R · n/11 badges.`, buttons `[ Refresh ]` and `[ Back ]`.
- Applying anything to the real Supabase project is **owner-gated** (Task 6): ask before each outward action.
- Commit trailers on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01HPb8GXdoyJ5vhtq3ZqACub`. No model identifiers in code or commits. Push to `claude/trusting-archimedes-64rvrc` after commits; never force.

## Review Focus

1. Nobody can read another player's `user_id`, email, answers or any table row through the new functions or policies. Tests: Task 1 (SQL: result columns, `anon` and other players denied on every table).
2. A hidden player never appears in `leaderboard_top`, and nobody else can hide or unhide them. Tests: Task 1 (SQL).
3. The screen never traps a player: Back and Refresh work in loading, empty, offline and malformed-reply states. Tests: Task 3.
4. `max_rows` cannot dump the player list, and the functions are not exploitable through the search path. Tests: Task 1 (clamp; a function created under a hostile `search_path` cannot be shadowed).
5. A hostile or odd server reply (wrong types, huge numbers, a non-string name) never crashes the screen. Tests: Task 2 (`parseRows`, `parseMe`).

---

### Task 1: The migration and its SQL test

**Files:**
- Create: `supabase/migrations/20261017010000_leaderboards.sql`
- Create: `supabase/tests/leaderboard.sql`

**Interfaces:**
- Produces (database): table `public.leaderboard_hidden(user_id uuid primary key references auth.users on delete cascade)` with RLS and policies `hidden_read` (select, own), `hidden_insert` (insert, own), `hidden_delete` (delete, own), all `to authenticated`; functions
  - `public.leaderboard_top(max_rows int default 20) returns table (rank bigint, name text, badges int, last_earned timestamptz)`
  - `public.leaderboard_me() returns table (rank bigint, badges int, hidden boolean)`

- [ ] **Step 1: Set up a local Postgres 16 harness** (not committed): start a throwaway cluster under `/var/tmp` as user `postgres` (binaries in `/usr/lib/postgresql/16/bin`; it cannot run under `/tmp/claude-0`), stub the roles `anon`, `authenticated`, an `auth` schema with `auth.users(id uuid primary key, email text)` and `auth.uid()` reading `request.jwt.claim.sub`, then apply the accounts migration `supabase/migrations/20261017000000_accounts.sql` exactly as `supabase/tests/policies.sql` expects. Confirm `psql -f supabase/tests/policies.sql` still passes there.
- [ ] **Step 2: Write the failing test** `supabase/tests/leaderboard.sql` in the style of `policies.sql` (one transaction, rolled back, plays each role): it makes five users with profiles and badges (A:3, B:3 with a later last badge than A, C:1, D:2 and hidden, E:0 with a profile) and asserts, as `anon` / `authenticated`:
  - `leaderboard_top()` lists A, B, D? — no: D is hidden, so A, B (rank 1, 1; A before B by `last_earned`), C (rank 3); E (no badges) is absent; the result has exactly the columns `rank, name, badges, last_earned` and no `user_id`.
  - `leaderboard_top(0)` and `leaderboard_top(-5)` return at most 1 row; `leaderboard_top(1000)` returns no more than 50; `leaderboard_top(null)` behaves as 20.
  - `anon` can call `leaderboard_top` but gets `insufficient_privilege` from `leaderboard_me()` and from `select` on `profiles`, `badges` and `leaderboard_hidden`.
  - As A: `leaderboard_me()` returns `(1, 3, false)`; as D (hidden): `(3, 2, true)` — rank among non-hidden players with more badges, plus one, i.e. `1 + 2 = 3` (A and B have more); as E: `(null, 0, false)`.
  - A can insert and delete their own `leaderboard_hidden` row; A inserting a row for B fails with `insufficient_privilege`; A deleting B's row removes no rows; after A hides themself they vanish from `leaderboard_top`.
  - Search-path safety: as `authenticated`, create `pg_temp.profiles` as a view returning a fake row, call `leaderboard_top()`, and assert the fake row is not in the result.
- [ ] **Step 3: Run it** in the harness (`psql -v ON_ERROR_STOP=1 -f supabase/tests/leaderboard.sql`) — Expected: FAIL because the functions and table do not exist.
- [ ] **Step 4: Write the migration** `20261017010000_leaderboards.sql`: the table, RLS, the three policies, the two functions with the signatures above (aggregate per player with `count(*)::int` and `max(earned_at)`; exclude `leaderboard_hidden`; `limit least(greatest(coalesce(max_rows, 20), 1), 50)`), `revoke all … from public`, and the grants from Global Constraints.
- [ ] **Step 5: Run** `leaderboard.sql` and then `policies.sql` again — Expected: both PASS.
- [ ] **Step 6: Negative control.** Temporarily change a policy to `using (true)` (and, separately, drop `where not exists (… leaderboard_hidden …)` from `leaderboard_top`); re-run `leaderboard.sql` — Expected: FAIL each time; restore both, re-run — Expected: PASS. Stop and delete the throwaway cluster.
- [ ] **Step 7: Commit** `feat: leaderboard functions and the hide table`.

### Task 2: The leaderboard store

**Files:**
- Create: `src/leaderboard/leaderboard.ts`, `src/leaderboard/supabaseLeaderboard.ts`, `src/leaderboard/memoryLeaderboard.ts`
- Modify: `src/net/supabaseClient.ts` (`SupabaseLike.rpc`, `TableLike.delete`), `src/auth/fakeSupabase.ts`
- Test: `src/leaderboard/leaderboard.test.ts`, `src/leaderboard/supabaseLeaderboard.test.ts`, `src/leaderboard/memoryLeaderboard.test.ts`

**Interfaces:**
- Produces:
  - `type Row = { rank: number; name: string; badges: number }`; `type Me = { rank: number | null; badges: number; hidden: boolean }`
  - `interface LeaderboardStore { top(): Promise<Row[]>; me(): Promise<Me | null>; setHidden(hidden: boolean): Promise<void> }` (every method rejects on failure)
  - `parseRows(data: unknown): Row[]` and `parseMe(data: unknown): Me | null`
  - `createSupabaseLeaderboard(load: () => Promise<SupabaseLike>, userId: string | null): LeaderboardStore`
  - `createMemoryLeaderboard(init?: { rows?: Row[]; me?: Me | null }): LeaderboardStore & { rows: Row[]; meState: Me | null; failNext: number; calls: string[] }` (each method first consumes `failNext` and rejects while it is above zero; `setHidden` updates `meState.hidden` and removes or restores the player's row by `meState` name is not needed: it only records the flag and the call)
  - `SupabaseLike.rpc(fn: string, args?: object): PromiseLike<{ data: unknown; error: ErrorLike }>`; `TableLike.delete(): { eq(col: string, val: string): PromiseLike<QueryResult> }`

- [ ] **Step 1: Write the failing tests.**
  - `parseRows`: valid rows pass through; a non-array gives `[]`; each of these rows is dropped and the rest kept: non-object, `rank` 0 / -1 / 1.5 / `"1"` / `NaN` / `Infinity`, `badges` 0 / 12 / 2.5, `name` empty / a number / longer than 12 characters.
  - `parseMe`: a one-element array of a valid object returns it (`rank: null` allowed); `[]`, `null`, a bad `hidden` type, a negative or non-integer `badges`, a non-null non-integer `rank` all give `null`.
  - Supabase store: `top()` calls `rpc("leaderboard_top", { max_rows: 20 })` and returns parsed rows; an `error` rejects; `me()` is `null` without calling anything when `userId` is null, otherwise `rpc("leaderboard_me")` parsed; `setHidden(true)` inserts `{ user_id }` into `leaderboard_hidden` and treats `23505` as success; `setHidden(false)` does `delete().eq("user_id", userId)`; both reject on another error; `setHidden` with a null `userId` does nothing.
  - Memory store: returns its rows and me, `failNext` rejects that many times then recovers, `setHidden` records the flag.
- [ ] **Step 2: Run** `npx vitest run src/leaderboard` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the three files and the two type additions; extend `createFakeSupabase` with `rpcReplies: Record<string, { data: unknown; error: … }>` (recorded in `calls` as `rpc` with the function and args), a `deleteReplies` map and a recorded `from(table).delete().eq` call. `parseRows` and `parseMe` are pure and defensive; never trust a server reply's shape.
- [ ] **Step 4: Run** `npx vitest run src/leaderboard src/auth src/progress src/net` and `npx tsc -b` — Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat: the leaderboard store`.

### Task 3: The Leaderboard screen

**Files:**
- Create: `src/screens/Leaderboard.tsx`
- Test: `src/screens/Leaderboard.test.tsx`

**Interfaces:**
- Consumes: `LeaderboardStore`, `Row`, `Me`, `createMemoryLeaderboard` (Task 2); `maskRude` from `src/chat/filter`; `AuthFrame`-style backdrop and panel (`MenuBackdrop`, `Panel`), `Button`.
- Produces: `Leaderboard({ store, signedIn, myName, onBack }: { store: LeaderboardStore; signedIn: boolean; myName: string | null; onBack(): void })`.

- [ ] **Step 1: Write the failing tests** (memory store; user-event):
  - Shows `Loading the leaderboard…` first, then a list labelled "Top players" with rank, masked name and `n/11 badges` per row (a name that `maskRude` changes is shown masked).
  - Empty rows show `No badges yet. Be the first!` and still offer `[ Refresh ]` and `[ Back ]`.
  - A failing store shows `Can't reach the leaderboard.`; `[ Refresh ]` retries (after the failure clears the list appears); `[ Back ]` calls `onBack` (Review Focus 3, also in the loading state).
  - Signed in as "Ann": her row is marked `(you)`; when she is outside the list a line `Your rank: 37 · 4/11 badges` shows; with `rank: null` the line `Earn a badge to join the leaderboard.` shows; guests (`signedIn=false`) never see the switch or any rank line and `me` is not called.
  - The switch (`role="switch"`, name `Hide me from the leaderboard`) reflects `me.hidden`; clicking it calls `setHidden(true)`, reloads, and shows `You're hidden. Your rank: R · n/11 badges.`; if `setHidden` rejects it snaps back and shows `Couldn't save that. Try again.`
  - Malformed data reaching the screen through the memory store (a row with a non-string name pushed past the types) does not crash it.
- [ ] **Step 2: Run** `npx vitest run src/screens/Leaderboard.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `Leaderboard.tsx` (load with `Promise.all([store.top(), signedIn ? store.me() : Promise.resolve(null)])` on mount and on Refresh, ignoring results that arrive after unmount; the same backdrop and panel look as `ClassPicker`; the list is an ordered list of rows; the own row matches `myName` ignoring case; focus the screen heading on mount so keyboard users start inside it).
- [ ] **Step 4: Run** the test and `npx tsc -b` — Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat: the Leaderboard screen`.

### Task 4: The menu button and App wiring

**Files:**
- Modify: `src/screens/MainMenu.tsx`, `src/App.tsx`, any test that renders `MainMenu` directly
- Test: `src/App.test.tsx`, the MainMenu tests

**Interfaces:**
- Consumes: `Leaderboard`, `createSupabaseLeaderboard`, `createMemoryLeaderboard`, `LeaderboardStore` (Tasks 2–3); `loadSupabase`.
- Produces: `MainMenu` prop `onLeaderboards: () => void` (the `ComingSoon` helper is deleted); `App` prop `makeLeaderboard?: (userId: string | null) => LeaderboardStore` (default `createSupabaseLeaderboard(loadSupabase, userId)`); `Screen` gains `"leaderboard"`.

- [ ] **Step 1: Write the failing tests / update the old ones.** The existing tests that expect `Leaderboards` to be "coming soon" (the button list `["Solo Quest", "Team Lobby", "LeaderboardsComing soon"]` and the "keeps Leaderboards as coming soon" test) are updated to the new truth: the button list is `["Solo Quest", "Team Lobby", "Leaderboards"]` and Leaderboards is enabled. New App tests: a guest clicks Leaderboards and sees `LEADERBOARD` with the memory store's rows (`makeLeaderboard` injected), `[ Back ]` returns to the menu; the store is built with `null` for a guest and with the account's user id when signed in; a signed-in player sees the switch and their rank line; while the saved badges are still loading (`busy`) the Leaderboards button stays enabled; being signed out (account event) while on the leaderboard returns to the login screen (the existing status-leaves effect).
- [ ] **Step 2: Run** `npx vitest run src/App.test.tsx src/screens` — Expected: FAIL.
- [ ] **Step 3: Implement.** `MainMenu`: replace the placeholder with `<Button className="w-full" onClick={onLeaderboards}>Leaderboards</Button>` (not disabled by `busy`). `App`: memoise the store by `userId`, render `<Leaderboard store signedIn={!!userId} myName={userName} onBack={() => setScreen("menu")} />` for `screen === "leaderboard"`.
- [ ] **Step 4: Run** the whole suite `npx vitest run` and `npx tsc -b` — Expected: all pass, clean.
- [ ] **Step 5: Commit** `feat: open the leaderboards from the menu`.

### Task 5: README, browser check, final review

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README.** Add a "Leaderboards" section: what it ranks, who can look, the hide switch, that it needs the `20261017010000_leaderboards.sql` migration (apply after the accounts one), the new files in the layout list, and that the button reports "Can't reach the leaderboard." until the migration is applied.
- [ ] **Step 2: Browser check** at 1366 × 657 and 390 × 844 against `npm run build` + `vite preview` (kill by saved pid) with Supabase routed to abort: guest → Leaderboards opens the screen, shows `Can't reach the leaderboard.`, `[ Refresh ]` stays usable, `[ Back ]` returns to the menu; no horizontal scroll; no console errors. Look at the screenshots.
- [ ] **Step 3: Full verification:** `npx tsc -b`, `npx vitest run`, `npm run build` — Expected: clean and green.
- [ ] **Step 4: Commit and push** `docs: leaderboards in the README`.
- [ ] **Step 5: Final whole-branch review** on the most capable model with the Review Focus above; triage, one fix pass (each fix RED→GREEN), ledger the rest.

### Task 6 (owner-gated): Apply the migration and check it live

Stops for the owner; each step needs an explicit yes first.

- [ ] **Step 1: Ask, then apply** `20261017010000_leaderboards.sql` to project `oifzgkvgpxxnoiyvbwvt` with the Supabase tools, and confirm with read-only queries: the table has RLS on with three policies, both functions exist with `security definer` and `search_path` set, and the grants are as in Global Constraints (`anon` can execute only `leaderboard_top`).
- [ ] **Step 2: Live check** on the deployed preview (or by the owner if the network blocks Supabase): two throwaway accounts each with a badge; both appear; one hides and disappears from the other's list yet still sees their own rank; Refresh updates; no other data is visible. Delete the throwaway accounts only with approval.
