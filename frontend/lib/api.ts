import type {
  ChatResponse,
  HealthResponse,
  NetworkResponse,
  SearchResponse,
  TimelineResponse,
  TopicSummaryResponse,
} from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? "GET").toUpperCase();
  const headers = new Headers(options?.headers);

  // Keep GET/HEAD simple requests to avoid unnecessary CORS preflight.
  if (options?.body !== undefined && method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    let error = "Request failed";
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = await res.json().catch(() => null) as
        | { detail?: string; error?: string }
        | null;
      error = payload?.detail ?? payload?.error ?? error;
    } else {
      error = await res.text();
    }
    throw new Error(`API error ${res.status}: ${error}`);
  }
  return res.json();
}

export const api = {
  search: (
    q: string,
    k = 10,
    subreddit = "",
    signal?: AbortSignal,
  ): Promise<SearchResponse> =>
    apiFetch(
      `/api/search?q=${encodeURIComponent(q)}&k=${k}&subreddit=${encodeURIComponent(subreddit)}`,
      { signal },
    ),

  chat: (
    question: string,
    history: { role: string; content: string }[],
    signal?: AbortSignal,
  ): Promise<ChatResponse> =>
    apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ question, history }),
      signal,
    }),

  getNetwork: (
    q = "",
    k = 180,
    subreddit = "",
    signal?: AbortSignal,
  ): Promise<NetworkResponse> =>
    apiFetch(
      `/api/network?q=${encodeURIComponent(q)}&k=${k}&subreddit=${encodeURIComponent(subreddit)}`,
      { signal },
    ),

  getNetworkWithout: (
    author: string,
    q = "",
    k = 180,
    subreddit = "",
    signal?: AbortSignal,
  ): Promise<NetworkResponse> =>
    apiFetch(
      `/api/network/remove/${encodeURIComponent(author)}?q=${encodeURIComponent(q)}&k=${k}&subreddit=${encodeURIComponent(subreddit)}`,
      { signal },
    ),

  getTimeline: (
    query: string,
    granularity: "day" | "week" | "month" = "week",
    subreddit?: string,
    signal?: AbortSignal,
  ): Promise<TimelineResponse> =>
    apiFetch("/api/timeline", {
      method: "POST",
      body: JSON.stringify({ query, granularity, subreddit }),
      signal,
    }),

  getTopics: (nrTopics = 20): Promise<TopicSummaryResponse> =>
    apiFetch(`/api/cluster?nr_topics=${nrTopics}`),

  getLandscapeUrl: (): string => `${BASE_URL}/static/landscape.html`,

  health: async (signal?: AbortSignal): Promise<HealthResponse> => {
    const liveness = await apiFetch<{ status: string }>("/healthz", { signal });
    return {
      status: liveness.status,
      posts: null,
      subreddits: null,
    };
  },
};
