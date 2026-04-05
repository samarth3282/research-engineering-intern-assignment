"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

import type { NetworkEdge, NetworkNode } from "@/lib/types";

interface GraphNode extends d3.SimulationNodeDatum, NetworkNode {}
type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  shared_contexts: string[];
  evidence_type: string;
};

interface Props {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selectedNodeId?: string | null;
  onNodeClick: (node: NetworkNode) => void;
  onNodeDoubleClick: (node: NetworkNode) => void;
}

function radius(node: NetworkNode) {
  return Math.max(4, Math.min(20, node.pagerank * 5000));
}

function color(community: number) {
  return d3.schemeTableau10[((community % 10) + 10) % 10];
}

export function ForceGraph({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
  onNodeDoubleClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 640 });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const bounds = containerRef.current.getBoundingClientRect();
    if (bounds.width && bounds.height) {
      setDimensions({ width: bounds.width, height: bounds.height });
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !dimensions.width || !dimensions.height) {
      return;
    }

    const graphNodes: GraphNode[] = nodes.map((node) => ({ ...node }));
    const graphLinks: GraphLink[] = edges.map((edge: NetworkEdge) => ({ ...edge }));

    simulationRef.current?.stop();

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);

    const root = svg.append("g");
    const linkLayer = root.append("g").attr("stroke", "rgba(156,163,175,0.4)");
    const nodeLayer = root.append("g");

    const simulation = d3
      .forceSimulation<GraphNode>(graphNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(graphLinks)
          .id((d) => d.id)
          .distance((link) => Math.max(30, 130 - link.weight * 12)),
      )
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius((d) => radius(d) + 2));

    simulationRef.current = simulation;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        root.attr("transform", event.transform.toString());
      });

    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity);

    const link = linkLayer
      .selectAll("line")
      .data(graphLinks)
      .join("line")
      .attr("stroke-width", (d) => 1 + d.weight * 0.75)
      .attr("opacity", 0.8);

    const node = nodeLayer
      .selectAll("circle")
      .data(graphNodes)
      .join("circle")
      .attr("r", (d) => radius(d))
      .attr("fill", (d) => color(d.community))
      .attr("stroke", (d) => (d.id === selectedNodeId ? "#c0522b" : "#ffffff"))
      .attr("stroke-width", (d) => (d.id === selectedNodeId ? 2.5 : 1.2))
      .style("cursor", "pointer")
      .on("click", (_event, datum) => onNodeClick(datum))
      .on("dblclick", (_event, datum) => onNodeDoubleClick(datum))
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on("start", (event, datum) => {
            if (!event.active) {
              simulation.alphaTarget(0.3).restart();
            }
            datum.fx = datum.x;
            datum.fy = datum.y;
          })
          .on("drag", (event, datum) => {
            datum.fx = event.x;
            datum.fy = event.y;
          })
          .on("end", (event, datum) => {
            if (!event.active) {
              simulation.alphaTarget(0);
            }
            datum.fx = null;
            datum.fy = null;
          }) as never,
      );

    node.append("title").text((d) => `${d.id}\nCommunity ${d.community}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      node
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);
    });

    simulation.stop();
    simulation.nodes(graphNodes);
    (simulation.force("link") as d3.ForceLink<GraphNode, GraphLink>).links(graphLinks);
    simulation.alpha(0.3).restart();

    return () => {
      simulation.stop();
    };
  }, [dimensions.height, dimensions.width, edges, nodes, onNodeClick, onNodeDoubleClick, selectedNodeId]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-[2rem] bg-[#f8f9fa]">
      {nodes.length ? (
        <svg ref={svgRef} className="h-full w-full" aria-label="Community network graph" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[#6b7280]">
          No nodes available for the current filter.
        </div>
      )}
    </div>
  );
}
