"""YouTube trend and Shorts scraping services."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

YT_INITIAL_DATA_PATTERN = re.compile(
    r"var\s+ytInitialData\s*=\s*(\{.*?\});",
    re.DOTALL,
)
YT_INITIAL_PLAYER_PATTERN = re.compile(
    r"var\s+ytInitialPlayerResponse\s*=\s*(\{.*?\});",
    re.DOTALL,
)


class YouTubeTrendScraper:
    """Scrape YouTube trending pages and Shorts feeds without the Data API."""

    TRENDING_URL = "https://www.youtube.com/feed/trending"
    SHORTS_URL = "https://www.youtube.com/feed/youtube_shorts"
    CATEGORY_URL_TEMPLATE = "https://www.youtube.com/feed/trending?bp={category}"

    def __init__(self, timeout: float = 30.0) -> None:
        """Initialize scraper with HTTP client settings."""
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

    def scrape_trending_page(self, category: str = "general") -> list[dict[str, Any]]:
        """
        Scrape the YouTube trending page for a given category.

        Args:
            category: Trending category identifier or 'general' for main feed.

        Returns:
            List of normalized video metadata dictionaries.
        """
        url = self.TRENDING_URL if category == "general" else self.CATEGORY_URL_TEMPLATE.format(
            category=category
        )
        try:
            html = self._fetch_html(url)
            return self._extract_videos_from_html(html)
        except Exception as exc:
            logger.exception("Failed to scrape trending page: %s", exc)
            return []

    def scrape_shorts_feed(self) -> list[dict[str, Any]]:
        """
        Scrape the YouTube Shorts feed page.

        Returns:
            List of normalized Short metadata dictionaries.
        """
        try:
            html = self._fetch_html(self.SHORTS_URL)
            return self._extract_shorts_from_html(html)
        except Exception as exc:
            logger.exception("Failed to scrape Shorts feed: %s", exc)
            return []

    def scrape_with_yt_dlp(self, url: str) -> dict[str, Any]:
        """
        Fallback metadata extraction using yt-dlp for a single URL.

        Args:
            url: YouTube video or Short URL.

        Returns:
            Normalized metadata dictionary.
        """
        try:
            import yt_dlp

            options = {
                "quiet": True,
                "no_warnings": True,
                "skip_download": True,
            }
            with yt_dlp.YoutubeDL(options) as ydl:
                info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title", ""),
                "view_count": int(info.get("view_count") or 0),
                "video_id": info.get("id", ""),
                "url": url,
                "duration": info.get("duration"),
                "channel": info.get("uploader", ""),
                "source": "yt_dlp",
            }
        except Exception as exc:
            logger.exception("yt-dlp scrape failed for %s: %s", url, exc)
            return {"title": "", "view_count": 0, "url": url, "source": "yt_dlp", "error": str(exc)}

    def _fetch_html(self, url: str) -> str:
        """Fetch page HTML content."""
        with httpx.Client(headers=self.headers, timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.text

    def _extract_yt_initial_data(self, html: str) -> dict[str, Any]:
        """Extract and parse ytInitialData JSON from page HTML."""
        match = YT_INITIAL_DATA_PATTERN.search(html)
        if not match:
            soup = BeautifulSoup(html, "lxml")
            for script in soup.find_all("script"):
                text = script.string or script.get_text()
                if text and "ytInitialData" in text:
                    match = YT_INITIAL_DATA_PATTERN.search(text)
                    if match:
                        break
        if not match:
            raise ValueError("ytInitialData not found in page HTML")
        return json.loads(match.group(1))

    def _extract_videos_from_html(self, html: str) -> list[dict[str, Any]]:
        """Extract trending video metadata from HTML."""
        data = self._extract_yt_initial_data(html)
        videos: list[dict[str, Any]] = []
        contents = (
            data.get("contents", {})
            .get("twoColumnBrowseResultsRenderer", {})
            .get("tabs", [{}])[0]
            .get("tabRenderer", {})
            .get("content", {})
            .get("sectionListRenderer", {})
            .get("contents", [])
        )
        for section in contents:
            items = (
                section.get("itemSectionRenderer", {})
                .get("contents", [{}])[0]
                .get("gridRenderer", {})
                .get("items", [])
            )
            if not items:
                items = (
                    section.get("itemSectionRenderer", {})
                    .get("contents", [{}])[0]
                    .get("richGridRenderer", {})
                    .get("contents", [])
                )
            for item in items:
                renderer = item.get("gridVideoRenderer") or item.get("richItemRenderer", {}).get(
                    "content", {}
                ).get("videoRenderer")
                if renderer:
                    parsed = self._parse_video_renderer(renderer)
                    if parsed.get("title"):
                        videos.append(parsed)
        if not videos:
            videos = self._deep_search_video_renderers(data)
        return videos

    def _extract_shorts_from_html(self, html: str) -> list[dict[str, Any]]:
        """Extract Shorts metadata from HTML."""
        data = self._extract_yt_initial_data(html)
        shorts: list[dict[str, Any]] = []

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                if "reelItemRenderer" in node:
                    renderer = node["reelItemRenderer"]
                    video_id = renderer.get("videoId", "")
                    title = self._get_text(renderer.get("headline", {}))
                    view_text = self._get_text(renderer.get("viewCountText", {}))
                    shorts.append(
                        {
                            "title": title,
                            "view_count": self._parse_view_count(view_text),
                            "video_id": video_id,
                            "url": f"https://www.youtube.com/shorts/{video_id}" if video_id else "",
                            "source": "shorts_feed",
                        }
                    )
                if "shortsLockupViewModel" in node:
                    vm = node["shortsLockupViewModel"]
                    video_id = vm.get("onTap", {}).get("innertubeCommand", {}).get(
                        "reelWatchEndpoint", {}
                    ).get("videoId", "")
                    title = vm.get("overlayMetadata", {}).get("primaryText", {}).get("content", "")
                    view_text = vm.get("overlayMetadata", {}).get("secondaryText", {}).get(
                        "content", ""
                    )
                    shorts.append(
                        {
                            "title": title,
                            "view_count": self._parse_view_count(view_text),
                            "video_id": video_id,
                            "url": f"https://www.youtube.com/shorts/{video_id}" if video_id else "",
                            "source": "shorts_feed",
                        }
                    )
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(data)
        return shorts

    def _deep_search_video_renderers(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        """Recursively search ytInitialData for videoRenderer nodes."""
        videos: list[dict[str, Any]] = []

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                if "videoRenderer" in node:
                    parsed = self._parse_video_renderer(node["videoRenderer"])
                    if parsed.get("title"):
                        videos.append(parsed)
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(data)
        seen: set[str] = set()
        unique: list[dict[str, Any]] = []
        for video in videos:
            key = video.get("video_id") or video.get("title")
            if key and key not in seen:
                seen.add(key)
                unique.append(video)
        return unique

    def _parse_video_renderer(self, renderer: dict[str, Any]) -> dict[str, Any]:
        """Parse a YouTube videoRenderer object into normalized metadata."""
        video_id = renderer.get("videoId", "")
        title = self._get_text(renderer.get("title", {}))
        view_text = self._get_text(renderer.get("viewCountText", {}))
        if not view_text:
            view_text = self._get_text(renderer.get("shortViewCountText", {}))
        channel = self._get_text(renderer.get("ownerText", {}))
        if not channel:
            channel = self._get_text(
                renderer.get("longBylineText", {}) or renderer.get("shortBylineText", {})
            )
        return {
            "title": title,
            "view_count": self._parse_view_count(view_text),
            "video_id": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
            "channel": channel,
            "source": "trending",
        }

    def _get_text(self, data: dict[str, Any] | None) -> str:
        """Extract plain text from YouTube's nested text objects."""
        if not data:
            return ""
        if isinstance(data, str):
            return data
        if "simpleText" in data:
            return str(data["simpleText"])
        runs = data.get("runs", [])
        if runs:
            return "".join(run.get("text", "") for run in runs)
        return str(data.get("content", ""))

    def _parse_view_count(self, text: str) -> int:
        """Parse human-readable view counts like '1.2M views' into integers."""
        if not text:
            return 0
        cleaned = text.lower().replace("views", "").replace("view", "").replace(",", "").strip()
        multiplier = 1
        if cleaned.endswith("k"):
            multiplier = 1_000
            cleaned = cleaned[:-1]
        elif cleaned.endswith("m"):
            multiplier = 1_000_000
            cleaned = cleaned[:-1]
        elif cleaned.endswith("b"):
            multiplier = 1_000_000_000
            cleaned = cleaned[:-1]
        try:
            return int(float(cleaned) * multiplier)
        except ValueError:
            digits = re.sub(r"[^\d.]", "", cleaned)
            if not digits:
                return 0
            try:
                return int(float(digits) * multiplier)
            except ValueError:
                return 0

    def scrape_combined_trends(self, limit: int = 20) -> list[dict[str, Any]]:
        """
        Scrape trending and Shorts feeds, merge and deduplicate results.

        Args:
            limit: Maximum number of unique trends to return.

        Returns:
            Combined list of trend metadata dictionaries.
        """
        trending = self.scrape_trending_page("general")
        shorts = self.scrape_shorts_feed()
        combined = trending + shorts
        seen: set[str] = set()
        unique: list[dict[str, Any]] = []
        for item in combined:
            key = (item.get("video_id") or item.get("title", "")).lower().strip()
            if key and key not in seen:
                seen.add(key)
                unique.append(item)
        unique.sort(key=lambda x: x.get("view_count", 0), reverse=True)
        return unique[:limit]
