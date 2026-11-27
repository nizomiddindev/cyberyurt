from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
LOG_FILE = CHALLENGE_DIR / "files" / "tizim.log"


def main() -> None:
    for line in LOG_FILE.read_text(encoding="utf-8").splitlines():
        if "ALERT" in line and "token=" in line:
            token = line.split("token=", 1)[1].strip()
            print(bytes.fromhex(token).decode("utf-8"))
            return
    raise SystemExit("ALERT token not found")


if __name__ == "__main__":
    main()
