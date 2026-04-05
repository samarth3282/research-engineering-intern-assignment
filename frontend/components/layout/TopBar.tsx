"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, AlertTriangle } from "lucide-react";

import { api } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const titleMap: Record<string, string> = {
  "/explore": "Narrative Explorer",
  "/landscape": "Topic Landscape",
  "/network": "Community Network",
};

export function TopBar() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [offline, setOffline] = useState(false);
  const retryDelayRef = useRef(5000);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delayMs: number) => {
      if (cancelled) {
        return;
      }
      timeoutId = setTimeout(() => {
        void poll();
      }, delayMs);
    };

    const poll = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const data = await api.health(controller.signal);
        if (cancelled) {
          return;
        }
        setHealth(data);
        setOffline(false);
        retryDelayRef.current = 10000;
      } catch {
        if (cancelled) {
          return;
        }
        setOffline(true);
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, 60000);
      } finally {
        clearTimeout(timeout);
        schedule(retryDelayRef.current);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const title = useMemo(() => titleMap[pathname] ?? "NarrativeScope", [pathname]);

  return (
    <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-slate-800/70 bg-slate-950/50 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Research Console</p>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="gap-2">
            <span>{health?.posts ?? "--"} posts</span>
            <span className="text-slate-500">|</span>
            <span>{health?.subreddits ?? "--"} subreddits</span>
          </Badge>
          <Badge className="gap-2">
            <Activity className={`h-3.5 w-3.5 ${offline ? "text-rose-400" : "text-emerald-400"}`} />
            <span>{offline ? "API unreachable" : "API connected"}</span>
          </Badge>
        </div>
      </div>

      {offline ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle className="h-4 w-4" />
          <span>Backend unavailable. Live metrics will refresh automatically when the API recovers.</span>
        </div>
      ) : null}
    </div>
  );
}
