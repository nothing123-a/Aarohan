/**
 * Alert / Callout components for success, warning, error, info states.
 */
import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from "lucide-react";

export type AlertVariant = "success" | "warning" | "error" | "info";

const ALERT_CONFIG: Record<
  AlertVariant,
  { bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />,
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: <XCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />,
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />,
  },
};

export interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ variant, title, children, onDismiss, className }: AlertProps) {
  const cfg = ALERT_CONFIG[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        cfg.bg,
        cfg.border,
        className
      )}
      role="alert"
    >
      {cfg.icon}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("text-sm font-semibold", cfg.text)}>{title}</p>
        )}
        <div className={cn("text-sm leading-relaxed", title ? "mt-0.5" : "", cfg.text)}>
          {children}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "p-0.5 rounded transition-colors flex-shrink-0",
            cfg.text,
            "hover:bg-black/10"
          )}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Inline status indicator ──────────────────────────────────────
interface InlineStatusProps {
  variant: AlertVariant;
  message: string;
  className?: string;
}

export function InlineStatus({ variant, message, className }: InlineStatusProps) {
  const cfg = ALERT_CONFIG[variant];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {cfg.icon}
      <span className={cn("text-sm", cfg.text)}>{message}</span>
    </div>
  );
}
