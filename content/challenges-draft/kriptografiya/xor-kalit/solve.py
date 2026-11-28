from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
CIPHER_FILE = CHALLENGE_DIR / "files" / "sir.hex"
KEY = b"yurt"


def main() -> None:
    cipher = bytes.fromhex(CIPHER_FILE.read_text(encoding="utf-8").strip())
    plain = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(cipher))
    print(plain.decode("utf-8"))


if __name__ == "__main__":
    main()
