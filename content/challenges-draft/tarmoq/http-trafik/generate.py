import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["http-trafik"].strip()
    creds_b64 = base64.b64encode(f"admin:{flag}".encode("utf-8")).decode("ascii")

    transcript = (
        "--- Packet #1 (192.168.1.15 -> 192.168.1.1:80) ---\n"
        "GET / HTTP/1.1\n"
        "Host: router.local\n"
        "User-Agent: DemoBrowser/1.0\n\n"
        "--- Packet #2 (192.168.1.1:80 -> 192.168.1.15) ---\n"
        "HTTP/1.1 401 Unauthorized\n"
        'WWW-Authenticate: Basic realm="RouterAdmin"\n\n'
        "--- Packet #3 (192.168.1.15 -> 192.168.1.1:80) ---\n"
        "GET /admin/status HTTP/1.1\n"
        "Host: router.local\n"
        f"Authorization: Basic {creds_b64}\n\n"
        "--- Packet #4 (192.168.1.1:80 -> 192.168.1.15) ---\n"
        "HTTP/1.1 200 OK\n"
        "Content-Type: text/plain\n\n"
        "Status: ONLINE\n"
    )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "trafik.txt").write_text(transcript, encoding="utf-8")


if __name__ == "__main__":
    main()
