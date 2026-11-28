import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"
KEY = b"yurt"


def xor_bytes(data: bytes, key: bytes) -> bytes:
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["xor-kalit"].strip()
    cipher = xor_bytes(flag.encode("utf-8"), KEY)

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "sir.hex").write_text(f"{cipher.hex()}\n", encoding="utf-8")
    (FILES_DIR / "eslatma.txt").write_text(
        "Xabar takrorlanuvchi XOR bilan shifrlangan.\n"
        "Kalit (4 bayt, kichik lotin harflari): yurt\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
