import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export function Breadcrumbs({
  items,
  separator = <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />,
  className,
}: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1.5 text-xs text-slate-500", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <span aria-hidden="true">{separator}</span>}
            {isLast || !item.href ? (
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  isLast ? "text-slate-800 font-semibold" : "text-slate-500"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex items-center gap-1.5 text-slate-500 hover:text-orange-600 transition-colors"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
