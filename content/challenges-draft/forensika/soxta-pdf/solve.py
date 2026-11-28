import base64
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
TARGET_FILE = CHALLENGE_DIR / "files" / "hujjat.pdf"


def main() -> None:
    raw = TARGET_FILE.read_bytes()
    if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        raise SystemExit("Expected PNG magic bytes")
    match = re.search(rb"FAKEPDF_B64=([A-Za-z0-9+/=]+)", raw)
    if not match:
        raise SystemExit("FAKEPDF_B64 not found")
    print(base64.b64decode(match.group(1)).decode("utf-8"))


if __name__ == "__main__":
    main()
