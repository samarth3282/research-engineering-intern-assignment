from __future__ import annotations

from urllib.parse import urlparse

import duckdb

from config import DATA_DIR

POST_COLUMNS = [
    "id",
    "subreddit",
    "title",
    "selftext",
    "author",
    "score",
    "upvote_ratio",
    "num_comments",
    "created_utc",
    "url",
    "domain",
    "permalink",
    "is_self",
]


def _connect() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(str(DATA_DIR / "posts.duckdb"), read_only=True)


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def _domain_candidate(query: str) -> str:
    lowered = query.strip().lower()
    parsed = urlparse(lowered if "://" in lowered else f"https://{lowered}")
    candidate = parsed.netloc or parsed.path
    candidate = candidate.split("/", 1)[0].strip()
    return candidate.removeprefix("www.")


def _looks_like_link_query(query: str) -> bool:
    lowered = query.strip().lower()
    return "://" in lowered or "/" in lowered or "." in lowered


def fetch_posts_by_ids(ids: list[str]) -> list[dict]:
    if not ids:
        return []

    con = _connect()
    try:
        placeholders = ",".join(["?" for _ in ids])
        rows = con.execute(
            f"""
            SELECT id, subreddit, title, selftext, author, score, upvote_ratio,
                   num_comments, created_utc, url, domain, permalink, is_self
            FROM posts
            WHERE id IN ({placeholders})
            """,
            ids,
        ).fetchall()
    finally:
        con.close()

    id_to_post = {row[0]: dict(zip(POST_COLUMNS, row, strict=False)) for row in rows}
    return [id_to_post[post_id] for post_id in ids if post_id in id_to_post]


def fetch_posts_by_author(author: str, k: int) -> list[dict]:
    con = _connect()
    try:
        rows = con.execute(
            """
            SELECT id, subreddit, title, selftext, author, score, upvote_ratio,
                   num_comments, created_utc, url, domain, permalink, is_self
            FROM posts
            WHERE lower(author) = lower(?)
            ORDER BY score DESC, num_comments DESC
            LIMIT ?
            """,
            [author, k],
        ).fetchall()
    finally:
        con.close()

    return [dict(zip(POST_COLUMNS, row, strict=False)) for row in rows]


def _lexical_post_ids(query: str, k: int) -> list[str]:
    trimmed = query.strip().lower()
    if not trimmed:
        return []

    escaped = trimmed.replace("%", r"\%").replace("_", r"\_")
    like = f"%{escaped}%"
    domain = _domain_candidate(trimmed)
    domain_like = f"%{domain}%" if domain else like

    con = _connect()
    try:
        rows = con.execute(
            """
            SELECT id
            FROM posts
            WHERE lower(text_combined) LIKE ? ESCAPE '\\'
               OR lower(url) LIKE ? ESCAPE '\\'
               OR lower(domain) = ?
               OR lower(domain) LIKE ? ESCAPE '\\'
            ORDER BY
                CASE
                    WHEN lower(url) = ? THEN 0
                    WHEN lower(domain) = ? THEN 0
                    WHEN lower(url) LIKE ? ESCAPE '\\' THEN 1
                    WHEN lower(domain) LIKE ? ESCAPE '\\' THEN 1
                    ELSE 2
                END,
                score DESC,
                num_comments DESC
            LIMIT ?
            """,
            [like, like, domain, domain_like, trimmed, domain, like, domain_like, k],
        ).fetchall()
    finally:
        con.close()

    return [row[0] for row in rows]


def resolve_post_ids_for_query(query: str, k: int = 200) -> tuple[list[str], str]:
    trimmed = query.strip()
    if not trimmed:
        return [], "empty"

    if trimmed.lower().startswith("author:"):
        author = trimmed.split(":", 1)[1].strip()
        return [post["id"] for post in fetch_posts_by_author(author, k)], "author"

    lexical_ids = _lexical_post_ids(trimmed, k)

    from services.embedding_service import EmbeddingService

    semantic_ids, _is_semantic, _retrieval_mode = EmbeddingService.get_instance().search(
        trimmed,
        k=k,
        fallback_to_top_posts=False,
    )

    if _looks_like_link_query(trimmed):
        combined = _dedupe_preserve_order(lexical_ids + semantic_ids)
        mode = "lexical-first"
    else:
        combined = _dedupe_preserve_order(semantic_ids + lexical_ids)
        mode = "semantic-first"

    return combined[:k], mode


def fetch_posts_for_query(query: str, k: int = 200, subreddit: str = "") -> tuple[list[dict], str]:
    post_ids, mode = resolve_post_ids_for_query(query, k=k)
    posts = fetch_posts_by_ids(post_ids)
    if subreddit:
        posts = [post for post in posts if post["subreddit"].lower() == subreddit.lower()]
    return posts, mode
