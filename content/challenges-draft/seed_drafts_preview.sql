-- Preview SQL for promoting drafts from content/challenges-draft/ into Supabase.
-- Do NOT run until you move the matching challenge folders into content/challenges/.
-- Contains ONLY SHA-256 hashes (never plaintext flags).

insert into public.ctf_challenges (slug, flag_sha256, points, hints_json)
values
  ('ikki-qatlam', 'c778bf6d5059376202ea64fd41b8f2cd362ea43542d3f89d1590717c5c07a368', 150, '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb),
  ('xor-kalit', 'a27d31269bea03d3f774086ff2e7afeef6ceb413ace2c8e600f7a26dc853249d', 250, '[{"id":"h1","cost":30},{"id":"h2","cost":50}]'::jsonb),
  ('soxta-pdf', '3d52c3af083ddb19065b64c5adf501b01cfcb121d29ace17cc05740094aaf5b4', 150, '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb),
  ('ochirilgan-iz', 'a2872441feed13f4b5db5b1b60f949eacf3f8771969e58e1d49daca0ad29b879', 350, '[{"id":"h1","cost":40},{"id":"h2","cost":60}]'::jsonb),
  ('satr-sanash', '1d29df7e7616c2b16f02029905c26fa83ad52ee4cad0314ed7c242fee485fc4e', 100, '[{"id":"h1","cost":20},{"id":"h2","cost":25}]'::jsonb),
  ('qavatli-papka', 'c562a561f0cd3bc90e04d86e399317935224d506c78c490b839b04dc44a074ab', 200, '[{"id":"h1","cost":30},{"id":"h2","cost":45}]'::jsonb),
  ('manba-kodi', '92bc156fd03d5e62bb9cc7b90c8753468c15b6eec404bf594cb6adb8ab9f07ff', 100, '[{"id":"h1","cost":20},{"id":"h2","cost":25}]'::jsonb),
  ('cookie-siri', 'ee20727b7bac9f842c67918fd9962a161e0d00508bcbf815fdbdee6a396ee938', 250, '[{"id":"h1","cost":30},{"id":"h2","cost":50}]'::jsonb),
  ('foto-manzil', '8636c97a51558ded9ea9514fa302609c6cfa851dfcd12f95b949f04f475b1cf9', 150, '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb),
  ('domen-tarixi', '03effb1f7c550b7ad7551e799dd5ec509721d3a2f0206dc0345784046a7037a2', 250, '[{"id":"h1","cost":30},{"id":"h2","cost":45}]'::jsonb),
  ('http-trafik', '129b49b099d4372435b46dcdcac705bbeaf19c5e1063e36b94f442cb0465c032', 200, '[{"id":"h1","cost":25},{"id":"h2","cost":40}]'::jsonb),
  ('dns-tunel', 'b14fed024cc3b83d6405677d2f6a069849aadb2f9d79bd58058ef22babeecdd2', 350, '[{"id":"h1","cost":40},{"id":"h2","cost":60}]'::jsonb),
  ('oddiy-tekshiruv', 'c5618b8279db3b11d2758ee43ee5881e82f030d0e3865c228c410505f76bbf05', 250, '[{"id":"h1","cost":30},{"id":"h2","cost":45}]'::jsonb),
  ('bayt-qulf', '67af952ac258a48a49b9fab9152f32a7667b8ccece02ff55173152031b13e2aa', 400, '[{"id":"h1","cost":50},{"id":"h2","cost":75}]'::jsonb),
  ('soxta-xat', '6282af2ed17e42dbc313396966ddea21cfcb0ee5cada6c992538b020ed907b7a', 150, '[{"id":"h1","cost":20},{"id":"h2","cost":30}]'::jsonb),
  ('aldovchi-havola', 'dc6671d8b2559094277ddae127ddfc857716727cf8f7186122f449f9146227c3', 300, '[{"id":"h1","cost":40},{"id":"h2","cost":60}]'::jsonb)
on conflict (slug) do update set
  flag_sha256 = excluded.flag_sha256,
  points = excluded.points,
  hints_json = excluded.hints_json;
