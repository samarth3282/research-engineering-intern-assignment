from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    app_name: str = "NarrativeScope API"
    app_version: str = "1.0.0"
    frontend_url: str | None = None
    auto_ingest_on_startup: bool = True
    preload_services_on_startup: bool = False
    llm_provider: str = "auto"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"
    embedding_model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"
    semantic_min_score: float = 0.12
    default_search_k: int = 10
    max_network_nodes: int = 500
    network_context_author_cap: int = 120
    network_query_cache_ttl_sec: int = 45
    network_query_cache_size: int = 128
    cluster_compute_timeout_sec: int = 30
    max_chat_sources: int = 8
    rate_limit_window_sec: int = 60
    rate_limit_chat_per_window: int = 20
    rate_limit_cluster_per_window: int = 8
    rate_limit_network_per_window: int = 40
    rate_limit_timeline_per_window: int = 60

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
