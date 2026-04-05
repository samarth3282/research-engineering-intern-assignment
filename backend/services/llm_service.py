"""
LLMService: wraps Gemini or Anthropic for time-series summaries and RAG chat.
Falls back to deterministic summaries when no provider is configured.
"""

from __future__ import annotations

import hashlib
import logging
from functools import lru_cache

from config import get_settings

try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:  # pragma: no cover
    genai = None
    genai_types = None


logger = logging.getLogger(__name__)


def _active_provider() -> str | None:
    settings = get_settings()
    provider = settings.llm_provider.lower().strip()

    if provider == "gemini":
        return "gemini" if settings.gemini_api_key and genai is not None else None
    if provider == "anthropic":
        return "anthropic" if settings.anthropic_api_key and anthropic is not None else None

    if settings.gemini_api_key and genai is not None:
        return "gemini"
    if settings.anthropic_api_key and anthropic is not None:
        return "anthropic"
    return None


def has_active_provider() -> bool:
    return _active_provider() is not None


def ensure_timeline_llm_ready() -> None:
    if not has_active_provider():
        raise RuntimeError(
            "Timeline summaries require an active LLM provider. "
            "Set LLM_PROVIDER and API credentials for Gemini or Anthropic."
        )


def _gemini_client():
    settings = get_settings()
    if not settings.gemini_api_key or genai is None:
        return None
    return genai.Client(api_key=settings.gemini_api_key)


def _anthropic_client():
    settings = get_settings()
    if not settings.anthropic_api_key or anthropic is None:
        return None
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


@lru_cache(maxsize=256)
def _cached_complete(prompt_hash: str, provider: str, system: str, user: str) -> str:
    if provider == "gemini":
        client = _gemini_client()
        if client is None or genai_types is None:
            return ""
        try:
            response = client.models.generate_content(
                model=get_settings().gemini_model,
                contents=user,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=400,
                    temperature=0.3,
                ),
            )
            return (response.text or "").strip()
        except Exception as exc:  # pragma: no cover
            logger.warning("Gemini request failed: %s", exc)
            return ""

    if provider == "anthropic":
        client = _anthropic_client()
        if client is None:
            return ""
        try:
            message = client.messages.create(
                model=get_settings().anthropic_model,
                max_tokens=400,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return message.content[0].text
        except Exception as exc:  # pragma: no cover
            logger.warning("Anthropic request failed: %s", exc)
            return ""

        return ""
    return ""


def _fallback_timeline_summary(series_description: str) -> str:
    return (
        "Discussion intensity changes over the selected period instead of staying flat. "
        f"Key context: {series_description}"
    )


def generate_timeline_summary(series_description: str, require_genai: bool = False) -> str:
    system = (
        "You are a data journalist writing brief, clear trend summaries for a general audience. "
        "Write 2-3 sentences maximum. Be specific about dates and numbers. "
        "Do not speculate beyond the data."
    )
    user = f"Summarize this trend for a non-technical reader:\n\n{series_description}"
    provider = _active_provider()
    if require_genai and provider is None:
        raise RuntimeError(
            "GenAI timeline summary is required but no active LLM provider is configured."
        )

    provider_name = provider or "none"
    key = hashlib.md5((provider_name + system + user).encode("utf-8")).hexdigest()
    response = _cached_complete(key, provider_name, system, user)
    return response or _fallback_timeline_summary(series_description)


def _fallback_rag(question: str, retrieved_posts: list[dict]) -> tuple[str, list[str]]:
    if not question.strip():
        return "Please enter a question to search the dataset.", []
    if not retrieved_posts:
        return (
            "No relevant posts were found for your query. Try broader terms or a different framing.",
            [],
        )

    answer = " ".join(
        f"r/{post['subreddit']} by u/{post['author']} discusses '{post['title']}'."
        for post in retrieved_posts[:3]
    )
    first_post = retrieved_posts[0]
    suggested = [
        f"How is {first_post['domain']} framed across subreddits?",
        f"What narratives are common in r/{first_post['subreddit']}?",
        f"Which authors overlap with u/{first_post['author']}?",
    ]
    return answer, suggested


def rag_chat(question: str, retrieved_posts: list[dict], history: list[dict]) -> tuple[str, list[str]]:
    if not question.strip():
        return "Please enter a question to search the dataset.", []

    if not retrieved_posts:
        return (
            "No relevant posts were found for your query. Try using broader terms or a different angle.",
            [],
        )

    provider = _active_provider()
    if provider is None:
        return _fallback_rag(question, retrieved_posts)

    context_blocks = []
    for index, post in enumerate(retrieved_posts[: get_settings().max_chat_sources], start=1):
        body_preview = (post.get("selftext") or "")[:300]
        context_blocks.append(
            f"[Post {index}] r/{post['subreddit']} by u/{post['author']} "
            f"(score: {post['score']}):\nTitle: {post['title']}\n{body_preview}"
        )
    context = "\n\n---\n\n".join(context_blocks)

    system = (
        "You are an investigative research assistant analyzing Reddit political discourse data. "
        "Answer questions based ONLY on the provided posts. "
        "Always cite which subreddit and author a claim comes from. "
        "If the posts do not contain enough information to answer, say so clearly. "
        "At the end of your answer, on a new line, write 'SUGGESTED:' followed by exactly "
        "3 related queries separated by '|'. Keep the main answer under 200 words."
    )
    messages = history[-6:] + [
        {"role": "user", "content": f"Question: {question}\n\nRelevant posts:\n{context}"}
    ]
    serialized = str(messages)
    key = hashlib.md5((provider + system + serialized).encode("utf-8")).hexdigest()
    raw = _cached_complete(key, provider, system, serialized)
    if not raw:
        return _fallback_rag(question, retrieved_posts)

    answer = raw
    suggested: list[str] = []
    if "SUGGESTED:" in raw:
        parts = raw.split("SUGGESTED:", 1)
        answer = parts[0].strip()
        suggested = [chunk.strip() for chunk in parts[1].split("|") if chunk.strip()][:3]
    return answer, suggested
