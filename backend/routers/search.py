from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from config import get_settings
from models.schemas import ChatRequest, ChatResponse, SearchResponse
from services.llm_service import rag_chat
from services.post_service import fetch_posts_by_author, fetch_posts_by_ids
from services.rate_limit_service import rate_limiter

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(default="", max_length=500),
    k: int = Query(default=10, ge=1, le=50),
    subreddit: str = Query(default=""),
):
    settings = get_settings()
    trimmed = q.strip()
    if trimmed and not trimmed.lower().startswith("author:") and len(trimmed) < 3:
        raise HTTPException(status_code=422, detail="Query must contain at least 3 characters.")

    from services.embedding_service import EmbeddingService

    svc = EmbeddingService.get_instance()

    if q.lower().startswith("author:"):
        author = q.split(":", 1)[1].strip()
        posts = fetch_posts_by_author(author, k)
        if subreddit:
            posts = [post for post in posts if post["subreddit"].lower() == subreddit.lower()]
        return SearchResponse(
            posts=posts[:k],
            total=len(posts[:k]),
            query=q,
            is_semantic=False,
            retrieval_mode="author",
        )

    post_ids, is_semantic, retrieval_mode = svc.search(
        q,
        k=k * 3 if subreddit else k,
        fallback_to_top_posts=not settings.strict_semantic_search,
    )
    posts = fetch_posts_by_ids(post_ids)

    if subreddit:
        posts = [post for post in posts if post["subreddit"].lower() == subreddit.lower()]

    posts = posts[:k]
    return SearchResponse(
        posts=posts,
        total=len(posts),
        query=q,
        is_semantic=is_semantic,
        retrieval_mode=retrieval_mode,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    from services.embedding_service import EmbeddingService

    settings = get_settings()
    client_id = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(
        bucket="chat",
        client_id=client_id,
        limit=settings.rate_limit_chat_per_window,
        window_seconds=settings.rate_limit_window_sec,
    ):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for chat requests.")

    history_payload = [item.model_dump() for item in req.history]

    if not req.question.strip():
        answer, suggested = rag_chat(req.question, [], history_payload)
        return ChatResponse(answer=answer, sources=[], suggested_queries=suggested)

    svc = EmbeddingService.get_instance()
    post_ids, _is_semantic, _retrieval_mode = svc.search(
        req.question,
        k=8,
        fallback_to_top_posts=False,
    )
    posts = fetch_posts_by_ids(post_ids)
    answer, suggested = rag_chat(req.question, posts, history_payload)
    return ChatResponse(answer=answer, sources=posts[:5], suggested_queries=suggested)
