"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  src: string;
}

export function DatamapplotFrame({ src }: Props) {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [nonce, setNonce] = useState(0);

  return (
    <div className="relative h-[calc(100vh-11rem)] overflow-hidden rounded-[2rem] border border-[#e5e7eb] bg-white shadow-sm">
      {loading && !errored ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-[#6b7280]">
          Loading landscape...
        </div>
      ) : null}

      {errored ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/95 text-center">
          <p className="max-w-md text-sm text-[#374151]">
            The interactive landscape failed to load. Retry the iframe and keep the current cluster
            summary.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setErrored(false);
              setLoading(true);
              setNonce((current) => current + 1);
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : null}

      <iframe
        key={nonce}
        src={src}
        className="h-full w-full"
        onLoad={() => setLoading(false)}
        onError={() => {
          setErrored(true);
          setLoading(false);
        }}
        title="NarrativeScope Topic Landscape"
      />
    </div>
  );
}

