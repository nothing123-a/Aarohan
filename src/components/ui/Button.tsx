import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap",
    "transition-all duration-150 cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Orange primary — key actions like Submit, Save, Sign In */
        primary:
          "bg-orange-500 text-white hover:bg-orange-600 shadow-[0_4px_14px_0_hsl(24_95%_53%_/_0.25)] hover:shadow-[0_4px_18px_0_hsl(24_95%_53%_/_0.35)]",
        /** Solid dark — secondary important actions */
        secondary:
          "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
        /** Bordered — tertiary, cancel, back */
        outline:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
        /** Orange outlined — alternative CTA */
        "outline-primary":
          "border border-orange-300 bg-white text-orange-600 hover:bg-orange-50",
        /** Text ghost */
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        /** Orange ghost — sidebar active-like inline link */
        "ghost-primary":
          "text-orange-600 hover:bg-orange-50",
        /** Danger */
        destructive:
          "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100",
        /** Muted / disabled-looking */
        muted:
          "bg-slate-100 text-slate-500 hover:bg-slate-200",
      },
      size: {
        xs:      "h-7 px-2.5 text-xs rounded",
        sm:      "h-8 px-3 text-sm",
        default: "h-9 px-4",
        lg:      "h-11 px-5 text-base",
        icon:    "h-9 w-9 p-0",
        "icon-sm":"h-7 w-7 p-0 text-xs",
        "icon-lg":"h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, asChild, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading…</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

// ─── Re-export for convenience ─────────────────────────────────────
export { buttonVariants };
