-- Checks the leaderboard migration: ranking, the hide switch, what leaves the database, and who may call what.
-- Run it after the accounts migration and the leaderboard migration are applied. Everything is rolled back.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.invalid'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.invalid'),
  ('00000000-0000-0000-0000-00000000000e', 'e@test.invalid'),
  ('00000000-0000-0000-0000-00000000000f', 'f@test.invalid');
insert into public.profiles (user_id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Alice'),
  ('00000000-0000-0000-0000-00000000000b', 'Bobby'),
  ('00000000-0000-0000-0000-00000000000c', 'Carol'),
  ('00000000-0000-0000-0000-00000000000d', 'Dave'),
  ('00000000-0000-0000-0000-00000000000e', 'Erin');
-- A and B have 3 badges (A finished earlier), C has 1, D has 2 and hides, E has none. F has no profile.
insert into public.badges (user_id, chest, question_id, answer, earned_at) values
  ('00000000-0000-0000-0000-00000000000a', 'chest-sql', 'q', 'a', '2026-01-01'),
  ('00000000-0000-0000-0000-00000000000a', 'chest-css', 'q', 'a', '2026-01-02'),
  ('00000000-0000-0000-0000-00000000000a', 'chest-js',  'q', 'a', '2026-01-03'),
  ('00000000-0000-0000-0000-00000000000b', 'chest-sql', 'q', 'a', '2026-02-01'),
  ('00000000-0000-0000-0000-00000000000b', 'chest-css', 'q', 'a', '2026-02-02'),
  ('00000000-0000-0000-0000-00000000000b', 'chest-js',  'q', 'a', '2026-02-03'),
  ('00000000-0000-0000-0000-00000000000c', 'chest-sql', 'q', 'a', '2026-03-01'),
  ('00000000-0000-0000-0000-00000000000d', 'chest-sql', 'q', 'a', '2026-04-01'),
  ('00000000-0000-0000-0000-00000000000d', 'chest-css', 'q', 'a', '2026-04-02');
insert into public.leaderboard_hidden (user_id) values ('00000000-0000-0000-0000-00000000000d');

-- The functions are definer functions with a fixed search path.
do $$
declare f record;
begin
  for f in select p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('leaderboard_top', 'leaderboard_me') loop
    if not f.prosecdef then raise exception '% is not security definer', f.proname; end if;
    if f.proconfig is null or not exists (select 1 from unnest(f.proconfig) c where c like 'search_path=%') then
      raise exception '% has no fixed search_path', f.proname;
    end if;
  end loop;
end $$;

-- Signed out: the list works; nothing else does.
set local role anon;
do $$
declare j jsonb; names text; n int;
begin
  select string_agg(rank || ':' || name || ':' || badges, ',' order by rank, last_earned, name) into names from public.leaderboard_top();
  if names is distinct from '1:Alice:3,1:Bobby:3,3:Carol:1' then raise exception 'wrong list: %', names; end if;

  -- Only these four columns leave the database.
  select to_jsonb(t) into j from public.leaderboard_top(1) t;
  if (select array_agg(k order by k) from jsonb_object_keys(j) k) is distinct from array['badges', 'last_earned', 'name', 'rank'] then
    raise exception 'unexpected columns';
  end if;

  begin
    perform * from public.leaderboard_me();
    raise exception 'anon called leaderboard_me';
  exception when insufficient_privilege then null; end;

  -- The tables stay closed: a denial or an empty result are both fine.
  begin
    select count(*) into n from public.profiles; if n <> 0 then raise exception 'anon can read profiles'; end if;
    select count(*) into n from public.badges; if n <> 0 then raise exception 'anon can read badges'; end if;
    select count(*) into n from public.leaderboard_hidden; if n <> 0 then raise exception 'anon can read the hidden list'; end if;
  exception when insufficient_privilege then null; end;
end $$;

-- max_rows is clamped: 0 and negatives give one row, null gives the default.
do $$
begin
  if (select count(*) from public.leaderboard_top(0)) <> 1 then raise exception 'top(0)'; end if;
  if (select count(*) from public.leaderboard_top(-5)) <> 1 then raise exception 'top(-5)'; end if;
  if (select count(*) from public.leaderboard_top(null)) <> 3 then raise exception 'top(null)'; end if;
end $$;

-- A search path trick cannot change what the function reads.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
begin
  create temp view profiles as select '00000000-0000-0000-0000-00000000000e'::uuid as user_id, 'Mallory'::text as name;
  set local search_path = pg_temp, public;
  if exists (select 1 from public.leaderboard_top() where name = 'Mallory') then raise exception 'the function read a shadow table'; end if;
  set local search_path = public;
end $$;

-- Signed-in callers: their own rank, with or without badges, hidden or not.
do $$
declare r record;
begin
  select * into r from public.leaderboard_me();
  if (r.rank, r.badges, r.hidden) is distinct from (1::bigint, 3, false) then raise exception 'A: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
do $$
declare r record;
begin
  select * into r from public.leaderboard_me();
  if (r.rank, r.badges, r.hidden) is distinct from (3::bigint, 2, true) then raise exception 'D: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true);
do $$
declare r record;
begin
  select * into r from public.leaderboard_me();
  if r.rank is not null or r.badges <> 0 or r.hidden then raise exception 'E: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', true);
do $$
begin
  if exists (select 1 from public.leaderboard_me()) then raise exception 'a user without a profile got a row'; end if;
end $$;

-- The hide switch is the player's own, and only theirs.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
declare n int;
begin
  begin
    insert into public.leaderboard_hidden (user_id) values ('00000000-0000-0000-0000-00000000000b');
    raise exception 'A hid B';
  exception when insufficient_privilege then null; end;
  delete from public.leaderboard_hidden where user_id = '00000000-0000-0000-0000-00000000000d'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'A unhid D'; end if;
  if (select count(*) from public.leaderboard_hidden) <> 0 then raise exception 'A can read the hidden list'; end if;

  insert into public.leaderboard_hidden (user_id) values ('00000000-0000-0000-0000-00000000000a');
  if exists (select 1 from public.leaderboard_top() where name = 'Alice') then raise exception 'A hid themself but is still listed'; end if;
  if not (select hidden from public.leaderboard_me()) then raise exception 'A is hidden but me says not'; end if;
  delete from public.leaderboard_hidden where user_id = '00000000-0000-0000-0000-00000000000a'; get diagnostics n = row_count;
  if n <> 1 then raise exception 'A could not unhide'; end if;
  if not exists (select 1 from public.leaderboard_top() where name = 'Alice') then raise exception 'A unhid but is not listed'; end if;
end $$;

-- A long list is cut at 20 by default and at 50 at most.
reset role;
insert into auth.users (id, email) select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@test.invalid' from generate_series(1, 60) g;
insert into public.profiles (user_id, name) select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'Pl' || g from generate_series(1, 60) g;
insert into public.badges (user_id, chest, question_id, answer) select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'chest-sql', 'q', 'a' from generate_series(1, 60) g;
set local role anon;
do $$
begin
  if (select count(*) from public.leaderboard_top()) <> 20 then raise exception 'default is not 20'; end if;
  if (select count(*) from public.leaderboard_top(1000)) <> 50 then raise exception 'top(1000) is not 50'; end if;
end $$;

rollback;
select 'leaderboard.sql: all checks passed' as result;
