import base64
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
INPUT_FILE = CHALLENGE_DIR / "files" / "xabar.txt"


def main() -> None:
    encoded = INPUT_FILE.read_text(encoding="utf-8").strip()
    decoded = base64.b64decode(encoded).decode("utf-8")
    print(decoded)


if __name__ == "__main__":
    main()
