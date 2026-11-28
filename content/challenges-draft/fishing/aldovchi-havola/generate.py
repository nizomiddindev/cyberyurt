import base64
import json
from pathlib import Path
from urllib.parse import quote

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["aldovchi-havola"].strip()

    # Layer 1: hex -> Layer 2: base64 -> Layer 3: URL-encoded query param inside phishing page
    b64_payload = base64.b64encode(flag.encode("utf-8").hex().encode("ascii")).decode("ascii")
    url_param = quote(b64_payload, safe="")

    html = f"""<!doctype html>
<html lang="uz">
<head><meta charset="utf-8" /><title>Sovrin olish</title></head>
<body>
  <h1>Tabriklaymiz! Telefon yutib oldingiz!</h1>
  <p>Xavfsizlik eslatmasi: bu faqat o‘quv namunasi, havolalar ishlamaydi.</p>
  <script>
    // Hujumchi sahifasi ma'lumotni yashirin parametr orqali yuboradi
    const fakeRedirect = "https://prize-claim.example/step?next=%2Flogin&track={url_param}";
  </script>
</body>
</html>
"""
    log = (
        "2026-11-27 11:02:01 BLOCKED url=https://prize-claim.example/step reason=phishing_kit\n"
        "2026-11-27 11:02:02 HINT decode track: URL-decode -> base64 -d -> xxd -r -p\n"
    )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "sahifa.html").write_text(html, encoding="utf-8")
    (FILES_DIR / "redirect.log").write_text(log, encoding="utf-8")


if __name__ == "__main__":
    main()
