import re
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
DNS_LOG = CHALLENGE_DIR / "files" / "dns.log"


def main() -> None:
    chunks = []
    for line in DNS_LOG.read_text(encoding="utf-8").splitlines():
        m = re.search(r"QNAME=(\d{2})\.([0-9a-f]+)\.exfil\.example", line)
        if m:
            chunks.append((int(m.group(1)), m.group(2)))
    chunks.sort(key=lambda item: item[0])
    full_hex = "".join(part for _, part in chunks)
    print(bytes.fromhex(full_hex).decode("utf-8"))


if __name__ == "__main__":
    main()
