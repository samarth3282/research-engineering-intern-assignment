"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SearchInput } from "@/components/explore/SearchInput";
import { ChatThread } from "@/components/explore/ChatThread";
import { NarrativeTimeline } from "@/components/explore/NarrativeTimeline";
import { ResultCard } from "@/components/explore/ResultCard";
import { SuggestedQueries } from "@/components/explore/SuggestedQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { ChatHistoryItem, Post } from "@/lib/types";

const hardcodedSuggestions = [
  "How do labor narratives differ across subreddits?",
  "Which authors push the same Reuters links?",
  "What communities discuss misinformation policy?",
];

function ExplorePageFallback() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-6">
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="space-y-4">
            <Skeleton className="h-14 w-full rounded-3xl" />
            <Skeleton className="h-5 w-56 rounded-full" />
          </div>
        </div>
        <div className="glass-panel h-[calc(100vh-17rem)] rounded-[2rem] p-5">
          <div className="space-y-4">
            <Skeleton className="h-24 w-[75%] rounded-[2rem]" />
            <Skeleton className="h-24 w-[68%] rounded-[2rem]" />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <Card className="mesh-backdrop min-h-[calc(100vh-11rem)]">
          <CardHeader>
            <CardTitle>Retrieved Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Skeleton className="h-40 w-full rounded-[2rem]" />
            <Skeleton className="h-40 w-full rounded-[2rem]" />
            <Skeleton className="h-40 w-full rounded-[2rem]" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [activeNarrativeQuery, setActiveNarrativeQuery] = useState(initialQuery);
  const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
  const [highlightedResultId, setHighlightedResultId] = useState<string | null>(null);
  const requestCounterRef = useRef(0);
  const activeRequestRef = useRef<number>(0);
  const requestAbortRef = useRef<AbortController | null>(null);

  const historyForApi = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })),
    [messages],
  );

  const executeQuery = useCallback(
    async (nextQuery: string) => {
      if (loading) {
        return;
      }

      const trimmed = nextQuery.trim();
      if (!trimmed) {
        setValidationMessage("Type a question or search term to explore the dataset.");
        return;
      }
      if (trimmed.length < 3) {
        setValidationMessage("Please enter at least 3 characters for semantic search.");
        return;
      }

      setValidationMessage(null);
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      const requestId = requestCounterRef.current + 1;
      requestCounterRef.current = requestId;
      activeRequestRef.current = requestId;

      setLoading(true);
      setActiveNarrativeQuery(trimmed);
      setHighlightedResultId(null);
      setMessages((current) => [...current, { role: "user", content: trimmed }]);

      try {
        const [searchResponse, chatResponse] = await Promise.all([
          api.search(trimmed, 10, "", controller.signal),
          api.chat(trimmed, historyForApi, controller.signal),
        ]);

        if (activeRequestRef.current !== requestId) {
          return;
        }

        setResults(searchResponse.posts);

        if (searchResponse.posts.length === 0) {
          const lowConfidence = searchResponse.retrieval_mode === "semantic_low_confidence";
          const shortQuery = searchResponse.retrieval_mode === "query_too_short";
          setSuggestedQueries(hardcodedSuggestions);
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content: lowConfidence
                ? "No relevant posts were returned because semantic confidence was too low for this query. Try adding context, entities, or timeframe details."
                : shortQuery
                  ? "Your query was too short for reliable semantic retrieval. Please add more detail and try again."
                  : "No posts matched your query. The dataset contains posts from r/politics, r/Conservative, r/Anarchism, r/socialism, and related communities. Try a broader term.",
              suggestedQueries: hardcodedSuggestions,
            },
          ]);
        } else {
          setSuggestedQueries(chatResponse.suggested_queries);
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content: chatResponse.answer,
              sources: chatResponse.sources,
              suggestedQueries: chatResponse.suggested_queries,
            },
          ]);
        }
      } catch (error) {
        if (controller.signal.aborted || activeRequestRef.current !== requestId) {
          return;
        }

        setResults([]);
        setSuggestedQueries([]);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: error instanceof Error ? error.message : "Search failed.",
          },
        ]);
      } finally {
        if (activeRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [historyForApi, loading],
  );

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      void executeQuery(initialQuery);
    }
  }, [executeQuery, initialQuery, messages.length]);

  const handleSuggestedQuery = (nextQuery: string) => {
    if (loading) {
      return;
    }
    setQuery(nextQuery);
    void executeQuery(nextQuery);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-6">
        <SearchInput
          value={query}
          onChange={setQuery}
          onSubmit={() => void executeQuery(query)}
          loading={loading}
          validationMessage={validationMessage}
        />
        <ChatThread
          messages={messages}
          onSourceClick={(postId) => {
            setHighlightedResultId(postId);
            document.getElementById(`result-${postId}`)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }}
          onSuggestedQueryClick={handleSuggestedQuery}
        />
      </section>

      <section className="space-y-6">
        <NarrativeTimeline
          query={activeNarrativeQuery}
          onOpenNetwork={(nextQuery) => {
            router.push(`/network?q=${encodeURIComponent(nextQuery)}`);
          }}
        />
        <Card className="mesh-backdrop min-h-[40rem]">
          <CardHeader>
            <CardTitle>Retrieved Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <>
                <Skeleton className="h-40 w-full rounded-[2rem]" />
                <Skeleton className="h-40 w-full rounded-[2rem]" />
                <Skeleton className="h-40 w-full rounded-[2rem]" />
              </>
            ) : results.length ? (
              results.map((post) => (
                <ResultCard
                  key={post.id}
                  post={post}
                  highlighted={highlightedResultId === post.id}
                />
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-[#d1d5db] bg-white px-6 py-12 text-center text-sm text-[#6b7280]">
                Search results will appear here alongside the chat analysis.
              </div>
            )}

            <SuggestedQueries
              queries={suggestedQueries.length ? suggestedQueries : hardcodedSuggestions}
              onSelect={handleSuggestedQuery}
              disabled={loading}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExplorePageFallback />}>
      <ExplorePageContent />
    </Suspense>
  );
}
