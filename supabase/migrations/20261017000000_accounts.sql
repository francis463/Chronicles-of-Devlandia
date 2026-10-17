-- Accounts and saved badges. See docs/superpowers/specs/2026-10-17-accounts-design.md.
create table public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text not null check (name ~ '^[A-Za-z0-9_-]{3,12}$'),
  -- generated, so a client can't forge the key that makes names unique ignoring case
  name_key   text generated always as (lower(name)) stored unique,
  created_at timestamptz not null default now()
);

create table public.badges (
  user_id     uuid not null references auth.users on delete cascade,
  chest       text not null check (chest in (
    'chest-cpp-1','chest-java','chest-cpp-2','chest-html','chest-css','chest-py-1',
    'chest-php','chest-sql','chest-py-2','chest-cs','chest-js')),
  question_id text not null,
  answer      text not null check (length(answer) <= 200),
  earned_at   timestamptz not null default now(),
  primary key (user_id, chest)
);

alter table public.profiles enable row level security;
alter table public.badges   enable row level security;

-- A player reads and writes only their own rows. There are no update or delete policies.
create policy own_profile_read  on public.profiles for select to authenticated using (user_id = auth.uid());
create policy own_profile_write on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy own_badges_read   on public.badges   for select to authenticated using (user_id = auth.uid());
create policy own_badges_write  on public.badges   for insert to authenticated with check (user_id = auth.uid());
