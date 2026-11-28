import base64
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
EML_FILE = CHALLENGE_DIR / "files" / "xat.eml"


def main() -> None:
    text = EML_FILE.read_text(encoding="utf-8")
    match = re.search(r"X-Campaign-Ref:\s*([A-Za-z0-9+/=]+)", text)
    if not match:
        raise SystemExit("X-Campaign-Ref header not found")
    print(base64.b64decode(match.group(1)).decode("utf-8"))


if __name__ == "__main__":
    main()
