import { format, formatDistanceToNow, differenceInDays, isAfter, isBefore, parseISO } from "date-fns";

/**
 * Format a date string to a human-readable format.
 */
export const formatDate = (dateStr: string, fmt = "dd MMM yyyy"): string => {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
};

/**
 * Format a date to a relative time string (e.g., "3 days ago").
 */
export const formatRelativeTime = (dateStr: string): string => {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
};

/**
 * Days remaining until a date.
 */
export const daysUntil = (dateStr: string): number => {
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return 0;
  }
};

/**
 * Check if a date is past.
 */
export const isPast = (dateStr: string): boolean => {
  try {
    return isBefore(parseISO(dateStr), new Date());
  } catch {
    return false;
  }
};

/**
 * Check if a date is in the future.
 */
export const isFuture = (dateStr: string): boolean => {
  try {
    return isAfter(parseISO(dateStr), new Date());
  } catch {
    return false;
  }
};

/**
 * Format currency amounts in INR.
 */
export const formatCurrency = (amount: number, compact = false): string => {
  if (compact) {
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
    if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)}L`;
    if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Truncate text with ellipsis.
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Generate initials from a full name.
 */
export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
};

/**
 * Classify maturity urgency level.
 */
export const getMaturityUrgency = (
  maturityDate: string
): "critical" | "warning" | "soon" | "normal" => {
  const days = daysUntil(maturityDate);
  if (days <= 0) return "critical";
  if (days <= 7) return "critical";
  if (days <= 15) return "warning";
  if (days <= 30) return "soon";
  return "normal";
};

/**
 * FDR status display labels.
 */
export const FDR_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  verified: "Verified",
  active: "Active",
  matured: "Matured",
  renewal_pending: "Renewal Pending",
  renewal_approved: "Renewal Approved",
  release_pending: "Release Pending",
  release_approved: "Release Approved",
  released: "Released",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/**
 * FDR status color classes.
 */
export const FDR_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  under_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  verified: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  matured: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  renewal_pending: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  renewal_approved: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  release_pending: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  release_approved: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  released: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-600/20 text-gray-500 border-gray-600/30",
};
