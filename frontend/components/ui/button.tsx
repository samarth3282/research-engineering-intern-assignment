import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730a3]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[linear-gradient(to_right,#c0522b,#5c2d82)] text-white hover:opacity-95",
        ghost: "bg-transparent text-[#1a1a3e] hover:bg-[#f3f4f6]",
        outline: "border border-[#d1d5db] bg-white text-[#374151] hover:border-[#9ca3af] hover:text-[#111827]",
        subtle: "bg-[#f3f4f6] text-[#1a1a3e] hover:bg-[#e5e7eb]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };

