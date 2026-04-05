"use client";

import { useEffect, useRef } from "react";

import { ChatMessage } from "@/components/explore/ChatMessage";
import type { ChatHistoryItem } from "@/lib/types";

interface Props {
  messages: ChatHistoryItem[];
  onSourceClick?: (postId: string) => void;
  onSuggestedQueryClick?: (query: string) => void;
}

export function ChatThread({
  messages,
  onSourceClick,
  onSuggestedQueryClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="glass-panel flex h-[calc(100vh-20rem)] min-h-[18rem] flex-col gap-4 overflow-y-auto rounded-[2rem] p-5 md:h-[calc(100vh-17rem)]"
    >
      {messages.length ? (
        messages.map((message, index) => (
          <ChatMessage
            key={`${message.role}-${index}`}
            message={message}
            onSourceClick={onSourceClick}
            onSuggestedQueryClick={onSuggestedQueryClick}
          />
        ))
      ) : (
        <div className="flex h-full items-center justify-center text-center text-sm text-[#6b7280]">
          Ask how a narrative spreads, which communities frame it differently, or who amplifies it.
        </div>
      )}
    </div>
  );
}

