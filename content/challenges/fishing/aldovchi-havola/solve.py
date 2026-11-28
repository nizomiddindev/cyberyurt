import base64
import re
from pathlib import Path
from urllib.parse import unquote

CHALLENGE_DIR = Path(__file__).resolve().parent
HTML_FILE = CHALLENGE_DIR / "files" / "sahifa.html"


def main() -> None:
    text = HTML_FILE.read_text(encoding="utf-8")
    match = re.search(r"track=([^\"'&\s]+)", text)
    if not match:
        raise SystemExit("track parameter not found")
    b64_str = unquote(match.group(1))
    hex_str = base64.b64decode(b64_str).decode("ascii")
    print(bytes.fromhex(hex_str).decode("utf-8"))


if __name__ == "__main__":
    main()
