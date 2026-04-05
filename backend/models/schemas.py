"""All Pydantic models for request/response validation."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

class Post(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    subreddit: str = Field(..., min_length=1, max_length=128)
    title: str = Field(default="", max_length=2048)
    selftext: str = Field(default="", max_length=50000)
    author: str = Field(..., min_length=1, max_length=128)
    score: int
    upvote_ratio: float
    num_comments: int
    created_utc: float
    url: str = Field(default="", max_length=4096)
    domain: str = Field(default="", max_length=255)
    permalink: str = Field(default="", max_length=4096)
    is_self: bool


class SearchResponse(BaseModel):
    posts: list[Post]
    total: int
    query: str
    is_semantic: bool
    retrieval_mode: str = "semantic"

class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=0, max_length=500)
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=20)

class ChatResponse(BaseModel):
    answer: str
    sources: list[Post]
    suggested_queries: list[str] = Field(default_factory=list, max_length=10)

class ClusterRequest(BaseModel):
    nr_topics: int = Field(default=20, ge=1, le=200)

class TopicSummaryResponse(BaseModel):
    class TopicSummary(BaseModel):
        id: int
        name: str
        keywords: list[str]
        post_count: int
        subreddit_distribution: dict[str, int]

    topic_count: int
    topics: list[TopicSummary]
    post_topic_map: dict[str, int]
    landscape_url: str

class NetworkResponse(BaseModel):
    class NetworkNode(BaseModel):
        id: str
        pagerank: float
        degree: int
        community: int
        subreddits: list[str]
        primary_subreddit: Optional[str] = None
        post_count: int

    class NetworkEdge(BaseModel):
        source: str
        target: str
        weight: int
        shared_contexts: list[str]
        evidence_type: str

    nodes: list[NetworkNode]
    edges: list[NetworkEdge]
    removed_node: Optional[str] = None
    removed: bool = False
    component_count: int
    query: str = ""
    mode: str = "global"
    matched_posts: int = 0
    summary: str = ""


class TimelineRequest(BaseModel):
    query: str = Field(default="", max_length=200)
    subreddit: Optional[str] = Field(default=None, max_length=120)
    granularity: str = Field(default="week", pattern="^(day|week|month)$")


class TimelinePoint(BaseModel):
    date: str
    count: int
    avg_score: float


class TopicTrendPoint(BaseModel):
    date: str
    count: int


class TopicTrend(BaseModel):
    topic_id: int
    topic_name: str
    total_posts: int
    series: list[TopicTrendPoint]


class TimelineResponse(BaseModel):
    series: list[TimelinePoint]
    topic_trends: list[TopicTrend] = Field(default_factory=list)
    summary: str
    query: str
