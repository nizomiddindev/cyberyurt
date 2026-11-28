import ast
import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
SCRIPT_FILE = CHALLENGE_DIR / "files" / "tekshir.py"


def main() -> None:
    src = SCRIPT_FILE.read_text(encoding="utf-8")
    shift_m = re.search(r"SHIFT\s*=\s*(\d+)", src)
    target_m = re.search(r"TARGET\s*=\s*(\[[0-9,\s]+\])", src)
    if not shift_m or not target_m:
        raise SystemExit("Could not parse SHIFT or TARGET")
    shift = int(shift_m.group(1))
    target = ast.literal_eval(target_m.group(1))
    print("".join(chr(val - shift) for val in target))


if __name__ == "__main__":
    main()
