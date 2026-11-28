import base64
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
INPUT_FILE = CHALLENGE_DIR / "files" / "shifr.txt"


def main() -> None:
    hex_str = INPUT_FILE.read_text(encoding="utf-8").strip()
    b64_bytes = bytes.fromhex(hex_str)
    print(base64.b64decode(b64_bytes).decode("utf-8"))


if __name__ == "__main__":
    main()
