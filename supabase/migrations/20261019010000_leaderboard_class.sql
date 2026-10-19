-- The Hall of Fame draws each top player as their own class hero, so the leaderboard now hands out the class too.
-- Apply after 20261019000000_avatars.sql. The class lives in the account's private metadata
-- (auth.users.raw_user_meta_data); this security-definer function returns that one key (cut to 12 characters) and
-- nothing else of the metadata. Run it in the Supabase SQL Editor: the connector holds DROP statements for approval.
-- Until it runs, the client still works: a row without a class is drawn as the default Warrior.
drop function public.leaderboard_top(int);
create function public.leaderboard_top(max_rows int default 20)
returns table (rank bigint, name text, badges int, last_earned timestamptz, avatar uuid, cls text)
language sql stable security definer set search_path = ''
as $$
  with counted as (
    select p.name, count(*)::int as badges, max(b.earned_at) as last_earned, a.key as avatar,
           left(u.raw_user_meta_data ->> 'class', 12) as cls
    from public.profiles p
    join public.badges b on b.user_id = p.user_id
    join auth.users u on u.id = p.user_id
    left join public.avatars a on a.user_id = p.user_id
    where not exists (select 1 from public.leaderboard_hidden h where h.user_id = p.user_id)
    group by p.user_id, p.name, a.key, u.raw_user_meta_data
  )
  select (rank() over (order by c.badges desc))::bigint, c.name, c.badges, c.last_earned, c.avatar, c.cls
  from counted c
  order by 1, c.last_earned, c.name
  limit least(greatest(coalesce(max_rows, 20), 1), 50)
$$;

revoke all on function public.leaderboard_top(int) from public, anon, authenticated;
grant execute on function public.leaderboard_top(int) to anon, authenticated;
