"use client";

import { Button } from "@/components/ui/button";

interface Props {
  queries: string[];
  onSelect: (query: string) => void;
  disabled?: boolean;
}

export function SuggestedQueries({ queries, onSelect, disabled = false }: Props) {
  if (!queries.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {queries.map((query) => (
        <Button
          key={query}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect(query)}
          disabled={disabled}
        >
          {query}
        </Button>
      ))}
    </div>
  );
}

