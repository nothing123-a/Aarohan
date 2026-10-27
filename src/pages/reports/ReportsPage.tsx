import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Building,
  FileSpreadsheet,
  PieChart,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  StatCard,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { reportsService } from "@/services/reportsService";
import { formatCurrency } from "@/utils";

export default function ReportsPage() {
  const { user } = useAuth();
  const isInstitution = user?.role === "institution_representative" || user?.role === "depositor";
  const userInstId = user?.institutionId || (isInstitution ? "inst-001" : undefined);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Fetch live reporting summary from database
  const { data: summaryRes, isLoading, refetch } = useQuery({
    queryKey: ["reports-summary", startDate, endDate, userInstId],
    queryFn: async () => {
      const res = await reportsService.getSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        institutionId: userInstId,
      });
      return res.data.data;
    },
  });

  const summary = summaryRes;

  const handleExportCsv = async (statusFilter?: string) => {
    setIsExporting(true);
    setExportNotice(null);
    try {
      await reportsService.exportCsv({
        institutionId: userInstId,
        statusFilter,
      });
      setExportNotice("Audit CSV export generated and downloaded successfully.");
      setTimeout(() => setExportNotice(null), 5000);
    } catch (e: unknown) {
      console.error("Export error:", e);
      setExportNotice("Failed to generate export file. Please verify permissions.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Reports & Financial Analytics"
        description="Comprehensive liability reports, bank risk exposure distributions, and statutory audit registers."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports & Analytics" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExportCsv("all")}
              isLoading={isExporting}
            >
              <Download size={14} />
              Export Master Register (CSV)
            </Button>
          </div>
        }
      />

      {exportNotice && (
        <Alert variant="success">
          <CheckCircle2 size={16} className="inline mr-1.5" />
          {exportNotice}
        </Alert>
      )}

      {/* ─── DATE-RANGE FILTERS CARD ──────────────────────────────────── */}
      <Card>
        <div className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Calendar size={14} className="text-orange-600" />
              <span>Issuance Date Window:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              placeholder="From Date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              placeholder="To Date"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(""); setEndDate(""); }}
              >
                Clear Filter
              </Button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Report Generated: {summary?.generated_at ? new Date(summary.generated_at).toLocaleString() : "Live"}
          </div>
        </div>
      </Card>

      {/* ─── HIGH LEVEL METRIC TOTALS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recorded Deposits"
          value={formatCurrency(summary?.totals.total_principal || 0)}
          subtitle={`${summary?.total_instruments_count || 0} Registered instruments`}
          icon={<Building className="text-orange-600" />}
        />
        <StatCard
          title="Active Custody Value"
          value={formatCurrency(summary?.totals.active_principal || 0)}
          subtitle={`${summary?.status_distribution.active || 0} Active compliance instruments`}
          icon={<ShieldCheck className="text-emerald-600" />}
        />
        <StatCard
          title="Maturing Within 30 Days"
          value={summary?.maturity_summary.within_30_days || 0}
          subtitle="Approaching statutory rollover"
          icon={<Clock className="text-amber-600" />}
        />
        <StatCard
          title="Pending Scrutiny Queue"
          value={summary?.status_distribution.under_scrutiny || 0}
          subtitle="Awaiting officer cross-verification"
          icon={<BarChart3 className="text-blue-600" />}
        />
      </div>

      {/* ─── 2-COLUMN ANALYTICS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Risk Exposure Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bank Risk Exposure Breakdown</CardTitle>
                <CardDescription>
                  Concentration of security deposits across Scheduled Commercial Banks
                </CardDescription>
              </div>
              <PieChart size={20} className="text-orange-600" />
            </div>
          </CardHeader>
          <div className="p-4 pt-0 space-y-4">
            {summary?.bank_exposures && summary.bank_exposures.length > 0 ? (
              summary.bank_exposures.map((b) => (
                <div key={b.bank} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{b.bank}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{b.count} FDRs</span>
                      <span className="font-mono font-bold text-slate-800">{b.value}</span>
                      <span className="font-mono text-orange-600 font-bold w-10 text-right">
                        {b.share}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(b.share, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No bank exposure records found.</p>
            )}
          </div>
        </Card>

        {/* Status Distribution Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Instrument Lifecycle Distribution</CardTitle>
                <CardDescription>
                  Current inventory categorized by operational state in central database
                </CardDescription>
              </div>
              <BarChart3 size={20} className="text-blue-600" />
            </div>
          </CardHeader>
          <div className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-700 font-medium block">Active Joint Custody</span>
                <span className="text-xl font-bold text-emerald-950 mt-1 block">
                  {summary?.status_distribution.active || 0}
                </span>
                <span className="text-[11px] text-emerald-600">Compliant CBS liens</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-700 font-medium block">Under Scrutiny / Review</span>
                <span className="text-xl font-bold text-amber-950 mt-1 block">
                  {summary?.status_distribution.under_scrutiny || 0}
                </span>
                <span className="text-[11px] text-amber-600">Pending verification</span>
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <span className="text-red-700 font-medium block">Past Maturity Date</span>
                <span className="text-xl font-bold text-red-950 mt-1 block">
                  {summary?.maturity_summary.past_maturity || 0}
                </span>
                <span className="text-[11px] text-red-600">Awaiting rollover action</span>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-purple-700 font-medium block">Renewal / Replacement</span>
                <span className="text-xl font-bold text-purple-950 mt-1 block">
                  {summary?.status_distribution.renewal_pending || 0}
                </span>
                <span className="text-[11px] text-purple-600">Rollovers in progress</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-700 block mb-2">Upcoming Expiry Windows</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">≤ 7 Days</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{summary?.maturity_summary.within_7_days || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">≤ 30 Days</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{summary?.maturity_summary.within_30_days || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">≤ 60 Days</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{summary?.maturity_summary.within_60_days || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── INSTITUTION DEPOSIT COMPLIANCE TABLE ─────────────────────── */}
      {!isInstitution && (
        <Card>
          <CardHeader>
            <CardTitle>Institution-Wise Security Deposit Quotas</CardTitle>
            <CardDescription>
              Aggregate statutory deposit maintenance status compared against required regulatory threshold
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">Institution Name</th>
                  <th className="p-3">AICTE Code</th>
                  <th className="p-3">State</th>
                  <th className="p-3 font-mono">Active Deposit</th>
                  <th className="p-3 font-mono">Required Quota</th>
                  <th className="p-3">FDRs</th>
                  <th className="p-3 text-right">Quota Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summary?.institution_summaries?.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-900">{inst.name}</td>
                    <td className="p-3 font-mono text-slate-600">{inst.code}</td>
                    <td className="p-3 text-slate-600">{inst.state}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {formatCurrency(inst.active_deposit)}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {formatCurrency(inst.required_deposit)}
                    </td>
                    <td className="p-3 font-mono text-slate-700">{inst.instruments_count}</td>
                    <td className="p-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          inst.compliance_percentage >= 100
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {inst.compliance_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── STANDARD REGULATORY REGISTERS & DOWNLOADS ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Exportable Regulatory Registers</CardTitle>
          <CardDescription>
            Audit registers compliant with AICTE Approval Process Handbook (APH) specifications
          </CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-0">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">Master Security Deposit Register (CSV)</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Full inventory of active, matured, and replaced FDR records with bank branch lien codes and account particulars.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("all")}
              isLoading={isExporting}
            >
              <Download size={13} />
              Export Master Register
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <h4 className="text-xs font-bold text-slate-900">Maturity &amp; Rollover Register (CSV)</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Filtered audit certificate containing expiring instruments, renewal states, and discharge request details.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("renewal_pending")}
              isLoading={isExporting}
            >
              <Download size={13} />
              Export Expiry Register
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
