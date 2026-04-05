"use client";

import { Button } from "@/components/ui/button";

interface Props {
  communities: number[];
  activeCommunity: number | null;
  onChange: (community: number | null) => void;
}

export function CommunityFilter({
  communities,
  activeCommunity,
  onChange,
}: Props) {
  return (
    <div className="glass-panel flex flex-wrap gap-2 rounded-[2rem] p-4">
      <Button
        variant={activeCommunity === null ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(null)}
      >
        All communities
      </Button>
      {communities.map((community) => (
        <Button
          key={community}
          variant={activeCommunity === community ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(community)}
        >
          Community {community}
        </Button>
      ))}
    </div>
  );
}

