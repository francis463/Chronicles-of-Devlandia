-- Checks the avatars migration: who may start, clear and see a photo, what the leaderboard shows, and the storage rules.
-- Run it after the accounts, leaderboard and avatars migrations are applied. Everything is rolled back.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.invalid');
insert into public.profiles (user_id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Alice'),
  ('00000000-0000-0000-0000-00000000000b', 'Bobby');
insert into public.badges (user_id, chest, question_id, answer) values
  ('00000000-0000-0000-0000-00000000000a', 'chest-sql', 'q', 'a'),
  ('00000000-0000-0000-0000-00000000000b', 'chest-sql', 'q', 'a');

-- The bucket is public, JPEG only and small.
do $$
declare b record;
begin
  select * into b from storage.buckets where id = 'avatars';
  if b.id is null or not b.public or b.file_size_limit > 102400 or b.allowed_mime_types is distinct from array['image/jpeg'] then
    raise exception 'avatars bucket is wrong';
  end if;
end $$;

-- A guest cannot start or clear a photo; a user without a profile cannot start one.
set local role anon;
do $$
begin
  begin perform * from public.avatar_start(); raise exception 'anon started a photo';
  exception when insufficient_privilege then null; end;
  begin perform * from public.avatar_clear(); raise exception 'anon cleared a photo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$
begin
  begin perform * from public.avatar_start(); raise exception 'a user with no profile started a photo';
  exception when insufficient_privilege then null; end;
end $$;

-- A starts a photo, then replaces it: the second call hands back the first key.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
declare k1 uuid; k2 uuid; old2 uuid; old1 uuid; changed int;
begin
  select new_key, old_key into k1, old1 from public.avatar_start();
  if k1 is null or old1 is not null then raise exception 'first start is wrong'; end if;
  select new_key, old_key into k2, old2 from public.avatar_start();
  if k2 = k1 or old2 is distinct from k1 then raise exception 'second start did not rotate the key'; end if;
  -- Nobody can write the avatars table directly.
  begin insert into public.avatars (user_id) values ('00000000-0000-0000-0000-00000000000b'); raise exception 'direct insert worked';
  exception when insufficient_privilege then null; end;
  update public.avatars set key = gen_random_uuid();  -- no update policy, so no row is touched
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'direct update worked'; end if;
  delete from public.avatars;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'direct delete worked'; end if;
end $$;

-- B starts one too. A sees only their own row.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select * from public.avatar_start();
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
begin
  if (select count(*) from public.avatars) <> 1 then raise exception 'A can read other players'' photo rows'; end if;
end $$;

-- Storage: A may add a file only under their own key, never under B's or a made-up one.
do $$
declare mine text; theirs text;
begin
  select key::text into mine from public.avatars;
  insert into storage.objects (bucket_id, name, owner_id) values ('avatars', mine || '.jpg', '00000000-0000-0000-0000-00000000000a');
  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('avatars', gen_random_uuid()::text || '.jpg', '00000000-0000-0000-0000-00000000000a');
    raise exception 'A added a file under a made-up key';
  exception when insufficient_privilege or check_violation then null; end;
end $$;
reset role;
do $$
declare theirs text;
begin
  select key::text into theirs from public.avatars where user_id = '00000000-0000-0000-0000-00000000000b';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('avatars', theirs || '.jpg', '00000000-0000-0000-0000-00000000000a');
    raise exception 'A added a file under B''s key';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- The leaderboard shows the key for a player with a photo; me() shows the caller's own.
reset role;
set local role anon;
do $$
declare a uuid; n int;
begin
  select avatar into a from public.leaderboard_top() where name = 'Alice';
  if a is null then raise exception 'Alice''s photo key is missing from the list'; end if;
  select count(*) into n from public.leaderboard_top() where avatar is not null;
  if n <> 2 then raise exception 'expected 2 photos, got %', n; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
begin
  if (select avatar from public.leaderboard_me()) is distinct from (select key from public.avatars) then raise exception 'me() has the wrong key'; end if;
end $$;

-- A hidden player's photo is not listed.
reset role;
insert into public.leaderboard_hidden (user_id) values ('00000000-0000-0000-0000-00000000000b');
set local role anon;
do $$
begin
  if exists (select 1 from public.leaderboard_top() where name = 'Bobby') then raise exception 'a hidden player is listed'; end if;
end $$;

-- Clearing returns the old key once; a second clear returns nothing.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
begin
  if (select count(*) from public.avatar_clear()) <> 1 then raise exception 'clear did not return the key'; end if;
  if (select count(*) from public.avatar_clear()) <> 0 then raise exception 'second clear returned a key'; end if;
  if (select avatar from public.leaderboard_me()) is not null then raise exception 'me() still has a photo'; end if;
end $$;

rollback;
select 'avatars.sql: all checks passed' as result;
