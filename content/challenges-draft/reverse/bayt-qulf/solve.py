import ast
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
SCRIPT_FILE = CHALLENGE_DIR / "files" / "qulf.py"


def main() -> None:
    src = SCRIPT_FILE.read_text(encoding="utf-8")
    m = re.search(r"EXPECTED\s*=\s*(\[[0-9,\s]+\])", src)
    if not m:
        raise SystemExit("EXPECTED array not found")
    expected = ast.literal_eval(m.group(1))
    rev_bytes = bytes(
        ((val - 5) % 256) ^ ((i * 3 + 11) % 256) for i, val in enumerate(expected)
    )
    print(rev_bytes[::-1].decode("utf-8"))


if __name__ == "__main__":
    main()
