"""Veo 3.1 video generation and FFmpeg concatenation services."""

from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from app.config import Settings, get_settings
from app.utils.ffmpeg_tools import get_video_duration_seconds, run_ffmpeg

logger = logging.getLogger(__name__)


class VideoGenerator:
    """Generate Shorts using Veo 3.1 clips and FFmpeg assembly."""

    POLL_INTERVAL_SECONDS = 10

    def __init__(self, settings: Settings | None = None) -> None:
        """Initialize video generator with Gemini/Veo client."""
        self.settings = settings or get_settings()
        self.client = genai.Client(api_key=self.settings.get_gemini_api_key())
        self.max_poll_seconds = max(120, int(self.settings.veo_poll_max_seconds))

    def generate_complete_short(
        self,
        content_package: dict[str, Any],
        project_id: int,
    ) -> Path:
        """
        Generate a complete Short from a content package.

        Args:
            content_package: Generated script, scenes, and visual prompts.
            project_id: Database project identifier for output naming.

        Returns:
            Path to the final concatenated MP4 file.
        """
        output_path = self.settings.output_dir / f"short_{project_id}.mp4"
        temp_dir = self.settings.temp_dir / f"project_{project_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        clip_paths: list[Path] = []

        try:
            scene_prompts = self._generate_scene_prompts(content_package)
            segment_cap = max(1, self.settings.segments_per_video)
            if scene_prompts:
                scene_prompts = scene_prompts[:segment_cap]
            num_segments = len(scene_prompts) or segment_cap
            clip_paths = self.generate_video_segments(
                visual_prompt=content_package.get("visual_prompt", ""),
                num_segments=num_segments,
                scene_prompts=scene_prompts,
                temp_dir=temp_dir,
            )
            if not clip_paths:
                raise RuntimeError("No video clips were generated")

            self._concatenate_clips(clip_paths, output_path)
            return output_path
        finally:
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)

    def generate_video_segments(
        self,
        visual_prompt: str,
        num_segments: int,
        scene_prompts: list[str] | None = None,
        temp_dir: Path | None = None,
    ) -> list[Path]:
        """
        Generate multiple Veo video clips for a Short.

        Args:
            visual_prompt: Master visual direction for the Short.
            num_segments: Number of ~8 second clips to generate.
            scene_prompts: Optional per-scene prompts (preferred).
            temp_dir: Directory for temporary clip files.

        Returns:
            List of paths to generated clip MP4 files.
        """
        work_dir = temp_dir or (self.settings.temp_dir / "segments")
        work_dir.mkdir(parents=True, exist_ok=True)

        prompts = scene_prompts or self._generate_scene_prompts(
            {"visual_prompt": visual_prompt, "scene_breakdown": []}
        )
        if not prompts:
            prompts = [
                (
                    f"{visual_prompt}. Scene {index + 1} of {num_segments}. "
                    "Cinematic vertical 9:16, dynamic camera movement, "
                    "native motion, dramatic lighting, ambient audio."
                )
                for index in range(num_segments)
            ]
        prompts = prompts[:num_segments]

        clip_paths: list[Path] = []
        for index, prompt in enumerate(prompts):
            clip_path = work_dir / f"clip_{index:02d}.mp4"
            try:
                self._generate_veo_clip(
                    prompt=prompt,
                    output_path=clip_path,
                    aspect_ratio="9:16",
                    resolution="720p",
                )
                clip_paths.append(clip_path)
            except Exception as exc:
                logger.exception("Failed to generate clip %s: %s", index, exc)
                if clip_paths:
                    continue
                raise
        return clip_paths

    def _generate_scene_prompts(self, content_package: dict[str, Any]) -> list[str]:
        """
        Extract meaningful per-scene Veo prompts from content package.

        Args:
            content_package: Content package with scene_breakdown array.

        Returns:
            List of detailed scene prompts tied to narration beats.
        """
        scene_breakdown = content_package.get("scene_breakdown", [])
        master_prompt = content_package.get("visual_prompt", "")
        title = content_package.get("title", "")

        prompts: list[str] = []
        for scene in scene_breakdown:
            scene_prompt = scene.get("scene_prompt", "")
            narration = scene.get("narration_line", "")
            beat = scene.get("beat_number", len(prompts) + 1)
            if scene_prompt:
                full_prompt = (
                    f"YouTube Short scene {beat} about '{title}'. "
                    f"{scene_prompt} "
                    f"Visual must directly illustrate: {narration}. "
                    "Vertical 9:16 cinematic video with native motion, "
                    "camera movement, realistic lighting, and ambient sound. "
                    f"Consistent style with master direction: {master_prompt}"
                )
                prompts.append(full_prompt.strip())

        if not prompts and master_prompt:
            for index in range(self.settings.segments_per_video):
                prompts.append(
                    f"Scene {index + 1} for Short '{title}'. {master_prompt}. "
                    "Meaningful visuals directly relevant to the topic. "
                    "9:16 vertical, cinematic motion, ambient audio."
                )
        return prompts

    def _generate_veo_clip(
        self,
        prompt: str,
        output_path: Path,
        aspect_ratio: str = "9:16",
        resolution: str = "720p",
    ) -> Path:
        """
        Generate a single video clip using Veo 3.1.

        Args:
            prompt: Detailed cinematic generation prompt.
            output_path: Destination MP4 path.
            aspect_ratio: Video aspect ratio (9:16 for Shorts).
            resolution: Output resolution (720p or 1080p).

        Returns:
            Path to saved clip file.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)

        config_kwargs: dict[str, Any] = {
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "number_of_videos": 1,
        }
        person_generation = (self.settings.veo_person_generation or "").strip().lower()
        if person_generation and person_generation not in {"none", "skip", "off"}:
            config_kwargs["person_generation"] = person_generation

        try:
            operation = self._start_veo_generation(prompt, config_kwargs)
        except Exception as exc:
            if "person_generation" in config_kwargs and self._is_person_generation_error(exc):
                logger.warning(
                    "Veo rejected person_generation=%s; retrying without person_generation",
                    config_kwargs.pop("person_generation"),
                )
                operation = self._start_veo_generation(prompt, config_kwargs)
            else:
                raise

        elapsed = 0
        while not operation.done and elapsed < self.max_poll_seconds:
            time.sleep(self.POLL_INTERVAL_SECONDS)
            elapsed += self.POLL_INTERVAL_SECONDS
            operation = self.client.operations.get(operation)
            logger.info("Veo generation polling... %ss elapsed", elapsed)

        if not operation.done:
            raise TimeoutError(f"Veo generation timed out after {self.max_poll_seconds}s")

        if not operation.response or not operation.response.generated_videos:
            raise RuntimeError("Veo returned no generated videos")

        generated_video = operation.response.generated_videos[0]
        self.client.files.download(file=generated_video.video)
        generated_video.video.save(str(output_path))
        logger.info("Saved Veo clip to %s", output_path)
        return output_path

    def _start_veo_generation(self, prompt: str, config_kwargs: dict[str, Any]) -> Any:
        """Start a Veo video generation operation."""
        return self.client.models.generate_videos(
            model=self.settings.veo_model,
            prompt=prompt,
            config=types.GenerateVideosConfig(**config_kwargs),
        )

    @staticmethod
    def _is_person_generation_error(exc: Exception) -> bool:
        """Return True when Veo rejected the personGeneration setting."""
        message = str(exc).lower()
        return "persongeneration" in message or "person_generation" in message

    def _concatenate_clips(self, clip_paths: list[Path], output_path: Path) -> Path:
        """
        Concatenate clips with FFmpeg into a final 1080x1920 30fps MP4.

        Args:
            clip_paths: Ordered list of clip file paths.
            output_path: Final output video path.

        Returns:
            Path to concatenated video file.
        """
        if not clip_paths:
            raise ValueError("No clips provided for concatenation")

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".txt",
            delete=False,
            encoding="utf-8",
        ) as concat_file:
            for clip in clip_paths:
                safe_path = str(clip.resolve()).replace("\\", "/")
                concat_file.write(f"file '{safe_path}'\n")
            concat_list_path = concat_file.name

        filter_complex = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,"
            "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[vout]"
        )

        cmd = [
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_list_path,
            "-filter_complex",
            filter_complex,
            "-map",
            "[vout]",
            "-map",
            "0:a?",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(output_path),
        ]

        try:
            result = run_ffmpeg(cmd, check=False)
            if result.returncode != 0:
                logger.warning("Filter concat failed, trying simple concat: %s", result.stderr)
                self._simple_concat(clip_paths, output_path)

            duration = get_video_duration_seconds(output_path)
            max_duration = float(self.settings.max_video_duration_seconds)
            if duration > max_duration:
                self._trim_video(output_path, max_duration)

            return output_path
        finally:
            Path(concat_list_path).unlink(missing_ok=True)

    def _simple_concat(self, clip_paths: list[Path], output_path: Path) -> None:
        """Fallback concatenation using filter_complex concat."""
        inputs: list[str] = []
        filter_parts: list[str] = []
        for index, clip in enumerate(clip_paths):
            inputs.extend(["-i", str(clip)])
            filter_parts.append(
                f"[{index}:v]scale=1080:1920:force_original_aspect_ratio=decrease,"
                f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{index}]"
            )

        concat_inputs = "".join(f"[v{index}]" for index in range(len(clip_paths)))
        filter_complex = (
            ";".join(filter_parts)
            + f";{concat_inputs}concat=n={len(clip_paths)}:v=1:a=0[vout]"
        )

        cmd = [
            "-y",
            *inputs,
            "-filter_complex",
            filter_complex,
            "-map",
            "[vout]",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
        run_ffmpeg(cmd, check=True)

    def _get_video_duration(self, video_path: Path) -> float:
        """Get video duration in seconds."""
        return get_video_duration_seconds(video_path)

    def _trim_video(self, video_path: Path, max_seconds: float) -> None:
        """Trim video to maximum duration."""
        trimmed = video_path.with_suffix(".trimmed.mp4")
        run_ffmpeg(
            [
                "-y",
                "-i",
                str(video_path),
                "-t",
                str(max_seconds),
                "-c",
                "copy",
                str(trimmed),
            ],
            check=True,
        )
        trimmed.replace(video_path)
