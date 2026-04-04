"""
TimelineService: DuckDB-backed time-series queries with optional semantic filtering.
"""

from __future__ import annotations

import duckdb

from config import DATA_DIR
from models.schemas import TimelineRequest
from services.llm_service import generate_timeline_summary
from services.post_service import resolve_post_ids_for_query


class TimelineService:
    _instance: "TimelineService" | None = None

    def __init__(self):
        self.db_path = DATA_DIR / "posts.duckdb"
        self.dataset_stats = self._load_dataset_stats()

    def _connect(self) -> duckdb.DuckDBPyConnection:
        return duckdb.connect(str(self.db_path), read_only=True)

    def _load_dataset_stats(self) -> dict[str, int]:
        con = self._connect()
        posts = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
        subreddits = con.execute("SELECT COUNT(DISTINCT subreddit) FROM posts").fetchone()[0]
        con.close()
        return {"posts": posts, "subreddits": subreddits}

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
        con.close()

        series = [{"date": str(row[0]), "count": row[1], "avg_score": row[2]} for row in rows]

        if not series:
            return {
                "series": [],
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
            f"Average score across periods: {avg_score:.1f}."
        )
        summary = generate_timeline_summary(description)
        return {"series": series, "summary": summary, "query": req.query}

    @classmethod
    def get_instance(cls) -> "TimelineService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
