import hashlib
import hmac
import json
from pathlib import Path
import sys
import unittest
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))
from pbmatch.telegram_auth import InvalidInitData, validate_init_data

# Synthetic token and users, no external Bot API calls.
TOKEN = "123456:synthetic-test-token"
NOW = 1_790_000_000


def signed(**overrides):
    fields = {"auth_date": str(NOW), "user": json.dumps({"id": 1099511627776,
              "first_name": "Тест", "username": "test_guest"}, ensure_ascii=False),
              "start_param": "event_demo"}
    fields.update(overrides)
    canonical = "\n".join(k + "=" + fields[k] for k in sorted(fields))
    key = hmac.digest(b"WebAppData", TOKEN.encode(), "sha256")
    fields["hash"] = hmac.digest(key, canonical.encode(), "sha256").hex()
    return urlencode(fields)


class TelegramAuthTests(unittest.TestCase):
    def test_valid_unicode_identity_and_large_user_id(self):
        user = validate_init_data(signed(), TOKEN, now=NOW)
        self.assertEqual(user.user_id, 1099511627776)
        self.assertEqual(user.first_name, "Тест")
        self.assertEqual(user.start_param, "event_demo")

    def test_tampered_context_cannot_select_another_event(self):
        with self.assertRaises(InvalidInitData):
            validate_init_data(signed().replace("event_demo", "event_other"), TOKEN, now=NOW)

    def test_wrong_bot(self):
        with self.assertRaises(InvalidInitData):
            validate_init_data(signed(), "another:token", now=NOW)

    def test_expired_and_future_data(self):
        for timestamp in (NOW - 601, NOW + 31):
            with self.subTest(timestamp=timestamp), self.assertRaises(InvalidInitData):
                validate_init_data(signed(auth_date=str(timestamp)), TOKEN, now=NOW)

    def test_duplicate_user_is_rejected(self):
        with self.assertRaises(InvalidInitData):
            validate_init_data(signed() + "&user=%7B%7D", TOKEN, now=NOW)

    def test_signed_invalid_identity_is_rejected(self):
        for user in ({"id": True, "first_name": "x"}, {"id": -1, "first_name": "x"},
                     {"id": 1, "first_name": ""}, [1], {"id": "1", "first_name": "x"}):
            with self.subTest(user=user), self.assertRaises(InvalidInitData):
                validate_init_data(signed(user=json.dumps(user)), TOKEN, now=NOW)

    def test_optional_signature_is_included_in_hmac(self):
        self.assertEqual(validate_init_data(signed(signature="synthetic"), TOKEN, now=NOW).user_id,
                         1099511627776)

    def test_malformed_missing_or_oversized_data(self):
        for raw in ("", "x", "hash=00", "x=" + "a" * 17000):
            with self.subTest(raw=raw[:20]), self.assertRaises(InvalidInitData):
                validate_init_data(raw, TOKEN, now=NOW)


if __name__ == "__main__":
    unittest.main()
