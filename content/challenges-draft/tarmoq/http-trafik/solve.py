import base64
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
TRAFFIC_FILE = CHALLENGE_DIR / "files" / "trafik.txt"


def main() -> None:
    text = TRAFFIC_FILE.read_text(encoding="utf-8")
    match = re.search(r"Authorization:\s*Basic\s+([A-Za-z0-9+/=]+)", text)
    if not match:
        raise SystemExit("Basic auth header not found")
    decoded = base64.b64decode(match.group(1)).decode("utf-8")
    _, password = decoded.split(":", 1)
    print(password)


if __name__ == "__main__":
    main()
