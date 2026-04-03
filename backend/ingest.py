"""
ingest.py - One-time data pipeline for NarrativeScope.

Reads data.jsonl -> DuckDB -> embeddings -> FAISS -> BERTopic -> NetworkX graph.
Must be run before starting the FastAPI server.

Usage: python ingest.py [--data data/data.jsonl] [--force]
"""

from __future__ import annotations

import argparse
import json
import logging
import pickle
from collections import Counter, defaultdict
from pathlib import Path

import duckdb
import faiss
import networkx as nx
import numpy as np
from bertopic import BERTopic
from hdbscan import HDBSCAN
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from umap import UMAP

from config import DATA_DIR, get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_jsonl(filepath: Path) -> list[dict]:
    posts: list[dict] = []
    with filepath.open("r", encoding="utf-8") as handle:
        for line_num, line in enumerate(handle, start=1):
            raw = line.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
                data = obj.get("data", obj)
                author = data.get("author", "[deleted]")
                if author in ("[deleted]", "AutoModerator", ""):
                    continue
                post = {
                    "id": data.get("id", f"unknown_{line_num}"),
                    "subreddit": data.get("subreddit", "unknown"),
                    "title": data.get("title", "").strip(),
                    "selftext": data.get("selftext", "").strip(),
                    "author": author,
                    "score": int(data.get("score", 0) or 0),
                    "upvote_ratio": float(data.get("upvote_ratio", 0.5) or 0.5),
                    "num_comments": int(data.get("num_comments", 0) or 0),
                    "created_utc": float(data.get("created_utc", 0.0) or 0.0),
                    "url": data.get("url", ""),
                    "domain": data.get("domain", ""),
                    "permalink": data.get("permalink", ""),
                    "is_self": bool(data.get("is_self", False)),
                }
                posts.append(post)
            except (json.JSONDecodeError, TypeError, ValueError) as exc:
                logger.warning("Line %s: parse error - %s. Skipping.", line_num, exc)
    logger.info("Loaded %s valid posts from %s", len(posts), filepath)
    return posts


def dedupe_posts_by_id(posts: list[dict]) -> list[dict]:
    deduped: list[dict] = []
    seen: set[str] = set()
    for post in posts:
        post_id = str(post.get("id", "")).strip()
        if not post_id or post_id in seen:
            continue
        seen.add(post_id)
        deduped.append(post)
    return deduped


def _combined_text(post: dict) -> str:
    body = post["selftext"]
    if body in ("[deleted]", "[removed]", ""):
        body = ""
    return (post["title"] + " " + body).strip()


def build_duckdb(posts: list[dict], db_path: Path) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect(str(db_path))
    con.execute("DROP TABLE IF EXISTS posts")
    con.execute(
        """
        CREATE TABLE posts (
            id VARCHAR PRIMARY KEY,
            subreddit VARCHAR,
            title VARCHAR,
            selftext VARCHAR,
            author VARCHAR,
            score INTEGER,
            upvote_ratio DOUBLE,
            num_comments INTEGER,
            created_utc DOUBLE,
            url VARCHAR,
            domain VARCHAR,
            permalink VARCHAR,
            is_self BOOLEAN,
            text_combined VARCHAR
        )
        """
    )

    rows = []
    for post in posts:
        body = post["selftext"]
        if body in ("[deleted]", "[removed]", ""):
            body = ""
        rows.append(
            (
                post["id"],
                post["subreddit"],
                post["title"],
                body,
                post["author"],
                post["score"],
                post["upvote_ratio"],
                post["num_comments"],
                post["created_utc"],
                post["url"],
                post["domain"],
                post["permalink"],
                post["is_self"],
                _combined_text(post),
            )
        )

    con.executemany(
        "INSERT OR IGNORE INTO posts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        rows,
    )
    inserted = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    logger.info("DuckDB: inserted %s posts", inserted)
    return con


def compute_embeddings(
    posts: list[dict],
    model_name: str = "paraphrase-multilingual-MiniLM-L12-v2",
) -> tuple[np.ndarray, list[str]]:
    model = SentenceTransformer(model_name)
    texts = [_combined_text(post)[:400] or post["title"][:400] or post["id"] for post in posts]
    logger.info("Computing embeddings for %s posts...", len(texts))
    embeddings = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embeddings.astype(np.float32), texts


def build_faiss_index(embeddings: np.ndarray) -> faiss.Index:
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    logger.info("FAISS index built with %s vectors, dim=%s", index.ntotal, dim)
    return index


def build_topic_model(
    posts: list[dict],
    docs: list[str],
    embeddings: np.ndarray,
    nr_topics: int = 20,
) -> tuple[BERTopic, list[int], object]:
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

    nr_topics_safe = max(2, min(nr_topics, max(2, len(posts) // 10 or 2)))

    topic_model = BERTopic(
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        nr_topics=nr_topics_safe,
        top_n_words=10,
        verbose=True,
    )
    topics, _ = topic_model.fit_transform(docs, embeddings)
    topic_info = topic_model.get_topic_info()
    logger.info("BERTopic: found %s topics (requested %s)", len(topic_info), nr_topics_safe)
    return topic_model, list(topics), topic_info


def export_datamapplot(
    embeddings: np.ndarray,
    topics: list[int],
    topic_model: BERTopic,
    output_path: Path,
) -> None:
    import datamapplot

    umap_2d = UMAP(
        n_neighbors=15,
        n_components=2,
        min_dist=0.1,
        metric="cosine",
        random_state=42,
    )
    coords_2d = umap_2d.fit_transform(embeddings)

    topic_info = topic_model.get_topic_info()
    id_to_label = {-1: "Miscellaneous"}
    for _, row in topic_info.iterrows():
        topic_id = int(row["Topic"])
        if topic_id != -1:
            id_to_label[topic_id] = str(row["Name"])

    labels = [id_to_label.get(topic_id, "Miscellaneous") for topic_id in topics]

    try:
        figure = datamapplot.create_interactive_plot(
            coords_2d,
            labels,
            title="Topic Landscape",
            sub_title="Reddit Political Discourse - Embedding Space",
            darkmode=True,
            marker_size_array=np.full(coords_2d.shape[0], 2.0, dtype=np.float32),
        )
        figure.save(output_path)
    except ImportError as exc:
        if "pyarrow" in str(exc):
            raise RuntimeError(
                "Datamapplot interactive export requires pyarrow. "
                "Install updated backend requirements and rerun ingest."
            ) from exc
        raise
    logger.info("Datamapplot exported to %s", output_path)


def _safe_partition(graph: nx.Graph) -> dict[str, int]:
    import community as community_louvain

    if graph.number_of_nodes() == 0:
        return {}
    if graph.number_of_edges() == 0:
        return {node: index for index, node in enumerate(graph.nodes())}
    return community_louvain.best_partition(graph, weight="weight", random_state=42)


def build_network(posts: list[dict], max_nodes: int = 500) -> dict:
    graph = nx.Graph()
    author_posts: dict[str, list[dict]] = defaultdict(list)
    for post in posts:
        author = post["author"]
        if author in ("[deleted]", "AutoModerator", ""):
            continue
        author_posts[author].append(post)

    shared_index: dict[tuple[str, str], set[str]] = defaultdict(set)
    for author, post_list in author_posts.items():
        for post in post_list:
            domain = post["domain"]
            if post["is_self"] or not domain or "reddit.com" in domain:
                continue
            shared_index[(post["subreddit"], domain)].add(author)

    for (subreddit, domain), authors in shared_index.items():
        authors_list = sorted(authors)
        for left_index in range(len(authors_list)):
            for right_index in range(left_index + 1, len(authors_list)):
                author_a = authors_list[left_index]
                author_b = authors_list[right_index]
                if graph.has_edge(author_a, author_b):
                    graph[author_a][author_b]["weight"] += 1
                    graph[author_a][author_b]["shared_domains"].append(domain)
                else:
                    graph.add_edge(
                        author_a,
                        author_b,
                        weight=1,
                        shared_domains=[domain],
                        subreddit=subreddit,
                    )

    for author in author_posts:
        if author not in graph:
            graph.add_node(author)

    if graph.number_of_nodes() == 0:
        return {"nodes": [], "edges": []}

    pagerank = nx.pagerank(graph, weight="weight") if graph.number_of_edges() else {n: 0.0 for n in graph.nodes()}
    partition = _safe_partition(graph)

    for author in graph.nodes():
        subreddit_counts = Counter(post["subreddit"] for post in author_posts.get(author, []))
        primary_subreddit = subreddit_counts.most_common(1)[0][0] if subreddit_counts else None
        graph.nodes[author]["pagerank"] = round(float(pagerank.get(author, 0.0)), 6)
        graph.nodes[author]["degree"] = int(graph.degree(author))
        graph.nodes[author]["community"] = int(partition.get(author, -1))
        graph.nodes[author]["subreddits"] = sorted(subreddit_counts.keys())
        graph.nodes[author]["primary_subreddit"] = primary_subreddit
        graph.nodes[author]["post_count"] = len(author_posts.get(author, []))

    ranked_authors = sorted(pagerank.items(), key=lambda item: item[1], reverse=True)[:max_nodes]
    selected_authors = {author for author, _ in ranked_authors} or set(graph.nodes())

    nodes = []
    for author in selected_authors:
        attr = graph.nodes[author]
        nodes.append(
            {
                "id": author,
                "pagerank": attr["pagerank"],
                "degree": attr["degree"],
                "community": attr["community"],
                "subreddits": attr["subreddits"],
                "primary_subreddit": attr["primary_subreddit"],
                "post_count": attr["post_count"],
            }
        )

    edges = []
    for source, target, data in graph.edges(data=True):
        if source in selected_authors and target in selected_authors:
            edges.append(
                {
                    "source": source,
                    "target": target,
                    "weight": int(data.get("weight", 1)),
                    "shared_domains": sorted(set(data.get("shared_domains", [])))[:5],
                }
            )

    component_count = nx.number_connected_components(graph.subgraph(selected_authors))
    logger.info(
        "Network: %s nodes, %s edges, %s components",
        len(nodes),
        len(edges),
        component_count,
    )
    return {"nodes": nodes, "edges": edges}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/data.jsonl")
    parser.add_argument("--force", action="store_true", help="Re-run even if artifacts exist.")
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.is_absolute():
        data_path = (Path(__file__).parent / data_path).resolve()

    db_path = DATA_DIR / "posts.duckdb"
    embeddings_path = DATA_DIR / "embeddings.npy"
    faiss_path = DATA_DIR / "faiss.bin"
    topics_path = DATA_DIR / "topics.pkl"
    graph_path = DATA_DIR / "graph.json"
    landscape_path = DATA_DIR / "landscape.html"

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not data_path.exists():
        raise FileNotFoundError(f"Missing dataset: {data_path}")

    posts = load_jsonl(data_path)
    posts = dedupe_posts_by_id(posts)
    if not posts:
        raise RuntimeError("No valid posts were loaded; ingestion cannot continue.")

    con = build_duckdb(posts, db_path)
    con.close()

    settings = get_settings()
    embeddings, docs = compute_embeddings(posts, settings.embedding_model_name)
    np.save(embeddings_path, embeddings)

    index = build_faiss_index(embeddings)
    faiss.write_index(index, str(faiss_path))

    topic_model, topics, _topic_info = build_topic_model(posts, docs, embeddings, nr_topics=20)
    with topics_path.open("wb") as handle:
        pickle.dump(
            {
                "model": topic_model,
                "topics": topics,
                "post_ids": [post["id"] for post in posts],
                "docs": docs,
            },
            handle,
        )

    export_datamapplot(embeddings, topics, topic_model, landscape_path)

    graph = build_network(posts, max_nodes=settings.max_network_nodes)
    with graph_path.open("w", encoding="utf-8") as handle:
        json.dump(graph, handle)

    logger.info("Ingestion complete. All artifacts saved.")


if __name__ == "__main__":
    main()
