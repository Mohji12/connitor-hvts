import unittest
from unittest.mock import MagicMock

from app.services.users_service import UsersService


class UsersServiceDuplicateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = UsersService(self.db)

    def test_normalize_email_returns_none_for_blank(self) -> None:
        self.assertIsNone(UsersService._normalize_email(None))
        self.assertIsNone(UsersService._normalize_email(""))
        self.assertIsNone(UsersService._normalize_email("   "))

    def test_find_duplicate_user_ignores_blank_email(self) -> None:
        existing_by_phone = MagicMock()
        existing_by_phone.phone = "9876543210"
        self.db.query.return_value.filter.return_value.first.side_effect = [
            existing_by_phone,
        ]

        result = self.service._find_duplicate_user("9876543210", "")

        self.assertIs(result, existing_by_phone)
        self.db.query.return_value.filter.assert_called_once()


if __name__ == "__main__":
    unittest.main()
