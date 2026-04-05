"use client";

import { useCallback, useState } from "react";

import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import type { TopicSummaryResponse } from "@/lib/types";

interface Props {
  onChange: (topics: TopicSummaryResponse) => void;
  onError?: (message: string) => void;
}

export function ClusterSlider({ onChange, onError }: Props) {
  const [value, setValue] = useState(20);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (v: number[]) => {
      const nr = v[0];
      setValue(nr);

      if (nr <= 2) {
        setWarning(
          "With 2 clusters, all content is split into just 2 broad groups. Topics will be very general.",
        );
      } else if (nr >= 80) {
        setWarning(
          "With many clusters, topics become very specific and some may have very few posts.",
        );
      } else {
        setWarning(null);
      }
    },
    [],
  );

  const handleCommit = useCallback(
    async (v: number[]) => {
      const nr = v[0];
      setError(null);
      onError?.("");

      setLoading(true);
      try {
        const data = await api.getTopics(nr);
        onChange(data);
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to update topic clusters.";
        setError(message);
        onError?.(message);
      } finally {
        setLoading(false);
      }
    },
    [onChange, onError],
  );

  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-sm backdrop-blur-sm">
      <div className="flex justify-between text-sm text-[#374151]">
        <span>Topics</span>
        <span className="font-mono font-bold text-[#1a1a3e]">{value}</span>
      </div>
      <Slider
        min={2}
        max={100}
        step={1}
        value={[value]}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
        className="w-full max-w-xs"
      />
      {loading ? <p className="animate-pulse text-xs text-[#6b7280]">Reclustering...</p> : null}
      {warning ? <p className="text-xs text-[#6b2d50]">{warning}</p> : null}
      {error ? <p className="text-xs text-[#6b2d50]">{error}</p> : null}
    </div>
  );
}

