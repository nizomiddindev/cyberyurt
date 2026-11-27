import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["yashirin-fayl"].strip()
    hex_payload = flag.encode("utf-8").hex()

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "eslatma.txt").write_text(
        "Oddiy ls bu yerdagi hamma fayllarni ko‘rsatmaydi.\n"
        "Topgan hex matnni xxd -r -p bilan ochib ko‘ring.\n",
        encoding="utf-8",
    )
    (FILES_DIR / ".yashirin").write_text(f"{hex_payload}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
