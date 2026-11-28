import base64
import json
import struct
import zlib
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["soxta-pdf"].strip()
    encoded = base64.b64encode(flag.encode("utf-8")).decode("ascii")

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = png_chunk(b"IHDR", struct.pack(">IIBBBBB", 2, 2, 8, 2, 0, 0, 0))
    text_chunk = png_chunk(b"tEXt", f"Comment\x00FAKEPDF_B64={encoded}".encode("ascii"))
    raw_pixels = b"\x00" + b"\x11\x22\x33" * 2 + b"\x00" + b"\x44\x55\x66" * 2
    idat = png_chunk(b"IDAT", zlib.compress(raw_pixels))
    iend = png_chunk(b"IEND", b"")

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "hujjat.pdf").write_bytes(signature + ihdr + text_chunk + idat + iend)


if __name__ == "__main__":
    main()
