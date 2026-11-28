import base64
import json
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
HTTP_FILE = CHALLENGE_DIR / "files" / "javob.http"


def b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def main() -> None:
    text = HTTP_FILE.read_text(encoding="utf-8")
    match = re.search(r"Set-Cookie:\s*session=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)", text)
    if not match:
        raise SystemExit("JWT cookie not found")
    payload_part = match.group(1).split(".")[1]
    payload = json.loads(b64url_decode(payload_part).decode("utf-8"))
    print(bytes.fromhex(payload["debug_hex"]).decode("utf-8"))


if __name__ == "__main__":
    main()
