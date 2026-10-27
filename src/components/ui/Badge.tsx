import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// ─── Badge ────────────────────────────────────────────────────────
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2.5 py-0.5 border",
  {
    variants: {
      variant: {
        default:     "bg-orange-50  text-orange-700 border-orange-200",
        primary:     "bg-orange-500 text-white       border-orange-500",
        secondary:   "bg-slate-100  text-slate-600   border-slate-200",
        success:     "bg-green-50   text-green-700   border-green-200",
        warning:     "bg-amber-50   text-amber-700   border-amber-200",
        error:       "bg-red-50     text-red-700     border-red-200",
        info:        "bg-blue-50    text-blue-700    border-blue-200",
        purple:      "bg-purple-50  text-purple-700  border-purple-200",
        outline:     "bg-white      text-slate-600   border-slate-300",
        /** Muted — lowest emphasis */
        muted:       "bg-slate-50   text-slate-500   border-slate-200",
      },
    },
    defaultVariants: { variant: "secondary" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full inline-block flex-shrink-0",
            variant === "success" && "bg-green-500",
            variant === "warning" && "bg-amber-500",
            variant === "error"   && "bg-red-500",
            variant === "info"    && "bg-blue-500",
            variant === "default" || variant === "primary" ? "bg-orange-500" : "",
            !["success","warning","error","info","default","primary"].includes(variant ?? "")
              && "bg-slate-400"
          )}
        />
      )}
      {children}
    </span>
  );
}
