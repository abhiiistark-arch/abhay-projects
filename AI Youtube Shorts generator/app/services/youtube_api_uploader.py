"""YouTube Data API v3 upload — no browser automation."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload"
YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
DEFAULT_CATEGORY_ID = "22"  # People & Blogs


class YouTubeApiUploader:
    """Upload Shorts via YouTube Data API using OAuth refresh token."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def upload_video(
        self,
        video_path: Path,
        title: str,
        description: str,
        tags: str | list[str],
        privacy: str = "UNLISTED",
        thumbnail_path: Path | None = None,
    ) -> str:
        """Upload a vertical Short via resumable YouTube Data API upload."""
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        if not self.settings.youtube_api_configured():
            raise RuntimeError(
                "YouTube OAuth is not configured. Run: python scripts/youtube_oauth_setup.py"
            )

        youtube = self._build_client()
        tag_list = self._normalize_tags(tags)
        snippet_title, snippet_description = self._prepare_shorts_metadata(title, description)

        privacy_status = privacy.strip().lower()
        if privacy_status not in {"public", "unlisted", "private"}:
            privacy_status = self.settings.youtube_upload_privacy.lower()

        body: dict[str, Any] = {
            "snippet": {
                "title": snippet_title[:100],
                "description": snippet_description[:5000],
                "tags": tag_list[:30],
                "categoryId": self.settings.youtube_category_id,
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": False,
            },
        }

        media = MediaFileUpload(
            str(video_path.resolve()),
            mimetype="video/mp4",
            chunksize=8 * 1024 * 1024,
            resumable=True,
        )

        logger.info("Starting YouTube API upload: %s", video_path.name)
        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media,
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                progress = int(status.progress() * 100)
                logger.info("Upload progress: %s%%", progress)

        video_id = response.get("id")
        if not video_id:
            raise RuntimeError(f"YouTube API returned no video id: {response}")

        if thumbnail_path and thumbnail_path.exists():
            self._upload_thumbnail(youtube, video_id, thumbnail_path)

        logger.info("YouTube upload complete: %s", video_id)
        return video_id

    def verify_login(self) -> bool:
        """Return True if OAuth credentials can access the authenticated channel."""
        if not self.settings.youtube_api_configured():
            return False
        try:
            youtube = self._build_client()
            response = youtube.channels().list(part="id", mine=True).execute()
            return bool(response.get("items"))
        except Exception as exc:
            logger.warning("YouTube API auth check failed: %s", exc)
            return False

    def get_channel_id(self) -> str | None:
        """Return the authenticated channel ID from the API."""
        try:
            youtube = self._build_client()
            response = youtube.channels().list(part="id", mine=True).execute()
            items = response.get("items") or []
            if items:
                return items[0]["id"]
        except Exception as exc:
            logger.warning("Could not fetch channel id: %s", exc)
        return None

    def _build_client(self) -> Any:
        credentials = Credentials(
            token=None,
            refresh_token=self.settings.get_youtube_refresh_token(),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.settings.get_youtube_client_id(),
            client_secret=self.settings.get_youtube_client_secret(),
            scopes=[YOUTUBE_UPLOAD_SCOPE, YOUTUBE_READONLY_SCOPE],
        )
        return build("youtube", "v3", credentials=credentials, cache_discovery=False)

    def _upload_thumbnail(self, youtube: Any, video_id: str, thumbnail_path: Path) -> None:
        try:
            media = MediaFileUpload(str(thumbnail_path.resolve()), mimetype="image/png")
            youtube.thumbnails().set(videoId=video_id, media_body=media).execute()
            logger.info("Thumbnail uploaded for %s", video_id)
        except HttpError as exc:
            logger.warning("Thumbnail upload skipped for %s: %s", video_id, exc)

    @staticmethod
    def _normalize_tags(tags: str | list[str]) -> list[str]:
        if isinstance(tags, list):
            raw = tags
        else:
            raw = [part.strip() for part in tags.split(",") if part.strip()]
        cleaned: list[str] = []
        for tag in raw:
            tag = re.sub(r"\s+", " ", tag).strip()
            if tag and tag.lower() != "shorts" and len(tag) <= 100:
                cleaned.append(tag)
        if "Shorts" not in cleaned:
            cleaned.insert(0, "Shorts")
        return cleaned

    @staticmethod
    def _prepare_shorts_metadata(title: str, description: str) -> tuple[str, str]:
        """Ensure title/description help YouTube classify the upload as a Short."""
        clean_title = title.strip() or "Untitled Short"
        if "#shorts" not in clean_title.lower():
            suffix = " #Shorts"
            max_len = 100 - len(suffix)
            clean_title = f"{clean_title[:max_len].rstrip()}{suffix}"

        clean_description = description.strip()
        if "#shorts" not in clean_description.lower():
            clean_description = f"{clean_description}\n\n#Shorts".strip()

        return clean_title, clean_description
