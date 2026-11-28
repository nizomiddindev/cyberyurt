import base64
from collections import Counter
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
INPUT_FILE = CHALLENGE_DIR / "files" / "kodlar.txt"


def main() -> None:
    lines = [line.strip() for line in INPUT_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]
    counts = Counter(lines)
    unique = [line for line, c in counts.items() if c == 1]
    if len(unique) != 1:
        raise SystemExit(f"Expected 1 unique line, found {len(unique)}")
    print(base64.b64decode(unique[0]).decode("utf-8"))


if __name__ == "__main__":
    main()
