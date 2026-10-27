import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "Unable to Load Data",
  message = "An error occurred while communicating with the records registry. Please try again.",
  errorCode,
  onRetry,
  onBack,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-red-200 bg-red-50/20",
        compact ? "py-6 px-4" : "py-12 px-6",
        className
      )}
      role="alert"
    >
      <div className="mb-3.5 p-3 rounded-xl bg-red-100/70 text-red-600 flex items-center justify-center">
        <AlertCircle size={compact ? 20 : 28} />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{message}</p>

      {errorCode && (
        <span className="mt-2 px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px] border border-slate-200">
          Code: {errorCode}
        </span>
      )}

      {(onRetry || onBack) && (
        <div className="mt-4 flex items-center gap-2">
          {onBack && (
            <Button size="xs" variant="outline" onClick={onBack}>
              <ArrowLeft size={13} />
              <span>Go Back</span>
            </Button>
          )}
          {onRetry && (
            <Button size="xs" variant="primary" onClick={onRetry}>
              <RefreshCw size={13} />
              <span>Retry</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
