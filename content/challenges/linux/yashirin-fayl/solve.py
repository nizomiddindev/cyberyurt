from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
HIDDEN_FILE = CHALLENGE_DIR / "files" / ".yashirin"


def main() -> None:
    hex_data = HIDDEN_FILE.read_text(encoding="utf-8").strip()
    print(bytes.fromhex(hex_data).decode("utf-8"))


if __name__ == "__main__":
    main()
