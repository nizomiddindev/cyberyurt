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


def build_minimal_png() -> bytes:
    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = png_chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw_scanline = b"\x00\x10\x20\x30"
    idat = png_chunk(b"IDAT", zlib.compress(raw_scanline))
    iend = png_chunk(b"IEND", b"")
    return signature + ihdr + idat + iend


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["sirli-rasm"].strip()
    encoded = base64.b64encode(flag.encode("utf-8")).decode("ascii")

    png_bytes = build_minimal_png() + f"\nSECRET_B64={encoded}\n".encode("ascii")
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "rasm.png").write_bytes(png_bytes)


if __name__ == "__main__":
    main()
