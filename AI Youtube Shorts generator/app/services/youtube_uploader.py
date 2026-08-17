"""YouTube upload facade — uses YouTube Data API (no browser)."""

from __future__ import annotations

from pathlib import Path

from app.services.youtube_api_uploader import YouTubeApiUploader


class YouTubeUploader(YouTubeApiUploader):
    """Backward-compatible name used by pipeline tasks."""

    def upload_video(
        self,
        video_path: Path,
        title: str,
        description: str,
        tags: str | list[str],
        privacy: str = "UNLISTED",
        thumbnail_path: Path | None = None,
    ) -> str:
        return super().upload_video(
            video_path=video_path,
            title=title,
            description=description,
            tags=tags,
            privacy=privacy,
            thumbnail_path=thumbnail_path,
        )
