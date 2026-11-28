import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["domen-tarixi"].strip()
    hex_token = flag.encode("utf-8").hex()

    whois_text = (
        "Domain Name: maktab-klub.example\n"
        "Registrar: Example Registrar LLC\n"
        "Creation Date: 2024-09-01T10:00:00Z\n"
        "Name Server: ns1.maktab-klub.example\n"
        "Name Server: ns2.maktab-klub.example\n"
    )
    dns_text = (
        "maktab-klub.example.   300  IN  A     203.0.113.42\n"
        "maktab-klub.example.   300  IN  MX    10 mail.maktab-klub.example.\n"
        'maktab-klub.example.   300  IN  TXT   "v=spf1 include:_spf.example ~all"\n'
        f'maktab-klub.example.   300  IN  TXT   "cyberyurt-verify={hex_token}"\n'
        "www.maktab-klub.example. 300 IN CNAME maktab-klub.example.\n"
    )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "whois.txt").write_text(whois_text, encoding="utf-8")
    (FILES_DIR / "dns_records.txt").write_text(dns_text, encoding="utf-8")


if __name__ == "__main__":
    main()
