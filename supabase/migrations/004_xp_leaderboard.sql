-- Milestone 6: XP + levels, privacy-safe leaderboards (Umumiy, Haftalik, Sinfim),
-- and public profile stats via narrow SECURITY DEFINER functions.
-- Run this SQL in the Supabase Dashboard -> SQL Editor AFTER 003_ctf.sql.
--
-- Privacy rules enforced here:
-- 1. NO broad SELECT policy is added to public.profiles or public.challenge_solves.
-- 2. Leaderboard and public profile RPCs NEVER return display_name, email, class_name, or school.
-- 3. XP and level ONLY change inside SECURITY DEFINER SQL functions (never from lesson_progress).

-- 1. Deterministic level calculation: +1 level every 200 XP (starts at level 1)
create or replace function public.calculate_level(p_xp integer)
returns integer
language sql
immutable
as $$
  select greatest(1, (coalesce(p_xp, 0) / 200) + 1);
$$;

-- Sync existing profile levels with the formula
update public.profiles
set level = public.calculate_level(xp)
where level <> public.calculate_level(xp);

-- 2. Update submit_ctf_flag so verified CTF solves also update profiles.level atomically
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

  -- Correct flag: log attempt, subtract unlocked hint costs, record solve, update XP & level
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
  set
    xp = xp + v_awarded,
    level = public.calculate_level(xp + v_awarded)
  where id = v_uid;

  return query select 'correct'::text, v_awarded;
end;
$$;

revoke all on function public.submit_ctf_flag(text, text) from public, anon;
grant execute on function public.submit_ctf_flag(text, text) to authenticated;

-- 3. Leaderboard: Umumiy (overall top users; username, level, xp, solves only)
create or replace function public.get_leaderboard_overall(p_limit integer default 50)
returns table (
  rank_num bigint,
  username text,
  level integer,
  xp integer,
  solves_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (order by p.xp desc, p.level desc, p.created_at asc) as rank_num,
    p.username,
    p.level,
    p.xp,
    count(s.challenge_slug) as solves_count
  from public.profiles p
  left join public.challenge_solves s on s.user_id = p.id
  group by p.id, p.username, p.level, p.xp, p.created_at
  order by p.xp desc, p.level desc, p.created_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.get_leaderboard_overall(integer) from public;
grant execute on function public.get_leaderboard_overall(integer) to anon, authenticated;

-- 4. Leaderboard: Haftalik (last 7 days verified CTF solves only)
create or replace function public.get_leaderboard_weekly(p_limit integer default 50)
returns table (
  rank_num bigint,
  username text,
  level integer,
  xp integer,
  solves_count bigint
)
language sql
security definer
set search_path = public
as $$
  with weekly as (
    select
      s.user_id,
      coalesce(sum(s.points_awarded), 0)::integer as weekly_xp,
      count(s.challenge_slug) as weekly_solves,
      min(s.solved_at) as first_solve_at
    from public.challenge_solves s
    where s.solved_at >= now() - interval '7 days'
    group by s.user_id
  )
  select
    row_number() over (order by w.weekly_xp desc, w.first_solve_at asc) as rank_num,
    p.username,
    p.level,
    w.weekly_xp as xp,
    w.weekly_solves as solves_count
  from weekly w
  join public.profiles p on p.id = w.user_id
  where w.weekly_xp > 0
  order by w.weekly_xp desc, w.first_solve_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.get_leaderboard_weekly(integer) from public;
grant execute on function public.get_leaderboard_weekly(integer) to anon, authenticated;

-- 5. Leaderboard: Sinfim (students in the viewer's own class ONLY; username/level/xp/solves only)
create or replace function public.get_leaderboard_class(p_limit integer default 50)
returns table (
  rank_num bigint,
  username text,
  level integer,
  xp integer,
  solves_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_my_class text;
begin
  if v_uid is null then
    return;
  end if;

  select nullif(trim(p.class_name), '') into v_my_class
  from public.profiles p
  where p.id = v_uid;

  if v_my_class is null then
    return;
  end if;

  return query
  select
    row_number() over (order by p.xp desc, p.level desc, p.created_at asc) as rank_num,
    p.username,
    p.level,
    p.xp,
    count(s.challenge_slug) as solves_count
  from public.profiles p
  left join public.challenge_solves s on s.user_id = p.id
  where p.role = 'student'
    and nullif(trim(p.class_name), '') = v_my_class
  group by p.id, p.username, p.level, p.xp, p.created_at
  order by p.xp desc, p.level desc, p.created_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

revoke all on function public.get_leaderboard_class(integer) from public, anon;
grant execute on function public.get_leaderboard_class(integer) to authenticated;

-- 6. Public profile stats (ONLY username, level, xp, solves_count, solved_slugs, created_at)
create or replace function public.get_public_profile_stats(target_username text)
returns table (
  username text,
  level integer,
  xp integer,
  solves_count bigint,
  solved_slugs text[],
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.username,
    p.level,
    p.xp,
    count(s.challenge_slug) as solves_count,
    coalesce(
      array_agg(s.challenge_slug order by s.solved_at asc)
        filter (where s.challenge_slug is not null),
      array[]::text[]
    ) as solved_slugs,
    p.created_at
  from public.profiles p
  left join public.challenge_solves s on s.user_id = p.id
  where p.username = target_username
  group by p.id, p.username, p.level, p.xp, p.created_at;
$$;

revoke all on function public.get_public_profile_stats(text) from public;
grant execute on function public.get_public_profile_stats(text) to anon, authenticated;
