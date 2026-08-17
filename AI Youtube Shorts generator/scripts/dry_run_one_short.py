"""End-to-end dry run: 1 topic, 1 Short, 1 Veo clip, upload validation."""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Fast, safe dry-run defaults (override .env for this process only)
os.environ.setdefault("SYNC_MODE", "true")
os.environ.setdefault("VIDEOS_PER_PIPELINE", "1")
os.environ.setdefault("SEGMENTS_PER_VIDEO", "1")
os.environ.setdefault("TOP_TRENDS_COUNT", "4")
os.environ.setdefault("VEO_PERSON_GENERATION", "")
os.environ.setdefault("VEO_POLL_MAX_SECONDS", "900")
os.environ.setdefault("YOUTUBE_UPLOAD_PRIVACY", "UNLISTED")

from app.config import clear_settings_cache, get_settings  # noqa: E402
from app.models.database import PipelineRun, VideoProject, get_db_read_session, init_db  # noqa: E402
from app.security import install_secret_redaction  # noqa: E402
from app.utils.ffmpeg_tools import verify_ffmpeg_available  # noqa: E402
from app.workers.celery_tasks import run_full_pipeline  # noqa: E402

install_secret_redaction()
clear_settings_cache()
settings = get_settings()
init_db()

SEED_TOPIC = (sys.argv[1] if len(sys.argv) > 1 else "fitness").strip().lower()


def main() -> int:
    print("=== ShortsForge dry run (1 video, 1 clip) ===")
    print(f"Topic: {SEED_TOPIC}")
    print(f"FFmpeg: {'OK' if verify_ffmpeg_available() else 'MISSING'}")
    print(f"Gemini key: {'OK' if settings.gemini_api_key_configured() else 'MISSING'}")
    print(f"YouTube OAuth: {'OK' if settings.youtube_api_configured() else 'not configured (upload will fail)'}")
    print()

    if not settings.gemini_api_key_configured():
        print("ERROR: GEMINI_API_KEY not configured")
        return 1
    if not verify_ffmpeg_available():
        print("ERROR: FFmpeg not available")
        return 1

    from app.models.database import get_db_session

    with get_db_session() as session:
        run = PipelineRun(status="running", started_at=datetime.utcnow(), seed_topic=SEED_TOPIC)
        session.add(run)
        session.flush()
        run_id = run.id

    print(f"Pipeline run #{run_id} starting...")
    try:
        result = run_full_pipeline.apply(args=[run_id, SEED_TOPIC])
        print("Pipeline result:", result)
    except Exception as exc:
        print(f"Pipeline raised: {exc}")
        return 1

    with get_db_read_session() as session:
        run = session.get(PipelineRun, run_id)
        projects = session.query(VideoProject).filter(VideoProject.pipeline_run_id == run_id).all()

    print()
    print("=== Results ===")
    if run:
        print(f"Status: {run.status}")
        print(f"Generated: {run.videos_generated}")
        print(f"Uploaded: {run.videos_uploaded}")
        if run.errors:
            print(f"Errors: {run.errors[:500]}")

    ok = False
    for project in projects:
        print(f"- Project #{project.id}: {project.status} | {project.title[:60]}")
        if project.video_path:
            path = Path(project.video_path)
            exists = path.exists()
            size = path.stat().st_size if exists else 0
            print(f"  Video: {path} ({size} bytes, exists={exists})")
            ok = ok or (exists and size > 1024)
        if project.youtube_video_id:
            print(f"  YouTube ID: {project.youtube_video_id}")
        if project.error_message:
            print(f"  Error: {project.error_message[:200]}")
        ok = ok or project.status == "uploaded"

    if run and (run.videos_generated or 0) >= 1:
        print()
        print("DRY RUN PASSED: at least one Short was generated.")
        if (run.videos_uploaded or 0) >= 1:
            print("Upload step validated.")
        elif not settings.youtube_api_configured():
            print("Upload skipped (OAuth not configured). Run scripts/youtube_oauth_setup.py")
        return 0

    print()
    print("DRY RUN FAILED: no video was generated.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
