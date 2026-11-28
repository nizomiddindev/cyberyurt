import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def transform(raw: bytes) -> list[int]:
    rev = raw[::-1]
    return [((b ^ ((i * 3 + 11) % 256)) + 5) % 256 for i, b in enumerate(rev)]


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["bayt-qulf"].strip()
    expected = transform(flag.encode("utf-8"))

    script = f"""# Qulf tekshiruvchi dastur (teskari muhandislik mashqi)

EXPECTED = {expected}


def verify(candidate: str) -> bool:
    data = candidate.encode("utf-8")[::-1]
    if len(data) != len(EXPECTED):
        return False
    out = [((b ^ ((i * 3 + 11) % 256)) + 5) % 256 for i, b in enumerate(data)]
    return out == EXPECTED


if __name__ == "__main__":
    s = input("Kalit: ")
    print("OCHILDI" if verify(s) else "YOPIQ")
"""

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "qulf.py").write_text(script, encoding="utf-8")


if __name__ == "__main__":
    main()
