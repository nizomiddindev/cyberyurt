import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["dns-tunel"].strip()
    hex_data = flag.encode("utf-8").hex()

    # Split hex payload into 8-char chunks embedded as DNS subdomains
    chunks = [hex_data[i : i + 8] for i in range(0, len(hex_data), 8)]

    normal_domains = [
        "uzedu.example",
        "kitoblar.example",
        "cdn.maktab.example",
        "time.ntp.example",
        "updates.os.example",
    ]

    lines = []
    sec = 10
    for idx, chunk in enumerate(chunks, start=1):
        normal = normal_domains[(idx - 1) % len(normal_domains)]
        lines.append(f"2026-11-27 14:20:{sec:02d} SRC=10.10.2.5 QTYPE=A QNAME={normal}")
        sec += 1
        lines.append(
            f"2026-11-27 14:20:{sec:02d} SRC=10.10.2.99 QTYPE=A QNAME={idx:02d}.{chunk}.exfil.example"
        )
        sec += 1

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "dns.log").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
