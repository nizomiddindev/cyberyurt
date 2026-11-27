import base64
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
PNG_FILE = CHALLENGE_DIR / "files" / "rasm.png"


def main() -> None:
    raw = PNG_FILE.read_bytes()
    match = re.search(rb"SECRET_B64=([A-Za-z0-9+/=]+)", raw)
    if not match:
        raise SystemExit("SECRET_B64 not found")
    decoded = base64.b64decode(match.group(1)).decode("utf-8")
    print(decoded)


if __name__ == "__main__":
    main()
