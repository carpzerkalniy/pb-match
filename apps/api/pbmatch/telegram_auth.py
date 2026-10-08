"""Validate Telegram Mini App initData before establishing a server session.

HMAC bot-token flow from https://core.telegram.org/bots/webapps.
This establishes Telegram identity, not event membership or admin permissions.
"""

from dataclasses import dataclass
import hashlib
import hmac
import json
import re
import time
from urllib.parse import parse_qsl


class InvalidInitData(ValueError):
    """Deliberately contains no submitted data or token."""


@dataclass(frozen=True)
class TelegramIdentity:
    user_id: int
    username: str | None
    first_name: str
    auth_date: int
    start_param: str | None


def validate_init_data(
    raw: str,
    bot_token: str,
    *,
    now: int | None = None,
    max_age_seconds: int = 600,
    future_skew_seconds: int = 30,
) -> TelegramIdentity:
    if not bot_token or max_age_seconds <= 0 or future_skew_seconds < 0:
        raise ValueError("Invalid Telegram authentication configuration")
    if not isinstance(raw, str) or not raw or len(raw.encode("utf-8")) > 16384:
        raise InvalidInitData("Invalid initData size")
    try:
        pairs = parse_qsl(raw, keep_blank_values=True, strict_parsing=True,
                          encoding="utf-8", errors="strict", max_num_fields=32)
    except (ValueError, UnicodeError) as exc:
        raise InvalidInitData("Malformed initData") from exc
    fields = dict(pairs)
    if len(fields) != len(pairs):
        raise InvalidInitData("Duplicate initData fields")
    provided_hash = fields.pop("hash", "")
    if not re.fullmatch(r"[0-9a-fA-F]{64}", provided_hash):
        raise InvalidInitData("Invalid initData hash")
    # Include every received field except hash, including signature if present.
    # The Ed25519 third-party flow has different rules and is not used here.
    check_string = "\n".join(f"{key}={value}" for key, value in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, provided_hash.lower()):
        raise InvalidInitData("Invalid initData signature")
    try:
        auth_date = int(fields["auth_date"])
        user = json.loads(fields["user"])
    except (KeyError, ValueError, TypeError) as exc:
        raise InvalidInitData("Missing or invalid identity") from exc
    current = int(time.time()) if now is None else now
    if auth_date < current - max_age_seconds or auth_date > current + future_skew_seconds:
        raise InvalidInitData("Expired or future initData")
    if not isinstance(user, dict):
        raise InvalidInitData("Invalid Telegram user")
    user_id = user.get("id")
    if type(user_id) is not int or not 0 < user_id <= (2**52 - 1):
        raise InvalidInitData("Invalid Telegram user id")
    first_name = user.get("first_name")
    username = user.get("username")
    if not isinstance(first_name, str) or not first_name:
        raise InvalidInitData("Invalid Telegram user name")
    if username is not None and not isinstance(username, str):
        raise InvalidInitData("Invalid Telegram username")
    return TelegramIdentity(user_id, username, first_name, auth_date, fields.get("start_param"))
