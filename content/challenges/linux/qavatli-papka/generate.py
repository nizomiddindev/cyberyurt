import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["qavatli-papka"].strip()
    reversed_hex = flag.encode("utf-8").hex()[::-1]

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "muhit.conf").write_text(
        "APP_ENV=pilot\n"
        "LOG_LEVEL=info\n"
        "TARGET_FILE=arxiv_02.dat\n"
        "TARGET_MARKER=REVHEX:\n",
        encoding="utf-8",
    )
    (FILES_DIR / "arxiv_01.dat").write_text(
        "\n".join(f"ENTRY_{i:02d}=00ffaa{i:02x}" for i in range(1, 25)) + "\n",
        encoding="utf-8",
    )
    lines = [f"ENTRY_{i:02d}=aa11bb{i:02x}" for i in range(1, 30)]
    lines.insert(17, f"REVHEX:{reversed_hex}")
    (FILES_DIR / "arxiv_02.dat").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
