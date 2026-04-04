from __future__ import annotations

from fastapi import APIRouter, HTTPException, Path as FPath, Query, Request

from config import get_settings
from models.schemas import NetworkResponse
from services.network_service import build_narrative_graph
from services.post_service import fetch_posts_for_query
from services.rate_limit_service import rate_limiter

router = APIRouter()


@router.get("/network", response_model=NetworkResponse)
async def get_network(
    request: Request,
    q: str = Query(default="", max_length=500),
    k: int = Query(default=180, ge=20, le=500),
    subreddit: str = Query(default=""),
):
    from services.network_service import NetworkService

    settings = get_settings()
    client_id = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(
        bucket="network",
        client_id=client_id,
        limit=settings.rate_limit_network_per_window,
        window_seconds=settings.rate_limit_window_sec,
    ):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for network requests.")

    trimmed = q.strip()
    if trimmed:
        posts, _mode = fetch_posts_for_query(trimmed, k=k, subreddit=subreddit)
        data = build_narrative_graph(posts, query=trimmed)
        return NetworkResponse(**data)

    svc = NetworkService.get_instance()
    data = svc.get_full_graph()
    return NetworkResponse(**data)


@router.get("/network/remove/{author}", response_model=NetworkResponse)
async def remove_node(
    request: Request,
    author: str = FPath(..., min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
    q: str = Query(default="", max_length=500),
    k: int = Query(default=180, ge=20, le=500),
    subreddit: str = Query(default=""),
):
    from services.network_service import NetworkService

    settings = get_settings()
    client_id = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(
        bucket="network",
        client_id=client_id,
        limit=settings.rate_limit_network_per_window,
        window_seconds=settings.rate_limit_window_sec,
    ):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for network requests.")

    trimmed = q.strip()
    if trimmed:
        posts, _mode = fetch_posts_for_query(trimmed, k=k, subreddit=subreddit)
        author_names = {str(post.get("author", "")).lower() for post in posts}
        if author.lower() not in author_names:
            raise HTTPException(status_code=404, detail="Author not found in the selected narrative graph.")
        data = build_narrative_graph(posts, query=trimmed, removed_author=author)
        return NetworkResponse(**data, removed_node=author, removed=True)

    svc = NetworkService.get_instance()
    if not svc.has_author(author):
        raise HTTPException(status_code=404, detail="Author not found in the global graph.")
    data = svc.get_graph_without_node(author)
    return NetworkResponse(**data, removed_node=author, removed=True)
