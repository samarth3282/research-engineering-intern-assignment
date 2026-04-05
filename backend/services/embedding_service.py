"""
EmbeddingService: singleton managing the SentenceTransformer model and FAISS index.
"""

from __future__ import annotations

import pickle

import duckdb
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from config import DATA_DIR, get_settings


class EmbeddingService:
    _instance: "EmbeddingService" | None = None

    def __init__(self):
        settings = get_settings()
        self.settings = settings
        self.model = SentenceTransformer(settings.embedding_model_name)
        self.embeddings = np.load(DATA_DIR / "embeddings.npy")
        self.index = faiss.read_index(str(DATA_DIR / "faiss.bin"))
        self.post_ids = self._load_post_ids()

    def _load_post_ids(self) -> list[str]:
        topics_path = DATA_DIR / "topics.pkl"
        if topics_path.exists():
            saved = pickle.loads(topics_path.read_bytes())
            ids = [str(value) for value in saved.get("post_ids", [])]
            if len(ids) == int(self.index.ntotal):
                return ids

        con = duckdb.connect(str(DATA_DIR / "posts.duckdb"), read_only=True)
        ids = [row[0] for row in con.execute("SELECT id FROM posts ORDER BY rowid").fetchall()]
        con.close()
        if len(ids) != int(self.index.ntotal):
            raise RuntimeError(
                "Embedding index and post id mapping are out of sync. "
                "Rerun ingest.py to rebuild artifacts."
            )
        return ids

    def _top_posts_by_score(self, k: int) -> list[str]:
        con = duckdb.connect(str(DATA_DIR / "posts.duckdb"), read_only=True)
        rows = con.execute(
            "SELECT id FROM posts ORDER BY score DESC, num_comments DESC LIMIT ?",
            [k],
        ).fetchall()
        con.close()
        return [row[0] for row in rows]

    def embed_query(self, text: str) -> np.ndarray | None:
        text = text.strip()
        if len(text) < 3:
            return None
        vector = self.model.encode(
            [text],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return vector.astype(np.float32)

    def search(
        self,
        query: str,
        k: int = 10,
        fallback_to_top_posts: bool = True,
    ) -> tuple[list[str], bool, str]:
        query_vector = self.embed_query(query)
        k_safe = min(max(k, 1), int(self.index.ntotal))
        if query_vector is None:
            if fallback_to_top_posts:
                return self._top_posts_by_score(k_safe), False, "fallback_top_posts_short_query"
            return [], False, "query_too_short"

        scores, indices = self.index.search(query_vector, k_safe)
        pairs = [
            (float(score), int(index))
            for score, index in zip(scores[0], indices[0], strict=False)
            if index >= 0
        ]
        if not pairs:
            if fallback_to_top_posts:
                return self._top_posts_by_score(k_safe), False, "fallback_top_posts_empty_neighbors"
            return [], False, "no_neighbors"

        if pairs[0][0] < self.settings.semantic_min_score:
            if fallback_to_top_posts:
                return self._top_posts_by_score(k_safe), False, "fallback_top_posts_low_confidence"
            return [], False, "semantic_low_confidence"

        return [self.post_ids[index] for _score, index in pairs], True, "semantic"

    @classmethod
    def get_instance(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
