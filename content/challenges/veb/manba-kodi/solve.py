import base64
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
HTML_FILE = CHALLENGE_DIR / "files" / "index.html"


def main() -> None:
    text = HTML_FILE.read_text(encoding="utf-8")
    match = re.search(r"ADMIN_NOTE=([A-Za-z0-9+/=]+)", text)
    if not match:
        raise SystemExit("ADMIN_NOTE not found")
    print(base64.b64decode(match.group(1)).decode("utf-8"))


if __name__ == "__main__":
    main()
