# Design Notes

## Problem Framing

The dashboard is designed as an investigative workflow, not a gallery of disconnected charts.

Core principle: one query should drive search, explanation, timeline, clustering context, and network structure so an analyst can move from evidence to interpretation quickly.

## Why This Structure

- Explore page is the operational entrypoint (query, evidence cards, grounded chat, timeline summary).
- Network page is a stress-testable structural lens (community and influence analysis).
- Landscape page is a model-introspection lens (embedding geometry and cluster controls).

This separation keeps each view deep and purpose-built while preserving a shared narrative query context.

## Network Layout and Filtering Choices

- Graph edges encode meaningful co-occurrence evidence:
  - shared non-Reddit domains in the same subreddit
  - shared discussion windows (same subreddit and week)
- This reduces false links compared with naive co-subreddit co-presence.
- A per-context author cap prevents pathological clique blowups.
- Query-scoped narrative graphs are preferred over always rendering a global graph to keep signal density high and computation bounded.

## Centrality / Community Algorithm Choice

- Influence score: PageRank on weighted undirected graph.
  - Reason: robust, interpretable ranking for amplification-like flow on connection networks.
- Community detection: Louvain partitioning.
  - Reason: scalable modularity optimization suitable for medium graph sizes and fast recomputation after node removal.

## Edge-Case Strategy

- Empty graph: return safe empty payload.
- Edgeless graph: deterministic fallback partition, zero PageRank defaults.
- Node removal: recompute centrality + communities on resulting graph.
- Cluster extremes: low values collapse to broad summary mode; high values remain bounded and UI-safe.
- Semantic low confidence: strict mode returns no-result instead of unrelated fallback content.

## Alternatives Considered

- Betweenness centrality instead of PageRank:
  - Rejected for runtime cost and instability under frequent interactive recomputation.
- Force-directed global graph by default:
  - Rejected due to clutter and poor narrative specificity for analyst tasks.
- Pure lexical search baseline:
  - Rejected because assignment explicitly tests semantic zero-overlap retrieval.
- Static hardcoded summaries:
  - Rejected because rubric requires dynamic summaries from returned data.

## Remaining Manual Submission Items

- Publish production URLs and update README placeholders.
- Record walkthrough video and add link.
- Rotate any previously exposed API keys in provider dashboards.
