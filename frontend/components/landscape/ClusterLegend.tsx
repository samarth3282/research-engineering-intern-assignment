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
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Legend</h3>
        <span className="text-xs text-slate-500">{topics.length} topics</span>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{topic.name}</p>
                <p className="mt-1 text-xs text-slate-500">{topic.post_count} posts</p>
              </div>
              <Badge>#{topic.id}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {topic.keywords.map((keyword) => (
                <Badge key={keyword} className="border-indigo-500/20 bg-indigo-500/10 text-indigo-100">
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

