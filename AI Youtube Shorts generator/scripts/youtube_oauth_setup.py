"""One-time OAuth setup for YouTube Data API uploads."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
]


def _print_403_help(project_id: str, email_hint: str | None) -> None:
    print()
    print("=" * 60)
    print("403 access_denied — checklist (Google Cloud Console)")
    print("=" * 60)
    print(f"1. Open project: {project_id}")
    print("   https://console.cloud.google.com/apis/credentials/consent")
    print("2. OAuth consent screen -> Publishing status must be TESTING")
    print("3. Audience / Test users -> add EXACT sign-in email (Gmail)")
    if email_hint:
        print(f"   Expected test user: {email_hint}")
    print("4. Scopes -> add YouTube Data API v3 scopes:")
    print("   - .../auth/youtube.upload")
    print("   - .../auth/youtube.readonly")
    print("5. Enabled APIs -> YouTube Data API v3 must be ON")
    print("6. Credentials -> OAuth client type must be DESKTOP (not Web)")
    print("7. Revoke old attempts:")
    print("   https://myaccount.google.com/permissions")
    print("8. Wait 2-5 min after saving test users, then retry")
    print()
    print("Retry with explicit account (incognito recommended):")
    print("  python scripts/youtube_oauth_setup.py --email your@gmail.com")
    print("Or manual URL flow (pick account carefully):")
    print("  python scripts/youtube_oauth_setup.py --console --email your@gmail.com")
    print("=" * 60)


def _parse_args() -> tuple[str | None, bool]:
    email_hint: str | None = None
    use_console = "--console" in sys.argv
    for index, arg in enumerate(sys.argv):
        if arg == "--email" and index + 1 < len(sys.argv):
            email_hint = sys.argv[index + 1].strip().lower()
    return email_hint, use_console


def main() -> int:
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("Missing dependency. Run: pip install google-api-python-client google-auth-oauthlib")
        return 1

    email_hint, use_console = _parse_args()

    client_secrets = ROOT / "client_secrets.json"
    if not client_secrets.exists():
        print("=" * 60)
        print("YouTube OAuth setup")
        print("=" * 60)
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create/select a project")
        print("3. Enable 'YouTube Data API v3'")
        print("4. Create OAuth client ID -> Desktop app")
        print("5. Download JSON and save as:")
        print(f"   {client_secrets}")
        print("6. Re-run this script")
        print("=" * 60)
        return 1

    with client_secrets.open("r", encoding="utf-8") as handle:
        secrets = json.load(handle)
    installed = secrets.get("installed") or secrets.get("web") or {}
    project_id = secrets.get("project_id") or installed.get("project_id") or "unknown"

    if "web" in secrets and "installed" not in secrets:
        print("ERROR: client_secrets.json is a WEB client. Recreate as Desktop app.")
        return 1

    print(f"Google Cloud project: {project_id}")
    print(f"OAuth client: {installed.get('client_id', 'unknown')[:20]}...")
    if email_hint:
        print(f"Login hint: {email_hint}")
    print()

    flow_kwargs: dict[str, str] = {"prompt": "consent", "access_type": "offline"}
    if email_hint:
        flow_kwargs["login_hint"] = email_hint

    flow = InstalledAppFlow.from_client_secrets_file(str(client_secrets), SCOPES)
    print(
        "Manual OAuth URL flow..."
        if use_console
        else "Opening browser for one-time YouTube authorization..."
    )
    try:
        if use_console:
            credentials = flow.run_console(**flow_kwargs)
        else:
            credentials = flow.run_local_server(port=0, **flow_kwargs)
    except Exception as exc:
        message = str(exc)
        print(f"Authorization failed: {message}")
        if "access_denied" in message.lower() or "403" in message:
            _print_403_help(project_id, email_hint)
        return 1

    if not credentials.refresh_token:
        print("ERROR: No refresh token returned. Remove app access at")
        print("https://myaccount.google.com/permissions and run again with prompt=consent.")
        return 1

    token_path = ROOT / "data" / "credentials" / "youtube_token.json"
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(credentials.to_json(), encoding="utf-8")

    with client_secrets.open("r", encoding="utf-8") as handle:
        secrets = json.load(handle)
    installed = secrets.get("installed") or secrets.get("web") or {}

    print()
    print("Authorization successful. Add these to your .env file:")
    print("-" * 60)
    print(f"YOUTUBE_CLIENT_ID={installed.get('client_id', '')}")
    print(f"YOUTUBE_CLIENT_SECRET={installed.get('client_secret', '')}")
    print(f"YOUTUBE_REFRESH_TOKEN={credentials.refresh_token}")
    print("-" * 60)
    print(f"Token backup saved to: {token_path}")
    print()
    print("Optional: fetch channel id with:")
    print("  python scripts/youtube_oauth_setup.py --verify")
    return 0


def verify() -> int:
    from app.config import clear_settings_cache, get_settings
    from app.services.youtube_api_uploader import YouTubeApiUploader

    clear_settings_cache()
    settings = get_settings()
    if not settings.youtube_api_configured():
        print("ERROR: YouTube OAuth env vars are not set in .env yet.")
        return 1

    uploader = YouTubeApiUploader()
    if not uploader.verify_login():
        print("ERROR: OAuth credentials invalid or expired.")
        return 1

    channel_id = uploader.get_channel_id()
    print("YouTube API auth OK.")
    if channel_id:
        print(f"Channel ID: {channel_id}")
        print(f"Add to .env if missing: YOUTUBE_CHANNEL_ID={channel_id}")
    return 0


if __name__ == "__main__":
    if "--verify" in sys.argv:
        raise SystemExit(verify())
    raise SystemExit(main())
