"""Celery worker tasks for the YouTube Shorts automation pipeline."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from celery import Celery, chain, chord, group

try:
    from google.genai.errors import ClientError
except ImportError:  # pragma: no cover
    ClientError = Exception  # type: ignore[misc, assignment]

from app.config import get_settings
from app.models.database import PipelineRun, Trend, VideoProject, get_db_session
from app.security import install_secret_redaction, redact_secrets
from app.services.analytics_scraper import YouTubeAnalyticsScraper
from app.services.content_engine import ContentEngine
from app.services.video_generator import VideoGenerator
from app.services.youtube_uploader import YouTubeUploader

logger = logging.getLogger(__name__)
install_secret_redaction()
settings = get_settings()

_broker = "memory://" if settings.sync_mode else settings.celery_broker_url
_backend = "cache+memory://" if settings.sync_mode else settings.celery_result_backend

celery_app = Celery(
    "shorts_pipeline",
    broker=_broker,
    backend=_backend,
)

_celery_conf: dict[str, Any] = {
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "UTC",
    "enable_utc": True,
    "worker_prefetch_multiplier": 1,
    "task_track_started": True,
    "task_acks_late": True,
    "broker_connection_retry_on_startup": not settings.sync_mode,
}

if settings.sync_mode:
    _celery_conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )
    logger.info("Celery SYNC_MODE enabled — tasks run in-process (no Redis worker needed)")

celery_app.conf.update(_celery_conf)


def _is_non_retryable_genai_error(exc: Exception) -> bool:
    """Return True for client-side Gemini/Veo errors that should not be retried."""
    if isinstance(exc, ClientError):
        code = getattr(exc, "code", None)
        try:
            return code is not None and 400 <= int(code) < 500
        except (TypeError, ValueError):
            return True
    return False


def _generation_failure(project_id: int, exc: Exception) -> dict[str, Any]:
    """Standard failure payload for generate_video_task."""
    return {
        "project_id": project_id,
        "status": "failed",
        "error": redact_secrets(str(exc)),
    }


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="pipeline.discover_topics",
)
def discover_topics_task(self, pipeline_run_id: int, seed_topic: str) -> dict[str, Any]:
    """
    Phase 1a: Ask Gemini for viral Shorts topic ideas from a one-word seed.

    Args:
        pipeline_run_id: Active pipeline run identifier.
        seed_topic: Single keyword niche (e.g. fitness, AI).

    Returns:
        Task result with discovered trends and pipeline run ID.
    """
    try:
        engine = ContentEngine()
        trends_data = engine.discover_viral_topics(
            seed_topic,
            count=max(settings.videos_per_pipeline, 4),
        )
        if not trends_data:
            raise ValueError(f"Gemini returned no Shorts topics for '{seed_topic}'")

        with get_db_session() as session:
            for item in trends_data:
                trend = Trend(
                    title=item.get("title", "Untitled"),
                    view_count=item.get("view_count", 0),
                    velocity_score=float(item.get("velocity_score", 0)),
                    competition_score=float(item.get("competition_score", 0)),
                    shelf_life_prediction=str(item.get("shelf_life_prediction", "unknown")),
                    overall_score=float(item.get("overall_score", 0)),
                    selected=bool(item.get("selected", False)),
                    source_url=item.get("url", ""),
                    category=seed_topic,
                    raw_metadata=json.dumps(item),
                )
                session.add(trend)
            run = session.get(PipelineRun, pipeline_run_id)
            if run:
                run.status = "topics_discovered"
                run.seed_topic = seed_topic

        return {
            "pipeline_run_id": pipeline_run_id,
            "seed_topic": seed_topic,
            "trends": trends_data,
            "trends_discovered": len(trends_data),
            "status": "success",
        }
    except Exception as exc:
        logger.exception("discover_topics_task failed: %s", exc)
        _append_pipeline_error(pipeline_run_id, f"Topic discovery failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    name="pipeline.analyze_and_generate_content",
)
def analyze_and_generate_content_task(
    self,
    discover_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Phase 1b: Turn discovered topics into video projects with Gemini content packages.

    Args:
        discover_result: Output from discover_topics_task.

    Returns:
        Task result with list of created project IDs.
    """
    pipeline_run_id = discover_result.get("pipeline_run_id")
    try:
        analyzed = discover_result.get("trends") or []
        if not analyzed:
            with get_db_session() as session:
                trends = (
                    session.query(Trend)
                    .order_by(Trend.overall_score.desc(), Trend.view_count.desc())
                    .limit(settings.top_trends_count)
                    .all()
                )
                analyzed = [
                    {
                        **(json.loads(t.raw_metadata) if t.raw_metadata else {}),
                        "id": t.id,
                        "title": t.title,
                        "view_count": t.view_count,
                        "source_url": t.source_url,
                        "category": t.category,
                        "overall_score": t.overall_score,
                        "selected": t.selected,
                    }
                    for t in trends
                ]

        if not analyzed:
            raise ValueError("No viral Short topics available for content generation")

        if analyzed[0].get("overall_score") is not None:
            analyzed.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
        else:
            trends_data = [
                {
                    "id": t.get("id"),
                    "title": t.get("title", ""),
                    "view_count": t.get("view_count", 0),
                    "source_url": t.get("source_url", t.get("url", "")),
                    "category": t.get("category", ""),
                }
                for t in analyzed
            ]
            engine = ContentEngine()
            analyzed = engine.analyze_trends(trends_data)
            analyzed.sort(key=lambda x: x.get("overall_score", 0), reverse=True)

        selected = [t for t in analyzed if t.get("selected")]
        if not selected:
            selected = analyzed[: settings.videos_per_pipeline]
        selected = selected[: settings.videos_per_pipeline]

        engine = ContentEngine()
        project_ids: list[int] = []
        with get_db_session() as session:
            for analysis in selected:
                trend_record = _find_or_create_trend(session, analysis)
                trend_record.velocity_score = float(analysis.get("velocity_score", 0))
                trend_record.competition_score = float(analysis.get("competition_score", 0))
                trend_record.shelf_life_prediction = str(
                    analysis.get("shelf_life_prediction", "unknown")
                )
                trend_record.overall_score = float(analysis.get("overall_score", 0))
                trend_record.selected = True

                package = engine.generate_content_package(analysis)
                thumbnail_path = settings.thumbnail_dir / f"thumb_{pipeline_run_id}_{len(project_ids)}.png"
                engine.generate_thumbnail(package.get("thumbnail_prompt", ""), thumbnail_path)

                project = VideoProject(
                    trend_id=trend_record.id,
                    pipeline_run_id=pipeline_run_id,
                    status="content_ready",
                    title=package.get("title", ""),
                    script=package.get("script", ""),
                    visual_prompt=json.dumps(
                        {
                            "visual_prompt": package.get("visual_prompt", ""),
                            "scene_breakdown": package.get("scene_breakdown", []),
                        }
                    ),
                    hook_text=package.get("hook_text", ""),
                    caption_text=package.get("caption_text", ""),
                    tags=package.get("tags", ""),
                    voice_tone=package.get("voice_tone", "energetic"),
                    thumbnail_prompt=package.get("thumbnail_prompt", ""),
                    thumbnail_path=str(thumbnail_path),
                )
                session.add(project)
                session.flush()
                project_ids.append(project.id)

            run = session.get(PipelineRun, pipeline_run_id)
            if run:
                run.status = "content_generated"

        return {
            "pipeline_run_id": pipeline_run_id,
            "project_ids": project_ids,
            "status": "success",
        }
    except Exception as exc:
        logger.exception("analyze_and_generate_content_task failed: %s", exc)
        if pipeline_run_id:
            _append_pipeline_error(pipeline_run_id, f"Content generation failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    name="pipeline.generate_video",
)
def generate_video_task(self, project_id: int) -> dict[str, Any]:
    """
    Phase 2a: Generate a complete Short video for a project.

    Args:
        project_id: VideoProject database ID.

    Returns:
        Task result with project ID and video path.
    """
    try:
        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            project.status = "generating"
            visual_data = json.loads(project.visual_prompt) if project.visual_prompt else {}
            content_package = {
                "title": project.title,
                "hook_text": project.hook_text,
                "script": project.script,
                "visual_prompt": visual_data.get("visual_prompt", project.title),
                "scene_breakdown": visual_data.get("scene_breakdown", []),
            }

        generator = VideoGenerator()
        video_path = generator.generate_complete_short(content_package, project_id)

        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            if project:
                project.status = "generated"
                project.video_path = str(video_path)
                run = session.get(PipelineRun, project.pipeline_run_id)
                if run:
                    run.videos_generated = (run.videos_generated or 0) + 1

        return {
            "project_id": project_id,
            "video_path": str(video_path),
            "status": "success",
        }
    except Exception as exc:
        logger.exception("generate_video_task failed for project %s: %s", project_id, exc)
        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            if project:
                project.status = "generation_failed"
                project.error_message = redact_secrets(str(exc))
                _append_pipeline_error(project.pipeline_run_id, f"Generation failed: {exc}")

        if isinstance(exc, ClientError) and getattr(exc, "code", None) == 400:
            return _generation_failure(project_id, exc)
        if settings.sync_mode or _is_non_retryable_genai_error(exc):
            return _generation_failure(project_id, exc)
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=180,
    name="pipeline.upload_video",
)
def upload_video_task(self, project_id: int) -> dict[str, Any]:
    """
    Phase 2b: Upload a generated Short to YouTube.

    Args:
        project_id: VideoProject database ID.

    Returns:
        Task result with YouTube video ID.
    """
    try:
        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            if not project.video_path:
                raise ValueError(f"Project {project_id} has no video file")
            project.status = "uploading"

        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            assert project is not None
            uploader = YouTubeUploader()
            from pathlib import Path

            if not settings.youtube_api_configured():
                raise RuntimeError(
                    "YouTube OAuth not configured. Run: python scripts/youtube_oauth_setup.py"
                )

            video_id = uploader.upload_video(
                video_path=Path(project.video_path),
                title=project.title,
                description=project.caption_text or project.script,
                tags=project.tags,
                privacy=settings.youtube_upload_privacy.upper(),
                thumbnail_path=Path(project.thumbnail_path) if project.thumbnail_path else None,
            )

            project.youtube_video_id = video_id
            project.status = "uploaded"
            run = session.get(PipelineRun, project.pipeline_run_id)
            if run:
                run.videos_uploaded = (run.videos_uploaded or 0) + 1

            collect_analytics_task.apply_async(args=[project_id], countdown=86400)

        return {
            "project_id": project_id,
            "youtube_video_id": video_id,
            "status": "success",
        }
    except Exception as exc:
        logger.exception("upload_video_task failed for project %s: %s", project_id, exc)
        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            if project:
                project.status = "upload_failed"
                project.error_message = redact_secrets(str(exc))
                _append_pipeline_error(project.pipeline_run_id, f"Upload failed: {exc}")
        if settings.sync_mode or isinstance(exc, (FileNotFoundError, RuntimeError)):
            return {
                "project_id": project_id,
                "status": "failed",
                "error": redact_secrets(str(exc)),
            }
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=3600,
    name="pipeline.collect_analytics",
)
def collect_analytics_task(self, project_id: int) -> dict[str, Any]:
    """
    Collect public video statistics 24 hours after upload.

    Args:
        project_id: VideoProject database ID.

    Returns:
        Task result with scraped metrics.
    """
    try:
        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            if not project or not project.youtube_video_id:
                return {"project_id": project_id, "status": "skipped"}
            youtube_video_id = project.youtube_video_id

        scraper = YouTubeAnalyticsScraper()
        stats = scraper.scrape_video_stats(youtube_video_id)

        with get_db_session() as session:
            project = session.get(VideoProject, project_id)
            if project:
                project.views = stats.get("views", 0)
                project.likes = stats.get("likes", 0)
                project.comments = stats.get("comments", 0)
                project.status = "analytics_collected"

        return {
            "project_id": project_id,
            "stats": stats,
            "status": "success",
        }
    except Exception as exc:
        logger.exception("collect_analytics_task failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="pipeline.feedback_analysis")
def feedback_analysis_task(pipeline_run_id: int) -> dict[str, Any]:
    """
    Analyze performance data and update content strategy for future runs.

    Args:
        pipeline_run_id: Pipeline run to analyze.

    Returns:
        Feedback analysis results.
    """
    try:
        with get_db_session() as session:
            projects = (
                session.query(VideoProject)
                .filter(VideoProject.pipeline_run_id == pipeline_run_id)
                .all()
            )
            video_data = [
                {
                    "title": p.title,
                    "hook_text": p.hook_text,
                    "views": p.views,
                    "likes": p.likes,
                    "comments": p.comments,
                    "tags": p.tags,
                    "youtube_video_id": p.youtube_video_id,
                }
                for p in projects
            ]

        engine = ContentEngine()
        analysis = engine.analyze_performance(video_data)

        with get_db_session() as session:
            run = session.get(PipelineRun, pipeline_run_id)
            if run:
                if (run.videos_uploaded or 0) > 0:
                    run.status = "completed"
                elif (run.videos_generated or 0) > 0:
                    run.status = "generated"
                else:
                    run.status = "error"
                run.completed_at = datetime.utcnow()
                run.strategy_notes = json.dumps(analysis)
            for project in session.query(VideoProject).filter(
                VideoProject.pipeline_run_id == pipeline_run_id
            ):
                project.feedback_analysis = analysis.get("summary", "")
                suggestions = analysis.get("strategy_updates", [])
                project.improvement_suggestions = json.dumps(suggestions)

        return {
            "pipeline_run_id": pipeline_run_id,
            "analysis": analysis,
            "status": "success",
        }
    except Exception as exc:
        logger.exception("feedback_analysis_task failed: %s", exc)
        _append_pipeline_error(pipeline_run_id, f"Feedback analysis failed: {exc}")
        return {"pipeline_run_id": pipeline_run_id, "status": "failed", "error": str(exc)}


@celery_app.task(name="pipeline.upload_videos_sequential")
def upload_videos_sequential_task(
    generate_results: list[dict[str, Any]],
    pipeline_run_id: int,
) -> dict[str, Any]:
    """
    Chord callback: sequentially upload all successfully generated videos.

    Args:
        generate_results: Results from parallel generate_video_task jobs.
        pipeline_run_id: Active pipeline run ID.

    Returns:
        Upload orchestration status.
    """
    successful_ids = [
        result["project_id"]
        for result in generate_results
        if isinstance(result, dict) and result.get("status") == "success"
    ]

    if not successful_ids:
        _append_pipeline_error(pipeline_run_id, "No videos generated successfully for upload")
        _finalize_pipeline_run(pipeline_run_id, status="error")
        return {"pipeline_run_id": pipeline_run_id, "uploaded": 0, "status": "no_videos"}

    if settings.sync_mode:
        for project_id in successful_ids:
            try:
                upload_video_task(project_id)
            except Exception as exc:
                logger.exception("Sync upload failed for project %s: %s", project_id, exc)
        feedback_analysis_task(pipeline_run_id)
    else:
        upload_chain = chain(*[upload_video_task.s(project_id) for project_id in successful_ids])
        upload_chain.apply_async()
        feedback_analysis_task.apply_async(args=[pipeline_run_id], countdown=90000)

    with get_db_session() as session:
        run = session.get(PipelineRun, pipeline_run_id)
        if run:
            run.status = "uploading"

    return {
        "pipeline_run_id": pipeline_run_id,
        "queued_uploads": len(successful_ids),
        "status": "uploads_queued",
    }


@celery_app.task(name="pipeline.run_full_pipeline")
def run_full_pipeline(pipeline_run_id: int, seed_topic: str) -> dict[str, Any]:
    """
    Master task: orchestrate the complete Shorts automation pipeline.

    Args:
        pipeline_run_id: Pre-created pipeline run database ID.
        seed_topic: One-word niche keyword for Gemini topic discovery.

    Returns:
        Pipeline run metadata and Celery task ID.
    """
    workflow = chain(
        discover_topics_task.s(pipeline_run_id, seed_topic),
        analyze_and_generate_content_task.s(),
        _build_generation_chord.s(pipeline_run_id),
    )
    async_result = workflow.apply_async()

    return {
        "pipeline_run_id": pipeline_run_id,
        "celery_task_id": async_result.id,
        "status": "started",
    }


@celery_app.task(name="pipeline.build_generation_chord")
def _build_generation_chord(
    content_result: dict[str, Any],
    pipeline_run_id: int,
) -> dict[str, Any]:
    """
    Build and dispatch parallel video generation chord.

    Args:
        content_result: Output from analyze_and_generate_content_task.
        pipeline_run_id: Active pipeline run ID.

    Returns:
        Chord dispatch status.
    """
    project_ids = content_result.get("project_ids", [])
    if not project_ids:
        _append_pipeline_error(pipeline_run_id, "No projects created for video generation")
        _finalize_pipeline_run(pipeline_run_id, status="error")
        return {"pipeline_run_id": pipeline_run_id, "status": "no_projects"}

    if settings.sync_mode:
        generate_results = []
        for pid in project_ids:
            try:
                generate_results.append(generate_video_task(pid))
            except Exception as exc:
                logger.exception("Sync generation failed for project %s: %s", pid, exc)
                generate_results.append(
                    {
                        "project_id": pid,
                        "status": "failed",
                        "error": redact_secrets(str(exc)),
                    }
                )
        upload_videos_sequential_task(generate_results, pipeline_run_id)
    else:
        generation_group = group(generate_video_task.s(pid) for pid in project_ids)
        chord(generation_group)(upload_videos_sequential_task.s(pipeline_run_id))

    with get_db_session() as session:
        run = session.get(PipelineRun, pipeline_run_id)
        if run:
            run.status = "generating"

    return {
        "pipeline_run_id": pipeline_run_id,
        "project_ids": project_ids,
        "status": "generation_started",
    }


def _find_or_create_trend(session: Any, analysis: dict[str, Any]) -> Trend:
    """Find existing trend by title or create a new one."""
    title = analysis.get("title", "Untitled")
    trend = session.query(Trend).filter(Trend.title == title).first()
    if trend:
        return trend
    trend = Trend(
        title=title,
        view_count=int(analysis.get("view_count", 0)),
        source_url=analysis.get("url", analysis.get("source_url", "")),
        category=analysis.get("source", "analyzed"),
        raw_metadata=json.dumps(analysis),
    )
    session.add(trend)
    session.flush()
    return trend


def _finalize_pipeline_run(pipeline_run_id: int, status: str) -> None:
    """Mark a pipeline run finished with an explicit terminal status."""
    try:
        with get_db_session() as session:
            run = session.get(PipelineRun, pipeline_run_id)
            if run:
                run.status = status
                run.completed_at = datetime.utcnow()
    except Exception as exc:
        logger.exception("Failed to finalize pipeline run %s: %s", pipeline_run_id, exc)


def _append_pipeline_error(pipeline_run_id: int | None, error: str) -> None:
    """Append a redacted error message to a pipeline run record."""
    if not pipeline_run_id:
        return
    safe_error = redact_secrets(error)
    try:
        with get_db_session() as session:
            run = session.get(PipelineRun, pipeline_run_id)
            if run:
                existing = run.errors or ""
                run.errors = f"{existing}\n{safe_error}".strip()
                if run.status not in ("completed", "uploading"):
                    run.status = "error"
    except Exception as exc:
        logger.exception("Failed to append pipeline error: %s", exc)
