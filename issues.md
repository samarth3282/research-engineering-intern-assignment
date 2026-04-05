proceed by fixing all the issues one by one. no issue should be left for fixing.

# 1. Page-wise Report

## Page Name: /
**Purpose:** Root entry that redirects to /explore via page.tsx:4.  
**Issues Found:** No functional issue in redirect path.  
**API Calls:** None.  
**Severity:** Low.

## Page Name: /explore
**Purpose:** Query entrypoint for semantic retrieval, grounded chat, and narrative timeline in page.tsx:58.  
**Issues Found:**  
Query race risk and inconsistent UI state because search/chat are launched in parallel and can overlap with subsequent submissions (page.tsx:93, page.tsx:94, page.tsx:95); suggested query actions are always clickable and can trigger duplicate requests while loading (SuggestedQueries.tsx:23); failure branch appends an error message but does not clear stale previous results, so UI can show old evidence after a failed request (page.tsx:124); fixed chat height may clip on small screens (ChatThread.tsx:31).  
**API Calls:**  
GET /api/search (page.tsx:94), POST /api/chat (page.tsx:95), POST /api/timeline via timeline component (NarrativeTimeline.tsx:127).  
**Severity:** High.

## Page Name: /landscape
**Purpose:** Topic cluster landscape with reclustering controls in page.tsx:11.  
**Issues Found:**  
Initial topics fetch has no catch path and no user-visible API error state (page.tsx:17, page.tsx:19); slider triggers API call on every value change (request storm risk, especially because backend reclustering is expensive) (ClusterSlider.tsx:59, ClusterSlider.tsx:37); slider failures are only logged to console, not surfaced to user (ClusterSlider.tsx:40); fixed slider width hurts small-screen layout (ClusterSlider.tsx:60).  
**API Calls:**  
GET /api/cluster on mount (page.tsx:17), GET /api/cluster on slider drag (ClusterSlider.tsx:37).  
**Severity:** High.

## Page Name: /network
**Purpose:** Global or query-specific author graph with community filtering and node actions in page.tsx:52.  
**Issues Found:**  
No request cancellation/order guard for graph reload/remove, so stale responses can overwrite newer user intent (page.tsx:72, page.tsx:135); node-removal flow does not clear previous error before retry (only loadGraph clears error) (page.tsx:68, page.tsx:135); Global button remains enabled in some loading states, allowing additional route churn while refresh is in progress (page.tsx:214); timeline strip has no loading state and falls back to generic text on failure (TimelineStrip.tsx:33).  
**API Calls:**  
GET /api/network (page.tsx:72), GET /api/network/remove/{author} (page.tsx:135), POST /api/timeline for node strip (TimelineStrip.tsx:26).  
**Severity:** Medium.

## Page Name: Shared shell affecting all pages
**Purpose:** Navigation, health state, and global framing via layout.tsx:25, Sidebar.tsx:23, TopBar.tsx:24.  
**Issues Found:**  
Mobile navigation gap because sidebar is hidden below lg and no alternate nav is provided (Sidebar.tsx:23); health check is one-shot with 5s timeout and no periodic refresh, so status can become stale (TopBar.tsx:24); “showing cached data” message is misleading because no actual cache layer is implemented (TopBar.tsx:69).  
**API Calls:**  
GET /health from top bar (api.ts:72).  
**Severity:** High.

# 2. API-wise Report

## Endpoint: GET /health
**Issues:**  
Synchronous DB calls on request path without explicit exception handling around query failure; a broken DB can propagate 500 (main.py:43, main.py:116).  
**Suggested Fix:**  
Wrap DB access in try/except, return degraded health payload with status=degraded and error code; optionally cache stats for short TTL.

## Endpoint: GET /api/search
**Issues:**  
No explicit server-side min query length despite UI enforcing >=3 chars (contract behavior divergence for direct API callers) (search.py:14, page.tsx:82); no route-level exception mapping.  
**Suggested Fix:**  
Add min_length validation and explicit error model (422/400), plus centralized exception handler for embedding/DB failures.

## Endpoint: POST /api/chat
**Issues:**  
Request history is untyped/unbounded list[dict], allowing oversized/malformed payloads (schemas.py:19); no request-level throttling or rate limiting for expensive chat usage.  
**Suggested Fix:**  
Define strict message schema (role enum + bounded content), add max history length and payload size limits, and introduce per-IP rate limiting.

## Endpoint: GET /api/cluster
**Issues:**  
Potentially heavy fit_transform execution per request (cluster_service.py:136); susceptible to burst calls from slider onValueChange (ClusterSlider.tsx:59).  
**Suggested Fix:**  
Client debounce/commit-only requests, server-side in-flight dedupe keyed by nr_topics, timeout budget, and compute queue limits.

## Endpoint: GET /api/landscape
**Issues:**  
Simple redirect only; if static artifact is missing, behavior degrades to static file failure without API-level structured error (cluster.py:21, main.py:106).  
**Suggested Fix:**  
Pre-check artifact existence and return explicit JSON error when unavailable.

## Endpoint: GET /api/network
**Issues:**  
Narrative graph construction has pairwise author linking loops with high worst-case cost (network_service.py:77, network_service.py:78); no explicit caching for repeated query payloads.  
**Suggested Fix:**  
Add query-result cache with TTL, prune candidate sets earlier, and cap pairwise expansion per context bucket.

## Endpoint: GET /api/network/remove/{author}
**Issues:**  
author path lacks length/format validation (network.py:33); when author is absent in global graph, service returns full graph, while router still reports removed_node, which can mislead UI (network_service.py:247, network.py:43).  
**Suggested Fix:**  
Validate author param, return removed=false or 404 for non-existent node in selected graph context.

## Endpoint: POST /api/timeline
**Issues:**  
subreddit filter uses exact match semantics while other paths normalize case, causing inconsistent results by casing (timeline_service.py:52, search.py:26); subreddit field lacks explicit max length (schemas.py:52).  
**Suggested Fix:**  
Normalize to case-insensitive compare and add bounded subreddit validation.

## Cross-cutting contract issue across APIs
Backend response models use list[dict] for nested payloads, weakening contract guarantees (schemas.py:11, schemas.py:24, schemas.py:34, schemas.py:40, schemas.py:57) while frontend expects strict typed objects (types.ts:1).

# 3. End-to-End Flow Issues

## Flow: Explore submit -> /api/search + /api/chat -> results + chat thread
**Problem:**  
Out-of-order response rendering and stale evidence on failure.  
**Root Cause:**  
Parallel calls without cancellation/version guard; failure branch does not reset prior results (page.tsx:93, page.tsx:124).  
**Fix:**  
Add request token/versioning + AbortController, clear stale panels on failed query, disable submit/suggestion triggers during in-flight requests.

## Flow: Explore timeline granularity toggle -> /api/timeline -> chart + summary
**Problem:**  
Fast toggles can render stale period response.  
**Root Cause:**  
No abort of previous timeline fetch in component effect (NarrativeTimeline.tsx:127).  
**Fix:**  
Abort previous request and verify active query/granularity before state commit.

## Flow: Landscape slider drag -> /api/cluster -> BERTopic recluster -> legend refresh
**Problem:**  
High latency/request bursts; backend compute saturation risk.  
**Root Cause:**  
onValueChange fires many network calls; backend computes fit_transform for uncached topic counts (ClusterSlider.tsx:59, cluster_service.py:136).  
**Fix:**  
Trigger on release or debounce, add server in-flight dedupe and max concurrent jobs.

## Flow: Network query map -> /api/network -> graph build -> force graph render
**Problem:**  
Slow responses on broad narratives and potential UI churn with repeated requests.  
**Root Cause:**  
Pairwise link expansion and no query cache (network_service.py:77, network_service.py:78).  
**Fix:**  
Cap context fan-out, cache narrative graph results, add cancellation on the frontend.

## Flow: Node removal -> /api/network/remove/{author} -> graph update -> node panel reset
**Problem:**  
Non-existent author can still appear “removed”; errors can persist across retries.  
**Root Cause:**  
Service returns full graph for missing author; router always sets removed_node; partial frontend error reset logic (network_service.py:247, network.py:43, page.tsx:68).  
**Fix:**  
Return explicit removed flag/404 and clear error state before removeNode requests.

## Flow: App shell mount -> /health -> status badges
**Problem:**  
Operational status becomes stale and user messaging can be inaccurate.  
**Root Cause:**  
One-shot health fetch with timeout and no polling/backoff (TopBar.tsx:24, TopBar.tsx:69).  
**Fix:**  
Add periodic polling with exponential backoff and accurate stale-data copy.

# 4. Critical Bugs (Top Priority)

- Mobile navigation is effectively broken on small screens because sidebar is hidden and no replacement nav exists (Sidebar.tsx:23).
- Landscape reclustering can trigger compute storms from slider drag, likely causing production latency spikes/timeouts (ClusterSlider.tsx:59, cluster_service.py:136).
- Public endpoints have no auth and no rate limiting; misuse/abuse risk is high for expensive endpoints (/api/chat, /api/cluster, /api/network).
- Response contracts are weakly enforced due list[dict] nested schemas, creating silent frontend/backend drift risk (schemas.py:11, schemas.py:57, types.ts:1).
- Embedding-to-post id alignment depends on DB rowid order in runtime service vs ingestion order in artifact generation, which can break semantic retrieval correctness if ordering diverges (embedding_service.py:28, ingest.py:393, ingest.py:126).
- Narrative graph builder has high worst-case pairwise complexity and can degrade severely under broad queries (network_service.py:77, network_service.py:78).

# 5. Improvement Suggestions

## Performance

- Add request cancellation/version guards in Explore, Network, NarrativeTimeline, and TimelineStrip.
- Debounce/commit-only cluster slider requests and cache /api/cluster + /api/network query responses.
- Optimize narrative graph edge construction to avoid unrestricted pairwise expansion.

## Code quality

- Replace list[dict] response fields with strict nested Pydantic models for posts, nodes, edges, topics, and timeline points.
- Introduce centralized API error schema and exception handlers so frontend can parse structured failures consistently (instead of generic text in api.ts:18).
- Add automated coverage: backend API tests (FastAPI TestClient), frontend E2E (Playwright), and contract tests for response shape parity.

## UX improvements

- Add mobile navigation fallback (topbar menu or bottom nav) for all routes.
- Show explicit loading/error states for all API fetches (especially landscape initial fetch and timeline strip).
- Prevent duplicate user actions while requests are in flight and provide retry affordances with context.