import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#374151] placeholder:text-[#9ca3af] focus-visible:border-[#9ca3af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730a3]/20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

