"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import { api } from "@/lib/api";
import type { TimelinePoint } from "@/lib/types";

interface Props {
  query?: string;
  subreddit?: string | null;
}

export function TimelineStrip({ query = "", subreddit }: Props) {
  const [series, setSeries] = useState<TimelinePoint[]>([]);
  const [summary, setSummary] = useState("Select a node to view timing context.");
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!subreddit) {
      abortRef.current?.abort();
      setSeries([]);
      setLoading(false);
      setSummary("Select a node to view timing context.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setLoading(true);

    api
      .getTimeline(query, "week", subreddit, controller.signal)
      .then((response) => {
        if (requestRef.current !== requestId) {
          return;
        }
        setSeries(response.series);
        setSummary(response.summary);
      })
      .catch(() => {
        if (controller.signal.aborted || requestRef.current !== requestId) {
          return;
        }
        setSeries([]);
        setSummary("Timeline data could not be loaded.");
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [query, subreddit]);

  const { areaPath, linePath } = useMemo(() => {
    if (!series.length) {
      return { areaPath: "", linePath: "" };
    }

    const width = 320;
    const height = 110;
    const x = d3
      .scalePoint<string>()
      .domain(series.map((point) => point.date))
      .range([0, width]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(series, (point) => point.count) ?? 1])
      .range([height, 0]);

    const area = d3
      .area<TimelinePoint>()
      .x((point) => x(point.date) ?? 0)
      .y0(height)
      .y1((point) => y(point.count))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<TimelinePoint>()
      .x((point) => x(point.date) ?? 0)
      .y((point) => y(point.count))
      .curve(d3.curveMonotoneX);

    return {
      areaPath: area(series) ?? "",
      linePath: line(series) ?? "",
    };
  }, [series]);

  return (
    <div className="rounded-[1.75rem] border border-[#e5e7eb] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#1a1a3e]">Timeline Intelligence</p>
        <p className="text-xs text-[#6b7280]">
          {subreddit ? `r/${subreddit}` : "No node selected"}
          {query ? " narrative slice" : ""}
        </p>
      </div>
      {loading ? (
        <p className="mb-2 text-xs text-[#6b7280]">Loading timeline...</p>
      ) : null}
      <svg viewBox="0 0 320 110" className="h-28 w-full">
        <defs>
          <linearGradient id="timeline-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(224,92,42,0.38)" />
            <stop offset="100%" stopColor="rgba(59,31,107,0.06)" />
          </linearGradient>
        </defs>
        {areaPath ? <path d={areaPath} fill="url(#timeline-gradient)" /> : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#c0522b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{summary}</p>
    </div>
  );
}
