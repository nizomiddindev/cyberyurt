import base64
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
EXIF_FILE = CHALLENGE_DIR / "files" / "exif.txt"


def main() -> None:
    text = EXIF_FILE.read_text(encoding="utf-8")
    match = re.search(r"META_B64=([A-Za-z0-9+/=]+)", text)
    if not match:
        raise SystemExit("META_B64 not found")
    print(base64.b64decode(match.group(1)).decode("utf-8"))


if __name__ == "__main__":
    main()
