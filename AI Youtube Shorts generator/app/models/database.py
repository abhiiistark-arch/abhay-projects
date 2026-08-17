"""SQLAlchemy database models and session management."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime
from typing import Generator

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

from app.config import get_settings

Base = declarative_base()


class Trend(Base):
    """Viral Shorts topic discovered via Gemini from a seed keyword."""

    __tablename__ = "trends"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(512), nullable=False, index=True)
    view_count = Column(Integer, default=0)
    velocity_score = Column(Float, default=0.0)
    competition_score = Column(Float, default=0.0)
    shelf_life_prediction = Column(String(128), default="unknown")
    overall_score = Column(Float, default=0.0)
    selected = Column(Boolean, default=False)
    source_url = Column(String(1024), default="")
    category = Column(String(128), default="general")
    raw_metadata = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    video_projects = relationship("VideoProject", back_populates="trend")


class VideoProject(Base):
    """Generated Short content package and production status."""

    __tablename__ = "video_projects"

    id = Column(Integer, primary_key=True, index=True)
    trend_id = Column(Integer, ForeignKey("trends.id"), nullable=True)
    pipeline_run_id = Column(Integer, ForeignKey("pipeline_runs.id"), nullable=True)
    status = Column(String(64), default="pending", index=True)
    title = Column(String(256), default="")
    script = Column(Text, default="")
    visual_prompt = Column(Text, default="")
    hook_text = Column(String(512), default="")
    caption_text = Column(Text, default="")
    tags = Column(Text, default="")
    voice_tone = Column(String(128), default="energetic")
    thumbnail_prompt = Column(Text, default="")
    video_path = Column(String(1024), default="")
    thumbnail_path = Column(String(1024), default="")
    youtube_video_id = Column(String(64), default="", index=True)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    feedback_analysis = Column(Text, default="")
    improvement_suggestions = Column(Text, default="")
    error_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trend = relationship("Trend", back_populates="video_projects")
    pipeline_run = relationship("PipelineRun", back_populates="video_projects")


class PipelineRun(Base):
    """Orchestrated pipeline execution record."""

    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    seed_topic = Column(String(64), default="", index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(64), default="running", index=True)
    videos_generated = Column(Integer, default=0)
    videos_uploaded = Column(Integer, default=0)
    errors = Column(Text, default="")
    celery_task_id = Column(String(128), default="", index=True)
    strategy_notes = Column(Text, default="")

    video_projects = relationship("VideoProject", back_populates="pipeline_run")


_engine = None
_SessionLocal = None


def get_engine():
    """Return SQLAlchemy engine singleton."""
    global _engine
    if _engine is None:
        settings = get_settings()
        connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
        _engine = create_engine(settings.database_url, connect_args=connect_args)
    return _engine


def get_session_factory() -> sessionmaker:
    """Return SQLAlchemy session factory."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine(),
            expire_on_commit=False,
        )
    return _SessionLocal


def _migrate_schema() -> None:
    """Apply lightweight SQLite schema updates for existing databases."""
    engine = get_engine()
    if not str(engine.url).startswith("sqlite"):
        return
    with engine.connect() as conn:
        columns = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(pipeline_runs)").fetchall()
        }
        if "seed_topic" not in columns:
            conn.exec_driver_sql(
                "ALTER TABLE pipeline_runs ADD COLUMN seed_topic VARCHAR(64) DEFAULT ''"
            )
            conn.commit()


def init_db() -> None:
    """Create all database tables."""
    Base.metadata.create_all(bind=get_engine())
    _migrate_schema()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Provide a transactional database session with automatic cleanup."""
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def get_db_read_session() -> Generator[Session, None, None]:
    """Provide a read-only database session (no commit on exit)."""
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
