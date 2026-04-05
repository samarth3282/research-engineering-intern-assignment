"use client";

import { Badge } from "@/components/ui/badge";
import type { ChatHistoryItem } from "@/lib/types";

interface Props {
  message: ChatHistoryItem;
  onSourceClick?: (postId: string) => void;
  onSuggestedQueryClick?: (query: string) => void;
}

export function ChatMessage({
  message,
  onSourceClick,
  onSuggestedQueryClick,
}: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-[2rem] px-5 py-4 ${
          isUser
            ? "bg-indigo-500 text-white"
            : "border border-slate-800 bg-slate-950/70 text-slate-100"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>

        {message.sources?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onSourceClick?.(source.id)}
                className="rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                r/{source.subreddit} / u/{source.author}
              </button>
            ))}
          </div>
        ) : null}

        {message.suggestedQueries?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.suggestedQueries.map((query) => (
              <Badge
                key={query}
                className="cursor-pointer border-indigo-500/30 bg-indigo-500/10 text-indigo-100"
                onClick={() => onSuggestedQueryClick?.(query)}
              >
                {query}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
