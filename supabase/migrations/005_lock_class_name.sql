-- Pilot decision: no classes yet (see docs/DECISIONS.md).
-- Run this SQL in the Supabase Dashboard -> SQL Editor AFTER 004_xp_leaderboard.sql.
--
-- Why: profiles.class_name was still editable by the student (own-row update policy).
-- A stranger could set any class name from the browser console and see that
-- "class" leaderboard, linking usernames to a real class or school.
-- After this file:
--   * students (Postgres roles anon / authenticated) can no longer set class_name;
--     only the SQL Editor, the service_role key, or future SECURITY DEFINER teacher
--     tools (join codes) can.
--   * get_leaderboard_class can no longer be called from the browser at all.

-- 1. Same trigger function as 001, plus class_name in the locked columns.
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
    new.class_name := null;
    new.created_at := now();
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       or new.xp is distinct from old.xp
       or new.level is distinct from old.level
       or new.class_name is distinct from old.class_name
       or new.created_at is distinct from old.created_at then
      raise exception 'role, xp, level, class_name and created_at cannot be changed directly';
    end if;
  end if;

  return new;
end;
$$;

-- 2. The "Sinfim" tab is removed from the site; close its function too.
revoke all on function public.get_leaderboard_class(integer) from public, anon, authenticated;
