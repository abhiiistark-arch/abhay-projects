"""Gemini-powered content analysis and generation services."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types
from PIL import Image, ImageDraw, ImageFont

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class ContentEngine:
    """Analyze trends and generate Shorts content packages using Gemini."""

    def __init__(self, settings: Settings | None = None) -> None:
        """Initialize Gemini client and model configuration."""
        self.settings = settings or get_settings()
        self.client = genai.Client(api_key=self.settings.get_gemini_api_key())

    def discover_viral_topics(
        self,
        seed_topic: str,
        count: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Use Gemini to brainstorm viral YouTube Shorts angles from a one-word seed topic.

        Args:
            seed_topic: Single keyword such as "fitness" or "AI".
            count: Number of topic ideas to request.

        Returns:
            Scored trend dictionaries ready for content generation.
        """
        topic_count = count or self.settings.videos_per_pipeline
        prompt = self._build_topic_discovery_prompt(seed_topic, topic_count)
        try:
            response = self.client.models.generate_content(
                model=self.settings.gemini_text_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.8,
                ),
            )
            text = response.text or "[]"
            parsed = json.loads(self._extract_json(text))
            if isinstance(parsed, dict) and "trends" in parsed:
                trends = parsed["trends"]
            elif isinstance(parsed, list):
                trends = parsed
            else:
                trends = []
            return self._normalize_discovered_trends(trends, seed_topic)
        except Exception as exc:
            logger.exception("Topic discovery failed for '%s': %s", seed_topic, exc)
            return self._fallback_discovered_topics(seed_topic, topic_count)

    def analyze_trends(self, trends: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Score trends for viral Shorts potential using Gemini 3.1 Pro.

        Args:
            trends: Trend metadata from discovery or external sources.

        Returns:
            Enriched trend analysis with scores and strategy fields.
        """
        if not trends:
            return []

        prompt = self._build_trend_analysis_prompt(trends)
        try:
            response = self.client.models.generate_content(
                model=self.settings.gemini_text_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                ),
            )
            text = response.text or "[]"
            parsed = json.loads(self._extract_json(text))
            if isinstance(parsed, dict) and "trends" in parsed:
                return parsed["trends"]
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception as exc:
            logger.exception("Trend analysis failed: %s", exc)
            return self._fallback_trend_analysis(trends)

    def generate_content_package(self, trend: dict[str, Any]) -> dict[str, Any]:
        """
        Generate a complete Short content package for a selected trend.

        Args:
            trend: Analyzed trend dictionary with scores and strategy.

        Returns:
            Content package with script, prompts, tags, and metadata.
        """
        prompt = self._build_content_package_prompt(trend)
        try:
            response = self.client.models.generate_content(
                model=self.settings.gemini_text_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
            text = response.text or "{}"
            package = json.loads(self._extract_json(text))
            package = self._normalize_content_package(package, trend)
            return package
        except Exception as exc:
            logger.exception("Content package generation failed: %s", exc)
            return self._fallback_content_package(trend)

    def generate_thumbnail(self, prompt: str, output_path: Path) -> Path:
        """
        Generate a thumbnail image using Gemini image model or PIL fallback.

        Args:
            prompt: Visual thumbnail generation prompt.
            output_path: Destination file path for the thumbnail.

        Returns:
            Path to the saved thumbnail image.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            response = self.client.models.generate_content(
                model=self.settings.gemini_image_model,
                contents=(
                    f"Create a bold, high-contrast YouTube Shorts thumbnail (9:16). "
                    f"No text overlays. {prompt}"
                ),
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    output_path.write_bytes(part.inline_data.data)
                    return output_path
        except Exception as exc:
            logger.warning("Gemini thumbnail generation failed, using fallback: %s", exc)

        return self._generate_fallback_thumbnail(prompt, output_path)

    def generate_voiceover_text(self, script: str, tone: str = "energetic") -> str:
        """
        Prepare voiceover narration text from a beat-marked script.

        Args:
            script: Script containing optional [BEAT] markers.
            tone: Desired narration tone descriptor.

        Returns:
            Clean narration text suitable for TTS.
        """
        cleaned = re.sub(r"\[BEAT\]", " ... ", script, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if tone:
            cleaned = f"[{tone} tone] {cleaned}"
        return cleaned

    def analyze_performance(self, video_data: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Analyze uploaded video performance and extract winning patterns.

        Args:
            video_data: List of video metrics and metadata dictionaries.

        Returns:
            Feedback analysis with patterns and strategy updates.
        """
        if not video_data:
            return {
                "summary": "No performance data available yet.",
                "winning_patterns": [],
                "strategy_updates": [],
            }

        prompt = (
            "You are a YouTube Shorts growth strategist. Analyze the following video "
            "performance data and return JSON with keys: summary (string), "
            "winning_patterns (list of strings), strategy_updates (list of strings), "
            "hook_recommendations (list of strings), visual_style_recommendations "
            "(list of strings), topics_to_double_down (list of strings), "
            "topics_to_avoid (list of strings).\n\n"
            f"VIDEO DATA:\n{json.dumps(video_data, indent=2)}"
        )
        try:
            response = self.client.models.generate_content(
                model=self.settings.gemini_text_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )
            text = response.text or "{}"
            return json.loads(self._extract_json(text))
        except Exception as exc:
            logger.exception("Performance analysis failed: %s", exc)
            return {
                "summary": f"Analysis failed: {exc}",
                "winning_patterns": [],
                "strategy_updates": ["Retry analytics after more views accumulate."],
            }

    def _build_topic_discovery_prompt(self, seed_topic: str, count: int) -> str:
        """Build prompt for viral Shorts topic discovery from a seed keyword."""
        return (
            f"You are an elite YouTube Shorts growth strategist. The creator's niche seed word is: "
            f'"{seed_topic}".\n\n'
            f"Research current YouTube Shorts culture mentally and propose {count} distinct Short "
            f"video concepts that could go viral in this niche RIGHT NOW.\n\n"
            "Return JSON with key 'trends' containing an array. Each item MUST include:\n"
            "- title (specific Short video title, max 80 chars)\n"
            "- overall_score (0-100 viral potential)\n"
            "- velocity_score (0-100, how fast it could spread)\n"
            "- competition_score (0-100, higher = more crowded)\n"
            "- shelf_life_prediction (e.g. '24h', '3d', '1w')\n"
            "- shorts_idea (exact Short angle/hook in one sentence)\n"
            "- target_audience (who watches this)\n"
            "- hook_strategy (pattern-interrupt for first 3 seconds)\n"
            "- why_viral (why this would perform on Shorts now)\n"
            "- selected (boolean, true for the best ideas)\n\n"
            "Rules:\n"
            f"- Every idea must clearly relate to '{seed_topic}' but feel fresh and clickable.\n"
            "- Favor ideas that are visually cinematic and work in 50-58 second AI-generated video.\n"
            "- Prefer concepts that work with abstract/product/B-roll visuals (no real people required).\n"
            "- Mix formats: myths debunked, shocking facts, tutorials, comparisons, story hooks.\n"
            "- Avoid generic titles; be specific and curiosity-driven.\n"
            "- Mark exactly the top ideas as selected=true.\n"
        )

    def _normalize_discovered_trends(
        self,
        trends: list[dict[str, Any]],
        seed_topic: str,
    ) -> list[dict[str, Any]]:
        """Normalize Gemini discovery output into pipeline trend records."""
        normalized: list[dict[str, Any]] = []
        for index, trend in enumerate(trends):
            title = str(trend.get("title", "")).strip()
            if not title:
                continue
            overall = float(trend.get("overall_score", 0) or 0)
            normalized.append(
                {
                    "title": title,
                    "overall_score": overall,
                    "velocity_score": float(trend.get("velocity_score", overall) or 0),
                    "competition_score": float(trend.get("competition_score", 50) or 50),
                    "shelf_life_prediction": str(
                        trend.get("shelf_life_prediction", "3d")
                    ),
                    "shorts_idea": trend.get("shorts_idea", ""),
                    "target_audience": trend.get("target_audience", ""),
                    "hook_strategy": trend.get("hook_strategy", ""),
                    "why_viral": trend.get("why_viral", ""),
                    "selected": bool(trend.get("selected", index < self.settings.videos_per_pipeline)),
                    "view_count": int(overall * 1000),
                    "source": "gemini_discovery",
                    "category": seed_topic,
                    "url": "",
                }
            )
        normalized.sort(key=lambda item: item.get("overall_score", 0), reverse=True)
        return normalized

    def _fallback_discovered_topics(self, seed_topic: str, count: int) -> list[dict[str, Any]]:
        """Heuristic topic ideas when Gemini discovery fails."""
        templates = [
            f"5 {seed_topic} mistakes everyone makes",
            f"The {seed_topic} hack nobody talks about",
            f"Why {seed_topic} is exploding on Shorts",
            f"{seed_topic} before vs after — shocking results",
            f"Stop doing THIS with {seed_topic}",
            f"The truth about {seed_topic} in 60 seconds",
        ]
        results: list[dict[str, Any]] = []
        for index, title in enumerate(templates[:count]):
            score = 90 - index * 5
            results.append(
                {
                    "title": title,
                    "overall_score": score,
                    "velocity_score": score,
                    "competition_score": 40 + index * 5,
                    "shelf_life_prediction": "3d",
                    "shorts_idea": f"Viral explainer Short about {title.lower()}",
                    "target_audience": f"{seed_topic} enthusiasts on YouTube",
                    "hook_strategy": "Open with a bold claim or question",
                    "why_viral": f"High curiosity angle in the {seed_topic} niche",
                    "selected": index < self.settings.videos_per_pipeline,
                    "view_count": score * 1000,
                    "source": "gemini_discovery_fallback",
                    "category": seed_topic,
                    "url": "",
                }
            )
        return results

    def _build_trend_analysis_prompt(self, trends: list[dict[str, Any]]) -> str:
        """Build structured JSON prompt for trend scoring."""
        trend_payload = [
            {
                "title": t.get("title", ""),
                "view_count": t.get("view_count", 0),
                "source": t.get("source", ""),
                "url": t.get("url", ""),
            }
            for t in trends
        ]
        return (
            "Analyze these YouTube trends for Shorts viral potential. "
            "Return a JSON object with key 'trends' containing an array. "
            "Each item must include: title, overall_score (0-100), velocity_score (0-100), "
            "competition_score (0-100, higher means more competition), "
            "shelf_life_prediction (string like '24h', '3d', '1w'), "
            "shorts_idea (specific Short angle), target_audience, hook_strategy, "
            "and selected (boolean, true for top opportunities).\n\n"
            "Prioritize trends that are: visually cinematic, explainable in 50-58 seconds, "
            "emotionally engaging, and suitable for AI video generation with clear scenes.\n\n"
            f"TRENDS:\n{json.dumps(trend_payload, indent=2)}"
        )

    def _build_content_package_prompt(self, trend: dict[str, Any]) -> str:
        """Build prompt for full Short content package generation."""
        return (
            "Create a complete YouTube Short content package as JSON with these keys:\n"
            "- title (max 70 chars, curiosity-driven)\n"
            "- hook_text (first 3 seconds, pattern interrupt)\n"
            "- script (50-58 seconds when spoken, include [BEAT] markers every 5-8 seconds)\n"
            "- visual_prompt (master cinematic direction for the entire Short)\n"
            "- scene_breakdown (array of 6-7 objects with: beat_number, duration_seconds (~8), "
            "scene_prompt (detailed Veo prompt with camera movement, lighting, motion, ambient audio), "
            "narration_line matching the script beat)\n"
            "- caption_text (YouTube description with hashtags)\n"
            "- tags (array of 15 SEO tags)\n"
            "- thumbnail_prompt (bold visual for 9:16 thumbnail)\n"
            "- voice_tone (e.g. energetic, authoritative, curious)\n\n"
            "CRITICAL: Scene prompts must be MEANINGFUL and DIRECTLY RELEVANT to the trend topic. "
            "Each scene should visually illustrate the narration beat — not generic B-roll. "
            "Do NOT require real human faces or identifiable people; use cinematic objects, "
            "environments, motion graphics, hands-only shots, or stylized visuals instead. "
            "Include native motion, camera movement (dolly, pan, tracking), lighting mood, "
            "and ambient audio cues in every scene_prompt.\n\n"
            f"TREND DATA:\n{json.dumps(trend, indent=2)}"
        )

    def _normalize_content_package(
        self,
        package: dict[str, Any],
        trend: dict[str, Any],
    ) -> dict[str, Any]:
        """Ensure content package has all required fields."""
        title = package.get("title") or trend.get("title", "Untitled Short")
        tags = package.get("tags", [])
        if isinstance(tags, list):
            tags_str = ", ".join(str(tag) for tag in tags)
        else:
            tags_str = str(tags)

        scene_breakdown = package.get("scene_breakdown", [])
        max_scenes = max(1, self.settings.segments_per_video)
        if len(scene_breakdown) > max_scenes:
            scene_breakdown = scene_breakdown[:max_scenes]
        visual_prompt = package.get("visual_prompt", "")
        if scene_breakdown and not visual_prompt:
            visual_prompt = " | ".join(
                scene.get("scene_prompt", "") for scene in scene_breakdown[:3]
            )

        return {
            "title": title[:100],
            "hook_text": package.get("hook_text", title),
            "script": package.get("script", ""),
            "visual_prompt": visual_prompt,
            "scene_breakdown": scene_breakdown,
            "caption_text": package.get("caption_text", ""),
            "tags": tags_str,
            "thumbnail_prompt": package.get(
                "thumbnail_prompt",
                f"YouTube Shorts thumbnail about {title}",
            ),
            "voice_tone": package.get("voice_tone", "energetic"),
        }

    def _fallback_trend_analysis(self, trends: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Provide heuristic scoring when Gemini is unavailable."""
        results: list[dict[str, Any]] = []
        max_views = max((t.get("view_count", 0) for t in trends), default=1) or 1
        for index, trend in enumerate(trends):
            view_ratio = trend.get("view_count", 0) / max_views
            overall = round(min(95, 40 + view_ratio * 55 - index * 1.5), 1)
            results.append(
                {
                    "title": trend.get("title", ""),
                    "overall_score": overall,
                    "velocity_score": round(view_ratio * 100, 1),
                    "competition_score": round(50 + index * 2, 1),
                    "shelf_life_prediction": "48h" if view_ratio > 0.5 else "1w",
                    "shorts_idea": f"Quick explainer Short about {trend.get('title', 'this trend')}",
                    "target_audience": "General YouTube audience",
                    "hook_strategy": "Open with a surprising fact or question",
                    "selected": index < 4,
                    **trend,
                }
            )
        return results

    def _fallback_content_package(self, trend: dict[str, Any]) -> dict[str, Any]:
        """Generate minimal content package when Gemini fails."""
        title = trend.get("title", "Trending Now")
        topic = title[:60]
        script = (
            f"[BEAT] Did you know about {topic}? [BEAT] "
            f"Here's why everyone is talking about it right now. [BEAT] "
            f"The key insight changes how you see this trend. [BEAT] "
            f"Watch closely — this is the moment that matters. [BEAT] "
            f"Now you understand what makes {topic} explode on Shorts. [BEAT] "
            f"Follow for more breakdowns like this."
        )
        scenes = []
        beats = script.split("[BEAT]")
        for index, beat in enumerate(beats[1:], start=1):
            narration = beat.strip()
            scenes.append(
                {
                    "beat_number": index,
                    "duration_seconds": 8,
                    "scene_prompt": (
                        f"Cinematic 9:16 vertical shot illustrating: {topic}. "
                        f"Scene {index}: {narration}. "
                        "Dynamic camera movement, dramatic lighting, native ambient audio, "
                        "photorealistic motion, emotionally relevant visuals tied to the topic."
                    ),
                    "narration_line": narration,
                }
            )
        return {
            "title": f"{topic} — Explained in 60 Seconds",
            "hook_text": f"Stop scrolling — {topic} is bigger than you think.",
            "script": script,
            "visual_prompt": f"Cinematic documentary-style Short about {topic}",
            "scene_breakdown": scenes,
            "caption_text": f"{topic}\n\n#shorts #trending #viral",
            "tags": "shorts, trending, viral, youtube shorts, " + topic.replace(" ", ", "),
            "thumbnail_prompt": f"Dramatic close-up visual representing {topic}, bold colors",
            "voice_tone": "energetic",
        }

    def _generate_fallback_thumbnail(self, prompt: str, output_path: Path) -> Path:
        """Create a simple gradient thumbnail when image generation fails."""
        width, height = 1080, 1920
        image = Image.new("RGB", (width, height), color=(18, 18, 28))
        draw = ImageDraw.Draw(image)
        for y in range(height):
            ratio = y / height
            color = (
                int(220 * (1 - ratio) + 30 * ratio),
                int(40 * (1 - ratio) + 20 * ratio),
                int(80 * (1 - ratio) + 120 * ratio),
            )
            draw.line([(0, y), (width, y)], fill=color)

        text = (prompt[:80] + "...") if len(prompt) > 80 else prompt
        try:
            font = ImageFont.truetype("arial.ttf", 48)
        except OSError:
            font = ImageFont.load_default()
        draw.text((60, height // 2), text, fill="white", font=font, spacing=8)
        image.save(output_path, format="PNG")
        return output_path

    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract JSON object or array from model response text."""
        text = text.strip()
        if text.startswith("{") or text.startswith("["):
            return text
        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        return match.group(1) if match else text
