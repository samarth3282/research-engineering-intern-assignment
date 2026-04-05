"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ArrowRight, CalendarRange, Sparkles, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { TimelinePoint, TimelineResponse } from "@/lib/types";

type Granularity = "day" | "week" | "month";

interface Props {
  query: string;
  onOpenNetwork?: (query: string) => void;
}

function TimelineChart({ series }: { series: TimelinePoint[] }) {
  const { areaPath, linePath, points } = useMemo(() => {
    if (!series.length) {
      return { areaPath: "", linePath: "", points: [] as Array<{ x: number; y: number }> };
    }

    const width = 720;
    const height = 220;
    const x = d3
      .scalePoint<string>()
      .domain(series.map((point) => point.date))
      .range([16, width - 16]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(series, (point) => point.count) ?? 1])
      .range([height - 20, 12]);

    const area = d3
      .area<TimelinePoint>()
      .x((point) => x(point.date) ?? 0)
      .y0(height - 20)
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
      points: series.map((point) => ({
        x: x(point.date) ?? 0,
        y: y(point.count),
      })),
    };
  }, [series]);

  if (!series.length) {
    return (
      <div className="flex h-44 items-center justify-center rounded-[1.75rem] border border-dashed border-slate-800 text-sm text-slate-400">
        No time-series data is available for this narrative yet.
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/55 p-4">
      <svg viewBox="0 0 720 220" className="h-56 w-full">
        <defs>
          <linearGradient id="narrative-timeline-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.58)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0.04)" />
          </linearGradient>
        </defs>

        {areaPath ? <path d={areaPath} fill="url(#narrative-timeline-gradient)" /> : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="#e0f2fe"
            opacity="0.95"
          />
        ))}
      </svg>
    </div>
  );
}

export function NarrativeTimeline({ query, onOpenNetwork }: Props) {
  const trimmedQuery = query.trim();
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timelineRequestRef = useRef(0);
  const timelineAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!trimmedQuery) {
      timelineAbortRef.current?.abort();
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    timelineAbortRef.current?.abort();
    const controller = new AbortController();
    timelineAbortRef.current = controller;
    const requestId = timelineRequestRef.current + 1;
    timelineRequestRef.current = requestId;

    setLoading(true);
    setError(null);
    api
      .getTimeline(trimmedQuery, granularity, undefined, controller.signal)
      .then((response) => {
        if (timelineRequestRef.current !== requestId) {
          return;
        }
        setData(response);
      })
      .catch((nextError) => {
        if (controller.signal.aborted || timelineRequestRef.current !== requestId) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Timeline failed to load.");
      })
      .finally(() => {
        if (timelineRequestRef.current === requestId) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [granularity, trimmedQuery]);

  const stats = useMemo(() => {
    if (!data?.series.length) {
      return {
        totalPosts: 0,
        peak: null as TimelinePoint | null,
        dateRange: null as string | null,
      };
    }

    const totalPosts = data.series.reduce((sum, point) => sum + point.count, 0);
    const peak = data.series.reduce((best, point) =>
      point.count > best.count ? point : best,
    );
    return {
      totalPosts,
      peak,
      dateRange: `${data.series[0].date} to ${data.series[data.series.length - 1].date}`,
    };
  }, [data]);

  return (
    <Card className="mesh-backdrop">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-300">
              <Waves className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.25em]">Narrative Timeline</span>
            </div>
            <CardTitle className="text-xl leading-8">
              {trimmedQuery ? `"${trimmedQuery}" over time` : "Run a query to map its trend line"}
            </CardTitle>
            <CardDescription>
              A dynamic time series of matched posts, paired with a plain-language summary for
              non-technical readers.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month"] as Granularity[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={granularity === value ? "default" : "outline"}
                onClick={() => setGranularity(value)}
                disabled={!trimmedQuery || loading}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        {trimmedQuery ? (
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-2 bg-sky-500/10 text-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{stats.totalPosts || "--"} matched posts</span>
            </Badge>
            <Badge className="gap-2">
              <CalendarRange className="h-3.5 w-3.5" />
              <span>{stats.dateRange ?? "Awaiting data"}</span>
            </Badge>
            {stats.peak ? (
              <Badge>
                Peak: {stats.peak.count} posts on {stats.peak.date}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {!trimmedQuery ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-800 px-6 py-10 text-sm text-slate-400">
            Search in the explorer to generate a query-driven timeline, then jump directly into a
            network map for the same narrative.
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-56 w-full rounded-[1.75rem]" />
            <Skeleton className="h-5 w-4/5 rounded-full" />
            <Skeleton className="h-5 w-2/3 rounded-full" />
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : (
          <>
            <TimelineChart series={data?.series ?? []} />
            {data?.topic_trends?.length ? (
              <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Topic Trends Over Time
                </p>
                <div className="space-y-3">
                  {data.topic_trends.map((trend) => (
                    <div
                      key={`${trend.topic_id}-${trend.topic_name}`}
                      className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-100">{trend.topic_name}</p>
                        <Badge>{trend.total_posts} posts</Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {trend.series
                          .map((point) => `${point.date}: ${point.count}`)
                          .join(" | ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/60 p-4">
              <p className="text-sm leading-7 text-slate-300">
                {data?.summary ?? "No timeline summary is available."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="subtle"
                onClick={() => trimmedQuery && onOpenNetwork?.(trimmedQuery)}
              >
                Open Narrative Network
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-slate-500">
                The network view will preserve this same query and rebuild the author graph from the
                matched posts.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
