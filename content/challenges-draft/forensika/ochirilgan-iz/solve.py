import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
IMG_FILE = CHALLENGE_DIR / "files" / "disk.img"


def main() -> None:
    raw = IMG_FILE.read_bytes()
    parts = {}
    for m in re.finditer(rb"FRAG_([123])=([0-9a-f]+)", raw):
        parts[int(m.group(1))] = m.group(2).decode("ascii")
    if len(parts) != 3:
        raise SystemExit("Missing fragments")
    full_hex = parts[1] + parts[2] + parts[3]
    print(bytes.fromhex(full_hex).decode("utf-8"))


if __name__ == "__main__":
    main()
