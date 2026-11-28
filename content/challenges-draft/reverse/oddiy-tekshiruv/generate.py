import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"
SHIFT = 7


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["oddiy-tekshiruv"].strip()
    target = [ord(ch) + SHIFT for ch in flag]

    script = f"""# Bu dastur kiritilgan parolni tekshiradi.
# Har bir belgining ASCII kodiga {SHIFT} qo‘shib TARGET ro‘yxati bilan solishtiradi.

SHIFT = {SHIFT}
TARGET = {target}


def check(password: str) -> bool:
    if len(password) != len(TARGET):
        return False
    return [ord(c) + SHIFT for c in password] == TARGET


if __name__ == "__main__":
    user_input = input("Parol: ")
    print("OK" if check(user_input) else "XATO")
"""

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "tekshir.py").write_text(script, encoding="utf-8")


if __name__ == "__main__":
    main()
