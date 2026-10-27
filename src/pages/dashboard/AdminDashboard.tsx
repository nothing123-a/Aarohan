import { Link } from "react-router-dom";
import {
  ShieldAlert,
  FileSearch,
  AlertTriangle,
  Clock,
  FileCheck2,
  TrendingUp,
  ArrowRight,
  Building2,
  Users,
  Settings,
  Terminal,
  AlertCircle,
  FileText,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/utils";
import { getPortfolioStats } from "@/data/centralDataset";
import type { User } from "@/types";

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const stats = getPortfolioStats();

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Admin Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
          <Terminal size={160} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-orange-400 mb-3">
            <span>AICTE Administration & System Governance Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-plus-jakarta tracking-tight">
            Portfolio Scrutiny & System Oversight
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Welcome, <span className="font-semibold text-white">{user.name}</span>. Monitor nationwide security deposit portfolios, user permissions, audit trails, and system workflow health.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 font-mono text-slate-300">
              Role: System Administrator
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1.5 font-medium">
              <ShieldAlert size={12} />
              Separation of Duties Enforced: Administrative role does not hold financial approval authority
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Open Scrutiny Queue", path: "/verification", icon: <FileCheck2 size={16} />, highlight: true },
          { label: "Search Instruments", path: "/fdr", icon: <FileSearch size={16} /> },
          { label: "Review Discrepancies", path: "/verification", icon: <AlertTriangle size={16} /> },
          { label: "Maturity Monitoring", path: "/alerts", icon: <Clock size={16} /> },
          { label: "Release / Refund Queue", path: "/release-requests", icon: <FileText size={16} /> },
          { label: "Authorized Reports", path: "/reports", icon: <TrendingUp size={16} /> },
        ].map((act, i) => (
          <Link
            key={i}
            to={act.path}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group hover:shadow-xs ${
              act.highlight
                ? "bg-orange-50/80 border-orange-200 text-orange-950 hover:bg-orange-100/60"
                : "bg-white border-slate-200 text-slate-800 hover:border-orange-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`p-2 rounded-lg ${act.highlight ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 group-hover:text-orange-600 group-hover:bg-orange-50"}`}>
                {act.icon}
              </span>
              <ArrowRight size={13} className="text-slate-300 group-hover:text-orange-600 transition-colors" />
            </div>
            <p className="text-xs font-bold leading-snug">{act.label}</p>
          </Link>
        ))}
      </div>

      {/* Required Administration Metrics */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Portfolio-Wide Regulatory Totals (Derived from Underlying Records)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            title="Portfolio Count"
            value={stats.totalInstruments}
            icon={<FileText size={18} />}
            iconColor="orange"
            subtitle="Total nationwide records"
          />
          <StatCard
            title="Total Principal Value"
            value={formatCurrency(stats.totalPrincipalValue)}
            icon={<TrendingUp size={18} />}
            iconColor="green"
            subtitle="Custody deposit total"
          />
          <StatCard
            title="Pending Scrutiny"
            value={stats.pendingScrutinyCases}
            icon={<FileCheck2 size={18} />}
            iconColor="blue"
            subtitle="Awaiting officer review"
          />
          <StatCard
            title="Unresolved Discrepancies"
            value={stats.unresolvedDiscrepancies}
            icon={<AlertCircle size={18} />}
            iconColor={stats.unresolvedDiscrepancies > 0 ? "red" : "green"}
            subtitle="Flags & open queries"
          />
          <StatCard
            title="Upcoming Maturities"
            value={stats.upcomingMaturities}
            icon={<Clock size={18} />}
            iconColor="amber"
            subtitle="Within 30 days"
          />
          <StatCard
            title="Expired Attention"
            value={stats.expiredRequiringAttention}
            icon={<AlertTriangle size={18} />}
            iconColor={stats.expiredRequiringAttention > 0 ? "red" : "orange"}
            subtitle="Action overdue"
          />
          <StatCard
            title="Pending Releases"
            value={stats.pendingReleaseRefundRequests}
            icon={<FileText size={18} />}
            iconColor="purple"
            subtitle="Approval queue"
          />
        </div>
      </div>

      {/* System Administration Shortcuts & Recent Workflow Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 font-plus-jakarta">
                  Recent Regulatory Workflow Activity
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Real-time events recorded in the centralized audit pipeline.
                </p>
              </div>
              <Button size="xs" variant="outline" asChild>
                <Link to="/audit-logs">Full Audit Trail</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {[
                  {
                    action: "Lien Confirmed in CBS",
                    desc: "Core Banking System matched FDR #FDR/AICTE/2026/089 (DTU) with State Bank of India.",
                    time: "12 mins ago",
                    badge: "bg-green-100 text-green-700",
                  },
                  {
                    action: "Maturity Escalation Dispatched",
                    desc: "Automated 15-day expiry reminder dispatched to BITS Pilani (Goa) and HDFC Bank.",
                    time: "1 hour ago",
                    badge: "bg-amber-100 text-amber-700",
                  },
                  {
                    action: "Release Recommendation Lodged",
                    desc: "Scrutiny officer recommended approval for PSG Tech discontinued program deposit refund.",
                    time: "3 hours ago",
                    badge: "bg-blue-100 text-blue-700",
                  },
                  {
                    action: "Observation Issued",
                    desc: "Query issued to Delhi Technological University regarding unverified branch manager token.",
                    time: "5 hours ago",
                    badge: "bg-purple-100 text-purple-700",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${item.badge} mb-1`}>
                        {item.action}
                      </span>
                      <p className="text-slate-800 font-medium">{item.desc}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Administration Modules */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 font-plus-jakarta">
                Governance & Administration Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Link
                to="/admin/users"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Users size={16} className="text-orange-600" />
                  <div>
                    <p className="font-bold text-slate-900">User Management</p>
                    <p className="text-[10px] text-slate-400">Manage officer roles & permissions</p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </Link>

              <Link
                to="/institutions"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 size={16} className="text-blue-600" />
                  <div>
                    <p className="font-bold text-slate-900">Institution Registry</p>
                    <p className="text-[10px] text-slate-400">Review approved technical colleges</p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </Link>

              <Link
                to="/settings"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={16} className="text-slate-700" />
                  <div>
                    <p className="font-bold text-slate-900">Workflow & Reminder Rules</p>
                    <p className="text-[10px] text-slate-400">Configure alert days (45d, 30d, 15d)</p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
