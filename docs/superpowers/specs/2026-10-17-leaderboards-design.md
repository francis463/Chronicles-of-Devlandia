# Leaderboards: design

**Date:** 2026-10-17 · **Status:** awaiting the owner's review of this written spec

## Goal

The main menu's **Leaderboards** button (today "coming soon") opens a screen ranking players by **badges earned**. Anyone can look; signed-in players can hide themselves.

## Decisions already made with the owner

| Question | Decision |
|---|---|
| Ranking | Most badges (out of 11). Ties share a rank; within a tie, the player who earned their latest badge earliest is listed first, then by name |
| Who can look | Everyone: signed-in players, guests and signed-out players |
| Who is listed | Every signed-in player with at least one badge, **unless they hide themselves** (opt-out, default visible) |
| Size | Top 20 |
| Server approach | A read-only Postgres function (no Edge Function, no secret, no loosening of the existing row rules) |

Out of scope: fastest-quest times, per-chest boards, team or friend boards, real-time updates (a **Refresh** button instead), pagination beyond 20, and showing answers or anything but name, rank and count.

## What the player sees

1. **Menu.** `Leaderboards` becomes a normal button (the `ComingSoon` placeholder is removed). It is never disabled by the saved-badge loading (`busy`), because it needs nothing from the game.
2. **Leaderboard screen** (title `LEADERBOARD`, the same backdrop and panel as the other account screens):
   - A list (`role="list"`, label "Top players") of up to 20 rows: rank, name, `n/11 badges`.
   - A signed-in player's own row is highlighted and marked "(you)". If they are not in the top 20 and not hidden, a line below the list reads `Your rank: 37 · 4/11 badges`. A signed-in player with no badges sees `Earn a badge to join the leaderboard.`
   - A signed-in player sees a switch, `Hide me from the leaderboard`. While on, their row is absent from the list for everyone, and they see `You're hidden. Your rank: 37 · 4/11 badges.` The switch is not shown to guests.
   - `[ Refresh ]` reloads the list and the player's rank; `[ Back ]` returns to the menu.
3. **States.** Loading: `Loading the leaderboard…`. Empty: `No badges yet. Be the first!`. Server unreachable or any failure: `Can't reach the leaderboard.` with `[ Refresh ]` and `[ Back ]` still available (the screen never traps). Toggle failing: the switch snaps back and `Couldn't save that. Try again.` shows.
4. Names are shown through the existing rude-word mask (`maskRude`), as a second line of defence after sign-up validation.

## Server (Supabase; applied only with the owner's approval)

One migration, `supabase/migrations/20261017010000_leaderboards.sql`:

```sql
create table public.leaderboard_hidden (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.leaderboard_hidden enable row level security;
create policy hidden_read   on public.leaderboard_hidden for select to authenticated using (user_id = auth.uid());
create policy hidden_insert on public.leaderboard_hidden for insert to authenticated with check (user_id = auth.uid());
create policy hidden_delete on public.leaderboard_hidden for delete to authenticated using (user_id = auth.uid());
```

Two functions, both `security definer` with `set search_path = ''` and fully qualified names:

- `public.leaderboard_top(max_rows int default 20)` returns `table (rank bigint, name text, badges int, last_earned timestamptz)`. It joins `profiles` and `badges`, counts badges per player, excludes anyone in `leaderboard_hidden`, orders by `badges desc, last_earned asc, name`, ranks with `rank()` over that count and `last_earned` so ties share a rank, and returns at most `least(greatest(coalesce(max_rows, 20), 1), 50)` rows. It returns **no user id and no email**.
- `public.leaderboard_me()` returns `table (rank bigint, badges int, hidden boolean)` for `auth.uid()` (one row, or none when signed out or the player has no badges). The rank is computed against all non-hidden players, so a hidden player still learns what their rank would be.

Grants: `revoke all on function … from public;` then `grant execute on function public.leaderboard_top(int) to anon, authenticated;` and `grant execute on function public.leaderboard_me() to authenticated;`.

The existing tables' row rules do not change: `profiles` and `badges` stay readable only by their owner. Only names, counts and ranks leave the database, through these two functions.

A local SQL script, `supabase/tests/leaderboard.sql`, runs on Postgres 16 with the same stubbed roles as `policies.sql` and must pass before the migration is offered: ranking order, ties, hidden players excluded, `max_rows` clamped, no `user_id` column in the result, `anon` can call `leaderboard_top` but gets a permission error from `leaderboard_me` and from `select` on `profiles`, `badges` and `leaderboard_hidden`, and one player cannot insert or delete another's hidden row. A planted `using (true)` policy must make it fail (negative control).

## Client

- `src/leaderboard/leaderboard.ts` (pure types): `type Row = { rank: number; name: string; badges: number }`, `type Me = { rank: number; badges: number; hidden: boolean }`, and `interface LeaderboardStore { top(): Promise<Row[]>; me(): Promise<Me | null>; setHidden(hidden: boolean): Promise<void> }`. Both reads parse defensively (numbers must be finite integers in range, names strings; a malformed row is dropped).
- `src/leaderboard/supabaseLeaderboard.ts`: `createSupabaseLeaderboard(load, userId | null)` using `client.rpc("leaderboard_top", { max_rows: 20 })`, `client.rpc("leaderboard_me")`, and `from("leaderboard_hidden")` insert/delete scoped to the user. `SupabaseLike` gains `rpc(fn, args?)` and `TableLike` gains `delete()`. Signed-out and guest players use the anonymous client; `me` and `setHidden` are no-ops for them.
- `src/leaderboard/memoryLeaderboard.ts`: an in-memory fake for tests (`rows`, `me`, `failNext`).
- `src/screens/Leaderboard.tsx`: the screen above, taking `{ store, signedIn, myName, onBack }`.
- `src/screens/MainMenu.tsx`: an `onLeaderboards` prop and the real button. `src/App.tsx`: `Screen` gains `"leaderboard"`; the store is built from `makeLeaderboard(userId | null)`, an injectable prop defaulting to the Supabase version (test seam, like `makeProgress`).
- `README.md`: a short section and the layout line.

## Edge cases

- Nobody has a badge yet: the empty state. Fewer than 20 players: a shorter list.
- The player's name matches another's ignoring case: not possible (names are unique ignoring case).
- Offline or the functions are not deployed yet: `Can't reach the leaderboard.`; guest and solo play are unaffected.
- A signed-in player earns a badge, then opens the board: they see the new count (the saver has already flushed when returning to the menu; a failed save simply shows the old count).
- Hiding while the list is open: the switch updates the player's own state at once and reloads the list.
- Signed out (or logged out) while on the screen: the screen returns to the menu, as every other screen does when the account status changes.
- A hostile or odd server reply (wrong types, huge numbers, a name that is not a string) never crashes the screen.

## Testing

- **Unit:** the store parsers and Supabase mapping (rpc arguments, error mapping to the failed state, hidden insert/delete); the memory fake; the screen's loading, empty, list, "(you)", rank line, hidden line, switch (and its failure), guest (no switch), offline, Refresh and Back; the menu button; App flow for guest and signed-in players, and returning to the menu when signed out.
- **SQL:** `supabase/tests/leaderboard.sql` as described, run locally with a negative control.
- **Browser (1366 × 657 and 390 × 844):** with the server unreachable, the button opens the screen, shows the offline message, and Back works; no horizontal scroll; no console errors. The real list is verified in the owner-gated step below.

## Setup the owner must do (outside the repo)

Nothing below is done without asking first: apply the migration to the existing project, then check the screen on the live site with two throwaway accounts (one hides itself and disappears from the other's list).

## Review focus

1. Nobody can read another player's `user_id`, email, answers or any table row through the new functions or policies.
2. A hidden player never appears in `leaderboard_top`, and cannot be hidden or unhidden by someone else.
3. The screen never traps a player: Back and Refresh work in every state, including offline and malformed replies.
4. `max_rows` cannot be abused to dump the whole player list (clamped to 50), and the functions cannot be exploited through the search path.
5. No secret, key or Edge Function change is introduced.
