import random


def generate_otp(length: int = 6, test_default: str = "123456") -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(length))
