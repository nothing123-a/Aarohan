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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Role-specific notifications data for Topbar dropdown
  const getRoleNotifications = () => {
    const role = user?.role;
    if (role === "institution_representative" || role === "depositor") {
      let dispatchedItems: any[] = [];
      try {
        const stored = JSON.parse(localStorage.getItem("fdr_smart_dispatched_notices") || "[]");
        dispatchedItems = stored.map((sn: any) => ({
          id: sn.id,
          title: sn.title,
          subtitle: sn.body ? sn.body.slice(0, 58) + "…" : "Statutory renewal action required",
          time: "Just now",
          icon: <AlertTriangle size={12} />,
          iconBg: "bg-red-100 text-red-600",
          link: "/renewals",
        }));
      } catch {}

      return [
        ...dispatchedItems,
        {
          id: "ir-1",
          title: "FDR Certificate Uploaded",
          subtitle: "FDR_AICTE_2026_FD143 submitted for OCR scrutiny",
          time: "15 mins ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-blue-100 text-blue-600",
          link: "/fdr",
        },
        {
          id: "ir-2",
          title: "Lien Clarification Required",
          subtitle: "Scrutiny Officer requested Bank of Baroda lien response",
          time: "2 hrs ago",
          icon: <AlertTriangle size={12} />,
          iconBg: "bg-amber-100 text-amber-600",
          link: "/dashboard",
        },
        {
          id: "ir-3",
          title: "Deposit Maturing in 28 Days",
          subtitle: "FDR-2024-9841 (₹50,00,000) renewal required",
          time: "5 hrs ago",
          icon: <Clock size={12} />,
          iconBg: "bg-red-100 text-red-600",
          link: "/renewals",
        },
        {
          id: "ir-4",
          title: "Refund Request Sanctioned",
          subtitle: "Refund REF-2026-081 approved by AICTE Authority",
          time: "1 day ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-green-100 text-green-600",
          link: "/release-requests",
        },
      ];
    } else if (role === "scrutiny_officer" || role === "officer" || role === "verifier") {
      return [
        {
          id: "so-1",
          title: "New FDR Pending Scrutiny",
          subtitle: "Delhi Technological University ₹50 Lakh FDR awaiting OCR",
          time: "10 mins ago",
          icon: <Clock size={12} />,
          iconBg: "bg-blue-100 text-blue-600",
          link: "/verification",
        },
        {
          id: "so-2",
          title: "OCR Amount Mismatch Flagged",
          subtitle: "FDR-2026-98124: Claimed ₹35 Lakh vs OCR ₹30 Lakh",
          time: "45 mins ago",
          icon: <AlertTriangle size={12} />,
          iconBg: "bg-orange-100 text-orange-600",
          link: "/verification",
        },
        {
          id: "so-3",
          title: "Institution Clarification Arrived",
          subtitle: "DTU submitted joint lien clarification response",
          time: "3 hrs ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-purple-100 text-purple-600",
          link: "/verification",
        },
        {
          id: "so-4",
          title: "SBI CBS Lien Verified",
          subtitle: "SBI Parliament St. confirmed irrevocable lien notation",
          time: "6 hrs ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-green-100 text-green-600",
          link: "/fdr",
        },
      ];
    } else if (role === "approving_authority") {
      return [
        {
          id: "aa-1",
          title: "Release Request Pending Sanction",
          subtitle: "DTU ₹50,00,000 refund claim awaiting executive sign-off",
          time: "25 mins ago",
          icon: <Clock size={12} />,
          iconBg: "bg-purple-100 text-purple-600",
          link: "/release-requests",
        },
        {
          id: "aa-2",
          title: "3 Scrutiny Dossiers Recommended",
          subtitle: "Technical scrutiny cleared; ready for executive sanction",
          time: "1 hr ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-green-100 text-green-600",
          link: "/dashboard",
        },
        {
          id: "aa-3",
          title: "Weekly Statement Overdue",
          subtitle: "2 institutions missed weekly bank statement filing",
          time: "4 hrs ago",
          icon: <AlertTriangle size={12} />,
          iconBg: "bg-amber-100 text-amber-600",
          link: "/statements",
        },
        {
          id: "aa-4",
          title: "Monthly Compliance Ledger Ready",
          subtitle: "AICTE Regulation Bureau deposit audit package compiled",
          time: "1 day ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-blue-100 text-blue-600",
          link: "/reports",
        },
      ];
    } else {
      return [
        {
          id: "adm-1",
          title: "Security & ClamAV Scan Clean",
          subtitle: "Zero malicious signatures across uploaded vault documents",
          time: "30 mins ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-green-100 text-green-600",
          link: "/audit-logs",
        },
        {
          id: "adm-2",
          title: "New Institution Account Verified",
          subtitle: "Netaji Subhas University representative account enabled",
          time: "2 hrs ago",
          icon: <Clock size={12} />,
          iconBg: "bg-blue-100 text-blue-600",
          link: "/admin/users",
        },
        {
          id: "adm-3",
          title: "OCR Engine Throughput: 98.4%",
          subtitle: "PyMuPDF + RapidOCR extracted 18 certificates today",
          time: "8 hrs ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-purple-100 text-purple-600",
          link: "/settings",
        },
        {
          id: "adm-4",
          title: "Supabase & Database Failover OK",
          subtitle: "PostgreSQL checkpoints verified and fully synchronized",
          time: "1 day ago",
          icon: <CheckCircle2 size={12} />,
          iconBg: "bg-slate-100 text-slate-600",
          link: "/audit-logs",
        },
      ];
    }
  };

  const notifications = getRoleNotifications();
  const [unreadCount, setUnreadCount] = useState(notifications.length - 1);

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
          {pageTitle || "Aarohan FDR Portal"}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
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
                <p className="text-xs font-bold text-slate-800">
                  {user?.role === "institution_representative" || user?.role === "depositor"
                    ? "Institution Alerts"
                    : user?.role === "scrutiny_officer" || user?.role === "officer" || user?.role === "verifier"
                    ? "Scrutiny Queue Alerts"
                    : user?.role === "approving_authority"
                    ? "Executive Sanction Alerts"
                    : "System Notifications"}
                </p>
                <p className="text-[10px] text-slate-400">{unreadCount} unread notifications</p>
              </div>
              <button
                onClick={() => setUnreadCount(0)}
                className="text-[10px] text-orange-600 hover:underline font-semibold"
              >
                Mark all read
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => navigate(n.link)}
                  className="p-3 hover:bg-orange-50/50 transition-colors cursor-pointer flex gap-2.5 items-start"
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      n.iconBg
                    )}
                  >
                    {n.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{n.subtitle}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                  </div>
                </div>
              ))}
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
