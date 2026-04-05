"use client";

import { useEffect, useState } from "react";

import { ClusterLegend } from "@/components/landscape/ClusterLegend";
import { ClusterSlider } from "@/components/landscape/ClusterSlider";
import { DatamapplotFrame } from "@/components/landscape/DatamapplotFrame";
import { api } from "@/lib/api";
import type { TopicSummaryResponse } from "@/lib/types";

export default function LandscapePage() {
  const [topics, setTopics] = useState<TopicSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getTopics(20)
      .then((data) => {
        if (!cancelled) {
          setTopics(data);
        }
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Failed to load topics.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative">
      <DatamapplotFrame src={topics?.landscape_url ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${topics.landscape_url}` : api.getLandscapeUrl()} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 lg:p-6">
        <div className="pointer-events-auto flex flex-col gap-4 lg:max-w-sm">
          <ClusterSlider
            onChange={(nextTopics) => {
              setTopics(nextTopics);
              setError(null);
            }}
            onError={(message) => setError(message)}
          />
          {error ? (
            <div className="glass-panel rounded-[2rem] border border-[#f3c6b6] bg-[#fff3ef] p-4 text-sm text-[#6b2d50]">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="glass-panel rounded-[2rem] p-4 text-sm text-[#6b7280]">
              Loading topic summary...
            </div>
          ) : topics ? (
            <ClusterLegend topics={topics.topics} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
