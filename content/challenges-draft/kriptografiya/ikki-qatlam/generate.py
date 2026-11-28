import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["ikki-qatlam"].strip()
    b64 = base64.b64encode(flag.encode("utf-8"))
    hex_str = b64.hex()

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "shifr.txt").write_text(f"{hex_str}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
