from __future__ import annotations

from models.schemas import (
    ChatResponse,
    NetworkResponse,
    SearchResponse,
    TimelineResponse,
    TopicSummaryResponse,
)


def _sample_post() -> dict:
    return {
        "id": "abc123",
        "subreddit": "politics",
        "title": "sample",
        "selftext": "body",
        "author": "user_a",
        "score": 10,
        "upvote_ratio": 0.9,
        "num_comments": 4,
        "created_utc": 1710000000.0,
        "url": "https://example.com/post",
        "domain": "example.com",
        "permalink": "/r/politics/comments/abc123/sample",
        "is_self": False,
    }


def test_search_response_contract() -> None:
    model = SearchResponse(
        posts=[_sample_post()],
        total=1,
        query="policy",
        is_semantic=True,
        retrieval_mode="semantic",
    )
    assert model.posts[0].id == "abc123"


def test_chat_response_contract() -> None:
    model = ChatResponse(answer="ok", sources=[_sample_post()], suggested_queries=["next query"])
    assert model.sources[0].author == "user_a"


def test_topic_summary_contract() -> None:
    model = TopicSummaryResponse(
        topic_count=1,
        topics=[
            {
                "id": 0,
                "name": "topic",
                "keywords": ["k1", "k2"],
                "post_count": 3,
                "subreddit_distribution": {"politics": 3},
            }
        ],
        post_topic_map={"abc123": 0},
        landscape_url="/static/landscape.html",
    )
    assert model.topics[0].name == "topic"


def test_network_response_contract() -> None:
    model = NetworkResponse(
        nodes=[
            {
                "id": "author_1",
                "pagerank": 0.1,
                "degree": 2,
                "community": 1,
                "subreddits": ["politics"],
                "primary_subreddit": "politics",
                "post_count": 5,
            }
        ],
        edges=[
            {
                "source": "author_1",
                "target": "author_2",
                "weight": 1,
                "shared_contexts": ["example"],
                "evidence_type": "shared-domain",
            }
        ],
        removed_node=None,
        removed=False,
        component_count=1,
        query="",
        mode="global",
        matched_posts=0,
        summary="ok",
    )
    assert model.nodes[0].community == 1


def test_timeline_response_contract() -> None:
    model = TimelineResponse(
        series=[{"date": "2026-01-01", "count": 2, "avg_score": 3.5}],
        topic_trends=[
            {
                "topic_id": 1,
                "topic_name": "Topic 1",
                "total_posts": 2,
                "series": [{"date": "2026-01-01", "count": 2}],
            }
        ],
        summary="ok",
        query="policy",
    )
    assert model.series[0].count == 2
