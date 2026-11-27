import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["log-ichida"].strip()
    hex_token = flag.encode("utf-8").hex()

    lines = []
    for i in range(1, 46):
        if i == 29:
            lines.append(
                f"2026-11-27 03:14:29 ALERT user=unknown token={hex_token}"
            )
        elif i % 7 == 0:
            lines.append(
                f"2026-11-27 03:14:{i:02d} WARN auth retry from 10.0.0.{i}"
            )
        else:
            lines.append(
                f"2026-11-27 03:14:{i:02d} INFO healthcheck status=ok seq={i}"
            )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "tizim.log").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
