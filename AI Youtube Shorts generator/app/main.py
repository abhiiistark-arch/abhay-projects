"""FastAPI application with dashboard and pipeline control API."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.models.database import (
    PipelineRun,
    Trend,
    VideoProject,
    get_db_read_session,
    get_db_session,
    init_db,
)
from app.security import (
    assert_env_not_world_readable,
    install_secret_redaction,
    is_blocked_path,
    is_local_client_host,
    redact_secrets,
)
from app.workers.celery_tasks import (
    _append_pipeline_error,
    _finalize_pipeline_run,
    celery_app,
    run_full_pipeline,
)

install_secret_redaction()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()
init_db()


class LocalOnlyMiddleware(BaseHTTPMiddleware):
    """Reject non-local requests when LOCAL_ONLY mode is enabled."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        if settings.local_only:
            client = request.client.host if request.client else None
            if not is_local_client_host(client):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Local-only mode: access restricted to this machine."},
                )
        if is_blocked_path(request.url.path):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        return await call_next(request)


app = FastAPI(
    title="YouTube Shorts Automation Pipeline",
    description="One-click AI-powered Shorts generation, upload, and analytics",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)
app.add_middleware(LocalOnlyMiddleware)

templates_dir = Path(__file__).parent / "templates"
static_dir = Path(__file__).parent / "static"
templates_dir.mkdir(exist_ok=True)
static_dir.mkdir(exist_ok=True)

templates = Jinja2Templates(directory=str(templates_dir))
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Only expose thumbnails — never mount cookies or full data directory
settings.thumbnail_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/data/thumbnails",
    StaticFiles(directory=str(settings.thumbnail_dir)),
    name="thumbnails",
)


class PipelineStartRequest(BaseModel):
    """Request body for starting a pipeline run."""

    topic: str = Field(..., min_length=2, max_length=32, description="Single-word niche keyword")

    @field_validator("topic")
    @classmethod
    def validate_single_word_topic(cls, value: str) -> str:
        """Ensure the topic is one word without spaces."""
        cleaned = value.strip().lower()
        if not cleaned or " " in cleaned:
            raise ValueError("Topic must be a single word with no spaces.")
        if not re.fullmatch(r"[a-z0-9_-]+", cleaned):
            raise ValueError("Topic may only contain letters, numbers, hyphens, or underscores.")
        return cleaned


class PipelineStartResponse(BaseModel):
    """Response model for pipeline start endpoint."""

    pipeline_run_id: int
    celery_task_id: str
    status: str
    message: str
    seed_topic: str


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    redis: str
    database: str
    youtube_oauth: bool
    local_only: bool
    gemini_configured: bool
    sync_mode: bool


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return sanitized errors that never leak secrets."""
    logger.exception("Unhandled error on %s: %s", request.url.path, exc)
    detail = redact_secrets(str(exc)) if settings.debug else "Internal server error."
    return JSONResponse(status_code=500, content={"detail": detail})


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request) -> HTMLResponse:
    """Render the main pipeline dashboard."""
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "app_name": "ShortsForge AI",
            "refresh_interval": 30,
        },
    )


@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check system health for dashboard status indicators."""
    redis_ok = "unknown"
    if settings.sync_mode:
        redis_ok = "not_required"
    else:
        try:
            celery_app.control.ping(timeout=2.0)
            redis_ok = "connected"
        except Exception:
            redis_ok = "disconnected"

    db_ok = "connected"
    try:
        with get_db_read_session() as session:
            session.query(PipelineRun).first()
    except Exception:
        db_ok = "error"

    oauth_ok = settings.youtube_api_configured()
    if oauth_ok:
        try:
            from app.services.youtube_api_uploader import YouTubeApiUploader

            oauth_ok = YouTubeApiUploader().verify_login()
        except Exception:
            oauth_ok = False

    return HealthResponse(
        status=(
            "healthy"
            if (redis_ok in {"connected", "not_required"} and db_ok == "connected")
            else "degraded"
        ),
        redis=redis_ok,
        database=db_ok,
        youtube_oauth=oauth_ok,
        local_only=settings.local_only,
        gemini_configured=settings.gemini_api_key_configured(),
        sync_mode=settings.sync_mode,
    )


@app.post("/api/pipeline/start", response_model=PipelineStartResponse)
async def start_pipeline(body: PipelineStartRequest) -> PipelineStartResponse:
    """Start the full automation pipeline for a one-word topic niche."""
    try:
        if not settings.gemini_api_key_configured():
            raise HTTPException(status_code=400, detail="GEMINI_API_KEY is not configured")

        seed_topic = body.topic
        import threading

        pipeline_run_id_holder: dict[str, int] = {}

        with get_db_session() as session:
            run = PipelineRun(
                status="running",
                started_at=datetime.utcnow(),
                seed_topic=seed_topic,
            )
            session.add(run)
            session.flush()
            pipeline_run_id = run.id
            pipeline_run_id_holder["id"] = pipeline_run_id

        def _run_pipeline() -> None:
            run_id = pipeline_run_id_holder["id"]
            try:
                run_full_pipeline.apply(args=[run_id, seed_topic])
            except Exception as exc:
                logger.exception("Background pipeline failed: %s", exc)
                _finalize_pipeline_run(run_id, status="error")
                _append_pipeline_error(run_id, f"Pipeline crashed: {exc}")

        if settings.sync_mode:
            threading.Thread(target=_run_pipeline, daemon=True).start()
            async_result_id = "sync-mode"
            with get_db_session() as session:
                run = session.get(PipelineRun, pipeline_run_id)
                if run:
                    run.celery_task_id = async_result_id
        else:
            async_result = run_full_pipeline.apply_async(args=[pipeline_run_id, seed_topic])
            async_result_id = async_result.id
            with get_db_session() as session:
                run = session.get(PipelineRun, pipeline_run_id)
                if run:
                    run.celery_task_id = async_result_id

        return PipelineStartResponse(
            pipeline_run_id=pipeline_run_id,
            celery_task_id=async_result_id,
            status="started",
            seed_topic=seed_topic,
            message=(
                f"Pipeline started for topic '{seed_topic}' in sync mode (no Redis)."
                if settings.sync_mode
                else f"Pipeline started for topic '{seed_topic}'. Track progress on the dashboard."
            ),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to start pipeline: %s", exc)
        detail = redact_secrets(str(exc)) if settings.debug else "Pipeline start failed. Check server logs."
        raise HTTPException(status_code=500, detail=detail) from exc


@app.get("/api/metrics")
async def get_metrics() -> dict[str, Any]:
    """Return real-time pipeline metrics for dashboard cards."""
    with get_db_read_session() as session:
        total_runs = session.query(PipelineRun).count()
        active_runs = (
            session.query(PipelineRun)
            .filter(PipelineRun.status.notin_(["completed", "error"]))
            .count()
        )
        total_videos = session.query(VideoProject).count()
        uploaded = session.query(VideoProject).filter(VideoProject.status == "uploaded").count()
        total_views = sum(p.views or 0 for p in session.query(VideoProject).all())
        total_trends = session.query(Trend).count()
        latest = (
            session.query(PipelineRun.id, PipelineRun.status)
            .order_by(PipelineRun.started_at.desc())
            .first()
        )
        latest_run_id = latest[0] if latest else None
        latest_run_status = latest[1] if latest else "none"

        return {
            "total_pipeline_runs": total_runs,
            "active_runs": active_runs,
            "total_videos": total_videos,
            "videos_uploaded": uploaded,
            "total_views": total_views,
            "trends_discovered": total_trends,
            "trends_scraped": total_trends,
            "latest_run_status": latest_run_status,
            "latest_run_id": latest_run_id,
            "timestamp": datetime.utcnow().isoformat(),
        }


@app.get("/api/videos/recent")
async def get_recent_videos(limit: int = 12) -> list[dict[str, Any]]:
    """Return recent video projects for the dashboard grid."""
    with get_db_read_session() as session:
        projects = (
            session.query(VideoProject)
            .order_by(VideoProject.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": p.id,
                "title": p.title,
                "status": p.status,
                "hook_text": p.hook_text,
                "youtube_video_id": p.youtube_video_id,
                "youtube_url": (
                    f"https://youtube.com/watch?v={p.youtube_video_id}"
                    if p.youtube_video_id
                    else None
                ),
                "views": p.views,
                "likes": p.likes,
                "comments": p.comments,
                "thumbnail_filename": Path(p.thumbnail_path).name if p.thumbnail_path else "",
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in projects
        ]


@app.get("/api/pipeline/history")
async def get_pipeline_history(limit: int = 10) -> list[dict[str, Any]]:
    """Return pipeline run history for the dashboard."""
    with get_db_read_session() as session:
        runs = (
            session.query(PipelineRun)
            .order_by(PipelineRun.started_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "status": r.status,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "videos_generated": r.videos_generated,
                "videos_uploaded": r.videos_uploaded,
                "seed_topic": r.seed_topic or "",
                "errors": redact_secrets(r.errors or ""),
                "celery_task_id": r.celery_task_id,
                "strategy_notes": redact_secrets(r.strategy_notes or ""),
            }
            for r in runs
        ]


@app.get("/api/pipeline/{run_id}")
async def get_pipeline_detail(run_id: int) -> dict[str, Any]:
    """Return detailed information for a specific pipeline run."""
    with get_db_read_session() as session:
        run = session.get(PipelineRun, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Pipeline run not found")

        projects = (
            session.query(VideoProject)
            .filter(VideoProject.pipeline_run_id == run_id)
            .all()
        )

        strategy_notes = run.strategy_notes or ""
        parsed_strategy = (
            json.loads(strategy_notes)
            if strategy_notes.startswith("{")
            else redact_secrets(strategy_notes)
        )

        return {
            "run": {
                "id": run.id,
                "status": run.status,
                "started_at": run.started_at.isoformat() if run.started_at else None,
                "completed_at": run.completed_at.isoformat() if run.completed_at else None,
                "videos_generated": run.videos_generated,
                "videos_uploaded": run.videos_uploaded,
                "seed_topic": run.seed_topic or "",
                "errors": redact_secrets(run.errors or ""),
                "strategy_notes": parsed_strategy,
            },
            "projects": [
                {
                    "id": p.id,
                    "title": p.title,
                    "status": p.status,
                    "youtube_video_id": p.youtube_video_id,
                    "views": p.views,
                    "error_message": redact_secrets(p.error_message or ""),
                }
                for p in projects
            ],
        }


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize application on startup."""
    settings.ensure_directories()
    assert_env_not_world_readable()
    logger.info(
        "Pipeline API started locally on %s:%s (local_only=%s, debug=%s)",
        settings.api_host,
        settings.api_port,
        settings.local_only,
        settings.debug,
    )
