"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Pydantic settings for the YouTube Shorts automation pipeline."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Gemini / Google GenAI (SecretStr prevents accidental logging/repr exposure)
    gemini_api_key: SecretStr = Field(..., alias="GEMINI_API_KEY")
    veo_model: str = Field(
        default="veo-3.1-generate-preview",
        alias="VEO_MODEL",
    )
    gemini_text_model: str = Field(
        default="gemini-3.1-pro-preview",
        alias="GEMINI_TEXT_MODEL",
    )
    gemini_image_model: str = Field(
        default="gemini-3.1-flash-image-preview",
        alias="GEMINI_IMAGE_MODEL",
    )

    # YouTube Data API (OAuth — one-time setup, free within quota)
    youtube_client_id: str = Field(default="", alias="YOUTUBE_CLIENT_ID")
    youtube_client_secret: SecretStr = Field(default=SecretStr(""), alias="YOUTUBE_CLIENT_SECRET")
    youtube_refresh_token: SecretStr = Field(default=SecretStr(""), alias="YOUTUBE_REFRESH_TOKEN")
    youtube_channel_id: str = Field(default="", alias="YOUTUBE_CHANNEL_ID")
    youtube_category_id: str = Field(default="22", alias="YOUTUBE_CATEGORY_ID")
    youtube_upload_privacy: str = Field(default="UNLISTED", alias="YOUTUBE_UPLOAD_PRIVACY")

    # Pipeline
    max_parallel_videos: int = Field(default=4, alias="MAX_PARALLEL_VIDEOS")
    top_trends_count: int = Field(default=20, alias="TOP_TRENDS_COUNT")
    videos_per_pipeline: int = Field(default=4, alias="VIDEOS_PER_PIPELINE")
    segments_per_video: int = Field(default=7, alias="SEGMENTS_PER_VIDEO")
    max_video_duration_seconds: int = Field(default=58, alias="MAX_VIDEO_DURATION_SECONDS")
    veo_person_generation: str = Field(
        default="",
        alias="VEO_PERSON_GENERATION",
        description="Optional Veo personGeneration; leave empty if unsupported in your region",
    )
    veo_poll_max_seconds: int = Field(default=900, alias="VEO_POLL_MAX_SECONDS")

    # Legacy (unused by API upload — kept for backward-compatible .env files)
    youtube_chrome_user_data: Path | None = Field(default=None, alias="YOUTUBE_CHROME_USER_DATA")
    youtube_cookies_path: Path = Field(
        default=Path("data/cookies/youtube_cookies.json"),
        alias="YOUTUBE_COOKIES_PATH",
    )

    @field_validator("youtube_chrome_user_data", mode="before")
    @classmethod
    def empty_chrome_profile_is_none(cls, value: Any) -> Path | None:
        """Legacy field — ignored by API upload."""
        if value in (None, "", "none", "null"):
            return None
        return Path(value)

    # Database
    database_url: str = Field(
        default="sqlite:///./data/shorts_pipeline.db",
        alias="DATABASE_URL",
    )

    # Redis / Celery
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    celery_broker_url: str = Field(
        default="redis://localhost:6379/0",
        alias="CELERY_BROKER_URL",
    )
    celery_result_backend: str = Field(
        default="redis://localhost:6379/1",
        alias="CELERY_RESULT_BACKEND",
    )

    # Paths
    output_dir: Path = Field(default=Path("data/output"), alias="OUTPUT_DIR")
    temp_dir: Path = Field(default=Path("data/temp"), alias="TEMP_DIR")
    thumbnail_dir: Path = Field(default=Path("data/thumbnails"), alias="THUMBNAIL_DIR")

    # API / security
    api_host: str = Field(default="127.0.0.1", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    debug: bool = Field(default=False, alias="DEBUG")
    local_only: bool = Field(default=True, alias="LOCAL_ONLY")
    sync_mode: bool = Field(
        default=False,
        alias="SYNC_MODE",
        description="Run Celery tasks in-process without Redis (local dev)",
    )

    def get_gemini_api_key(self) -> str:
        """Return the Gemini API key value without exposing it in repr/logs."""
        return self.gemini_api_key.get_secret_value()

    def gemini_api_key_configured(self) -> bool:
        """Check whether a non-empty Gemini API key is configured."""
        value = self.get_gemini_api_key().strip()
        placeholder_values = {"", "your_gemini_api_key_here", "your_key_here"}
        return value not in placeholder_values

    def get_youtube_client_id(self) -> str:
        return self.youtube_client_id.strip()

    def get_youtube_client_secret(self) -> str:
        return self.youtube_client_secret.get_secret_value().strip()

    def get_youtube_refresh_token(self) -> str:
        return self.youtube_refresh_token.get_secret_value().strip()

    def youtube_api_configured(self) -> bool:
        """Return True when YouTube OAuth credentials are present."""
        placeholders = {"", "your_client_id", "your_client_secret", "your_refresh_token"}
        return (
            self.get_youtube_client_id() not in placeholders
            and self.get_youtube_client_secret() not in placeholders
            and self.get_youtube_refresh_token() not in placeholders
        )

    @model_validator(mode="after")
    def enforce_local_safety(self) -> "Settings":
        """Enforce localhost-only settings when LOCAL_ONLY is enabled."""
        if not self.local_only:
            return self

        if self.sync_mode:
            return self

        if self.api_host not in {"127.0.0.1", "localhost"}:
            raise ValueError(
                "LOCAL_ONLY=true requires API_HOST=127.0.0.1. "
                "Do not bind to 0.0.0.0 on a machine with secrets in .env."
            )

        for name, url in (
            ("REDIS_URL", self.redis_url),
            ("CELERY_BROKER_URL", self.celery_broker_url),
            ("CELERY_RESULT_BACKEND", self.celery_result_backend),
        ):
            if "127.0.0.1" not in url and "localhost" not in url:
                raise ValueError(
                    f"LOCAL_ONLY=true requires {name} to use 127.0.0.1 or localhost."
                )

        if self.debug:
            raise ValueError(
                "LOCAL_ONLY=true requires DEBUG=false to hide /docs and stack traces."
            )

        return self

    def ensure_directories(self) -> None:
        """Create required data directories if they do not exist."""
        for directory in (
            self.output_dir,
            self.temp_dir,
            self.thumbnail_dir,
            self.youtube_cookies_path.parent,
            Path("data/credentials"),
            Path("data"),
        ):
            directory.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    settings = Settings()
    settings.ensure_directories()
    return settings


def clear_settings_cache() -> None:
    """Clear cached settings (after SYNC_MODE or env changes)."""
    get_settings.cache_clear()
