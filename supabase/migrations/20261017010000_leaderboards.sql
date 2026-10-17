-- Leaderboards. See docs/superpowers/specs/2026-10-17-leaderboards-design.md.
-- Apply after 20261017000000_accounts.sql. profiles and badges stay private to their owner: only the two
-- functions below let name, rank and badge count leave the database.
create table public.leaderboard_hidden (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.leaderboard_hidden enable row level security;

-- A player reads, adds and removes only their own row.
create policy hidden_read   on public.leaderboard_hidden for select to authenticated using (user_id = auth.uid());
create policy hidden_insert on public.leaderboard_hidden for insert to authenticated with check (user_id = auth.uid());
create policy hidden_delete on public.leaderboard_hidden for delete to authenticated using (user_id = auth.uid());

-- The top players by badges, never more than 50 rows and never a user id or email. Players with the same
-- count share a rank; within a rank the one whose latest badge came first is listed first.
create function public.leaderboard_top(max_rows int default 20)
returns table (rank bigint, name text, badges int, last_earned timestamptz)
language sql stable security definer set search_path = ''
as $$
  with counted as (
    select p.name, count(*)::int as badges, max(b.earned_at) as last_earned
    from public.profiles p
    join public.badges b on b.user_id = p.user_id
    where not exists (select 1 from public.leaderboard_hidden h where h.user_id = p.user_id)
    group by p.user_id, p.name
  )
  select (rank() over (order by c.badges desc))::bigint, c.name, c.badges, c.last_earned
  from counted c
  order by 1, c.last_earned, c.name
  limit least(greatest(coalesce(max_rows, 20), 1), 50)
$$;

-- The caller's own standing: their rank among players who are not hidden (null with no badges), their badge
-- count, and whether they hide themselves. One row for a signed-in caller with a profile, none otherwise.
create function public.leaderboard_me()
returns table (rank bigint, badges int, hidden boolean)
language sql stable security definer set search_path = ''
as $$
  with me as (
    select p.user_id, (select count(*)::int from public.badges b where b.user_id = p.user_id) as n
    from public.profiles p
    where p.user_id = auth.uid()
  )
  select
    case when me.n = 0 then null else 1 + (
      select count(*) from (
        select b.user_id from public.badges b
        where not exists (select 1 from public.leaderboard_hidden h where h.user_id = b.user_id)
        group by b.user_id having count(*) > me.n
      ) ahead
    ) end::bigint,
    me.n,
    exists (select 1 from public.leaderboard_hidden h where h.user_id = me.user_id)
  from me
$$;

-- New functions are open to the API roles by default, so close them explicitly, then open what is meant.
revoke all on function public.leaderboard_top(int) from public, anon, authenticated;
revoke all on function public.leaderboard_me() from public, anon, authenticated;
grant execute on function public.leaderboard_top(int) to anon, authenticated;
grant execute on function public.leaderboard_me() to authenticated;
