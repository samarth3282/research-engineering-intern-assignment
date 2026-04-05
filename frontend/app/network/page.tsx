"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Share2 } from "lucide-react";

import { CommunityFilter } from "@/components/network/CommunityFilter";
import { ForceGraph } from "@/components/network/ForceGraph";
import { NodePanel } from "@/components/network/NodePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { NetworkNode, NetworkResponse } from "@/lib/types";

const networkSuggestions = [
  "misinformation policy",
  "algorithmic wage theft",
  "immigration raids",
];

function NetworkPageFallback() {
  return (
    <div className="grid h-[calc(100vh-11rem)] gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="flex min-h-0 flex-col gap-4">
        <Card className="mesh-backdrop">
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-14 w-full rounded-3xl" />
            <Skeleton className="h-5 w-72 rounded-full" />
            <Skeleton className="h-16 w-full rounded-[1.75rem]" />
          </CardContent>
        </Card>
        <Skeleton className="h-12 w-80 rounded-[1.75rem]" />
        <Card className="min-h-0 flex-1 p-3">
          <Skeleton className="h-full w-full rounded-[1.75rem]" />
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-24 w-full rounded-[1.75rem]" />
          <Skeleton className="h-24 w-full rounded-[1.75rem]" />
        </CardContent>
      </Card>
    </div>
  );
}

function NetworkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [draftQuery, setDraftQuery] = useState(urlQuery);
  const [graph, setGraph] = useState<NetworkResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [armedNodeId, setArmedNodeId] = useState<string | null>(null);
  const [activeCommunity, setActiveCommunity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const graphRequestRef = useRef(0);
  const graphAbortRef = useRef<AbortController | null>(null);

  const loadGraph = useCallback(async (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      graphAbortRef.current?.abort();
      setGraph(null);
      setError(null);
      setLoading(false);
      setSelectedNode(null);
      setArmedNodeId(null);
      setActiveCommunity(null);
      return;
    }

    graphAbortRef.current?.abort();
    const controller = new AbortController();
    graphAbortRef.current = controller;
    const requestId = graphRequestRef.current + 1;
    graphRequestRef.current = requestId;

    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setArmedNodeId(null);
    try {
      const response = await api.getNetwork(
        trimmedQuery,
        220,
        "",
        controller.signal,
      );
      if (graphRequestRef.current !== requestId) {
        return;
      }
      setGraph(response);
      setActiveCommunity(null);
    } catch (nextError) {
      if (controller.signal.aborted || graphRequestRef.current !== requestId) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "Network failed to load.");
    } finally {
      if (graphRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setDraftQuery(urlQuery);
    if (urlQuery.trim()) {
      void loadGraph(urlQuery);
    } else {
      setGraph(null);
      setError(null);
      setLoading(false);
      setSelectedNode(null);
      setArmedNodeId(null);
      setActiveCommunity(null);
    }
  }, [loadGraph, urlQuery]);

  useEffect(() => {
    return () => {
      graphAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!graph || !selectedNode) {
      return;
    }
    const updated = graph.nodes.find((node) => node.id === selectedNode.id) ?? null;
    setSelectedNode(updated);
    if (!updated) {
      setArmedNodeId(null);
    }
  }, [graph, selectedNode]);

  const communities = useMemo(() => {
    if (!graph) {
      return [];
    }
    return [...new Set(graph.nodes.map((node) => node.community))].sort((a, b) => a - b);
  }, [graph]);

  useEffect(() => {
    if (activeCommunity === null) {
      return;
    }
    if (!communities.includes(activeCommunity)) {
      setActiveCommunity(null);
    }
  }, [activeCommunity, communities]);

  const filteredGraph = useMemo(() => {
    if (!graph || activeCommunity === null) {
      return graph;
    }
    const nodeIds = new Set(
      graph.nodes.filter((node) => node.community === activeCommunity).map((node) => node.id),
    );
    const nextGraph = {
      ...graph,
      nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
      edges: graph.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
      ),
    };

    if (!nextGraph.nodes.length && graph.nodes.length) {
      return graph;
    }
    return nextGraph;
  }, [activeCommunity, graph]);

  const applyQuery = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && trimmed.length < 3) {
      setValidationMessage("Enter at least 3 characters for a narrative network query.");
      return;
    }

    setValidationMessage(null);
    router.push(trimmed ? `/network?q=${encodeURIComponent(trimmed)}` : "/network");
  };

  const removeNode = async (node: NetworkNode) => {
    graphAbortRef.current?.abort();
    const controller = new AbortController();
    graphAbortRef.current = controller;
    const requestId = graphRequestRef.current + 1;
    graphRequestRef.current = requestId;

    setLoading(true);
    setError(null);
    try {
      const nextGraph = await api.getNetworkWithout(
        node.id,
        graph?.query ?? "",
        220,
        "",
        controller.signal,
      );
      if (graphRequestRef.current !== requestId) {
        return;
      }
      setGraph(nextGraph);
      setSelectedNode(null);
      setArmedNodeId(null);
    } catch (nextError) {
      if (controller.signal.aborted || graphRequestRef.current !== requestId) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "Node removal failed.");
    } finally {
      if (graphRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const suggestionText = graph?.mode === "narrative"
    ? "This map is rebuilt from the matched posts for your active narrative query."
    : "Enter a narrative query to generate an author graph. The app does not load a heavy global map by default.";

  return (
    <div className="grid h-[calc(100vh-11rem)] gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="flex min-h-0 flex-col gap-4">
        <Card className="mesh-backdrop">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sky-300">
                  <Share2 className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.25em]">Narrative Graph</span>
                </div>
                <CardTitle className="text-xl leading-8">
                  {graph?.mode === "narrative"
                    ? `"${graph.query}" author network`
                    : "Narrative graph requires a query"}
                </CardTitle>
                <CardDescription>{suggestionText}</CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{graph?.mode === "narrative" ? "Narrative mode" : "Idle"}</Badge>
                <Badge>
                  {graph?.mode === "narrative"
                    ? `${graph?.matched_posts ?? 0} matched posts`
                    : "Add query to build graph"}
                </Badge>
                <Badge>{graph?.component_count ?? 0} components</Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyQuery(draftQuery);
                    }
                  }}
                  placeholder="Map a narrative by keyword, issue, link, or domain..."
                  className="h-14 rounded-3xl pl-11 text-base"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-14 rounded-3xl px-6"
                  onClick={() => applyQuery(draftQuery)}
                  disabled={loading}
                >
                  {loading ? "Mapping..." : "Map Network"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 rounded-3xl px-5"
                  onClick={() => {
                    setDraftQuery("");
                    applyQuery("");
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {networkSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraftQuery(suggestion);
                    applyQuery(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>

            {validationMessage ? (
              <p className="text-sm text-amber-300">{validationMessage}</p>
            ) : (
              <p className="text-sm text-slate-400">
                {graph?.summary ??
                  "Start from a narrative query to generate the author graph and avoid rendering a heavy global map."}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <CommunityFilter
            communities={communities}
            activeCommunity={activeCommunity}
            onChange={setActiveCommunity}
          />
          <div className="flex items-center gap-2">
            <Badge>{filteredGraph?.nodes.length ?? 0} nodes</Badge>
            <Badge>{filteredGraph?.edges.length ?? 0} edges</Badge>
            {loading ? <Badge className="bg-sky-500/10 text-sky-100">Refreshing</Badge> : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <Card className="min-h-[24rem] flex-1 overflow-hidden p-3">
          <ForceGraph
            nodes={filteredGraph?.nodes ?? []}
            edges={filteredGraph?.edges ?? []}
            selectedNodeId={selectedNode?.id}
            onNodeClick={(node) => {
              setSelectedNode(node);
            }}
            onNodeDoubleClick={(node) => {
              setSelectedNode(node);
              setArmedNodeId(node.id);
            }}
          />
        </Card>
      </div>

      <NodePanel
        node={selectedNode}
        nodes={graph?.nodes ?? []}
        activeQuery={graph?.query ?? ""}
        armedForRemoval={selectedNode?.id === armedNodeId}
        onRemove={(node) => void removeNode(node)}
        onSearch={(node) => {
          router.push(`/explore?q=${encodeURIComponent(`author:${node.id}`)}`);
        }}
      />
    </div>
  );
}

export default function NetworkPage() {
  return (
    <Suspense fallback={<NetworkPageFallback />}>
      <NetworkPageContent />
    </Suspense>
  );
}
