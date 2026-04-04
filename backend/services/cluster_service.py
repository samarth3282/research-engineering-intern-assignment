"""
ClusterService: handles dynamic re-clustering with user-specified nr_topics.
"""

from __future__ import annotations

import asyncio
import pickle
from concurrent.futures import ThreadPoolExecutor

import duckdb
import numpy as np
from bertopic import BERTopic
from hdbscan import HDBSCAN
from sklearn.feature_extraction.text import CountVectorizer
from umap import UMAP

from config import DATA_DIR, get_settings

_executor = ThreadPoolExecutor(max_workers=2)


class ClusterService:
    _instance: "ClusterService" | None = None

    def __init__(self):
        bundle_path = DATA_DIR / "topics.pkl"
        saved = pickle.loads(bundle_path.read_bytes())
        self._model: BERTopic = saved["model"]
        self._topics: list[int] = list(saved["topics"])
        self._post_ids: list[str] = list(saved["post_ids"])
        self._docs: list[str] = list(saved.get("docs", []))
        self._embeddings: np.ndarray = np.load(DATA_DIR / "embeddings.npy")
        self._id_to_subreddit = self._load_subreddits()
        self._cache: dict[int, dict] = {}
        self._inflight: dict[int, asyncio.Future] = {}
        self._default_nr_topics = max(2, min(20, max(2, len(self._post_ids) // 10 or 2)))

    def _load_subreddits(self) -> dict[str, str]:
        con = duckdb.connect(str(DATA_DIR / "posts.duckdb"), read_only=True)
        rows = con.execute("SELECT id, subreddit FROM posts").fetchall()
        con.close()
        return {row[0]: row[1] for row in rows}

    def _summarize(self, topic_model: BERTopic, topics: list[int], landscape_url: str) -> dict:
        topic_info = topic_model.get_topic_info()
        topics_out: list[dict] = []
        post_topic_map = {post_id: int(topic_id) for post_id, topic_id in zip(self._post_ids, topics, strict=False)}

        for _, row in topic_info.iterrows():
            topic_id = int(row["Topic"])
            if topic_id == -1:
                continue
            topic_words = topic_model.get_topic(topic_id) or []
            keywords = [word for word, _score in topic_words[:5]]
            subreddit_distribution: dict[str, int] = {}
            for post_id, mapped_topic in post_topic_map.items():
                if mapped_topic != topic_id:
                    continue
                subreddit = self._id_to_subreddit.get(post_id, "unknown")
                subreddit_distribution[subreddit] = subreddit_distribution.get(subreddit, 0) + 1

            topics_out.append(
                {
                    "id": topic_id,
                    "name": str(row["Name"]),
                    "keywords": keywords,
                    "post_count": int(row["Count"]),
                    "subreddit_distribution": subreddit_distribution,
                }
            )

        return {
            "topic_count": len(topics_out),
            "topics": topics_out,
            "post_topic_map": post_topic_map,
            "landscape_url": landscape_url,
        }

    def _all_posts_summary(self, landscape_url: str) -> dict:
        subreddit_distribution: dict[str, int] = {}
        for subreddit in self._id_to_subreddit.values():
            subreddit_distribution[subreddit] = subreddit_distribution.get(subreddit, 0) + 1
        return {
            "topic_count": 1,
            "topics": [
                {
                    "id": 0,
                    "name": "All Posts",
                    "keywords": ["all", "posts"],
                    "post_count": len(self._post_ids),
                    "subreddit_distribution": subreddit_distribution,
                }
            ],
            "post_topic_map": {post_id: 0 for post_id in self._post_ids},
            "landscape_url": landscape_url,
        }

    def _fit_summary(self, nr_topics: int, landscape_url: str) -> dict:
        if nr_topics <= 1:
            return self._all_posts_summary(landscape_url)

        max_topics = max(2, len(self._post_ids) // 10 or 2)
        nr_topics_safe = max(2, min(nr_topics, max_topics))

        if nr_topics_safe == self._default_nr_topics:
            return self._summarize(self._model, self._topics, landscape_url)
        if nr_topics_safe in self._cache:
            return self._cache[nr_topics_safe]

        umap_model = UMAP(
            n_neighbors=15,
            n_components=5,
            min_dist=0.0,
            metric="cosine",
            random_state=42,
        )
        hdbscan_model = HDBSCAN(
            min_cluster_size=10,
            metric="euclidean",
            cluster_selection_method="eom",
            prediction_data=True,
        )
        vectorizer_model = CountVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
        )
        model = BERTopic(
            umap_model=umap_model,
            hdbscan_model=hdbscan_model,
            vectorizer_model=vectorizer_model,
            nr_topics=nr_topics_safe,
            top_n_words=10,
            verbose=False,
        )
        topics, _ = model.fit_transform(self._docs, self._embeddings)
        summary = self._summarize(model, list(topics), landscape_url)
        self._cache[nr_topics_safe] = summary
        return summary

    async def get_topic_summary(self, nr_topics: int | None = None) -> dict:
        landscape_url = "/static/landscape.html"
        requested = nr_topics or 20
        loop = asyncio.get_running_loop()
        future = self._inflight.get(requested)
        if future is None:
            future = loop.run_in_executor(_executor, self._fit_summary, requested, landscape_url)
            self._inflight[requested] = future

        timeout_seconds = get_settings().cluster_compute_timeout_sec
        try:
            return await asyncio.wait_for(asyncio.shield(future), timeout=timeout_seconds)
        except asyncio.TimeoutError as exc:
            raise TimeoutError(
                f"Cluster computation exceeded {timeout_seconds} seconds."
            ) from exc
        finally:
            current = self._inflight.get(requested)
            if current is future and future.done():
                self._inflight.pop(requested, None)

    @classmethod
    def get_instance(cls) -> "ClusterService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
