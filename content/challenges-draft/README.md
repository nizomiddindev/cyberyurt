# CTF Challenge Drafts (`content/challenges-draft/`)

This is a staging folder for new CTF challenges across all 8 CyberYurt categories (`Kriptografiya`, `Forensika`, `Linux`, `Veb`, `OSINT`, `Tarmoq`, `Reverse`, `Fishing`).

Challenges here are **not live** on `/mashq` yet until you review and promote them.

## Security Rule (Public Repo)
- Plaintext flags live **only** in `.flags.local.json` (gitignored).
- Never put a plaintext `KIBER{...}` flag in `challenge.yaml`, `generate.py`, `solve.py`, or `files/`.
- `challenge.yaml` stores only `flag_sha256`.

## Commands
- Validate every draft challenge (`solve.py` hash match + plaintext leak scan):
  ```bash
  npm run validate:drafts
  ```
- Regenerate all draft `files/` from your local `.flags.local.json`:
  ```bash
  python -c "import pathlib, subprocess; [subprocess.run(['python', str(p)], check=True) for p in sorted(pathlib.Path('content/challenges-draft').glob('*/*/generate.py'))]"
  ```

## How to Promote a Draft to Live `/mashq`
1. Move the challenge folder from `content/challenges-draft/<category>/<slug>/` into `content/challenges/<category>/<slug>/`.
2. Add its `slug`, `flag_sha256`, `points`, and `hints_json` row to a new Supabase SQL migration (see `supabase/migrations/003_ctf.sql` for the exact `INSERT ... ON CONFLICT` format, or copy the matching row from `seed_drafts_preview.sql`).
3. Run `npm run validate:challenges && npm test && npm run build`.
