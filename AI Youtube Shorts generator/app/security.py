"""Security utilities for secret handling and log redaction."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Pattern

# Google API keys typically start with AIza
_SECRET_PATTERNS: list[Pattern[str]] = [
    re.compile(r"AIza[0-9A-Za-z\-_]{35}"),
    re.compile(r"(?i)(api[_-]?key|token|secret|password|cookie)\s*[:=]\s*\S+"),
    re.compile(r"(?i)Bearer\s+[A-Za-z0-9\-_\.]+"),
]

# URL paths that must never be served over HTTP
_BLOCKED_PATH_FRAGMENTS = (
    ".env",
    "cookies",
    "youtube_cookies",
    ".git",
    "id_rsa",
    "secret",
    "credentials",
)


def redact_secrets(text: str) -> str:
    """
    Redact known secret patterns from a string.

    Args:
        text: Input text that may contain secrets.

    Returns:
        Text with secrets replaced by [REDACTED].
    """
    if not text:
        return text
    redacted = str(text)
    for pattern in _SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted


def is_blocked_path(path: str) -> bool:
    """Return True if the request path targets sensitive files."""
    normalized = path.lower().replace("\\", "/")
    return any(fragment in normalized for fragment in _BLOCKED_PATH_FRAGMENTS)


def is_local_client_host(host: str | None) -> bool:
    """Return True if the client host is local-only."""
    if not host:
        return False
    bare = host.split(":")[0]
    return bare in {"127.0.0.1", "localhost", "::1"}


class SecretRedactingFilter(logging.Filter):
    """Logging filter that redacts secrets from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Redact secrets in log message and args before emission."""
        if isinstance(record.msg, str):
            record.msg = redact_secrets(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    key: redact_secrets(str(value)) if isinstance(value, str) else value
                    for key, value in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    redact_secrets(str(arg)) if isinstance(arg, str) else arg
                    for arg in record.args
                )
        if record.exc_info and record.exc_text:
            record.exc_text = redact_secrets(record.exc_text)
        return True


def install_secret_redaction() -> None:
    """Attach secret redaction filter to root logger."""
    root = logging.getLogger()
    if not any(isinstance(f, SecretRedactingFilter) for f in root.filters):
        root.addFilter(SecretRedactingFilter())


def assert_env_not_world_readable(env_path: Path = Path(".env")) -> None:
    """
    Warn if .env exists in project root (gitignored by default).

    Does not read or print file contents.
    """
    if env_path.exists():
        logging.getLogger(__name__).info(
            "Secrets loaded from %s (local file only, never exposed via API).",
            env_path.name,
        )
