"""
FastAPI application entry point.

Startup sequence:
  1. Check all artifact files exist.
  2. If any are missing, run ingest.py automatically.
  3. Load all services into memory.
  4. Mount the static artifact directory.
  5. Register routers and CORS.
"""

from __future__ import annotations

import logging
import subprocess
import sys
from contextlib import asynccontextmanager

import duckdb
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from config import DATA_DIR, get_settings
from routers import cluster, network, search, timeline

REQUIRED_ARTIFACTS = [
    "embeddings.npy",
    "faiss.bin",
    "topics.pkl",
    "graph.json",
    "landscape.html",
    "posts.duckdb",
]

logger = logging.getLogger(__name__)


def _missing_artifacts() -> list[str]:
    return [name for name in REQUIRED_ARTIFACTS if not (DATA_DIR / name).exists()]


def _load_health_stats() -> dict[str, int | None | str]:
    db_path = DATA_DIR / "posts.duckdb"
    if not db_path.exists():
        return {
            "status": "degraded",
            "posts": None,
            "subreddits": None,
            "error": "db_missing",
        }

    try:
        con = duckdb.connect(str(db_path), read_only=True)
        try:
            posts = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
            subreddits = con.execute("SELECT COUNT(DISTINCT subreddit) FROM posts").fetchone()[0]
        finally:
            con.close()
    except Exception as exc:  # pragma: no cover
        logger.warning("Health check failed while reading DuckDB: %s", exc)
        return {
            "status": "degraded",
            "posts": None,
            "subreddits": None,
            "error": "db_unavailable",
        }

    return {"status": "ok", "posts": int(posts), "subreddits": int(subreddits), "error": ""}


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    missing = _missing_artifacts()
    if missing:
        if not settings.auto_ingest_on_startup:
            missing_str = ", ".join(missing)
            raise RuntimeError(
                f"Required data artifacts are missing: {missing_str}. "
                "Run 'python ingest.py' before starting the backend."
            )

        logger.warning("Missing artifacts detected at startup: %s. Running ingest.py.", ", ".join(missing))
        subprocess.run(
            [sys.executable, "ingest.py"],
            cwd=str(DATA_DIR.parent),
            check=True,
        )

    if settings.preload_services_on_startup:
        from services.cluster_service import ClusterService
        from services.embedding_service import EmbeddingService
        from services.network_service import NetworkService
        from services.timeline_service import TimelineService

        logger.info("Preloading backend services during startup.")
        EmbeddingService.get_instance()
        ClusterService.get_instance()
        NetworkService.get_instance()
        TimelineService.get_instance()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

allow_origins = ["http://localhost:3000"]
if settings.frontend_url:
    allow_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(DATA_DIR)), name="static")

app.include_router(search.router, prefix="/api")
app.include_router(cluster.router, prefix="/api")
app.include_router(network.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation failed", "errors": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health")
async def health():
    stats = _load_health_stats()
    return {
        "status": stats["status"],
        "posts": stats["posts"],
        "subreddits": stats["subreddits"],
        "artifacts_ready": not _missing_artifacts(),
        "error": stats["error"] or None,
    }


if __name__ == "__main__":
    import uvicorn
    import os

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
