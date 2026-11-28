-- Preview SQL for the drafts still in content/challenges-draft/.
-- Do NOT run until you move the matching challenge folders into content/challenges/.
-- Contains ONLY SHA-256 hashes (never plaintext flags).
-- The other 13 drafts were promoted on 2026-11-28 (see supabase/migrations/006_more_challenges.sql).
-- These 3 stay drafts: they need Python/programming, which the browser terminal does not have yet.

insert into public.ctf_challenges (slug, flag_sha256, points, hints_json)
values
  ('xor-kalit', 'a27d31269bea03d3f774086ff2e7afeef6ceb413ace2c8e600f7a26dc853249d', 250, '[{"id":"h1","cost":30},{"id":"h2","cost":50}]'::jsonb),
  ('oddiy-tekshiruv', 'c5618b8279db3b11d2758ee43ee5881e82f030d0e3865c228c410505f76bbf05', 250, '[{"id":"h1","cost":30},{"id":"h2","cost":45}]'::jsonb),
  ('bayt-qulf', '67af952ac258a48a49b9fab9152f32a7667b8ccece02ff55173152031b13e2aa', 400, '[{"id":"h1","cost":50},{"id":"h2","cost":75}]'::jsonb)
on conflict (slug) do update set
  flag_sha256 = excluded.flag_sha256,
  points = excluded.points,
  hints_json = excluded.hints_json;
