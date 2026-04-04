from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from config import DATA_DIR, get_settings
from models.schemas import TopicSummaryResponse
from services.rate_limit_service import rate_limiter

router = APIRouter()


@router.get("/cluster", response_model=TopicSummaryResponse)
async def get_cluster(
    request: Request,
    nr_topics: int = Query(default=20, ge=1, le=200),
):
    from services.cluster_service import ClusterService

    settings = get_settings()
    client_id = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(
        bucket="cluster",
        client_id=client_id,
        limit=settings.rate_limit_cluster_per_window,
        window_seconds=settings.rate_limit_window_sec,
    ):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for cluster requests.")

    try:
        summary = await ClusterService.get_instance().get_topic_summary(nr_topics)
    except TimeoutError:
        raise HTTPException(status_code=503, detail="Cluster computation timed out.") from None
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return TopicSummaryResponse(**summary)


@router.get("/landscape")
async def get_landscape():
    if not (DATA_DIR / "landscape.html").exists():
        raise HTTPException(status_code=503, detail="Landscape artifact is not available.")
    return RedirectResponse(url="/static/landscape.html")
