import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["foto-manzil"].strip()
    encoded = base64.b64encode(flag.encode("utf-8")).decode("ascii")

    post_text = (
        "Muallif: @guliston_sayohat\n"
        "Sana: 2026-11-15 16:40\n"
        "Matn: Bugun Sirdaryo bo‘yidagi yangi bog‘da suratga tushdik! "
        "Kameram sozlamalarini o‘chirishni unutibman...\n"
    )
    exif_text = (
        "File Name      : bog_surati.jpg\n"
        "Camera Model   : DemoCam X100\n"
        "Create Date    : 2026:11:15 16:35:12\n"
        "GPS Latitude   : 40 deg 29' 23.00\" N\n"
        "GPS Longitude  : 68 deg 46' 58.00\" E\n"
        "City Hint      : Guliston, Sirdaryo\n"
        f"User Comment   : META_B64={encoded}\n"
    )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "post.txt").write_text(post_text, encoding="utf-8")
    (FILES_DIR / "exif.txt").write_text(exif_text, encoding="utf-8")


if __name__ == "__main__":
    main()
