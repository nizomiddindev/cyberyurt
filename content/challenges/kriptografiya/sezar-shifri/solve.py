from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
INPUT_FILE = CHALLENGE_DIR / "files" / "shifr.txt"


def rot13(text: str) -> str:
    out = []
    for ch in text:
        if "a" <= ch <= "z":
            out.append(chr((ord(ch) - ord("a") + 13) % 26 + ord("a")))
        elif "A" <= ch <= "Z":
            out.append(chr((ord(ch) - ord("A") + 13) % 26 + ord("A")))
        else:
            out.append(ch)
    return "".join(out)


def main() -> None:
    cipher = INPUT_FILE.read_text(encoding="utf-8").strip()
    print(rot13(cipher))


if __name__ == "__main__":
    main()
