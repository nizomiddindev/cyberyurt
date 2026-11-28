import json
from pathlib import Path

CHALLENGE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CHALLENGE_DIR.parents[1] / ".flags.local.json"
FILES_DIR = CHALLENGE_DIR / "files"


def deterministic_noise(length: int, seed: int) -> bytes:
    out = bytearray(length)
    val = seed
    for i in range(length):
        val = (val * 1103515245 + 12345) & 0x7FFFFFFF
        # Keep non-printable bytes to look like raw disk sectors
        b = val & 0xFF
        if 0x20 <= b <= 0x7E:
            b = (b + 0x80) & 0xFF
        out[i] = b
    return bytes(out)


def main() -> None:
    flags = json.loads(FLAGS_FILE.read_text(encoding="utf-8"))
    flag = flags["ochirilgan-iz"].strip()
    hex_flag = flag.encode("utf-8").hex()

    step = len(hex_flag) // 3
    p1 = hex_flag[:step]
    p2 = hex_flag[step : step * 2]
    p3 = hex_flag[step * 2 :]

    # Scatter parts out of order across binary disk sectors with decoys
    blob = b"".join(
        [
            b"CYBERFS_V1\x00\x00\x00\x00",
            deterministic_noise(256, 17),
            b"DELETED_BLOCK_A\x00",
            f"FRAG_2={p2}".encode("ascii"),
            deterministic_noise(312, 42),
            b"NOISE_SECTOR=deadbeef00\x00",
            f"FRAG_3={p3}".encode("ascii"),
            deterministic_noise(190, 99),
            b"OLD_INODE_HDR\x00",
            f"FRAG_1={p1}".encode("ascii"),
            deterministic_noise(220, 123),
        ]
    )

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    (FILES_DIR / "disk.img").write_bytes(blob)


if __name__ == "__main__":
    main()
