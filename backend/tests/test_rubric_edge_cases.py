from __future__ import annotations

from dataclasses import dataclass

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers import cluster, network, search, timeline
from services.embedding_service import EmbeddingService
from services.network_service import build_narrative_graph
from services.cluster_service import ClusterService


app = FastAPI()
app.include_router(search.router, prefix="/api")
app.include_router(cluster.router, prefix="/api")
app.include_router(network.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
client = TestClient(app)


def _sample_post(post_id: str, title: str, author: str = "user_a") -> dict:
    return {
        "id": post_id,
        "subreddit": "politics",
        "title": title,
        "selftext": "discussion",
        "author": author,
        "score": 10,
        "upvote_ratio": 0.9,
        "num_comments": 4,
        "created_utc": 1710000000.0,
        "url": "https://example.com/post",
        "domain": "example.com",
        "permalink": f"/r/politics/comments/{post_id}/sample",
        "is_self": False,
    }


@dataclass
class _EmbeddingStub:
    ids: list[str]
    is_semantic: bool
    mode: str

    def search(self, _query: str, k: int = 10, fallback_to_top_posts: bool = False):
        return self.ids[:k], self.is_semantic, self.mode


def test_search_empty_result_explicit_low_confidence(monkeypatch: pytest.MonkeyPatch) -> None:
    stub = _EmbeddingStub([], False, "semantic_low_confidence")
    monkeypatch.setattr(EmbeddingService, "get_instance", classmethod(lambda cls: stub))
    monkeypatch.setattr(search, "fetch_posts_by_ids", lambda _ids: [])

    response = client.get("/api/search", params={"q": "coordinated influence campaign", "k": 10})
    assert response.status_code == 200
    payload = response.json()
    assert payload["posts"] == []
    assert payload["total"] == 0
    assert payload["retrieval_mode"] == "semantic_low_confidence"


def test_search_non_english_query_returns_semantic_results(monkeypatch: pytest.MonkeyPatch) -> None:
    stub = _EmbeddingStub(["ar_1"], True, "semantic")
    monkeypatch.setattr(EmbeddingService, "get_instance", classmethod(lambda cls: stub))
    monkeypatch.setattr(search, "fetch_posts_by_ids", lambda _ids: [_sample_post("ar_1", "سردية التضليل", "arabic_user")])

    response = client.get("/api/search", params={"q": "ما هي السرديات المضللة؟", "k": 10})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["is_semantic"] is True
    assert payload["retrieval_mode"] == "semantic"


@pytest.mark.parametrize(
    "query,returned_title",
    [
        ("workers replaced by software", "Automation pressures clerical hiring"),
        ("state narrative amplification", "Cross-subreddit message coordination pattern"),
        ("food prices and rent strain", "Cost-of-living squeeze in local communities"),
    ],
)
def test_semantic_retrieval_examples_with_zero_keyword_overlap(
    monkeypatch: pytest.MonkeyPatch,
    query: str,
    returned_title: str,
) -> None:
    stub = _EmbeddingStub(["sem_1"], True, "semantic")
    monkeypatch.setattr(EmbeddingService, "get_instance", classmethod(lambda cls: stub))
    monkeypatch.setattr(search, "fetch_posts_by_ids", lambda _ids: [_sample_post("sem_1", returned_title)])

    response = client.get("/api/search", params={"q": query, "k": 10})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["retrieval_mode"] == "semantic"


def test_network_remove_highly_connected_node_rebuilds_graph() -> None:
    posts = [
        {
            "id": "1",
            "author": "hub",
            "subreddit": "politics",
            "domain": "alpha.com",
            "is_self": False,
            "created_utc": 1710000000.0,
        },
        {
            "id": "2",
            "author": "a1",
            "subreddit": "politics",
            "domain": "alpha.com",
            "is_self": False,
            "created_utc": 1710000001.0,
        },
        {
            "id": "3",
            "author": "a2",
            "subreddit": "politics",
            "domain": "alpha.com",
            "is_self": False,
            "created_utc": 1710000002.0,
        },
        {
            "id": "4",
            "author": "a3",
            "subreddit": "politics",
            "domain": "alpha.com",
            "is_self": False,
            "created_utc": 1710000003.0,
        },
    ]

    full_graph = build_narrative_graph(posts, query="alpha")
    removed_graph = build_narrative_graph(posts, query="alpha", removed_author="hub")

    assert any(node["id"] == "hub" for node in full_graph["nodes"])
    assert all(node["id"] != "hub" for node in removed_graph["nodes"])
    assert len(removed_graph["edges"]) < len(full_graph["edges"])


def test_narrative_graph_handles_disconnected_components() -> None:
    posts = [
        {
            "id": "a",
            "author": "left_1",
            "subreddit": "politics",
            "domain": "left.example",
            "is_self": False,
            "created_utc": 1710000000.0,
        },
        {
            "id": "b",
            "author": "left_2",
            "subreddit": "politics",
            "domain": "left.example",
            "is_self": False,
            "created_utc": 1710000001.0,
        },
        {
            "id": "c",
            "author": "right_1",
            "subreddit": "Conservative",
            "domain": "right.example",
            "is_self": False,
            "created_utc": 1710000002.0,
        },
        {
            "id": "d",
            "author": "right_2",
            "subreddit": "Conservative",
            "domain": "right.example",
            "is_self": False,
            "created_utc": 1710000003.0,
        },
    ]

    result = build_narrative_graph(posts, query="split")
    assert result["component_count"] >= 2


def test_narrative_graph_handles_edgeless_state() -> None:
    posts = [
        {
            "id": "x1",
            "author": "solo_a",
            "subreddit": "politics",
            "domain": "domain-a.example",
            "is_self": False,
            "created_utc": 1710000100.0,
        },
        {
            "id": "x2",
            "author": "solo_b",
            "subreddit": "Conservative",
            "domain": "domain-b.example",
            "is_self": False,
            "created_utc": 1710000200.0,
        },
        {
            "id": "x3",
            "author": "solo_c",
            "subreddit": "Anarchism",
            "domain": "domain-c.example",
            "is_self": False,
            "created_utc": 1710000300.0,
        },
    ]

    result = build_narrative_graph(posts, query="independent")
    assert len(result["nodes"]) == 3
    assert result["edges"] == []
    assert result["component_count"] == 3


def test_network_api_returns_disconnected_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "nodes": [
            {"id": "n1", "pagerank": 0.1, "degree": 1, "community": 0, "subreddits": ["politics"], "primary_subreddit": "politics", "post_count": 2},
            {"id": "n2", "pagerank": 0.1, "degree": 1, "community": 0, "subreddits": ["politics"], "primary_subreddit": "politics", "post_count": 2},
            {"id": "n3", "pagerank": 0.1, "degree": 1, "community": 1, "subreddits": ["Conservative"], "primary_subreddit": "Conservative", "post_count": 2},
            {"id": "n4", "pagerank": 0.1, "degree": 1, "community": 1, "subreddits": ["Conservative"], "primary_subreddit": "Conservative", "post_count": 2},
        ],
        "edges": [
            {"source": "n1", "target": "n2", "weight": 1, "shared_contexts": ["a"], "evidence_type": "shared-domain"},
            {"source": "n3", "target": "n4", "weight": 1, "shared_contexts": ["b"], "evidence_type": "shared-domain"},
        ],
        "component_count": 2,
        "query": "split",
        "mode": "narrative",
        "matched_posts": 8,
        "summary": "ok",
    }

    monkeypatch.setattr(network, "fetch_posts_for_query", lambda _q, k=200, subreddit="": ([], "semantic-first"))
    monkeypatch.setattr(network, "build_narrative_graph", lambda _posts, query, removed_author=None: payload)

    response = client.get("/api/network", params={"q": "split"})
    assert response.status_code == 200
    assert response.json()["component_count"] == 2


def test_cluster_extreme_values_return_stable_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    class ClusterStub:
        async def get_topic_summary(self, nr_topics: int) -> dict:
            if nr_topics <= 1:
                return {
                    "topic_count": 1,
                    "topics": [{"id": 0, "name": "All Posts", "keywords": ["all"], "post_count": 10, "subreddit_distribution": {"politics": 10}}],
                    "post_topic_map": {"p1": 0},
                    "landscape_url": "/static/landscape.html",
                }
            return {
                "topic_count": min(100, nr_topics),
                "topics": [{"id": 1, "name": "Topic 1", "keywords": ["k"], "post_count": 1, "subreddit_distribution": {"politics": 1}}],
                "post_topic_map": {"p1": 1},
                "landscape_url": "/static/landscape.html",
            }

    monkeypatch.setattr(ClusterService, "get_instance", classmethod(lambda cls: ClusterStub()))

    low = client.get("/api/cluster", params={"nr_topics": 1})
    high = client.get("/api/cluster", params={"nr_topics": 100})

    assert low.status_code == 200
    assert high.status_code == 200
    assert low.json()["topic_count"] == 1
    assert high.json()["topic_count"] >= 1
