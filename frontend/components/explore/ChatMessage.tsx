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
            ? "bg-[linear-gradient(to_right,#c0522b,#5c2d82)] text-white"
            : "border border-[#e5e7eb] bg-white text-[#374151]"
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
                className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs text-[#374151] hover:bg-[#e5e7eb]"
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
                className="cursor-pointer border-[#f3c6b6] bg-[#fff3ef] text-[#c0522b]"
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
