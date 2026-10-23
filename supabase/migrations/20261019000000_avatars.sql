-- Leaderboard profile photos. Apply after 20261017010000_leaderboards.sql.
-- A photo is a 96x96 JPEG in the public `avatars` bucket, named by a random key (never the user id), so the
-- leaderboard can show it without ever exposing who owns which account. A player's key changes with every new
-- photo, so an old picture is never served from a cache.
create table public.avatars (
  user_id uuid primary key references auth.users on delete cascade,
  key     uuid not null default gen_random_uuid()
);
alter table public.avatars enable row level security;
-- A player reads only their own row. Rows change only through the two functions below.
create policy avatars_read on public.avatars for select to authenticated using (user_id = (select auth.uid()));

-- Gives the caller a fresh key and returns it with the key it replaces (null if there was none).
create function public.avatar_start()
returns table (new_key uuid, old_key uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  prev  uuid;
  fresh uuid := gen_random_uuid();
begin
  if uid is null or not exists (select 1 from public.profiles p where p.user_id = uid) then
    raise exception 'no profile' using errcode = '42501';
  end if;
  select a.key into prev from public.avatars a where a.user_id = uid;
  insert into public.avatars (user_id, key) values (uid, fresh)
    on conflict (user_id) do update set key = excluded.key;
  return query select fresh, prev;
end
$$;

-- Removes the caller's photo row and returns the key it had, so the file can be deleted.
create function public.avatar_clear()
returns table (old_key uuid)
language plpgsql security definer set search_path = ''
as $$
begin
  return query delete from public.avatars a where a.user_id = auth.uid() returning a.key;
end
$$;

-- The bucket: public to read, JPEG only, 50 KB at most (a 96x96 photo is around 10 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 51200, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 51200, allowed_mime_types = array['image/jpeg'];

-- A player may add a file only under the key the server gave them, and see or delete only files they added.
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and exists (
    select 1 from public.avatars a where a.user_id = (select auth.uid()) and a.key::text || '.jpg' = name));
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);

-- The leaderboard functions now also hand out each player's photo key (and the caller's own).
drop function public.leaderboard_top(int);
create function public.leaderboard_top(max_rows int default 20)
returns table (rank bigint, name text, badges int, last_earned timestamptz, avatar uuid)
language sql stable security definer set search_path = ''
as $$
  with counted as (
    select p.name, count(*)::int as badges, max(b.earned_at) as last_earned, a.key as avatar
    from public.profiles p
    join public.badges b on b.user_id = p.user_id
    left join public.avatars a on a.user_id = p.user_id
    where not exists (select 1 from public.leaderboard_hidden h where h.user_id = p.user_id)
    group by p.user_id, p.name, a.key
  )
  select (rank() over (order by c.badges desc))::bigint, c.name, c.badges, c.last_earned, c.avatar
  from counted c
  order by 1, c.last_earned, c.name
  limit least(greatest(coalesce(max_rows, 20), 1), 50)
$$;

drop function public.leaderboard_me();
create function public.leaderboard_me()
returns table (rank bigint, badges int, hidden boolean, avatar uuid)
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
    exists (select 1 from public.leaderboard_hidden h where h.user_id = me.user_id),
    (select a.key from public.avatars a where a.user_id = me.user_id)
  from me
$$;

revoke all on function public.avatar_start() from public, anon, authenticated;
revoke all on function public.avatar_clear() from public, anon, authenticated;
revoke all on function public.leaderboard_top(int) from public, anon, authenticated;
revoke all on function public.leaderboard_me() from public, anon, authenticated;
grant execute on function public.avatar_start() to authenticated;
grant execute on function public.avatar_clear() to authenticated;
grant execute on function public.leaderboard_top(int) to anon, authenticated;
grant execute on function public.leaderboard_me() to authenticated;
