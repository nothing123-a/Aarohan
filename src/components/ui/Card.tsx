import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Card Root ────────────────────────────────────────────────────
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle hover lift effect */
  hoverable?: boolean;
  /** Adds a left orange border accent */
  accent?: boolean;
  /** Remove default padding */
  noPadding?: boolean;
}

export function Card({ className, hoverable, accent, noPadding, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-sm",
        !noPadding && "p-6",
        hoverable && "transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        accent && "border-l-4 border-l-orange-500",
        className
      )}
      {...props}
    />
  );
}

// ─── Card Header ──────────────────────────────────────────────────
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1 mb-5", className)} {...props} />
  );
}

// ─── Card Title ───────────────────────────────────────────────────
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-slate-900 leading-tight", className)}
      {...props}
    />
  );
}

// ─── Card Description ─────────────────────────────────────────────
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-500 leading-relaxed", className)} {...props} />
  );
}

// ─── Card Content ─────────────────────────────────────────────────
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

// ─── Card Footer ──────────────────────────────────────────────────
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4",
        className
      )}
      {...props}
    />
  );
}

// ─── Divider ──────────────────────────────────────────────────────
export function CardDivider({ className }: { className?: string }) {
  return <hr className={cn("border-slate-100 my-4", className)} />;
}

// ─── Stat Card ────────────────────────────────────────────────────
export type TrendDirection = "up" | "down" | "flat";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  /** Icon background / accent color class */
  iconColor?: "orange" | "green" | "blue" | "red" | "amber" | "purple";
  trend?: { value: number; label: string; direction?: TrendDirection };
  className?: string;
  onClick?: () => void;
}

const ICON_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  orange: { bg: "bg-orange-50",  text: "text-orange-500" },
  green:  { bg: "bg-green-50",   text: "text-green-600"  },
  blue:   { bg: "bg-blue-50",    text: "text-blue-500"   },
  red:    { bg: "bg-red-50",     text: "text-red-500"    },
  amber:  { bg: "bg-amber-50",   text: "text-amber-500"  },
  purple: { bg: "bg-purple-50",  text: "text-purple-500" },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "orange",
  trend,
  className,
  onClick,
}: StatCardProps) {
  const colors = ICON_COLOR_MAP[iconColor] ?? ICON_COLOR_MAP.orange;
  const isClickable = !!onClick;

  const TrendIcon =
    trend?.direction === "up" ? TrendingUp
    : trend?.direction === "down" ? TrendingDown
    : Minus;

  const trendColor =
    trend?.direction === "up"   ? "text-green-600"
    : trend?.direction === "down" ? "text-red-500"
    : "text-slate-400";

  return (
    <Card
      className={cn(
        isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight font-plus-jakarta">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon size={13} className={trendColor} />
              <span className={cn("text-xs font-medium", trendColor)}>
                {trend.value}%
              </span>
              <span className="text-xs text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg flex-shrink-0 ml-3", colors.bg)}>
          <span className={colors.text}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}
