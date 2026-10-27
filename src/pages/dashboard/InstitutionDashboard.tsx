import { useState } from "react";
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
} from "lucide-react";
import { StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FDRStatusBadge } from "@/components/shared/FDRStatusBadge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/FormFields";
import { formatCurrency, formatDate, daysUntil } from "@/utils";
import { getInstitutionStats, CENTRAL_OBSERVATIONS } from "@/data/centralDataset";
import type { User } from "@/types";

interface InstitutionDashboardProps {
  user: User;
}

export function InstitutionDashboard({ user }: InstitutionDashboardProps) {
  const institutionId = user.institutionId || "inst-001";
  const stats = getInstitutionStats(institutionId);
  const observations = CENTRAL_OBSERVATIONS.filter((o) =>
    stats.records.some((r) => r.id === o.fdrId) && o.status === "OPEN"
  );

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
            Welcome, <span className="font-semibold text-white">{user.name}</span> ({user.designation}). Manage fixed deposit securities, track regulatory lien confirmation, and respond to scrutiny queries.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Institution Code: AICTE-NZ-00142
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Active Lien Balance: {formatCurrency(stats.totalPrincipalPledged)}
            </span>
          </div>
        </div>
      </div>

      {/* Observation Callout Banner */}
      {observations.length > 0 && (
        <Alert variant="warning" className="border-amber-300 bg-amber-50/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <p className="text-xs font-bold text-amber-900">
                Action Required: {observations.length} Scrutiny Observation Awaiting Your Response
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                AICTE Scrutiny Officer issued a query regarding branch confirmation for FDR #{stats.records.find((r) => r.id === observations[0].fdrId)?.fdrNumber}.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="self-start sm:self-auto text-xs"
              onClick={() => setActiveObservation(observations[0])}
            >
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
          { label: "Respond to Query", onClick: () => observations[0] && setActiveObservation(observations[0]), icon: <AlertCircle size={16} />, badge: observations.length },
          { label: "Submit Replacement", path: "/renewals", icon: <RefreshCw size={16} /> },
          { label: "Release / Refund Request", path: "/release-requests", icon: <FileCheck size={16} /> },
          { label: "Notifications & Alerts", path: "/notifications", icon: <Bell size={16} />, highlight: false },
        ].map((act, i) => (
          act.path ? (
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
          ) : (
            <button
              key={i}
              onClick={act.onClick}
              disabled={!act.badge}
              className="p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group bg-white border-slate-200 text-slate-800 hover:border-orange-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:text-orange-600 group-hover:bg-orange-50">
                  {act.icon}
                </span>
                {act.badge ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {act.badge}
                  </span>
                ) : null}
              </div>
              <p className="text-xs font-bold leading-snug">{act.label}</p>
            </button>
          )
        ))}
      </div>

      {/* Required Role Statistics Metrics */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Institutional Portfolio Totals (Derived from Records)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            title="Total Instruments"
            value={stats.totalInstruments}
            icon={<FileText size={18} />}
            iconColor="orange"
            subtitle="All institution deposits"
          />
          <StatCard
            title="Draft Submissions"
            value={stats.draftSubmissions}
            icon={<FilePlus2 size={18} />}
            iconColor="orange"
            subtitle="Not yet submitted"
          />
          <StatCard
            title="Awaiting Scrutiny"
            value={stats.awaitingScrutiny}
            icon={<Clock size={18} />}
            iconColor="blue"
            subtitle="In Bureau Queue"
          />
          <StatCard
            title="Observations Issued"
            value={stats.requiringInfo}
            icon={<AlertCircle size={18} />}
            iconColor={stats.requiringInfo > 0 ? "red" : "green"}
            subtitle="Requires institution response"
          />
          <StatCard
            title="Upcoming Maturities"
            value={stats.upcomingMaturities}
            icon={<Clock size={18} />}
            iconColor={stats.upcomingMaturities > 0 ? "amber" : "orange"}
            subtitle="Within 60 days"
          />
          <StatCard
            title="Renewal Requests"
            value={stats.renewalRequests}
            icon={<RefreshCw size={18} />}
            iconColor="blue"
            subtitle="Tenure rollovers"
          />
          <StatCard
            title="Release Requests"
            value={stats.releaseRequests}
            icon={<FileCheck size={18} />}
            iconColor="purple"
            subtitle="Pending approval"
          />
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

      {/* Observation Response Dialog */}
      {activeObservation && (
        <Dialog
          open={!!activeObservation}
          onClose={() => setActiveObservation(null)}
          size="md"
          title="Respond to Scrutiny Observation"
          description={`FDR Reference: #${stats.records.find((r) => r.id === activeObservation.fdrId)?.fdrNumber}`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveObservation(null)}>
                Close
              </Button>
              {!resolvedSuccess && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleResolveObservation}
                  disabled={!responseNotes.trim()}
                >
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
    </div>
  );
}
