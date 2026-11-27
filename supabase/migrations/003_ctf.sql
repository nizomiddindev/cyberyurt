-- Milestone 4: CTF challenges (hashes only), rate-limited flag checks,
-- solves, and hint unlocks with strict Row-Level Security (RLS).
-- Run this SQL in the Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto with schema extensions;

-- 1. Challenge registry (stores ONLY SHA-256 hashes, NEVER plaintext flags)
create table if not exists public.ctf_challenges (
  slug text primary key,
  flag_sha256 text not null check (flag_sha256 ~ '^[0-9a-f]{64}$'),
  points integer not null check (points > 0),
  hints_json jsonb not null default '[]'::jsonb
);

-- RLS enabled with NO client policies: anon/authenticated cannot read or write directly.
alter table public.ctf_challenges enable row level security;

-- Seed the 5 Milestone 4 easy challenges (SHA-256 hashes only)
insert into public.ctf_challenges (slug, flag_sha256, points, hints_json)
values
  (
    'salom-base64',
    '4d095e7918ea6aa269d4576c52d550114af896408a872b997f11c51a96bc07a7',
    100,
    '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb
  ),
  (
    'sezar-shifri',
    '427b83d717b41b5c542eba8bc9342f81855b4fd6fd4f5f2474cd8c211fdd9f93',
    100,
    '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb
  ),
  (
    'yashirin-fayl',
    '4ab6c5e32a7b09808a561a995dce27554e6013d9d81ce14bcf7fb6552144932d',
    100,
    '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb
  ),
  (
    'log-ichida',
    'f3a5fa0735ab55e12bfdfaf048d0ed5822174d07e5ce93d36a89163199414706',
    100,
    '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb
  ),
  (
    'sirli-rasm',
    '3dd1c560e2fcd399689b403eb45d0bf18df05b922506e0f24ce4b06c584aea5c',
    150,
    '[{"id":"h1","cost":25},{"id":"h2","cost":35}]'::jsonb
  )
on conflict (slug) do update set
  flag_sha256 = excluded.flag_sha256,
  points = excluded.points,
  hints_json = excluded.hints_json;

-- 2. Flag submission attempts (used for durable 5/minute/user rate limiting)
create table if not exists public.challenge_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_slug text not null references public.ctf_challenges (slug) on delete cascade,
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_challenge_attempts_user_time
  on public.challenge_attempts (user_id, attempted_at desc);

alter table public.challenge_attempts enable row level security;

drop policy if exists "Users can read own attempts" on public.challenge_attempts;
create policy "Users can read own attempts"
  on public.challenge_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 3. Solved challenges (read-only for students; written ONLY by submit_ctf_flag)
create table if not exists public.challenge_solves (
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_slug text not null references public.ctf_challenges (slug) on delete cascade,
  points_awarded integer not null check (points_awarded >= 0),
  solved_at timestamptz not null default now(),
  primary key (user_id, challenge_slug)
);

alter table public.challenge_solves enable row level security;

drop policy if exists "Users can read own solves" on public.challenge_solves;
create policy "Users can read own solves"
  on public.challenge_solves
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 4. Unlocked hints (read-only for students; written ONLY by unlock_ctf_hint)
create table if not exists public.challenge_hint_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_slug text not null references public.ctf_challenges (slug) on delete cascade,
  hint_id text not null,
  cost integer not null check (cost >= 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, challenge_slug, hint_id)
);

alter table public.challenge_hint_unlocks enable row level security;

drop policy if exists "Users can read own hint unlocks" on public.challenge_hint_unlocks;
create policy "Users can read own hint unlocks"
  on public.challenge_hint_unlocks
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 5. SECURITY DEFINER function: unlock a hint using server-known cost
create or replace function public.unlock_ctf_hint(
  p_slug text,
  p_hint_id text
)
returns table (
  status text,
  cost integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hints jsonb;
  v_cost integer;
begin
  if v_uid is null then
    return query select 'unauthorized'::text, 0;
    return;
  end if;

  select c.hints_json into v_hints
  from public.ctf_challenges c
  where c.slug = p_slug;

  if v_hints is null then
    return query select 'not_found'::text, 0;
    return;
  end if;

  select (elem ->> 'cost')::integer into v_cost
  from jsonb_array_elements(v_hints) as elem
  where elem ->> 'id' = p_hint_id
  limit 1;

  if v_cost is null then
    return query select 'not_found'::text, 0;
    return;
  end if;

  insert into public.challenge_hint_unlocks (user_id, challenge_slug, hint_id, cost)
  values (v_uid, p_slug, p_hint_id, v_cost)
  on conflict (user_id, challenge_slug, hint_id) do nothing;

  return query select 'unlocked'::text, v_cost;
end;
$$;

revoke all on function public.unlock_ctf_hint(text, text) from public, anon;
grant execute on function public.unlock_ctf_hint(text, text) to authenticated;

-- 6. SECURITY DEFINER function: hash p_flag inside Postgres, enforce 5/min limit, award points
-- Note: hashes are public in GitHub, so this function accepts plaintext p_flag (never a hash)
-- and computes SHA-256 itself to prevent pass-the-hash from the browser console.
drop function if exists public.submit_ctf_flag(text, text);

create or replace function public.submit_ctf_flag(
  p_slug text,
  p_flag text
)
returns table (
  status text,
  points_awarded integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_expected_hash text;
  v_submitted_hash text;
  v_base_points integer;
  v_recent_attempts integer;
  v_hint_cost integer;
  v_awarded integer;
  v_already_solved boolean;
begin
  if v_uid is null then
    return query select 'unauthorized'::text, 0;
    return;
  end if;

  if p_flag is null or char_length(p_flag) > 200 or char_length(trim(p_flag)) = 0 then
    return query select 'wrong'::text, 0;
    return;
  end if;

  select c.flag_sha256, c.points into v_expected_hash, v_base_points
  from public.ctf_challenges c
  where c.slug = p_slug;

  if v_expected_hash is null then
    return query select 'not_found'::text, 0;
    return;
  end if;

  -- Enforce max 5 attempts per minute per user
  select count(*) into v_recent_attempts
  from public.challenge_attempts a
  where a.user_id = v_uid
    and a.attempted_at > now() - interval '60 seconds';

  if v_recent_attempts >= 5 then
    return query select 'rate_limited'::text, 0;
    return;
  end if;

  -- Check if already solved
  select exists (
    select 1 from public.challenge_solves s
    where s.user_id = v_uid and s.challenge_slug = p_slug
  ) into v_already_solved;

  if v_already_solved then
    return query select 'already_solved'::text, 0;
    return;
  end if;

  v_submitted_hash := encode(extensions.digest(trim(p_flag), 'sha256'), 'hex');

  if v_submitted_hash <> v_expected_hash then
    insert into public.challenge_attempts (user_id, challenge_slug, is_correct)
    values (v_uid, p_slug, false);
    return query select 'wrong'::text, 0;
    return;
  end if;

  -- Correct flag: log attempt, subtract unlocked hint costs, record solve, add XP
  insert into public.challenge_attempts (user_id, challenge_slug, is_correct)
  values (v_uid, p_slug, true);

  select coalesce(sum(h.cost), 0) into v_hint_cost
  from public.challenge_hint_unlocks h
  where h.user_id = v_uid and h.challenge_slug = p_slug;

  v_awarded := greatest(0, v_base_points - v_hint_cost);

  insert into public.challenge_solves (user_id, challenge_slug, points_awarded)
  values (v_uid, p_slug, v_awarded)
  on conflict (user_id, challenge_slug) do nothing;

  update public.profiles
  set xp = xp + v_awarded
  where id = v_uid;

  return query select 'correct'::text, v_awarded;
end;
$$;

revoke all on function public.submit_ctf_flag(text, text) from public, anon;
grant execute on function public.submit_ctf_flag(text, text) to authenticated;
