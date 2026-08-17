"""Upload one test Short to YouTube via Data API (UNLISTED)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import get_settings
from app.services.youtube_api_uploader import YouTubeApiUploader

VIDEO = ROOT / "data" / "output" / "veo_test_clip.mp4"
TITLE = "[TEST] ShortsForge API Upload - Safe to Delete"
DESCRIPTION = (
    "Automated test upload from ShortsForge AI pipeline.\n"
    "UNLISTED test Short — delete anytime.\n\n"
    "#Shorts #test"
)
TAGS = "shorts, test, shortsforge"


def main() -> int:
    settings = get_settings()
    if not VIDEO.exists():
        print(f"ERROR: Test video not found at {VIDEO}")
        return 1

    if not settings.youtube_api_configured():
        print("YouTube OAuth not configured in .env")
        print("Run once: python scripts/youtube_oauth_setup.py")
        return 1

    uploader = YouTubeApiUploader()
    if not uploader.verify_login():
        print("ERROR: YouTube OAuth credentials invalid. Re-run youtube_oauth_setup.py")
        return 1

    print(f"Video: {VIDEO} ({VIDEO.stat().st_size:,} bytes)")
    print(f"Privacy: {settings.youtube_upload_privacy}")
    print("Uploading via YouTube Data API (no browser)...")

    try:
        video_id = uploader.upload_video(
            video_path=VIDEO,
            title=TITLE,
            description=DESCRIPTION,
            tags=TAGS,
            privacy=settings.youtube_upload_privacy,
        )
    except Exception as exc:
        print(f"ERROR: {exc}")
        return 1

    print()
    print("Upload complete!")
    print(f"Video ID: {video_id}")
    print(f"URL: https://youtube.com/shorts/{video_id}")
    print(f"Studio: https://studio.youtube.com/video/{video_id}/edit")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
