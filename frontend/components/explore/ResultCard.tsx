"use client";

import Link from "next/link";
import { ExternalLink, MessageSquare, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Post } from "@/lib/types";

function snippet(text: string) {
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

interface Props {
  post: Post;
  highlighted?: boolean;
}

export function ResultCard({ post, highlighted }: Props) {
  return (
    <Card
      id={`result-${post.id}`}
      className={highlighted ? "border-[#c0522b] shadow-[0_0_0_1px_rgba(192,82,43,0.28)]" : ""}
    >
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>r/{post.subreddit}</Badge>
          <Badge>u/{post.author}</Badge>
          <Badge>{post.domain}</Badge>
        </div>
        <CardTitle className="text-xl leading-8">{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-[#374151]">
          {snippet(post.selftext || "Link post with no self text.")}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-[#6b7280]">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{post.score} score</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{post.num_comments} comments</span>
          </div>
        </div>
        <Link
          href={post.url}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm text-[#c0522b] hover:text-[#9f4322]"
        >
          <span>Open source link</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

