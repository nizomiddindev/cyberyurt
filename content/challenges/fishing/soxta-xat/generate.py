import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["soxta-xat"].strip()
    ref_b64 = base64.b64encode(flag.encode("utf-8")).decode("ascii")

    eml = (
        "Return-Path: <alerts@fake-bank-promo.example>\n"
        "Received: from mail.fake-bank-promo.example (198.51.100.77)\n"
        "From: \"Bank Xavfsizlik\" <support@haqiqiy-bank.example>\n"
        "To: talaba@maktab.example\n"
        "Subject: SHOSHILINCH! Kartangiz 10 daqiqada bloklanadi\n"
        "Authentication-Results: spf=fail; dkim=fail\n"
        f"X-Campaign-Ref: {ref_b64}\n"
        "Content-Type: text/plain; charset=utf-8\n\n"
        "Hurmatli mijoz! Kartangiz bloklanmasligi uchun darhol quyidagi havolaga kiring:\n"
        "https://haqiqiy-bank.example.login-check.example/verify\n"
    )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "xat.eml").write_text(eml, encoding="utf-8")


if __name__ == "__main__":
    main()
