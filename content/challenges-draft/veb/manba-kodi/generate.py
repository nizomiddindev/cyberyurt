import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["manba-kodi"].strip()
    encoded = base64.b64encode(flag.encode("utf-8")).decode("ascii")

    html = f"""<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <title>Maktab portali</title>
</head>
<body>
  <header>
    <h1>Maktab yangiliklari</h1>
  </header>
  <main>
    <p>Haftalik dars jadvali tez orada yangilanadi.</p>
    <!-- TODO: sinov kalitini olib tashlash kerak: ADMIN_NOTE={encoded} -->
  </main>
  <footer>2026 Guliston</footer>
</body>
</html>
"""
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "index.html").write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main()
