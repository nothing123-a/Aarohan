import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  FilePlus2,
  FileText,
  AlertCircle,
  Clock,
  RefreshCw,
  FileCheck,
  Bell,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Search,
  Coins,
  CheckCircle2,
  AlertTriangle,
  X,
  BarChart2,
  Send,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FDRStatusBadge } from "@/components/shared/FDRStatusBadge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea, Input, Select } from "@/components/ui/FormFields";
import { formatCurrency, formatDate, daysUntil } from "@/utils";
import { getInstitutionStats, CENTRAL_OBSERVATIONS, CENTRAL_FDR_RECORDS } from "@/data/centralDataset";
import { releaseService, institutionDashboardService } from "@/services/fdrService";
import type { InstitutionFinancialStatus } from "@/services/fdrService";
import type { User } from "@/types";

interface InstitutionDashboardProps {
  user: User;
}

// ─── Tab Types ──────────────────────────────────────────────────────────────
type TabId = "overview" | "financial_status" | "refund_requests";

// ─── Status Badge Helper ─────────────────────────────────────────────────────
function StatusChip({
  label,
  variant,
}: {
  label: string;
  variant: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const cls = {
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

function refundStatusVariant(s: string): "green" | "amber" | "red" | "blue" | "slate" {
  if (s === "completed" || s === "released") return "green";
  if (s === "approved") return "blue";
  if (s === "rejected") return "red";
  if (s === "returned_for_correction") return "amber";
  return "slate";
}

function refundStatusLabel(s: string) {
  const map: Record<string, string> = {
    submitted: "Submitted",
    under_review: "Under Scrutiny",
    approved: "Approved – Pending NOC",
    completed: "Completed",
    released: "Released",
    rejected: "Rejected",
    returned_for_correction: "Returned – Query Raised",
  };
  return map[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function InstitutionDashboard({ user }: InstitutionDashboardProps) {
  const institutionId = user.institutionId || "inst-001";

  // ─── Existing local data (kept unchanged) ────────────────────────────────
  const stats = getInstitutionStats(institutionId);
  const observations = CENTRAL_OBSERVATIONS.filter(
    (o) => stats.records.some((r) => r.id === o.fdrId) && o.status === "OPEN"
  );
  const eligibleFdrs = CENTRAL_FDR_RECORDS.filter(
    (r) => r.institutionId === institutionId && (r.status as string) !== "RELEASED" && (r.status as string) !== "CLOSED"
  );

  // ─── Tab State ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // ─── Backend Financial Status (Part 2 & 4) ──────────────────────────────
  const [financialStatus, setFinancialStatus] = useState<InstitutionFinancialStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchFinancialStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await institutionDashboardService.getFinancialStatus(institutionId);
      setFinancialStatus(res.data);
    } catch {
      setStatusError("Financial status data unavailable. Showing local records.");
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialStatus();
  }, [institutionId]);

  // ─── Observation Response (kept from original) ───────────────────────────
  const [activeObservation, setActiveObservation] = useState<(typeof observations)[0] | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [resolvedSuccess, setResolvedSuccess] = useState(false);

  const handleResolveObservation = () => {
    setResolvedSuccess(true);
    setTimeout(() => {
      setActiveObservation(null);
      setResolvedSuccess(false);
      setResponseNotes("");
    }, 1200);
  };


  // ─── Part 3: Refund Request State ───────────────────────────────────────
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundFdrId, setRefundFdrId] = useState("");
  const [refundType, setRefundType] = useState<"FULL_RELEASE" | "PARTIAL_REFUND" | "NOC_ISSUANCE">("FULL_RELEASE");
  const [refundJustification, setRefundJustification] = useState("");
  const [refundClause, setRefundClause] = useState("AICTE APH 2026-27 Clause 11.2");
  const [refundApplicantName, setRefundApplicantName] = useState(user.name || "");
  const [refundApplicantDesignation, setRefundApplicantDesignation] = useState(user.designation || "");
  const [refundDocNames, setRefundDocNames] = useState<string[]>([]);
  const [refundDocInput, setRefundDocInput] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<{ success: boolean; message: string; requestId?: string } | null>(null);
  const [refundValidationError, setRefundValidationError] = useState<string | null>(null);
  const [queryResponseModal, setQueryResponseModal] = useState<{ id: string; fdr_number: string } | null>(null);
  const [queryResponseNotes, setQueryResponseNotes] = useState("");
  const [queryResponseLoading, setQueryResponseLoading] = useState(false);
  const [queryResponseSuccess, setQueryResponseSuccess] = useState(false);

  const handleRefundSubmit = async () => {
    setRefundValidationError(null);
    if (!refundFdrId) { setRefundValidationError("Please select an FDR."); return; }
    if (refundJustification.trim().length < 20) { setRefundValidationError("Justification must be at least 20 characters."); return; }
    if (!refundApplicantName.trim()) { setRefundValidationError("Applicant name is required."); return; }
    if (!refundApplicantDesignation.trim()) { setRefundValidationError("Applicant designation is required."); return; }

    const selectedFdr = eligibleFdrs.find((f) => f.id === refundFdrId);
    if (!selectedFdr) { setRefundValidationError("Selected FDR not found."); return; }

    setRefundLoading(true);
    try {
      const res = await releaseService.create({
        fdr_id: refundFdrId,
        fdr_number: selectedFdr.fdrNumber,
        institution_id: institutionId,
        institution_name: user.institutionName || "Institution",
        bank_name: selectedFdr.bankName,
        principal_amount: selectedFdr.principalAmount,
        request_type: refundType,
        justification_reason: refundJustification.trim(),
        regulatory_clause_reference: refundClause.trim(),
        supporting_document_names: refundDocNames.length > 0 ? refundDocNames : ["Supporting_Documents.pdf"],
        applicant_name: refundApplicantName.trim(),
        applicant_designation: refundApplicantDesignation.trim(),
      });
      const data = res.data;
      setRefundResult({
        success: data.status === "SUCCESS",
        message: data.message,
        requestId: data.release_request?.id,
      });
      if (data.status === "SUCCESS") {
        setRefundFdrId("");
        setRefundJustification("");
        setRefundDocNames([]);
        setShowRefundForm(false);
        await fetchFinancialStatus();
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setRefundResult({
        success: false,
        message: apiErr?.response?.data?.detail || "Refund request submission failed. Please try again.",
      });
    } finally {
      setRefundLoading(false);
    }
  };

  const handleQueryResponse = async () => {
    if (!queryResponseModal || !queryResponseNotes.trim()) return;
    setQueryResponseLoading(true);
    // Simulate responding to query (logged as a note; actual API call would send to backend)
    await new Promise((r) => setTimeout(r, 800));
    setQueryResponseSuccess(true);
    setQueryResponseLoading(false);
    setTimeout(() => {
      setQueryResponseModal(null);
      setQueryResponseNotes("");
      setQueryResponseSuccess(false);
    }, 1400);
  };

  // ─── Notifications from backend (Part 5) ─────────────────────────────────
  const backendNotifications = financialStatus?.notifications ?? [];
  // Filter out any statement missing banners — weekly statements & tallying belong exclusively on the Approver Dashboard
  const criticalNotifications = backendNotifications.filter(
    (n) => (n.severity === "CRITICAL" || n.action_required) && n.type !== "MISSING_STATEMENT" && n.type !== "STATEMENT_QUERY"
  );

  // ─── TABS ─────────────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Portfolio Overview", icon: <Building2 size={14} /> },
    {
      id: "financial_status",
      label: "Institutional Standing & Scrutiny",
      icon: <BarChart2 size={14} />,
      badge: (financialStatus?.financial_discrepancies.total_open ?? 0) + (observations.length ?? 0),
    },
    {
      id: "refund_requests",
      label: "Deposit Refund & Release Claims",
      icon: <Coins size={14} />,
      badge: financialStatus?.refund_requests.pending ?? 0,
    },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Institution Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
          <Building2 size={160} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold mb-3">
            <span>AICTE Authorized Institutional Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-plus-jakarta tracking-tight">
            {user.institutionName || "Delhi Technological University (DTU)"}
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 mt-1 max-w-2xl leading-relaxed">
            Welcome, <span className="font-semibold text-white">{user.name}</span> ({user.designation}). Manage
            fixed deposit securities, track regulatory lien confirmation, respond to scrutiny queries, and submit deposit refund claims.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Institution Code: {financialStatus?.institution_code ?? "AICTE-NZ-00142"}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Active Lien Balance: {formatCurrency(stats.totalPrincipalPledged)}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Notifications Banner (Part 5) */}
      {criticalNotifications.length > 0 && (
        <div className="space-y-2">
          {criticalNotifications.slice(0, 3).map((n, i) => (
            <Alert key={i} variant={n.severity === "CRITICAL" ? "error" : "warning"} className="border-l-4">
              <div className="flex items-start justify-between gap-3 w-full">
                <div>
                  <p className="text-xs font-bold">{n.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{n.body}</p>
                </div>
                {n.action_required && (
                  <Button size="sm" variant="primary" className="text-xs shrink-0"
                    onClick={() => {
                      if (n.type === "CLARIFICATION_REQUIRED") setActiveTab("financial_status");
                      else if (n.type === "REFUND_DECISION") setActiveTab("refund_requests");
                      else setActiveTab("overview");
                    }}>
                    Take Action
                  </Button>
                )}
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Observation Callout (kept from original) */}
      {observations.length > 0 && (
        <Alert variant="warning" className="border-amber-300 bg-amber-50/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <p className="text-xs font-bold text-amber-900">
                Action Required: {observations.length} Scrutiny Observation Awaiting Your Response
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                AICTE Scrutiny Officer issued a query regarding branch confirmation for FDR #
                {stats.records.find((r) => r.id === observations[0].fdrId)?.fdrNumber}.
              </p>
            </div>
            <Button size="sm" variant="primary" className="self-start sm:self-auto text-xs"
              onClick={() => setActiveObservation(observations[0])}>
              Respond to Query
            </Button>
          </div>
        </Alert>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Submit New FDR", path: "/fdr/new", icon: <FilePlus2 size={16} />, highlight: true },
          { label: "My Institution FDRs", path: "/fdr", icon: <FileText size={16} /> },
          { label: "Maturity Horizon", path: "/alerts", icon: <Clock size={16} /> },
          { label: "Submit Replacement", path: "/renewals", icon: <RefreshCw size={16} /> },
          { label: "Release Claims", path: "/release-requests", icon: <FileCheck size={16} /> },
          { label: "Notifications & Alerts", path: "/notifications", icon: <Bell size={16} />, highlight: false },
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

      {/* ─── TAB NAVIGATION ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-700 bg-orange-50/60"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? "bg-orange-500 text-white" : "bg-red-100 text-red-700"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: PORTFOLIO OVERVIEW (original content)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Required Role Statistics Metrics */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Institutional Portfolio Totals (Derived from Records)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard title="Total Instruments" value={stats.totalInstruments} icon={<FileText size={18} />} iconColor="orange" subtitle="All institution deposits" />
              <StatCard title="Draft Submissions" value={stats.draftSubmissions} icon={<FilePlus2 size={18} />} iconColor="orange" subtitle="Not yet submitted" />
              <StatCard title="Awaiting Scrutiny" value={stats.awaitingScrutiny} icon={<Clock size={18} />} iconColor="blue" subtitle="In Bureau Queue" />
              <StatCard title="Observations Issued" value={stats.requiringInfo} icon={<AlertCircle size={18} />}
                iconColor={stats.requiringInfo > 0 ? "red" : "green"} subtitle="Requires institution response" />
              <StatCard title="Upcoming Maturities" value={stats.upcomingMaturities} icon={<Clock size={18} />}
                iconColor={stats.upcomingMaturities > 0 ? "amber" : "orange"} subtitle="Within 60 days" />
              <StatCard title="Renewal Requests" value={stats.renewalRequests} icon={<RefreshCw size={18} />} iconColor="blue" subtitle="Tenure rollovers" />
              <StatCard title="Release Requests" value={stats.releaseRequests} icon={<FileCheck size={18} />} iconColor="purple" subtitle="Pending approval" />
            </div>
          </div>

          {/* Institution Instruments Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 font-plus-jakarta">
                  Authorized Institution FDR Records
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Strictly showing instruments registered under {user.institutionName || "your institution"}.
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/fdr">
                  <Search size={14} />
                  <span>Full Repository</span>
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left">FDR Certificate #</th>
                      <th className="py-3 px-4 text-left">Issuing Bank & Branch</th>
                      <th className="py-3 px-4 text-right">Lien Principal</th>
                      <th className="py-3 px-4 text-left">Maturity Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">CBS Lien Confirmation</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {stats.records.map((fdr) => {
                      const days = daysUntil(fdr.maturityDate);
                      return (
                        <tr key={fdr.id} className="hover:bg-orange-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {fdr.fdrNumber}
                            <p className="text-[10px] text-slate-400 font-normal font-sans">{fdr.department}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <p className="font-semibold">{fdr.bankName}</p>
                            <p className="text-[10px] text-slate-400">{fdr.bankBranch}</p>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            {formatCurrency(fdr.principalAmount)}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <p className="font-medium">{formatDate(fdr.maturityDate)}</p>
                            <p className={`text-[10px] ${days <= 30 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                              {days > 0 ? `${days} days left` : "Matured"}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <FDRStatusBadge status={fdr.status} />
                          </td>
                          <td className="py-3 px-4 text-center">
                            {fdr.lienConfirmedInCBS ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-semibold">
                                <ShieldCheck size={11} />
                                Confirmed in CBS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                Pending CBS Match
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="xs" asChild>
                              <Link to={`/fdr/${fdr.id}`}>
                                <span>Inspect</span>
                                <ExternalLink size={11} />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Refund Claims Section (original kept) */}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 bg-slate-50/50">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 font-plus-jakarta flex items-center gap-2">
                  <Coins size={18} className="text-emerald-600" />
                  <span>Institutional Refund Claims & Exit Clearances</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dedicated statutory portal for pro-rata refunds upon student intake reductions, course closures, and completed lock-in releases.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setActiveTab("refund_requests")}>
                  <span>View All Claims</span>
                </Button>
                <Button size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={() => { setActiveTab("refund_requests"); setShowRefundForm(true); }}>
                  <Coins size={14} />
                  <span>Apply for Deposit Refund</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Refund Application Status</span>
                    <p className="text-base font-extrabold text-emerald-950 font-mono mt-1">
                      {financialStatus?.refund_requests.pending ?? 1} Pro-Rata Claim{(financialStatus?.refund_requests.pending ?? 1) !== 1 ? "s" : ""} Active
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-2">
                    Program closure pro-rata refund dossier under scrutiny review by AICTE Regulation Bureau.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Approved Discharge NOCs</span>
                    <p className="text-base font-extrabold text-blue-950 font-mono mt-1">
                      {financialStatus?.refund_requests.approved_pending_discharge ?? 1} Sanction Issued
                    </p>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-2">
                    Official Bank Discharge NOC voucher ready for presentation to bank CBS host.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Statutory Refund Norm</span>
                    <p className="text-base font-bold text-slate-900 mt-1">APH Clause 11.2</p>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Mandatory 5-year lock-in with state regulatory "No Dues" clearance required prior to disbursement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: INSTITUTIONAL STANDING & SCRUTINY (Part 2)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "financial_status" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Institution Financial Status</h3>
              <p className="text-xs text-slate-500">Live data from AICTE FDR-SMART backend. Refresh to get latest status.</p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchFinancialStatus} disabled={statusLoading}>
              <RefreshCw size={13} className={statusLoading ? "animate-spin" : ""} />
              <span>{statusLoading ? "Loading..." : "Refresh"}</span>
            </Button>
          </div>

          {statusError && (
            <Alert variant="warning">
              <p className="text-xs">{statusError}</p>
            </Alert>
          )}

          {/* FDR Portfolio Status Grid */}
          {financialStatus && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total FDRs", value: financialStatus.fdr_portfolio.total, color: "orange" as const },
                { label: "Verified", value: financialStatus.fdr_portfolio.verified, color: "green" as const },
                { label: "Under Review", value: financialStatus.fdr_portfolio.under_review, color: "blue" as const },
                { label: "Pending", value: financialStatus.fdr_portfolio.pending, color: "amber" as const },
                { label: "Clarification Required", value: financialStatus.fdr_portfolio.clarification_required, color: financialStatus.fdr_portfolio.clarification_required > 0 ? "red" as const : "orange" as const },
                { label: "Rejected", value: financialStatus.fdr_portfolio.rejected, color: financialStatus.fdr_portfolio.rejected > 0 ? "red" as const : "orange" as const },
              ].map((s) => (
                <StatCard key={s.label} title={s.label} value={s.value} icon={<FileText size={16} />} iconColor={s.color} />
              ))}
            </div>
          )}

          {/* Clarification Requests */}
          {(financialStatus?.financial_discrepancies.clarification_requests.length ?? 0) > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2 border-b border-amber-100">
                <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600" />
                  Outstanding Scrutiny Observations & Clarification Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-amber-100">
                  {financialStatus!.financial_discrepancies.clarification_requests.map((cl) => (
                    <div key={cl.fdr_id} className="p-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-xs text-slate-800">{cl.fdr_number}</span>
                          <StatusChip
                            label={cl.status === "clarification_required" ? "Clarification Required" : "Discrepancy Found"}
                            variant="amber"
                          />
                        </div>
                        <p className="text-xs text-slate-600">{cl.notes || "AICTE scrutiny officer has raised a query. Please respond."}</p>
                        {cl.issued_at && (
                          <p className="text-[10px] text-slate-400 mt-1">Issued: {formatDate(cl.issued_at)}</p>
                        )}
                      </div>
                      <Button size="xs" variant="outline" className="shrink-0"
                        onClick={() => setActiveObservation(observations.find((o) => o.fdrId === cl.fdr_id) || null)}>
                        Respond
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Open Financial Alerts */}
          {(financialStatus?.financial_discrepancies.open_alerts.length ?? 0) > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-sm font-bold text-red-900 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-red-600" />
                  Outstanding Financial Discrepancies & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-red-50">
                  {financialStatus!.financial_discrepancies.open_alerts.map((a) => (
                    <div key={a.id} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusChip label={a.severity} variant={a.severity === "CRITICAL" ? "red" : "amber"} />
                        <span className="text-xs font-semibold text-slate-800">{a.title}</span>
                      </div>
                      <p className="text-xs text-slate-600">{a.description}</p>
                      {a.created_at && <p className="text-[10px] text-slate-400 mt-1">Raised: {formatDate(a.created_at)}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Maturities */}
          {(financialStatus?.upcoming_maturities.length ?? 0) > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2 border-b border-amber-100">
                <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <Clock size={15} className="text-amber-600" />
                  Upcoming FDR Maturities (Within 60 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-amber-100">
                  {financialStatus!.upcoming_maturities.map((m) => (
                    <div key={m.fdr_id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{m.reference_number}</span>
                          {m.is_critical && <StatusChip label="Critical — Under 30 Days" variant="red" />}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{m.bank_name} • {formatCurrency(m.amount)}</p>
                        <p className={`text-xs font-bold mt-0.5 ${m.is_critical ? "text-red-600" : "text-amber-700"}`}>
                          Matures {m.maturity_date ? formatDate(m.maturity_date) : "—"} ({m.days_to_maturity} days remaining)
                        </p>
                      </div>
                      <Button size="xs" variant="outline" asChild>
                        <Link to={`/fdr/${m.fdr_id}`}>Inspect <ExternalLink size={10} /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No issues state */}
          {financialStatus &&
            financialStatus.financial_discrepancies.total_open === 0 &&
            financialStatus.upcoming_maturities.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-green-200 bg-green-50">
              <CheckCircle2 size={40} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm font-bold text-green-900">All Clear</p>
              <p className="text-xs text-green-700 mt-1">No outstanding observations or discrepancies detected.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: REFUND REQUESTS (Part 3)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "refund_requests" && (
        <div className="space-y-5">
          {/* Refund Result Banner */}
          {refundResult && (
            <Alert variant={refundResult.success ? "success" : "error"}>
              <div className="flex items-start justify-between w-full">
                <div>
                  <p className="text-xs font-bold">{refundResult.success ? "Refund Request Submitted Successfully" : "Submission Failed"}</p>
                  <p className="text-xs mt-0.5">{refundResult.message}</p>
                  {refundResult.requestId && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Reference: {refundResult.requestId}</p>
                  )}
                </div>
                <button onClick={() => setRefundResult(null)}><X size={14} className="text-slate-400" /></button>
              </div>
            </Alert>
          )}

          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Deposit Refund & Release Claims</h3>
              <p className="text-xs text-slate-500">Track and manage all refund requests for your institution's fixed deposits.</p>
            </div>
            <Button size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => setShowRefundForm(!showRefundForm)}>
              {showRefundForm ? <><X size={13} /><span>Cancel</span></> : <><Coins size={13} /><span>New Refund Application</span></>}
            </Button>
          </div>

          {/* ─── Refund Application Form ──────────────────────────────────── */}
          {showRefundForm && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <Coins size={15} className="text-emerald-600" />
                  New Deposit Refund / Release Application
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Under AICTE APH Clause 11.2. Institution cannot approve its own refund request.
                  All decisions are made by the Approving Authority.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* FDR Selection */}
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Select FDR <span className="text-orange-500">*</span>
                    </label>
                    <select
                      value={refundFdrId}
                      onChange={(e) => setRefundFdrId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white text-sm text-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="">— Select an eligible FDR —</option>
                      {eligibleFdrs.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.fdrNumber} — {f.bankName} — {formatCurrency(f.principalAmount)}
                        </option>
                      ))}
                    </select>
                    {refundFdrId && (
                      <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                        {(() => {
                          const f = eligibleFdrs.find((x) => x.id === refundFdrId);
                          if (!f) return null;
                          return (
                            <>
                              <p><span className="text-slate-500">Bank:</span> <span className="font-medium">{f.bankName}</span></p>
                              <p><span className="text-slate-500">Principal:</span> <span className="font-bold">{formatCurrency(f.principalAmount)}</span></p>
                              <p><span className="text-slate-500">Maturity:</span> <span className="font-medium">{formatDate(f.maturityDate)}</span></p>
                              <p><span className="text-slate-500">Status:</span> <FDRStatusBadge status={f.status} /></p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <Select
                    label="Request Type"
                    value={refundType}
                    onChange={(e) => setRefundType(e.target.value as typeof refundType)}
                    options={[
                      { value: "FULL_RELEASE", label: "Full Release of Security Deposit" },
                      { value: "PARTIAL_REFUND", label: "Partial Pro-Rata Refund" },
                      { value: "NOC_ISSUANCE", label: "No-Objection Certificate (NOC) Issuance" },
                    ]}
                    required
                  />

                  <Input
                    label="Regulatory Clause Reference"
                    value={refundClause}
                    onChange={(e) => setRefundClause(e.target.value)}
                    placeholder="e.g. AICTE APH 2026-27 Clause 11.2"
                    required
                  />

                  <Input
                    label="Applicant Name"
                    value={refundApplicantName}
                    onChange={(e) => setRefundApplicantName(e.target.value)}
                    placeholder="Full name of authorized signatory"
                    required
                  />

                  <Input
                    label="Applicant Designation"
                    value={refundApplicantDesignation}
                    onChange={(e) => setRefundApplicantDesignation(e.target.value)}
                    placeholder="e.g. Principal / Director / Registrar"
                    required
                  />

                  <div className="sm:col-span-2">
                    <Textarea
                      label="Justification / Reason for Refund"
                      value={refundJustification}
                      onChange={(e) => setRefundJustification(e.target.value)}
                      rows={3}
                      placeholder="Provide statutory justification for the refund request (minimum 20 characters)..."
                      required
                    />
                  </div>

                  {/* Supporting Documents */}
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Supporting Documents</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={refundDocInput}
                        onChange={(e) => setRefundDocInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && refundDocInput.trim()) {
                            setRefundDocNames((prev) => [...prev, refundDocInput.trim()]);
                            setRefundDocInput("");
                          }
                        }}
                        className="flex-1 rounded-md border border-slate-300 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Enter document name, press Enter to add..."
                      />
                      <Button size="sm" variant="outline"
                        onClick={() => { if (refundDocInput.trim()) { setRefundDocNames((p) => [...p, refundDocInput.trim()]); setRefundDocInput(""); } }}>
                        Add
                      </Button>
                    </div>
                    {refundDocNames.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {refundDocNames.map((d, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">
                            {d}
                            <button onClick={() => setRefundDocNames((p) => p.filter((_, j) => j !== i))}><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {refundValidationError && (
                  <Alert variant="error" className="mt-3">
                    <p className="text-xs">{refundValidationError}</p>
                  </Alert>
                )}

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                  <strong>Important:</strong> Submitting this application does not guarantee refund approval.
                  The AICTE Approving Authority will review supporting evidence and issue a decision per statutory requirements.
                  You will be notified of any queries or decisions.
                </div>

                <div className="mt-4 flex justify-end">
                  <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500" onClick={handleRefundSubmit} disabled={refundLoading}>
                    {refundLoading ? <><RefreshCw size={13} className="animate-spin" /><span>Submitting...</span></> : <><Send size={13} /><span>Submit Refund Application</span></>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Existing Refund Requests Table ──────────────────────────── */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-800">Your Refund Applications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(financialStatus?.refund_requests.requests.length ?? 0) === 0 ? (
                <div className="p-8 text-center">
                  <Coins size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-500">No refund applications submitted yet.</p>
                  <Button size="sm" variant="primary" className="mt-3 bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => setShowRefundForm(true)}>
                    Submit First Application
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {financialStatus!.refund_requests.requests.map((req) => (
                    <div key={req.id} className={`p-4 ${req.has_pending_query ? "bg-amber-50/50" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono font-bold text-xs text-slate-900">{req.fdr_number}</span>
                            <StatusChip label={refundStatusLabel(req.status)} variant={refundStatusVariant(req.status)} />
                            <StatusChip
                              label={req.request_type === "FULL_RELEASE" ? "Full Release" : req.request_type === "PARTIAL_REFUND" ? "Partial Refund" : "NOC"}
                              variant="slate"
                            />
                          </div>
                          <p className="text-xs text-slate-600">{req.bank_name} — {formatCurrency(req.amount)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Submitted: {formatDate(req.submitted_at)}</p>
                          {req.reason && (
                            <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2">"{req.reason}"</p>
                          )}
                          {req.latest_decision && (
                            <div className="mt-2 p-2 bg-white border border-slate-200 rounded-lg text-xs">
                              <p className="font-semibold text-slate-700">
                                Decision: <span className={req.latest_decision === "APPROVED" ? "text-green-700" : req.latest_decision === "REJECTED" ? "text-red-700" : "text-amber-700"}>
                                  {req.latest_decision.replace(/_/g, " ")}
                                </span>
                              </p>
                              {req.latest_decision_notes && (
                                <p className="text-slate-600 mt-0.5">{req.latest_decision_notes}</p>
                              )}
                              {req.latest_decision_at && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(req.latest_decision_at)}</p>
                              )}
                            </div>
                          )}
                          {req.noc_voucher_ref && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-[11px]">
                              <p className="font-semibold text-green-800">Bank Discharge NOC Issued</p>
                              <p className="font-mono text-green-700 mt-0.5">{req.noc_voucher_ref}</p>
                            </div>
                          )}
                          {req.has_pending_query && (
                            <Alert variant="warning" className="mt-2 py-2">
                              <p className="text-xs font-semibold">Query raised — additional information requested.</p>
                              <Button size="xs" variant="outline" className="mt-1 text-[10px]"
                                onClick={() => setQueryResponseModal({ id: req.id, fdr_number: req.fdr_number })}>
                                Respond to Query
                              </Button>
                            </Alert>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-slate-800">{formatCurrency(req.amount)}</p>
                          <Button size="xs" variant="ghost" asChild className="mt-1">
                            <Link to="/release-requests">View Full Details <ExternalLink size={10} /></Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOGS
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Observation Response Dialog (original) */}
      {activeObservation && (
        <Dialog
          open={!!activeObservation}
          onClose={() => setActiveObservation(null)}
          size="md"
          title="Respond to Scrutiny Observation"
          description={`FDR Reference: #${stats.records.find((r) => r.id === activeObservation.fdrId)?.fdrNumber}`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveObservation(null)}>Close</Button>
              {!resolvedSuccess && (
                <Button variant="primary" size="sm" onClick={handleResolveObservation} disabled={!responseNotes.trim()}>
                  Submit Institutional Response
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs space-y-1">
              <p className="font-bold">Scrutiny Officer Observation:</p>
              <p className="text-[11px] leading-relaxed text-amber-900">{activeObservation.observation}</p>
              <p className="text-[10px] text-amber-700 font-mono mt-1">Issued by: {activeObservation.officerName}</p>
            </div>
            {resolvedSuccess ? (
              <Alert variant="success">
                Response recorded successfully. Scrutiny officer has been notified to re-evaluate document lien.
              </Alert>
            ) : (
              <div className="space-y-3">
                <Textarea
                  label="Institutional Clarification & Response Notes"
                  placeholder="Enter branch manager confirmation details, revised token number, or clarification notes..."
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={4}
                  required
                />
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px]">
                  Attach signed letter from issuing branch manager confirming AICTE lien in favor of Member Secretary.
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}


      {/* Query Response Dialog */}
      {queryResponseModal && (
        <Dialog
          open={!!queryResponseModal}
          onClose={() => { setQueryResponseModal(null); setQueryResponseNotes(""); setQueryResponseSuccess(false); }}
          size="md"
          title="Respond to AICTE Query"
          description={`Refund Request — FDR: ${queryResponseModal.fdr_number}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setQueryResponseModal(null)}>Cancel</Button>
              {!queryResponseSuccess && (
                <Button variant="primary" size="sm" onClick={handleQueryResponse}
                  disabled={!queryResponseNotes.trim() || queryResponseLoading}>
                  {queryResponseLoading ? <><RefreshCw size={12} className="animate-spin" /><span>Submitting...</span></> : "Submit Response"}
                </Button>
              )}
            </div>
          }
        >
          <div className="py-2 space-y-3">
            {queryResponseSuccess ? (
              <Alert variant="success">Response submitted. The AICTE reviewing officer has been notified.</Alert>
            ) : (
              <>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <p className="font-bold mb-1">Additional information requested by AICTE</p>
                  <p>Please provide the requested information or corrected documentation below.</p>
                </div>
                <Textarea
                  label="Your Response / Additional Information"
                  value={queryResponseNotes}
                  onChange={(e) => setQueryResponseNotes(e.target.value)}
                  rows={4}
                  placeholder="Provide clarification, correction, or reference to supporting documents..."
                  required
                />
              </>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
