import { NextResponse } from "next/server";

import type { HealthResponse } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const base = BACKEND_URL.endsWith("/") ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
  const url = `${base}/healthz`;

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "degraded",
          posts: null,
          subreddits: null,
          error: `upstream_${response.status}`,
        },
        { status: 200 },
      );
    }

    const payload = await response.json().catch(() => ({ status: "ok" as const }));
    const status = payload?.status === "ok" ? "ok" : "degraded";

    return NextResponse.json(
      {
        status,
        posts: null,
        subreddits: null,
        error: status === "ok" ? null : "invalid_upstream_payload",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        posts: null,
        subreddits: null,
        error: "upstream_unreachable",
      },
      { status: 200 },
    );
  }
}
