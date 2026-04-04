from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from config import get_settings
from models.schemas import TimelineRequest, TimelineResponse
from services.rate_limit_service import rate_limiter

router = APIRouter()


@router.post("/timeline", response_model=TimelineResponse)
async def timeline(req: TimelineRequest, request: Request):
    from services.timeline_service import TimelineService

    settings = get_settings()
    client_id = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(
        bucket="timeline",
        client_id=client_id,
        limit=settings.rate_limit_timeline_per_window,
        window_seconds=settings.rate_limit_window_sec,
    ):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for timeline requests.")

    data = TimelineService.get_instance().get_series(req)
    return TimelineResponse(**data)
