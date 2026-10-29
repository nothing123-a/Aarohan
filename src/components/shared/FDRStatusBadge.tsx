import { cn } from "@/lib/utils";
import type { FDRStatus } from "@/types";

export type SubmissionStatus = "DRAFT" | "SUBMITTED" | "RETURNED" | "WITHDRAWN";

export type VerificationStatus =
  | "NOT_STARTED"
  | "PENDING_REVIEW"
  | "UNDER_SCRUTINY"
  | "VERIFIED"
  | "DISCREPANCY_FLAGGED"
  | "REJECTED";

export type LifecycleStatus =
  | "LODGED"
  | "ACTIVE_LIEN"
  | "MATURING_SOON"
  | "MATURED"
  | "RENEWAL_REQUESTED"
  | "RELEASE_REQUESTED"
  | "RELEASED"
  | "DISCHARGED";

// ─── 1. SUBMISSION STATUS BADGE ──────────────────────────────────
const SUBMISSION_CONFIG: Record<
  SubmissionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  DRAFT:     { label: "Draft",     bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
  SUBMITTED: { label: "Submitted", bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  RETURNED:  { label: "Returned",  bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500"  },
  WITHDRAWN: { label: "Withdrawn", bg: "bg-rose-50",    text: "text-rose-700",   dot: "bg-rose-400"   },
};

export function SubmissionStatusBadge({
  status,
  className,
  noDot,
}: {
  status: SubmissionStatus | string;
  className?: string;
  noDot?: boolean;
}) {
  const norm = (status || "DRAFT").toUpperCase() as SubmissionStatus;
  const cfg = SUBMISSION_CONFIG[norm] ?? SUBMISSION_CONFIG.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap",
        cfg.bg,
        cfg.text,
        "border-current/20",
        className
      )}
      title={`Submission Status: ${cfg.label}`}
    >
      {!noDot && <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}

// ─── 2. VERIFICATION STATUS BADGE ────────────────────────────────
const VERIFICATION_CONFIG: Record<
  VerificationStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  NOT_STARTED:         { label: "Not Started",          bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"   },
  PENDING_REVIEW:      { label: "Pending Scrutiny",     bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500"   },
  UNDER_SCRUTINY:      { label: "Under Scrutiny",       bg: "bg-purple-50",   text: "text-purple-700",  dot: "bg-purple-500"  },
  VERIFIED:            { label: "Verified & Approved",  bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-600" },
  DISCREPANCY_FLAGGED: { label: "Discrepancy Flagged",  bg: "bg-rose-50",     text: "text-rose-700",    dot: "bg-rose-600"    },
  REJECTED:            { label: "Rejected",             bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-600"     },
};

export function VerificationStatusBadge({
  status,
  className,
  noDot,
}: {
  status: VerificationStatus | string;
  className?: string;
  noDot?: boolean;
}) {
  const norm = (status || "PENDING_REVIEW").toUpperCase() as VerificationStatus;
  const cfg = VERIFICATION_CONFIG[norm] ?? VERIFICATION_CONFIG.PENDING_REVIEW;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap",
        cfg.bg,
        cfg.text,
        "border-current/20",
        className
      )}
      title={`Verification Status: ${cfg.label}`}
    >
      {!noDot && <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}

// ─── 3. LIFECYCLE STATUS BADGE ───────────────────────────────────
const LIFECYCLE_CONFIG: Record<
  LifecycleStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  LODGED:             { label: "Lodged in Safe Custody", bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500"     },
  ACTIVE_LIEN:        { label: "Active Lien Marked",     bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  MATURING_SOON:      { label: "Maturing Soon (<30d)",   bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500"  },
  MATURED:            { label: "Matured",                bg: "bg-amber-100",  text: "text-amber-800",   dot: "bg-amber-600"   },
  RENEWAL_REQUESTED:  { label: "Renewal Pending",        bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500"  },
  RELEASE_REQUESTED:  { label: "Release Requested",      bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500"    },
  RELEASED:           { label: "Released / Refunded",    bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  DISCHARGED:         { label: "Discharged",             bg: "bg-slate-100",  text: "text-slate-500",   dot: "bg-slate-400"   },
};

export function LifecycleStatusBadge({
  status,
  className,
  noDot,
}: {
  status: LifecycleStatus | string;
  className?: string;
  noDot?: boolean;
}) {
  const norm = (status || "ACTIVE_LIEN").toUpperCase() as LifecycleStatus;
  const cfg = LIFECYCLE_CONFIG[norm] ?? LIFECYCLE_CONFIG.ACTIVE_LIEN;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap",
        cfg.bg,
        cfg.text,
        "border-current/20",
        className
      )}
      title={`Lifecycle Status: ${cfg.label}`}
    >
      {!noDot && <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}

// ─── LEGACY FDRStatusBadge FOR BACKWARD COMPATIBILITY ─────────────
const STATUS_CONFIG: Record<
  FDRStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft:            { label: "Draft",             bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
  submitted:        { label: "Submitted",          bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  under_review:     { label: "Under Review",       bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500"  },
  verified:         { label: "Verified",           bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500"},
  active:           { label: "Active",             bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  matured:          { label: "Matured",            bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-500" },
  renewal_pending:  { label: "Renewal Pending",    bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-500" },
  renewal_approved: { label: "Renewal Approved",   bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-500" },
  release_pending:  { label: "Release Pending",    bg: "bg-pink-50",    text: "text-pink-700",   dot: "bg-pink-500"   },
  release_approved: { label: "Release Approved",   bg: "bg-teal-50",    text: "text-teal-700",   dot: "bg-teal-500"   },
  released:         { label: "Released",           bg: "bg-slate-100",  text: "text-slate-500",  dot: "bg-slate-400"  },
  rejected:         { label: "Rejected",           bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500"    },
  cancelled:        { label: "Cancelled",          bg: "bg-slate-100",  text: "text-slate-400",  dot: "bg-slate-300"  },
};

interface FDRStatusBadgeProps {
  status: FDRStatus;
  className?: string;
  noDot?: boolean;
}

export function FDRStatusBadge({ status, className, noDot }: FDRStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap",
        cfg.bg,
        cfg.text,
        "border-current/20",
        className
      )}
    >
      {!noDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      )}
      {cfg.label}
    </span>
  );
}
