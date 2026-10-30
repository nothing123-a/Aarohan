import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Coins,
  Building2,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, daysUntil } from "@/utils";
import { CENTRAL_FDR_RECORDS, getApprovalCases } from "@/data/centralDataset";
import { INITIAL_SCRUTINY_OFFICERS } from "@/pages/authority/OfficerSupervisionPage";
import { useAuth } from "@/context/AuthContext";
import { AuthorityStatCards } from "@/components/shared/AuthorityStatCards";

export default function TreasuryPage() {
  const { user } = useAuth();
  const fdrRecords = CENTRAL_FDR_RECORDS;
  const officers = INITIAL_SCRUTINY_OFFICERS;
  const refundCases = useMemo(() => getApprovalCases(), []);
  const pendingRefunds = useMemo(
    () => refundCases.filter((c) => c.status === "PENDING_APPROVAL"),
    [refundCases]
  );
  const pendingFDRs = useMemo(
    () =>
      fdrRecords.filter(
        (r) => r.scrutinyStatus === "SCRUTINY_PASSED" || r.verificationStatus === "PENDING_REVIEW"
      ),
    [fdrRecords]
  );

  const totalFundsPledged = useMemo(
    () => fdrRecords.reduce((acc, r) => acc + (r.principalAmount || 0), 0),
    [fdrRecords]
  );

  const activePledgedFunds = useMemo(
    () =>
      fdrRecords
        .filter((r) => r.lifecycleStatus === "ACTIVE_LIEN")
        .reduce((acc, r) => acc + (r.principalAmount || 0), 0),
    [fdrRecords]
  );

  const maturingFunds30Days = useMemo(() => {
    return fdrRecords
      .filter((r) => {
        const days = daysUntil(r.maturityDate);
        return days <= 30 && days > 0;
      })
      .reduce((acc, r) => acc + (r.principalAmount || 0), 0);
  }, [fdrRecords]);

  // Bank allocation breakdown
  const bankAllocations = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    fdrRecords.forEach((r) => {
      const current = map.get(r.bankName) || { count: 0, total: 0 };
      map.set(r.bankName, { count: current.count + 1, total: current.total + (r.principalAmount || 0) });
    });
    return Array.from(map.entries())
      .map(([bank, data]) => ({
        bank,
        count: data.count,
        total: data.total,
        percentage: totalFundsPledged > 0 ? (data.total / totalFundsPledged) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [fdrRecords, totalFundsPledged]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── EXECUTIVE REGULATORY AUTHORITY DESK HERO BANNER (FROM IMAGE) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-md">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-200 border border-purple-400/30">
              <ShieldCheck size={12} className="text-purple-300" />
              AICTE REGULATION BUREAU · CENTRAL DECISION AUTHORITY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-plus-jakarta tracking-tight">
            Executive Regulatory Authority Desk
          </h1>
          <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-2xl leading-relaxed">
            Welcome, <span className="font-semibold text-white">{user?.name || "Dr. Abhay Jere"}</span> ({user?.designation || "Member Secretary / Financial Approving Authority"}). Consolidated executive oversight across nationwide security deposits, scrutiny officers, final FDR sanctions, and refund claims.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">
              Supervising: {officers.length} Scrutiny Officers
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">
              Pending Final Sanctions: {pendingFDRs.length} FDRs
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">
              Pending Refund Claims: {pendingRefunds.length} ({formatCurrency(pendingRefunds.reduce((a, c) => a + (c.principalAmount || 0), 0))})
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4 CORE STAT CARDS ─────────────────────────────────────────── */}
      <AuthorityStatCards activeSection="treasury" />

      {/* ─── TREASURY BREAKDOWN PILLARS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-600 p-4">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Lien Custody</span>
          <p className="text-2xl font-extrabold text-slate-900 font-plus-jakarta mt-1">
            {formatCurrency(activePledgedFunds)}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Secured irrevocably under AICTE Regulation Bureau lien
          </p>
        </Card>

        <Card className="border-l-4 border-l-amber-500 p-4">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Maturity Horizon (&lt;30 Days)</span>
          <p className="text-2xl font-extrabold text-slate-900 font-plus-jakarta mt-1">
            {formatCurrency(maturingFunds30Days)}
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Approaching rollover deadline — automated reminder issued
          </p>
        </Card>

        <Card className="border-l-4 border-l-purple-600 p-4">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Pledged Instruments</span>
          <p className="text-2xl font-extrabold text-slate-900 font-plus-jakarta mt-1">
            {fdrRecords.length} Deposits
          </p>
          <p className="text-[11px] text-purple-700 font-medium mt-1">
            Across {bankAllocations.length} Scheduled Commercial Depository Banks
          </p>
        </Card>
      </div>

      {/* ─── BANK-WISE PORTFOLIO ALLOCATION ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 size={16} className="text-purple-600" />
              Bank-Wise Security Deposit Distribution (Scheduled Commercial Banks)
            </span>
            <span className="text-xs font-normal text-slate-500">RBI Schedule II Compliant Depository</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bankAllocations.map((ba) => (
              <div key={ba.bank} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <Building2 size={13} className="text-slate-500" />
                    {ba.bank}
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">{formatCurrency(ba.total)}</span>
                    <span className="text-slate-400 ml-2">
                      ({ba.percentage.toFixed(1)}% · {ba.count} deposits)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${ba.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── MASTER DEPOSIT REGISTRY ─────────────────────────────────────── */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Coins size={16} className="text-purple-600" />
              Master Deposit Portfolio Registry ({fdrRecords.length} Nationwide Instruments)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs font-semibold whitespace-nowrap border-slate-200 hover:border-purple-300 hover:text-purple-700"
            >
              <Link to="/fdr">
                Full Register <ArrowUpRight size={13} className="ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">FDR Number</th>
                  <th className="px-4 py-3.5">Institution Name</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Issuing Bank & Branch</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Principal Amount</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Maturity Date</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">Lien Status</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fdrRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap text-xs">
                      <Link to={`/fdr/${r.id}`} className="hover:text-purple-600 transition-colors">
                        {r.fdrNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 text-xs">{r.institutionName}</td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap text-xs">
                      <span className="font-medium text-slate-900">{r.bankName}</span>
                      <span className="text-slate-500 ml-1">({r.bankBranch || "Main Branch"})</span>
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900 whitespace-nowrap text-xs">
                      {formatCurrency(r.principalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap text-xs">{formatDate(r.maturityDate)}</td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check size={11} className="text-emerald-600" /> AICTE Joint Lien
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Badge
                        variant={
                          r.verificationStatus === "VERIFIED"
                            ? "success"
                            : r.verificationStatus === "DISCREPANCY_FLAGGED"
                            ? "error"
                            : "info"
                        }
                        className="whitespace-nowrap text-[11px]"
                      >
                        {r.verificationStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
