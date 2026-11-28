# Bu dastur kiritilgan parolni tekshiradi.
# Har bir belgining ASCII kodiga 7 qo‘shib TARGET ro‘yxati bilan solishtiradi.

SHIFT = 7
TARGET = [82, 80, 73, 76, 89, 130, 114, 55, 107, 117, 56, 102, 55, 120, 56, 105, 102, 123, 55, 119, 56, 122, 111, 102, 55, 122, 55, 117, 132]


def check(password: str) -> bool:
    if len(password) != len(TARGET):
        return False
    return [ord(c) + SHIFT for c in password] == TARGET


if __name__ == "__main__":
    user_input = input("Parol: ")
    print("OK" if check(user_input) else "XATO")
