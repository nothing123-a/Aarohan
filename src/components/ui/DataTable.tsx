/**
 * Data Table component — clean fintech style.
 * Supports sortable columns, loading skeleton, and empty state.
 */
import React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// ─── Column definition ────────────────────────────────────────────
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: keyof T;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  onRowClick?: (row: T) => void;
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  isLoading,
  emptyMessage = "No records found",
  emptyDescription,
  emptyIcon,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  className,
  stickyHeader,
}: TableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto rounded-lg border border-slate-200", className)}>
      <table className="w-full text-sm border-collapse">
        {/* Head */}
        <thead className={cn("bg-slate-50", stickyHeader && "sticky top-0 z-10")}>
          <tr>
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              const SortIcon = isSorted
                ? sortDirection === "asc"
                  ? ChevronUp
                  : ChevronDown
                : ChevronsUpDown;
              return (
                <th
                  key={String(col.key)}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200",
                    col.align === "center" && "text-center",
                    col.align === "right"  && "text-right",
                    !col.align             && "text-left",
                    col.sortable && "cursor-pointer select-none hover:text-slate-700 hover:bg-slate-100 transition-colors",
                    col.className
                  )}
                  onClick={col.sortable && onSort ? () => onSort(String(col.key)) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        size={13}
                        className={isSorted ? "text-orange-500" : "text-slate-300"}
                      />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="bg-white divide-y divide-slate-100">
          {isLoading ? (
            // Skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3">
                    <div className="skeleton h-4 rounded" style={{ width: `${60 + (i * 7) % 30}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                {emptyIcon && (
                  <div className="flex justify-center mb-3 text-slate-300">{emptyIcon}</div>
                )}
                <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
                {emptyDescription && (
                  <p className="text-xs text-slate-400 mt-1">{emptyDescription}</p>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={String(row[keyField])}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-colors duration-100",
                  onRowClick && "cursor-pointer hover:bg-orange-50/50"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      "px-4 py-3 text-slate-700",
                      col.align === "center" && "text-center",
                      col.align === "right"  && "text-right",
                      col.className
                    )}
                  >
                    {col.cell
                      ? col.cell(row, rowIndex)
                      : String(row[col.key as keyof T] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────
export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white text-sm">
      <p className="text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "h-8 w-8 rounded text-sm font-medium transition-colors",
                p === page
                  ? "bg-orange-500 text-white border border-orange-500"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
