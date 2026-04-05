import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[#d1d5db] bg-[#f3f4f6] px-3 py-1 text-xs font-medium text-[#374151]",
        className,
      )}
      {...props}
    />
  );
}

