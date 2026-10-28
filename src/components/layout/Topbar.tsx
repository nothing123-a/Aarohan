import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/Dropdown";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  fdr: "FDR Management",
  new: "Submit New FDR",
  verification: "Document Verification",
  alerts: "Maturity & Expiry Alerts",
  renewals: "Renewal & Replacement",
  "release-requests": "Release / Refund Requests",
  reports: "Reports & Analytics",
  "audit-logs": "Audit Logs",
  institutions: "Institution Management",
  settings: "Settings",
  profile: "Officer Profile",
  "design-system": "Design System",
};

interface TopbarProps {
  pageTitle?: string;
}

export function Topbar({ pageTitle }: TopbarProps) {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(3);

  // Generate breadcrumb trail
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = ROUTE_LABELS[segment] || segment.toUpperCase();
    return { path, label };
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-slate-200 bg-white flex-shrink-0 z-20">
      {/* Left: Breadcrumbs & Page Context */}
      <div className="min-w-0 flex flex-col justify-center">
        {breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Link to="/dashboard" className="hover:text-orange-600 transition-colors">
              Portal
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.path} className="flex items-center gap-1.5">
                  <ChevronRight size={10} className="text-slate-300" />
                  {isLast ? (
                    <span className="text-slate-700 font-semibold">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="hover:text-orange-600 transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        )}
        <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate font-plus-jakarta mt-0.5">
          {pageTitle || "Garuda Netra FDR Portal"}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/*
          ── EVALUATION DEMO SWITCHER ─────────────────────────────────────────
          Calls /api/auth/switch-role to obtain a real signed JWT for each persona.
          Backend authorization enforces the actual role on every API call.
          This control does NOT bypass backend permissions.
        */}
        <div
          className="hidden xl:flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-200 text-xs"
          title="SIH Demo: Switches active JWT persona. Backend enforces real role on every API call."
        >
          <span className="text-[10px] text-amber-700 font-bold uppercase px-1.5 whitespace-nowrap">
            🎓 Demo:
          </span>
          <button
            onClick={() => switchRole("institution_representative")}
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
              user?.role === "institution_representative" || user?.role === "depositor"
                ? "bg-orange-500 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
            title="Institution Representative (DTU) — limited to own institution records"
          >
            Inst Rep
          </button>
          <button
            onClick={() => switchRole("scrutiny_officer")}
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
              user?.role === "scrutiny_officer" || user?.role === "officer" || user?.role === "verifier"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
            title="AICTE Scrutiny Officer — can recommend but not approve releases"
          >
            Scrutiny
          </button>
          <button
            onClick={() => switchRole("approving_authority")}
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
              user?.role === "approving_authority"
                ? "bg-purple-700 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
            title="Executive Approving Authority — sole role that can sanction final releases"
          >
            Approver
          </button>
          <button
            onClick={() => switchRole("admin")}
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
              user?.role === "admin"
                ? "bg-slate-800 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
            title="System Administrator — no financial approval authority"
          >
            Admin
          </button>
        </div>

        {/* Quick Search */}
        <button
          onClick={() => navigate("/fdr")}
          className="hidden md:flex items-center gap-2 px-3 h-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:border-orange-300 hover:text-orange-600 transition-all text-xs cursor-pointer"
          aria-label="Search records"
          id="topbar-search"
        >
          <Search size={13} />
          <span>Search FDR, Bank, Tender…</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-orange-600 hover:border-orange-300 transition-all cursor-pointer"
              aria-label="Notifications"
              id="topbar-notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden shadow-lg border-slate-200">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Critical Notifications</p>
                <p className="text-[10px] text-slate-400">{unreadCount} actionable maturity alerts</p>
              </div>
              <button
                onClick={() => setUnreadCount(0)}
                className="text-[10px] text-orange-600 hover:underline font-semibold"
              >
                Mark all read
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              <div
                onClick={() => navigate("/alerts")}
                className="p-3 hover:bg-orange-50/50 transition-colors cursor-pointer flex gap-2.5 items-start"
              >
                <div className="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    FDR-2026-002 Maturing in 3 Days
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tata Projects Global · ₹ 1.20 Cr</p>
                  <span className="text-[10px] text-slate-400 font-mono">10 mins ago</span>
                </div>
              </div>

              <div
                onClick={() => navigate("/verification")}
                className="p-3 hover:bg-orange-50/50 transition-colors cursor-pointer flex gap-2.5 items-start"
              >
                <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    SBI Parliament St. Confirmed Lien
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">FDR-2026-98124 verified by Branch Manager</p>
                  <span className="text-[10px] text-slate-400 font-mono">45 mins ago</span>
                </div>
              </div>

              <div
                onClick={() => navigate("/renewals")}
                className="p-3 hover:bg-orange-50/50 transition-colors cursor-pointer flex gap-2.5 items-start"
              >
                <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    New Renewal Request Submitted
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">GMR Enterprises · ₹ 92,00,000</p>
                  <span className="text-[10px] text-slate-400 font-mono">2 hrs ago</span>
                </div>
              </div>
            </div>
            <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <Link
                to="/alerts"
                className="font-semibold text-orange-600 hover:text-orange-700"
              >
                Expiry Register →
              </Link>
              <Link
                to="/notifications"
                className="font-semibold text-slate-600 hover:text-slate-800"
              >
                All Notifications →
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-0.5" />

        {/* User Profile Menu Dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-orange-300 transition-all cursor-pointer"
                id="topbar-user"
              >
                <div className="h-7 w-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold border border-orange-200">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight max-w-[110px] truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize leading-tight">{user.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-slate-200">
              <DropdownMenuLabel className="px-2 py-1.5">
                <p className="text-xs font-bold text-slate-800">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-normal lowercase">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User size={14} className="text-slate-400" />
                <span>My Profile & DSC Token</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings size={14} className="text-slate-400" />
                <span>System Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/audit-logs")}>
                <Shield size={14} className="text-slate-400" />
                <span>My Audit Activity</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={handleLogout}>
                <LogOut size={14} />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
