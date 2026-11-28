import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
DNS_FILE = CHALLENGE_DIR / "files" / "dns_records.txt"


def main() -> None:
    text = DNS_FILE.read_text(encoding="utf-8")
    match = re.search(r"cyberyurt-verify=([0-9a-f]+)", text)
    if not match:
        raise SystemExit("cyberyurt-verify TXT record not found")
    print(bytes.fromhex(match.group(1)).decode("utf-8"))


if __name__ == "__main__":
    main()
