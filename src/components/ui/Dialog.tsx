/**
 * Dialog / Modal component — clean overlay with orange accents.
 */
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "default" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Prevent closing on backdrop click */
  persistent?: boolean;
}

const SIZE_MAP = {
  sm: "max-w-sm",
  default: "max-w-md",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  "3xl": "max-w-6xl",
  "4xl": "max-w-7xl",
  full: "max-w-[95vw]",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "default",
  children,
  footer,
  persistent,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, persistent]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={persistent ? undefined : onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full bg-white rounded-xl shadow-2xl border border-slate-200 animate-scale-in flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto",
          SIZE_MAP[size]
        )}
      >
        {/* Header — fixed, does not scroll */}
        <div className="flex items-start justify-between px-6 py-3 border-b border-slate-100 flex-shrink-0 bg-white rounded-t-xl">
          <div>
            <h2 id="dialog-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable so tall forms never overflow the viewport */}
        <div className="px-6 py-3.5 overflow-y-auto flex-1 min-h-0 focus:outline-none scrollbar-thin scrollbar-thumb-slate-300">
          {children}
        </div>

        {/* Footer — fixed, does not scroll */}
        {footer && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/90 rounded-b-xl flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      persistent={isLoading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Dialog>
  );
}
