import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["satr-sanash"].strip()
    real_b64 = base64.b64encode(flag.encode("utf-8")).decode("ascii")

    lines = []
    for i in range(1, 65):
        decoy = base64.b64encode(f"sinov_kod_{i:03d}_takror".encode("utf-8")).decode("ascii")
        lines.extend([decoy, decoy, decoy])

    # Insert the single unique line in the middle
    lines.insert(97, real_b64)

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "kodlar.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
