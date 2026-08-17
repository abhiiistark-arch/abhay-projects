"""Public YouTube analytics scraping without the Data API."""

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


class YouTubeAnalyticsScraper:
    """Scrape public video statistics from YouTube pages."""

    WATCH_URL_TEMPLATE = "https://www.youtube.com/watch?v={video_id}"
    CHANNEL_VIDEOS_TEMPLATE = "https://www.youtube.com/channel/{channel_id}/videos"

    def __init__(self, timeout: float = 30.0) -> None:
        """Initialize scraper with HTTP settings."""
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
        }

    def scrape_video_stats(self, video_id: str) -> dict[str, Any]:
        """
        Scrape public views, likes, comments, and title for a video.

        Args:
            video_id: YouTube video identifier.

        Returns:
            Dictionary with video statistics.
        """
        url = self.WATCH_URL_TEMPLATE.format(video_id=video_id)
        try:
            html = self._fetch_html(url)
            data = self._extract_yt_initial_data(html)
            stats = self._parse_video_stats(data, video_id)
            if not stats.get("title"):
                stats["title"] = self._parse_title_from_html(html)
            return stats
        except Exception as exc:
            logger.exception("Failed to scrape stats for %s: %s", video_id, exc)
            return {
                "video_id": video_id,
                "views": 0,
                "likes": 0,
                "comments": 0,
                "title": "",
                "error": str(exc),
            }

    def scrape_channel_videos(self, channel_id: str, max_results: int = 20) -> list[dict[str, Any]]:
        """
        Scrape recent videos from a channel's public videos page.

        Args:
            channel_id: YouTube channel identifier.
            max_results: Maximum videos to return.

        Returns:
            List of video metadata with public stats.
        """
        url = self.CHANNEL_VIDEOS_TEMPLATE.format(channel_id=channel_id)
        try:
            html = self._fetch_html(url)
            data = self._extract_yt_initial_data(html)
            videos = self._extract_channel_videos(data)
            enriched: list[dict[str, Any]] = []
            for video in videos[:max_results]:
                video_id = video.get("video_id", "")
                if video_id:
                    stats = self.scrape_video_stats(video_id)
                    enriched.append({**video, **stats})
                else:
                    enriched.append(video)
            return enriched
        except Exception as exc:
            logger.exception("Failed to scrape channel %s: %s", channel_id, exc)
            return []

    def _fetch_html(self, url: str) -> str:
        """Fetch page HTML."""
        with httpx.Client(headers=self.headers, timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.text

    def _extract_yt_initial_data(self, html: str) -> dict[str, Any]:
        """Extract ytInitialData JSON from HTML."""
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
            raise ValueError("ytInitialData not found")
        return json.loads(match.group(1))

    def _parse_video_stats(self, data: dict[str, Any], video_id: str) -> dict[str, Any]:
        """Parse video statistics from ytInitialData."""
        result: dict[str, Any] = {
            "video_id": video_id,
            "views": 0,
            "likes": 0,
            "comments": 0,
            "title": "",
        }

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                if "videoPrimaryInfoRenderer" in node:
                    info = node["videoPrimaryInfoRenderer"]
                    result["title"] = self._get_text(info.get("title", {}))
                    view_text = self._get_text(
                        info.get("viewCount", {}).get("videoViewCountRenderer", {}).get(
                            "viewCount", {}
                        )
                    )
                    if view_text:
                        result["views"] = self._parse_count(view_text)

                if "factoidRenderer" in node:
                    factoid = node["factoidRenderer"]
                    label = self._get_text(factoid.get("label", {})).lower()
                    value_text = self._get_text(factoid.get("value", {}))
                    if "like" in label:
                        result["likes"] = self._parse_count(value_text)

                if "engagementPanelSectionListRenderer" in node:
                    header = (
                        node.get("engagementPanelSectionListRenderer", {})
                        .get("header", {})
                        .get("engagementPanelTitleHeaderRenderer", {})
                    )
                    title_text = self._get_text(header.get("title", {})).lower()
                    if "comment" in title_text:
                        count_text = self._get_text(header.get("contextualInfo", {}))
                        result["comments"] = self._parse_count(count_text)

                if "toggleButtonRenderer" in node:
                    toggle = node["toggleButtonRenderer"]
                    label = self._get_text(
                        toggle.get("defaultText", {}) or toggle.get("accessibility", {})
                    ).lower()
                    if "like" in label:
                        result["likes"] = max(
                            result["likes"],
                            self._parse_count(self._get_text(toggle.get("defaultText", {}))),
                        )

                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(data)
        return result

    def _extract_channel_videos(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        """Extract video list from channel videos page."""
        videos: list[dict[str, Any]] = []

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                if "gridVideoRenderer" in node:
                    renderer = node["gridVideoRenderer"]
                    video_id = renderer.get("videoId", "")
                    title = self._get_text(renderer.get("title", {}))
                    view_text = self._get_text(renderer.get("viewCountText", {}))
                    videos.append(
                        {
                            "video_id": video_id,
                            "title": title,
                            "views": self._parse_count(view_text),
                        }
                    )
                if "videoRenderer" in node:
                    renderer = node["videoRenderer"]
                    video_id = renderer.get("videoId", "")
                    title = self._get_text(renderer.get("title", {}))
                    view_text = self._get_text(renderer.get("viewCountText", {}))
                    videos.append(
                        {
                            "video_id": video_id,
                            "title": title,
                            "views": self._parse_count(view_text),
                        }
                    )
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(data)
        seen: set[str] = set()
        unique: list[dict[str, Any]] = []
        for video in videos:
            vid = video.get("video_id", "")
            if vid and vid not in seen:
                seen.add(vid)
                unique.append(video)
        return unique

    def _parse_title_from_html(self, html: str) -> str:
        """Fallback title extraction from HTML meta tags."""
        soup = BeautifulSoup(html, "lxml")
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return str(og_title["content"])
        title_tag = soup.find("title")
        return title_tag.get_text(strip=True) if title_tag else ""

    def _get_text(self, data: dict[str, Any] | None) -> str:
        """Extract text from YouTube nested text objects."""
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

    def _parse_count(self, text: str) -> int:
        """
        Parse human-readable counts like '1.2M' or '5,432' into integers.

        Args:
            text: Raw count string from YouTube UI.

        Returns:
            Parsed integer count.
        """
        if not text:
            return 0
        cleaned = text.lower().replace(",", "").strip()
        cleaned = re.sub(r"(views|view|likes|like|comments|comment)", "", cleaned).strip()
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
