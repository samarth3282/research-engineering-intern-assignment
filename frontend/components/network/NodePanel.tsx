"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineStrip } from "@/components/network/TimelineStrip";
import type { NetworkNode } from "@/lib/types";

interface Props {
  node: NetworkNode | null;
  nodes: NetworkNode[];
  activeQuery?: string;
  armedForRemoval: boolean;
  onRemove: (node: NetworkNode) => void;
  onSearch: (node: NetworkNode) => void;
}

export function NodePanel({
  node,
  nodes,
  activeQuery,
  armedForRemoval,
  onRemove,
  onSearch,
}: Props) {
  if (!node) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Author Detail</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          Click a node to inspect its influence, community membership, and time-series context.
        </CardContent>
      </Card>
    );
  }

  const ranked = [...nodes].sort((left, right) => right.pagerank - left.pagerank);
  const rank = ranked.findIndex((entry) => entry.id === node.id) + 1;
  const percentile = Math.max(1, Math.round((rank / Math.max(ranked.length, 1)) * 100));

  return (
    <div className="flex h-full flex-col gap-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{node.id}</CardTitle>
            <Badge>Community {node.community}</Badge>
          </div>
          <Link
            href={`https://www.reddit.com/user/${node.id}`}
            target="_blank"
            className="text-sm text-indigo-300 hover:text-indigo-200"
          >
            Open Reddit profile
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-900/80 p-3">
              <p className="text-slate-500">Influence</p>
              <p className="mt-1 font-semibold text-white">Top {percentile}%</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 p-3">
              <p className="text-slate-500">Degree</p>
              <p className="mt-1 font-semibold text-white">{node.degree}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 p-3">
              <p className="text-slate-500">PageRank</p>
              <p className="mt-1 font-semibold text-white">{node.pagerank.toFixed(4)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 p-3">
              <p className="text-slate-500">Posts</p>
              <p className="mt-1 font-semibold text-white">{node.post_count}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {node.subreddits.map((subreddit) => (
              <Badge key={subreddit}>r/{subreddit}</Badge>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="subtle" onClick={() => onSearch(node)}>
              Search posts by this author
            </Button>
            {armedForRemoval ? (
              <Button variant="outline" onClick={() => onRemove(node)}>
                Remove from graph
              </Button>
            ) : (
              <p className="text-xs text-amber-300">
                Double-click the node in the graph to arm removal.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <TimelineStrip query={activeQuery} subreddit={node.primary_subreddit ?? node.subreddits[0]} />
    </div>
  );
}
