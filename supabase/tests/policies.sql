-- Checks the row-level rules of the accounts migration. Everything is rolled back.
-- Run it in the Supabase SQL editor (role postgres) or on any Postgres that has the migration applied.
-- It makes three throwaway users, then plays each one with the `authenticated` role.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.invalid');
insert into public.profiles (user_id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Alice'),
  ('00000000-0000-0000-0000-00000000000b', 'Bobby');
insert into public.badges (user_id, chest, question_id, answer) values
  ('00000000-0000-0000-0000-00000000000b', 'chest-sql', 'sql-from', 'FROM');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);

do $$
declare n int;
begin
  -- A sees only A's own rows.
  if (select count(*) from public.profiles) <> 1 then raise exception 'A can read other profiles'; end if;
  if (select count(*) from public.badges) <> 0 then raise exception 'A can read B''s badges'; end if;

  -- A cannot write rows that belong to B.
  begin
    insert into public.badges (user_id, chest, question_id, answer) values ('00000000-0000-0000-0000-00000000000b', 'chest-css', 'q', 'a');
    raise exception 'A inserted a badge for B';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.profiles (user_id, name) values ('00000000-0000-0000-0000-00000000000c', 'Carol');
    raise exception 'A inserted a profile for C';
  exception when insufficient_privilege then null; end;

  -- A can save their own badge once; the same chest again, an unknown chest and a long answer are refused.
  insert into public.badges (user_id, chest, question_id, answer) values ('00000000-0000-0000-0000-00000000000a', 'chest-css', 'css-color', 'color');
  begin
    insert into public.badges (user_id, chest, question_id, answer) values ('00000000-0000-0000-0000-00000000000a', 'chest-css', 'x', 'y');
    raise exception 'A saved the same chest twice';
  exception when unique_violation then null; end;
  begin
    insert into public.badges (user_id, chest, question_id, answer) values ('00000000-0000-0000-0000-00000000000a', 'chest-rust', 'x', 'y');
    raise exception 'A saved an unknown chest';
  exception when check_violation then null; end;
  begin
    insert into public.badges (user_id, chest, question_id, answer) values ('00000000-0000-0000-0000-00000000000a', 'chest-js', 'x', repeat('a', 201));
    raise exception 'A saved an over-long answer';
  exception when check_violation then null; end;

  -- Nothing can be changed or removed: updates and deletes touch no rows.
  update public.badges set answer = 'changed'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'A updated badges'; end if;
  delete from public.badges; get diagnostics n = row_count;
  if n <> 0 then raise exception 'A deleted badges'; end if;
  update public.profiles set name = 'Mallory'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'A renamed a profile'; end if;
  delete from public.profiles; get diagnostics n = row_count;
  if n <> 0 then raise exception 'A deleted a profile'; end if;
end $$;

-- C has no profile yet: a name that differs from Bobby's only in case is refused, a name that breaks the rule too.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$
begin
  begin
    insert into public.profiles (user_id, name) values ('00000000-0000-0000-0000-00000000000c', 'BOBBY');
    raise exception 'C took a name that differs only in case';
  exception when unique_violation then null; end;
  begin
    insert into public.profiles (user_id, name) values ('00000000-0000-0000-0000-00000000000c', 'has space');
    raise exception 'C took an invalid name';
  exception when check_violation then null; end;
  insert into public.profiles (user_id, name) values ('00000000-0000-0000-0000-00000000000c', 'Carol');
end $$;

-- Signed out (the anon role) sees nothing.
set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.badges;
    if n <> 0 then raise exception 'anon can read badges'; end if;
    select count(*) into n from public.profiles;
    if n <> 0 then raise exception 'anon can read profiles'; end if;
  exception when insufficient_privilege then null; end;
end $$;

rollback;
select 'policies.sql: all checks passed' as result;
