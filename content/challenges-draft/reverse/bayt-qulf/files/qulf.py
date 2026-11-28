# Qulf tekshiruvchi dastur (teskari muhandislik mashqi)

EXPECTED = [123, 68, 122, 125, 43, 119, 131, 21, 129, 69, 74, 94, 99, 114, 76, 13, 72, 102, 117, 59, 120, 38, 67, 104, 44, 50, 16, 30, 34, 48, 51]


def verify(candidate: str) -> bool:
    data = candidate.encode("utf-8")[::-1]
    if len(data) != len(EXPECTED):
        return False
    out = [((b ^ ((i * 3 + 11) % 256)) + 5) % 256 for i, b in enumerate(data)]
    return out == EXPECTED


if __name__ == "__main__":
    s = input("Kalit: ")
    print("OCHILDI" if verify(s) else "YOPIQ")
