"""Portable Redis download and startup for Windows (no winget/choco required)."""

from __future__ import annotations

import logging
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

logger = logging.getLogger(__name__)

REDIS_VERSION = "5.0.14.1"
REDIS_ZIP_URL = (
    f"https://github.com/tporadowski/redis/releases/download/v{REDIS_VERSION}/"
    f"Redis-x64-{REDIS_VERSION}.zip"
)


def redis_server_path(tools_dir: Path) -> Path:
    """Return expected redis-server.exe path inside tools directory."""
    return tools_dir / "redis" / f"Redis-x64-{REDIS_VERSION}" / "redis-server.exe"


def download_portable_redis(tools_dir: Path) -> Path | None:
    """
    Download and extract portable Redis for Windows.

    Args:
        tools_dir: Project tools directory.

    Returns:
        Path to redis-server.exe or None on failure.
    """
    tools_dir.mkdir(parents=True, exist_ok=True)
    server = redis_server_path(tools_dir)
    if server.exists():
        return server

    zip_path = tools_dir / f"Redis-x64-{REDIS_VERSION}.zip"
    extract_root = tools_dir / "redis"

    try:
        logger.info("Downloading portable Redis for Windows...")
        urlretrieve(REDIS_ZIP_URL, zip_path)  # noqa: S310
        extract_root.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path, "r") as archive:
            archive.extractall(extract_root)
        zip_path.unlink(missing_ok=True)
        if server.exists():
            logger.info("Portable Redis ready at %s", server.parent)
            return server
    except Exception as exc:
        logger.warning("Portable Redis download failed: %s", exc)

    return None


def start_portable_redis(tools_dir: Path) -> subprocess.Popen | None:
    """
    Start portable redis-server if available.

    Args:
        tools_dir: Project tools directory.

    Returns:
        Popen process handle or None.
    """
    server = redis_server_path(tools_dir)
    if not server.exists():
        server = download_portable_redis(tools_dir)
    if not server or not Path(server).exists():
        return None

    conf = Path(server).parent / "redis.windows.conf"
    cmd = [str(server)]
    if conf.exists():
        cmd.extend([str(conf)])

    popen_kwargs: dict = {
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }
    if sys.platform == "win32":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]

    proc = subprocess.Popen(cmd, **popen_kwargs)
    time.sleep(2)
    return proc
