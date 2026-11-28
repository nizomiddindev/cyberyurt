import base64
import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["cookie-siri"].strip()

    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode("utf-8"))
    payload = b64url(
        json.dumps(
            {
                "sub": "student_07",
                "role": "guest",
                "debug_hex": flag.encode("utf-8").hex(),
            }
        ).encode("utf-8")
    )
    signature = b64url(b"demo-signature-only")
    token = f"{header}.{payload}.{signature}"

    http_dump = (
        "HTTP/1.1 200 OK\n"
        "Content-Type: text/html; charset=utf-8\n"
        f"Set-Cookie: session={token}; Path=/; SameSite=Lax\n"
        "X-Powered-By: Portal-Demo\n\n"
        "<h1>Xush kelibsiz!</h1>\n"
    )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "javob.http").write_text(http_dump, encoding="utf-8")


if __name__ == "__main__":
    main()
