/**
 * Shared loading, skeleton, and empty state components.
 */
import { cn } from "@/lib/utils";

// ─── Inline spinner ───────────────────────────────────────────────
export function LoadingSpinner({ size = "default", className }: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sz = size === "sm" ? "h-4 w-4 border" : size === "lg" ? "h-8 w-8 border-2" : "h-5 w-5 border-2";
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <span className={cn(sz, "animate-spin rounded-full border-slate-300 border-t-orange-500")} />
    </div>
  );
}

// ─── Full-page loader ─────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}

// ─── Skeleton primitives ──────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-3 w-${i % 2 === 0 ? "full" : "3/4"}`} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 border-b border-slate-100 last:border-0 flex gap-6 bg-white">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={`h-3 w-${j === 0 ? 28 : j === 1 ? 20 : 16}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Section loading overlay ──────────────────────────────────────
export function SectionLoader({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-orange-400" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
