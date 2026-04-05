"""
TimelineService: DuckDB-backed time-series queries with optional semantic filtering.
"""

from __future__ import annotations

import pickle
from collections import defaultdict

import duckdb

from config import DATA_DIR, get_settings
from models.schemas import TimelineRequest
from services.llm_service import generate_timeline_summary
from services.post_service import resolve_post_ids_for_query


class TimelineService:
    _instance: "TimelineService" | None = None

    def __init__(self):
        self.db_path = DATA_DIR / "posts.duckdb"
        self.dataset_stats = self._load_dataset_stats()
        self._post_topic_map, self._topic_names = self._load_topic_metadata()

    def _connect(self) -> duckdb.DuckDBPyConnection:
        return duckdb.connect(str(self.db_path), read_only=True)

    def _load_dataset_stats(self) -> dict[str, int]:
        con = self._connect()
        posts = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
        subreddits = con.execute("SELECT COUNT(DISTINCT subreddit) FROM posts").fetchone()[0]
        con.close()
        return {"posts": posts, "subreddits": subreddits}

    def _load_topic_metadata(self) -> tuple[dict[str, int], dict[int, str]]:
        topic_file = DATA_DIR / "topics.pkl"
        if not topic_file.exists():
            return {}, {-1: "Miscellaneous"}

        saved = pickle.loads(topic_file.read_bytes())
        post_ids = [str(post_id) for post_id in saved.get("post_ids", [])]
        topic_ids = [int(topic_id) for topic_id in saved.get("topics", [])]
        mapping = {post_id: topic_id for post_id, topic_id in zip(post_ids, topic_ids, strict=False)}

        topic_names: dict[int, str] = {-1: "Miscellaneous"}
        model = saved.get("model")
        if model is not None:
            topic_info = model.get_topic_info()
            for _, row in topic_info.iterrows():
                topic_id = int(row["Topic"])
                topic_names[topic_id] = str(row["Name"])

        return mapping, topic_names

    def _build_topic_trends(self, period_rows: list[tuple[str, object]]) -> list[dict]:
        by_topic_and_period: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for post_id, period in period_rows:
            topic_id = int(self._post_topic_map.get(str(post_id), -1))
            if topic_id == -1:
                continue
            by_topic_and_period[topic_id][str(period)] += 1

        if not by_topic_and_period:
            return []

        ranked_topic_ids = sorted(
            by_topic_and_period.keys(),
            key=lambda topic_id: sum(by_topic_and_period[topic_id].values()),
            reverse=True,
        )[:3]

        trends: list[dict] = []
        for topic_id in ranked_topic_ids:
            period_counts = by_topic_and_period[topic_id]
            series = [
                {"date": date, "count": count}
                for date, count in sorted(period_counts.items())
            ]
            trends.append(
                {
                    "topic_id": topic_id,
                    "topic_name": self._topic_names.get(topic_id, f"Topic {topic_id}"),
                    "total_posts": sum(period_counts.values()),
                    "series": series,
                }
            )
        return trends

    def get_series(self, req: TimelineRequest) -> dict:
        con = self._connect()
        params: list[str] = []
        where_clause = ""

        if req.query.strip():
            post_ids, _mode = resolve_post_ids_for_query(req.query, k=250)
            if not post_ids:
                con.close()
                return {
                    "series": [],
                    "topic_trends": [],
                    "summary": "No posts matched this query.",
                    "query": req.query,
                }
            placeholders = ",".join(["?" for _ in post_ids])
            where_clause = f"WHERE id IN ({placeholders})"
            params.extend(post_ids)

        if req.subreddit:
            connector = "AND" if where_clause else "WHERE"
            where_clause += f" {connector} lower(subreddit) = lower(?)"
            params.append(req.subreddit.strip())

        trunc = {"day": "day", "week": "week", "month": "month"}[req.granularity]
        rows = con.execute(
            f"""
            SELECT
                date_trunc('{trunc}', to_timestamp(created_utc))::DATE AS period,
                COUNT(*) AS post_count,
                ROUND(AVG(score), 2) AS avg_score
            FROM posts
            {where_clause}
            GROUP BY period
            ORDER BY period ASC
            """,
            params,
        ).fetchall()
        period_rows = con.execute(
            f"""
            SELECT
                id,
                date_trunc('{trunc}', to_timestamp(created_utc))::DATE AS period
            FROM posts
            {where_clause}
            """,
            params,
        ).fetchall()
        con.close()

        series = [{"date": str(row[0]), "count": row[1], "avg_score": row[2]} for row in rows]
        topic_trends = self._build_topic_trends(period_rows)

        if not series:
            return {
                "series": [],
                "topic_trends": [],
                "summary": "No posts matched the selected filters.",
                "query": req.query,
            }

        peak = max(series, key=lambda item: item["count"])
        avg_score = sum(point["avg_score"] for point in series) / len(series)
        description = (
            f"Query: '{req.query or 'all posts'}'. "
            f"Granularity: {req.granularity}. "
            f"Date range: {series[0]['date']} to {series[-1]['date']}. "
            f"Peak volume: {peak['count']} posts on {peak['date']}. "
            f"Average score across periods: {avg_score:.1f}. "
            f"Top topic trend: {topic_trends[0]['topic_name'] if topic_trends else 'not available'}."
        )
        summary = generate_timeline_summary(
            description,
            require_genai=get_settings().require_genai_timeline_summary,
        )
        return {
            "series": series,
            "topic_trends": topic_trends,
            "summary": summary,
            "query": req.query,
        }

    @classmethod
    def get_instance(cls) -> "TimelineService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
