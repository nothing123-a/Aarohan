import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  FileCheck2,
  CheckCircle2,
  BellRing,
  RefreshCw,
  FileCheck,
  TrendingUp,
  Terminal,
  Building2,
  Settings,
  LogOut,
  ChevronLeft,
  Users,
  Clock,
  Coins,
  FileSpreadsheet,
  Layers,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (itemPath: string) => {
    // 1. Exact match with search params (e.g. /dashboard?tab=supervision)
    if (itemPath === location.pathname + location.search) {
      return true;
    }

    // 2. Dashboard or Treasury primary path match
    if (
      (itemPath === "/treasury" || itemPath === "/dashboard") &&
      (location.pathname === "/treasury" || location.pathname === "/dashboard")
    ) {
      return true;
    }

    // 3. Release & Refund list match
    if (itemPath === "/release-requests" && (location.pathname === "/release-requests" || location.pathname === "/refund-requests")) {
      return true;
    }

    // 4. For other non-query links (like /verification, /fdr, /monitoring, /audit-logs):
    if (!itemPath.includes("?")) {
      return location.pathname === itemPath || (itemPath !== "/" && location.pathname.startsWith(itemPath + "/"));
    }

    return false;
  };

  const getNavItemsForRole = (role?: UserRole): NavItem[] => {
    switch (role) {
      case "institution_representative":
      case "depositor":
        return [
          { label: "Dashboard",                   path: "/dashboard",        icon: <LayoutDashboard size={17} /> },
          { label: "My Pledged FDRs",             path: "/fdr",              icon: <FileText size={17} /> },
          { label: "Submit New FDR",              path: "/fdr/new",          icon: <FilePlus2 size={17} /> },
          { label: "Renewals & Extensions",       path: "/renewals",         icon: <RefreshCw size={17} /> },
          { label: "Release & Refund Claims",     path: "/release-requests", icon: <FileCheck size={17} /> },
          { label: "Request for Refund",          path: "/refund-requests/new", icon: <Coins size={17} /> },
          { label: "Observations & Alerts",       path: "/notifications",    icon: <BellRing size={17} /> },
        ];
      case "scrutiny_officer":
      case "officer":
      case "verifier":
        return [
          { label: "Scrutiny Dashboard",          path: "/dashboard",        icon: <LayoutDashboard size={17} /> },
          { label: "OCR Document Verification",   path: "/verification",     icon: <FileCheck2 size={17} /> },
          { label: "Weekly Statements",           path: "/statements",       icon: <FileSpreadsheet size={17} /> },
          { label: "Account Aggregator",          path: "/account-aggregator", icon: <Layers size={17} /> },
          { label: "Master Deposit Register",     path: "/fdr",              icon: <FileText size={17} /> },
          { label: "Maturity Timeline",           path: "/monitoring",       icon: <Clock size={17} /> },
          { label: "Scrutiny Reports",            path: "/reports",          icon: <TrendingUp size={17} /> },
          { label: "Operational Alerts",          path: "/notifications",    icon: <BellRing size={17} /> },
        ];
      case "approving_authority":
      case "admin":
      default:
        return [
          { label: "Treasury & Funds Liquidity",  path: "/treasury",                  icon: <Coins size={17} /> },
          { label: "Supervise Scrutiny Officers", path: "/officers",                  icon: <Users size={17} /> },
          { label: "Final FDR Approvals",         path: "/approvals",                 icon: <CheckCircle2 size={17} /> },
          { label: "Refund & Release Sanctions",  path: "/refund-sanctions",          icon: <Wallet size={17} /> },
          { label: "OCR Documents Managing",      path: "/verification",              icon: <FileCheck2 size={17} /> },
          { label: "Institution Directory",       path: "/institutions",              icon: <Building2 size={17} /> },
          { label: "User Administration",         path: "/admin/users",               icon: <Users size={17} /> },
          { label: "Regulatory Policy Settings",  path: "/settings",                  icon: <Settings size={17} /> },
          { label: "Master Deposit Register",     path: "/fdr",                       icon: <FileText size={17} /> },
          { label: "Audit Ledger",                path: "/audit-logs",                icon: <Terminal size={17} /> },
        ];
    }
  };

  const navItems = getNavItemsForRole(user?.role);

  const getPortalLabel = (role?: UserRole) => {
    switch (role) {
      case "institution_representative":
      case "depositor":
        return { title: "Institution Portal", subtitle: user?.institutionName || "AICTE Institute" };
      case "scrutiny_officer":
      case "officer":
      case "verifier":
        return { title: "Scrutiny Portal", subtitle: "Regulation Bureau Scrutiny" };
      case "approving_authority":
      case "admin":
      default:
        return { title: "Approving Authority", subtitle: "Financial Decision Cell" };
    }
  };

  const portalInfo = getPortalLabel(user?.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex-shrink-0 z-30 select-none",
        collapsed ? "w-[64px]" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 h-16 border-b border-slate-100 flex-shrink-0",
          collapsed && "justify-center px-0"
        )}
      >
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center shadow-xs">
            <Building2 size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 leading-tight font-plus-jakarta tracking-tight">
                Aarohan
              </p>
              <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider truncate">
                {portalInfo.title}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[3.75rem] z-20 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 hover:text-orange-600 hover:border-orange-300 transition-colors cursor-pointer"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft
          size={12}
          className={cn("transition-transform duration-300", collapsed && "rotate-180")}
        />
      </button>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = isItemActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
                isActive
                  ? "bg-orange-50 text-orange-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                collapsed && "justify-center px-0"
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0 transition-colors",
                  isActive ? "text-orange-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {/* Active indicator bar */}
              {isActive && !collapsed && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0 ml-auto" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className={cn("border-t border-slate-100 p-2.5 space-y-1 flex-shrink-0", collapsed && "px-1.5")}>
        {user && !collapsed && (
          <Link
            to="/profile"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors mb-0.5"
            title="View Profile"
          >
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold font-plus-jakarta border border-orange-200">
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
            </div>
          </Link>
        )}

        {user && collapsed && (
          <Link
            to="/profile"
            className="flex justify-center py-2"
            title={user.name}
          >
            <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold font-plus-jakarta border border-orange-200">
              {getInitials(user.name)}
            </div>
          </Link>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut size={15} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
