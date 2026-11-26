-- Milestone 1: Profiles table with strict Row-Level Security (RLS)
-- Run this SQL in the Supabase Dashboard -> SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  class_name text,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username ~ '^[a-z][a-z0-9_-]{2,19}$'
  ),
  constraint profiles_username_not_reserved check (
    username not in ('root', 'admin', 'mehmon', 'system', 'guest')
  ),
  constraint profiles_display_name_length check (
    char_length(trim(display_name)) between 1 and 50
  )
);

-- Keep updated_at current on row edits
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Lock privileged columns (role, xp, level, created_at) against direct API writes.
-- Students talk to the database as the Postgres role "anon" or "authenticated".
-- Those roles may NOT change these columns; only trusted code can:
--   * the Dashboard SQL Editor (runs as "postgres")
--   * the service_role key (server only, never in the browser)
--   * future SECURITY DEFINER functions, e.g. awarding XP after a verified flag
--     (inside them current_user is the function owner, not "authenticated")
drop trigger if exists profiles_prevent_role_change on public.profiles;
drop function if exists public.prevent_role_self_escalation();

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A new profile always starts from zero, whatever the browser sent
    new.role := 'student';
    new.xp := 0;
    new.level := 1;
    new.created_at := now();
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       or new.xp is distinct from old.xp
       or new.level is distinct from old.level
       or new.created_at is distinct from old.created_at then
      raise exception 'role, xp, level and created_at cannot be changed directly';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;
create trigger profiles_protect_privileged_columns
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileged_columns();

-- Automatically create a student profile on email signup when valid metadata is provided
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_username text;
  meta_display_name text;
begin
  meta_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  meta_display_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if meta_username ~ '^[a-z][a-z0-9_-]{2,19}$'
     and meta_username not in ('root', 'admin', 'mehmon', 'system', 'guest')
     and char_length(meta_display_name) between 1 and 50 then
    insert into public.profiles (id, username, display_name, role)
    values (new.id, meta_username, meta_display_name, 'student')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Enable Row-Level Security (required on EVERY table)
alter table public.profiles enable row level security;

-- Users can read ONLY their own private profile (protects minors' display_name and class_name)
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Users can create ONLY their own profile as a student
drop policy if exists "Users can insert own student profile" on public.profiles;
create policy "Users can insert own student profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and role = 'student'
  );

-- Users can update ONLY their own profile (role/xp/level lock is enforced by trigger)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Safe username availability check (returns boolean only; never exposes user rows)
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    candidate ~ '^[a-z][a-z0-9_-]{2,19}$'
    and candidate not in ('root', 'admin', 'mehmon', 'system', 'guest')
    and not exists (
      select 1 from public.profiles where username = candidate
    );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- Safe public profile lookup (returns ONLY public non-PII fields)
create or replace function public.get_public_profile(target_username text)
returns table (
  username text,
  level integer,
  xp integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.username, p.level, p.xp, p.created_at
  from public.profiles p
  where p.username = target_username;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;
