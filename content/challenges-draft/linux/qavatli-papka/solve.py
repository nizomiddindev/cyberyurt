from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    target_file = ""
    marker = ""
    for line in (FILES_DIR / "muhit.conf").read_text(encoding="utf-8").splitlines():
        if line.startswith("TARGET_FILE="):
            target_file = line.split("=", 1)[1].strip()
        elif line.startswith("TARGET_MARKER="):
            marker = line.split("=", 1)[1].strip()

    for line in (FILES_DIR / target_file).read_text(encoding="utf-8").splitlines():
        if line.startswith(marker):
            rev_hex = line[len(marker) :].strip()
            print(bytes.fromhex(rev_hex[::-1]).decode("utf-8"))
            return
    raise SystemExit("Marker not found")


if __name__ == "__main__":
    main()
