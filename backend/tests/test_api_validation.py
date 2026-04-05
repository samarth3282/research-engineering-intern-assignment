from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers import cluster, network, search, timeline


app = FastAPI()
app.include_router(search.router, prefix="/api")
app.include_router(cluster.router, prefix="/api")
app.include_router(network.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
client = TestClient(app)


def test_search_rejects_short_query() -> None:
    response = client.get("/api/search", params={"q": "ab", "k": 10})
    assert response.status_code == 422
    assert "at least 3" in response.json()["detail"].lower()


def test_chat_history_item_validation() -> None:
    response = client.post(
        "/api/chat",
        json={
            "question": "test",
            "history": [{"role": "invalid", "content": "message"}],
        },
    )
    assert response.status_code == 422


def test_network_remove_requires_valid_author_pattern() -> None:
    response = client.get("/api/network/remove/contains.dot")
    assert response.status_code == 422


def test_timeline_subreddit_max_length_validation() -> None:
    response = client.post(
        "/api/timeline",
        json={
            "query": "policy",
            "granularity": "week",
            "subreddit": "x" * 121,
        },
    )
    assert response.status_code == 422
