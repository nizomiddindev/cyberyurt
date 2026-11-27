import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["salom-base64"].strip()
    encoded = base64.b64encode(flag.encode("utf-8")).decode("ascii")
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "xabar.txt").write_text(f"{encoded}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
