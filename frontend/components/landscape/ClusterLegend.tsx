"use client";

import { Badge } from "@/components/ui/badge";
import type { ClusterTopic } from "@/lib/types";

interface Props {
  topics: ClusterTopic[];
}

export function ClusterLegend({ topics }: Props) {
  return (
    <div className="glass-panel max-h-[34rem] space-y-4 overflow-y-auto rounded-[2rem] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b2d50]">Legend</h3>
        <span className="text-xs text-[#6b7280]">{topics.length} topics</span>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="rounded-2xl border border-[#e5e7eb] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1a1a3e]">{topic.name}</p>
                <p className="mt-1 text-xs text-[#6b7280]">{topic.post_count} posts</p>
              </div>
              <Badge>#{topic.id}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {topic.keywords.map((keyword) => (
                <Badge key={keyword} className="border-[#f3c6b6] bg-[#fff3ef] text-[#c0522b]">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

