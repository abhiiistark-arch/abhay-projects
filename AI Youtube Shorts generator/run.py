#!/usr/bin/env python3
"""
One-command launcher for the YouTube Shorts pipeline (local, no Docker).

Usage:
    python run.py
    python run.py --setup    # force reinstall dependencies
    python run.py --no-browser
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

# Allow importing app utilities after venv bootstrap
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    import urllib.request
except ImportError:
    urllib = None  # type: ignore

PROJECT_ROOT = Path(__file__).resolve().parent
VENV_DIR = PROJECT_ROOT / ".venv"
ENV_FILE = PROJECT_ROOT / ".env"
ENV_EXAMPLE = PROJECT_ROOT / ".env.example"

IS_WINDOWS = sys.platform == "win32"
PYTHON = VENV_DIR / ("Scripts/python.exe" if IS_WINDOWS else "bin/python")
PIP = VENV_DIR / ("Scripts/pip.exe" if IS_WINDOWS else "bin/pip")
PLAYWRIGHT = VENV_DIR / ("Scripts/playwright.exe" if IS_WINDOWS else "bin/playwright")

API_HOST = "127.0.0.1"
API_PORT = 8000
HEALTH_URL = f"http://{API_HOST}:{API_PORT}/api/health"

TOOLS_DIR = PROJECT_ROOT / "tools"

PROCESSES: list[subprocess.Popen] = []
RUNTIME_ENV: dict[str, str] = {}
def log(msg: str, level: str = "info") -> None:
    """Print a formatted log line."""
    colors = {"info": "", "ok": "\033[92m", "warn": "\033[93m", "err": "\033[91m", "head": "\033[96m"}
    reset = "\033[0m" if level in colors and colors[level] else ""
    prefix = {"ok": "[OK]", "warn": "[WARN]", "err": "[FAIL]", "head": "===", "info": "..."}
    print(f"{colors.get(level, '')}{prefix.get(level, '')} {msg}{reset}")


def venv_python() -> Path:
    """Return path to venv Python executable."""
    return PYTHON


def run_cmd(cmd: list[str], *, check: bool = True, cwd: Path | None = None) -> subprocess.CompletedProcess:
    """Run a subprocess command."""
    return subprocess.run(
        cmd,
        cwd=cwd or PROJECT_ROOT,
        check=check,
        text=True,
        capture_output=True,
    )


def ensure_venv(force_setup: bool = False) -> None:
    """Create virtual environment and install dependencies if needed."""
    if force_setup and VENV_DIR.exists():
        log("Removing existing .venv for fresh setup...", "warn")

    if not PYTHON.exists():
        log("Creating virtual environment...", "head")
        run_cmd([sys.executable, "-m", "venv", str(VENV_DIR)])

    log("Installing / updating Python packages...", "info")
    run_cmd([str(PYTHON), "-m", "pip", "install", "--upgrade", "pip"], check=False)
    run_cmd([str(PIP), "install", "-r", "requirements.txt"])

    log("Ensuring Playwright Chromium is installed...", "info")
    run_cmd([str(PLAYWRIGHT), "install", "chromium"], check=False)

    for folder in ("data/output", "data/temp", "data/thumbnails", "data/cookies"):
        (PROJECT_ROOT / folder).mkdir(parents=True, exist_ok=True)

    log("Virtual environment ready.", "ok")


def fix_env_local() -> None:
    """Configure .env for secure local operation without printing secrets."""
    if not ENV_FILE.exists():
        if ENV_EXAMPLE.exists():
            shutil.copy(ENV_EXAMPLE, ENV_FILE)
            log("Created .env from .env.example — add GEMINI_API_KEY before continuing.", "warn")
        else:
            log(".env missing and no .env.example found.", "err")
            sys.exit(1)

    replacements = {
        r"^REDIS_URL=.*": "REDIS_URL=redis://127.0.0.1:6379/0",
        r"^CELERY_BROKER_URL=.*": "CELERY_BROKER_URL=redis://127.0.0.1:6379/0",
        r"^CELERY_RESULT_BACKEND=.*": "CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/1",
        r"^API_HOST=.*": "API_HOST=127.0.0.1",
        r"^DEBUG=.*": "DEBUG=false",
        r"^LOCAL_ONLY=.*": "LOCAL_ONLY=true",
    }

    lines = ENV_FILE.read_text(encoding="utf-8").splitlines()
    new_lines: list[str] = []
    seen_local_only = False

    for line in lines:
        updated = line
        for pattern, replacement in replacements.items():
            if re.match(pattern, line):
                updated = replacement
                if pattern.startswith("^LOCAL_ONLY"):
                    seen_local_only = True
                break
        new_lines.append(updated)

    if not seen_local_only:
        new_lines.append("LOCAL_ONLY=true")

    ENV_FILE.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    log(".env configured for secure local run.", "ok")


def env_has_gemini_key() -> bool:
    """Check GEMINI_API_KEY is set without reading the value aloud."""
    if not ENV_FILE.exists():
        return False
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if line.startswith("GEMINI_API_KEY="):
            value = line.split("=", 1)[1].strip()
            return bool(value) and value not in {"your_gemini_api_key_here", "your_key_here"}
    return False


def ping_redis() -> bool:
    """Return True if Redis responds on localhost."""
    redis_cli = shutil.which("redis-cli")
    if redis_cli:
        result = subprocess.run(
            [redis_cli, "ping"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if "PONG" in (result.stdout or "").upper():
            return True

    try:
        import redis

        client = redis.Redis(host="127.0.0.1", port=6379, socket_connect_timeout=2)
        return bool(client.ping())
    except Exception:
        return False


def try_start_portable_redis() -> bool:
    """Download and start portable Redis on Windows if not already running."""
    try:
        from app.utils.redis_tools import start_portable_redis

        log("Attempting portable Redis (auto-download, no winget/choco)...", "info")
        proc = start_portable_redis(TOOLS_DIR)
        if proc is None:
            return False
        PROCESSES.append(proc)
        time.sleep(2)
        if ping_redis():
            log("Portable Redis is running.", "ok")
            return True
        log("Portable Redis started but not responding yet.", "warn")
        return False
    except Exception as exc:
        log(f"Portable Redis setup failed: {exc}", "warn")
        return False


def ensure_ffmpeg() -> bool:
    """Ensure FFmpeg is available via PATH or bundled imageio-ffmpeg."""
    if shutil.which("ffmpeg"):
        log("FFmpeg found on system PATH.", "ok")
        return True

    env = {**os.environ, "PYTHONPATH": str(PROJECT_ROOT)}
    check = subprocess.run(
        [
            str(PYTHON),
            "-c",
            "from app.utils.ffmpeg_tools import verify_ffmpeg_available; "
            "raise SystemExit(0 if verify_ffmpeg_available() else 1)",
        ],
        cwd=PROJECT_ROOT,
        env=env,
        capture_output=True,
    )
    if check.returncode == 0:
        log("FFmpeg available via bundled imageio-ffmpeg.", "ok")
        return True

    log("Installing bundled FFmpeg (imageio-ffmpeg)...", "info")
    run_cmd([str(PIP), "install", "imageio-ffmpeg>=0.5.1"], check=False)
    check = subprocess.run(
        [
            str(PYTHON),
            "-c",
            "from app.utils.ffmpeg_tools import verify_ffmpeg_available; "
            "raise SystemExit(0 if verify_ffmpeg_available() else 1)",
        ],
        cwd=PROJECT_ROOT,
        env=env,
        capture_output=True,
    )
    if check.returncode == 0:
        log("FFmpeg ready via imageio-ffmpeg (no manual install needed).", "ok")
        return True

    log("FFmpeg still unavailable after bundled install.", "err")
    log("Manual option: download from https://www.gyan.dev/ffmpeg/builds/ to tools/ffmpeg/", "warn")
    return False


def configure_runtime_mode(use_redis: bool = True) -> bool:
    """
    Configure Redis worker mode or in-process SYNC_MODE.

    Returns:
        True if sync mode is active (no separate Celery worker needed).
    """
    if ping_redis():
        log("Redis is running — using Celery worker mode.", "ok")
        RUNTIME_ENV["SYNC_MODE"] = "false"
        return False

    if use_redis and try_start_portable_redis():
        log("Using portable Redis + Celery worker mode.", "ok")
        RUNTIME_ENV["SYNC_MODE"] = "false"
        return False

    log("Redis unavailable — enabling SYNC_MODE (no Redis needed).", "warn")
    RUNTIME_ENV["SYNC_MODE"] = "true"
    RUNTIME_ENV["CELERY_BROKER_URL"] = "memory://"
    RUNTIME_ENV["CELERY_RESULT_BACKEND"] = "cache+memory://"
    return True


def wait_for_api(timeout: int = 60) -> bool:
    """Wait until the API health endpoint responds."""
    if urllib is None:
        time.sleep(3)
        return True

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(HEALTH_URL, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(1)
    return False


def spawn_process(name: str, cmd: list[str]) -> subprocess.Popen:
    """Spawn a background child process."""
    log(f"Starting {name}...", "info")
    creationflags = 0
    if IS_WINDOWS:
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]

    proc = subprocess.Popen(
        cmd,
        cwd=PROJECT_ROOT,
        env={**os.environ, **RUNTIME_ENV, "PYTHONPATH": str(PROJECT_ROOT)},
        creationflags=creationflags,
    )
    PROCESSES.append(proc)
    return proc


def shutdown(_signum: int | None = None, _frame: object | None = None) -> None:
    """Terminate all child processes."""
    log("Shutting down pipeline services...", "warn")
    for proc in PROCESSES:
        try:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        except Exception:
            pass
    log("Stopped.", "ok")
    sys.exit(0)


def main() -> None:
    """Launch the full local pipeline with one command."""
    parser = argparse.ArgumentParser(description="Run YouTube Shorts pipeline locally")
    parser.add_argument("--setup", action="store_true", help="Reinstall dependencies")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the dashboard")
    parser.add_argument(
        "--sync-only",
        action="store_true",
        help="Skip Redis download; run in-process sync mode",
    )
    args = parser.parse_args()

    os.chdir(PROJECT_ROOT)
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    if IS_WINDOWS:
        signal.signal(signal.SIGBREAK, shutdown)  # type: ignore[attr-defined]

    print()
    log("ShortsForge AI — One-Command Launcher", "head")
    print()

    ensure_venv(force_setup=args.setup)
    fix_env_local()

    if not env_has_gemini_key():
        log("GEMINI_API_KEY is missing in .env — add your key and run again.", "err")
        sys.exit(1)

    sync_mode = configure_runtime_mode(use_redis=not args.sync_only)

    if not ensure_ffmpeg():
        sys.exit(1)

    py = str(venv_python())

    spawn_process(
        "API Server",
        [py, "-m", "uvicorn", "app.main:app", "--host", API_HOST, "--port", str(API_PORT), "--reload"],
    )

    if sync_mode:
        log("Skipping Celery worker (SYNC_MODE — tasks run inside API process).", "info")
    else:
        time.sleep(2)
        spawn_process(
            "Celery Worker",
            [
                py,
                "-m",
                "celery",
                "-A",
                "app.workers.celery_tasks",
                "worker",
                "--loglevel=info",
                "--pool=threads",
                "--concurrency=4",
            ],
        )

    log("Waiting for API to be ready...", "info")
    if wait_for_api():
        log(f"Dashboard ready: http://{API_HOST}:{API_PORT}", "ok")
        if not args.no_browser:
            webbrowser.open(f"http://{API_HOST}:{API_PORT}")
    else:
        log("API did not start in time — check logs above.", "warn")

    print()
    log("Pipeline is running. Click START PIPELINE on the dashboard.", "ok")
    log("Press Ctrl+C here to stop everything.", "info")
    print()

    try:
        while True:
            for proc in PROCESSES:
                if proc.poll() is not None:
                    log(f"A service exited unexpectedly (code {proc.returncode}).", "err")
                    shutdown()
            time.sleep(2)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
