"""FFmpeg binary resolution with bundled fallbacks (no system install required)."""

from __future__ import annotations

import logging
import re
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PORTABLE_FFMPEG = PROJECT_ROOT / "tools" / "ffmpeg" / "bin" / "ffmpeg.exe"
PORTABLE_FFPROBE = PROJECT_ROOT / "tools" / "ffmpeg" / "bin" / "ffprobe.exe"


@lru_cache(maxsize=1)
def get_ffmpeg_exe() -> str:
    """
    Resolve FFmpeg executable: PATH, imageio-ffmpeg bundle, or portable tools dir.

    Returns:
        Absolute path or command name for ffmpeg.

    Raises:
        RuntimeError: If no FFmpeg binary can be found.
    """
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    if PORTABLE_FFMPEG.exists():
        return str(PORTABLE_FFMPEG)

    try:
        import imageio_ffmpeg

        bundled = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled and Path(bundled).exists():
            logger.info("Using bundled FFmpeg from imageio-ffmpeg")
            return bundled
    except Exception as exc:
        logger.debug("imageio-ffmpeg unavailable: %s", exc)

    raise RuntimeError(
        "FFmpeg not found. Run: python run.py --setup  "
        "(installs imageio-ffmpeg automatically)"
    )


@lru_cache(maxsize=1)
def get_ffprobe_exe() -> str | None:
    """Resolve ffprobe if available; optional when ffmpeg can probe duration."""
    system_ffprobe = shutil.which("ffprobe")
    if system_ffprobe:
        return system_ffprobe
    if PORTABLE_FFPROBE.exists():
        return str(PORTABLE_FFPROBE)
    return None


def verify_ffmpeg_available() -> bool:
    """Return True if FFmpeg can be resolved."""
    try:
        get_ffmpeg_exe()
        return True
    except RuntimeError:
        return False


def get_video_duration_seconds(video_path: Path) -> float:
    """
    Get video duration using ffprobe or ffmpeg fallback.

    Args:
        video_path: Path to video file.

    Returns:
        Duration in seconds, or 0.0 if unknown.
    """
    ffprobe = get_ffprobe_exe()
    if ffprobe:
        result = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(video_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        try:
            return float(result.stdout.strip())
        except ValueError:
            pass

    ffmpeg = get_ffmpeg_exe()
    result = subprocess.run(
        [ffmpeg, "-i", str(video_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    output = (result.stderr or "") + (result.stdout or "")
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", output)
    if not match:
        return 0.0
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def run_ffmpeg(cmd_args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    """
    Run ffmpeg with resolved binary path.

    Args:
        cmd_args: Arguments after the ffmpeg executable name.
        check: Raise on non-zero exit code.

    Returns:
        Completed subprocess result.
    """
    ffmpeg = get_ffmpeg_exe()
    full_cmd = [ffmpeg, *cmd_args]
    return subprocess.run(full_cmd, capture_output=True, text=True, check=check)
