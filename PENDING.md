# PENDING

Audit update date: 2026-04-04

## Completed in Codebase

- [x] Added a complete README with architecture, setup, API docs, rubric mapping, ML/AI declarations, semantic examples, and screenshots.
- [x] Added dashboard screenshots under `docs/screenshots`.
- [x] Implemented strict semantic search behavior with explicit retrieval modes and no silent low-confidence fallback.
- [x] Exposed retrieval reason metadata to frontend and added user-facing no-result handling.
- [x] Added strict GenAI timeline enforcement option (`REQUIRE_GENAI_TIMELINE_SUMMARY`) plus startup/provider checks.
- [x] Added topic-over-time trends in backend timeline response and frontend timeline UI.
- [x] Added targeted rubric edge-case tests in `backend/tests/test_rubric_edge_cases.py`.
- [x] Sanitized local env files to remove exposed API key values.
- [x] Restored and expanded `samar-prompts.md` with additional implementation entries.
- [x] Added `DESIGN.md` for design rationale and interview defense clarity.

## User-Owned Final Actions (External)

- [ ] Replace placeholders in `README.md` with real public URLs:
  - frontend deployment URL
  - backend deployment URL
  - video walkthrough URL
- [ ] Rotate previously exposed provider keys in Gemini/Anthropic dashboards (external action) and store fresh keys securely.
- [ ] Continue making small, incremental commits while finalizing submission artifacts.

## Optional Nice-to-Have (Still Optional)

- [ ] Link offline events (Wikipedia/news APIs) to timeline spikes.
- [ ] Add multi-platform/cross-dataset search.
