"""
NetworkService: serves pre-computed graph JSON and handles node-removal queries.
"""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from collections import Counter, defaultdict
from datetime import datetime, timezone
from time import monotonic

import networkx as nx

from config import DATA_DIR, get_settings

_NARRATIVE_CACHE: dict[str, tuple[float, dict]] = {}


def _narrative_cache_key(
    posts: list[dict],
    query: str,
    removed_author: str | None,
    max_nodes: int | None,
) -> str:
    hasher = hashlib.md5()
    hasher.update(query.strip().lower().encode("utf-8"))
    hasher.update((removed_author or "").strip().lower().encode("utf-8"))
    hasher.update(str(max_nodes or 0).encode("utf-8"))
    for post in posts:
        hasher.update(str(post.get("id", "")).encode("utf-8"))
        hasher.update(b"|")
    return hasher.hexdigest()


def _get_cached_narrative(cache_key: str) -> dict | None:
    cached = _NARRATIVE_CACHE.get(cache_key)
    if not cached:
        return None

    expires_at, payload = cached
    if monotonic() >= expires_at:
        _NARRATIVE_CACHE.pop(cache_key, None)
        return None
    return deepcopy(payload)


def _set_cached_narrative(cache_key: str, payload: dict) -> None:
    settings = get_settings()
    if len(_NARRATIVE_CACHE) >= settings.network_query_cache_size:
        oldest_key = min(_NARRATIVE_CACHE.items(), key=lambda item: item[1][0])[0]
        _NARRATIVE_CACHE.pop(oldest_key, None)

    _NARRATIVE_CACHE[cache_key] = (
        monotonic() + settings.network_query_cache_ttl_sec,
        deepcopy(payload),
    )


def _safe_partition(graph: nx.Graph) -> dict[str, int]:
    import community as community_louvain

    if graph.number_of_nodes() == 0:
        return {}
    if graph.number_of_edges() == 0:
        return {node: index for index, node in enumerate(graph.nodes())}
    return community_louvain.best_partition(graph, weight="weight", random_state=42)


def _week_bucket(created_utc: float) -> str:
    dt = datetime.fromtimestamp(created_utc or 0.0, tz=timezone.utc)
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _global_summary() -> str:
    return (
        "Global influence map across the full dataset. "
        "Edges connect authors who shared the same non-Reddit domain inside the same subreddit."
    )


def build_narrative_graph(
    posts: list[dict],
    query: str,
    removed_author: str | None = None,
    max_nodes: int | None = None,
) -> dict:
    cache_key = _narrative_cache_key(posts, query, removed_author, max_nodes)
    cached = _get_cached_narrative(cache_key)
    if cached is not None:
        return cached

    graph = nx.Graph()
    author_posts: dict[str, list[dict]] = defaultdict(list)
    settings = get_settings()
    context_author_cap = max(2, settings.network_context_author_cap)

    for post in posts:
        author = post.get("author", "")
        if author in ("[deleted]", "AutoModerator", "", removed_author):
            continue
        author_posts[author].append(post)

    shared_index: dict[tuple[str, str, str], dict[str, object]] = {}
    for author, post_list in author_posts.items():
        for post in post_list:
            subreddit = post.get("subreddit", "unknown")
            domain = (post.get("domain") or "").lower().strip()
            if not post.get("is_self") and domain and "reddit.com" not in domain:
                key = ("shared-domain", subreddit, domain)
                label = domain
            else:
                week = _week_bucket(float(post.get("created_utc", 0.0) or 0.0))
                key = ("shared-discussion-window", subreddit, week)
                label = f"r/{subreddit} during {week}"

            entry = shared_index.setdefault(
                key,
                {"authors": set(), "label": label, "evidence_type": key[0]},
            )
            entry["authors"].add(author)

    for entry in shared_index.values():
        authors = sorted(
            entry["authors"],
            key=lambda author: (-len(author_posts.get(author, [])), author),
        )[:context_author_cap]
        label = str(entry["label"])
        evidence_type = str(entry["evidence_type"])
        for left_index in range(len(authors)):
            for right_index in range(left_index + 1, len(authors)):
                author_a = authors[left_index]
                author_b = authors[right_index]
                if graph.has_edge(author_a, author_b):
                    graph[author_a][author_b]["weight"] += 1
                    graph[author_a][author_b]["shared_contexts"].append(label)
                    graph[author_a][author_b]["evidence_types"].add(evidence_type)
                else:
                    graph.add_edge(
                        author_a,
                        author_b,
                        weight=1,
                        shared_contexts=[label],
                        evidence_types={evidence_type},
                    )

    for author in author_posts:
        if author not in graph:
            graph.add_node(author)

    if graph.number_of_nodes() == 0:
        result = {
            "nodes": [],
            "edges": [],
            "component_count": 0,
            "query": query,
            "mode": "narrative",
            "matched_posts": 0,
            "summary": (
                f"No author relationships were found for '{query}'. "
                "Try a broader narrative, domain, or keyword."
            ),
        }
        _set_cached_narrative(cache_key, result)
        return result

    visible_post_count = sum(len(post_list) for post_list in author_posts.values())

    if graph.number_of_edges():
        pagerank = nx.pagerank(graph, weight="weight")
    else:
        pagerank = {node: 0.0 for node in graph.nodes()}

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

    limit = max_nodes or get_settings().max_network_nodes
    ranked_authors = sorted(
        graph.nodes(),
        key=lambda author: (
            graph.nodes[author]["pagerank"],
            graph.nodes[author]["post_count"],
            graph.nodes[author]["degree"],
        ),
        reverse=True,
    )[:limit]
    selected_authors = set(ranked_authors) or set(graph.nodes())

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
            evidence_types = sorted(data.get("evidence_types", []))
            edges.append(
                {
                    "source": source,
                    "target": target,
                    "weight": int(data.get("weight", 1)),
                    "shared_contexts": sorted(set(data.get("shared_contexts", [])))[:6],
                    "evidence_type": evidence_types[0] if len(evidence_types) == 1 else "mixed",
                }
            )

    component_count = nx.number_connected_components(graph.subgraph(selected_authors))
    subreddit_counts = Counter(
        post["subreddit"] for post_list in author_posts.values() for post in post_list
    )
    dominant_subreddit = subreddit_counts.most_common(1)[0][0] if subreddit_counts else "unknown"
    if edges:
        summary = (
            f"Showing {len(nodes)} authors linked by {len(edges)} relationships from {visible_post_count} "
            f"matched posts for '{query}'. The densest activity sits in r/{dominant_subreddit}, "
            "and edges represent either shared non-Reddit domains or the same-subreddit discussion "
            "within the same week."
        )
    else:
        summary = (
            f"Showing {len(nodes)} authors from {visible_post_count} matched posts for '{query}', but their "
            "relationships are sparse. This usually means the narrative is discussed individually "
            "rather than amplified through shared links."
        )

    result = {
        "nodes": nodes,
        "edges": edges,
        "component_count": component_count,
        "query": query,
        "mode": "narrative",
        "matched_posts": visible_post_count,
        "summary": summary,
    }
    _set_cached_narrative(cache_key, result)
    return result


class NetworkService:
    _instance: "NetworkService" | None = None

    def __init__(self):
        with (DATA_DIR / "graph.json").open("r", encoding="utf-8") as handle:
            self._graph_data = json.load(handle)
        self._G = self._build_nx(self._graph_data)

    def _build_nx(self, data: dict) -> nx.Graph:
        graph = nx.Graph()
        for node in data["nodes"]:
            graph.add_node(node["id"], **{key: value for key, value in node.items() if key != "id"})
        for edge in data["edges"]:
            graph.add_edge(
                edge["source"],
                edge["target"],
                weight=edge.get("weight", 1),
                shared_domains=edge.get("shared_domains", []),
            )
        return graph

    def _resolve_author_id(self, author: str) -> str | None:
        if author in self._G:
            return author

        lowered = author.lower()
        for node_id in self._G.nodes():
            if str(node_id).lower() == lowered:
                return str(node_id)
        return None

    def has_author(self, author: str) -> bool:
        return self._resolve_author_id(author) is not None

    def get_full_graph(self) -> dict:
        edges = [
            {
                "source": edge["source"],
                "target": edge["target"],
                "weight": edge.get("weight", 1),
                "shared_contexts": edge.get("shared_domains", []),
                "evidence_type": "shared-domain",
            }
            for edge in self._graph_data["edges"]
        ]
        return {
            "nodes": self._graph_data["nodes"],
            "edges": edges,
            "component_count": (
                nx.number_connected_components(self._G) if self._G.number_of_nodes() else 0
            ),
            "query": "",
            "mode": "global",
            "matched_posts": 0,
            "summary": _global_summary(),
        }

    def get_graph_without_node(self, author: str) -> dict:
        resolved_author = self._resolve_author_id(author)
        if resolved_author is None:
            return self.get_full_graph()

        graph = self._G.copy()
        graph.remove_node(resolved_author)

        if graph.number_of_nodes() == 0:
            return {
                "nodes": [],
                "edges": [],
                "component_count": 0,
                "query": "",
                "mode": "global",
                "matched_posts": 0,
                "summary": _global_summary(),
            }

        if graph.number_of_edges():
            pagerank = nx.pagerank(graph, weight="weight")
        else:
            pagerank = {node: 0.0 for node in graph.nodes()}

        partition = _safe_partition(graph)

        nodes = []
        for node_id, attr in graph.nodes(data=True):
            nodes.append(
                {
                    "id": node_id,
                    "pagerank": round(float(pagerank.get(node_id, 0.0)), 6),
                    "degree": int(graph.degree(node_id)),
                    "community": int(partition.get(node_id, -1)),
                    "subreddits": attr.get("subreddits", []),
                    "primary_subreddit": attr.get("primary_subreddit"),
                    "post_count": attr.get("post_count", 0),
                }
            )

        edges = []
        for source, target, data in graph.edges(data=True):
            edges.append(
                {
                    "source": source,
                    "target": target,
                    "weight": int(data.get("weight", 1)),
                    "shared_contexts": data.get("shared_domains", []),
                    "evidence_type": "shared-domain",
                }
            )

        return {
            "nodes": nodes,
            "edges": edges,
            "component_count": nx.number_connected_components(graph) if graph.number_of_nodes() else 0,
            "query": "",
            "mode": "global",
            "matched_posts": 0,
            "summary": _global_summary(),
        }

    @classmethod
    def get_instance(cls) -> "NetworkService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
