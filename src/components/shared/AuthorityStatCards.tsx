import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Coins, Users, FileCheck2, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { formatCurrency } from "@/utils";
import { CENTRAL_FDR_RECORDS, getApprovalCases } from "@/data/centralDataset";
import { INITIAL_SCRUTINY_OFFICERS } from "@/pages/authority/OfficerSupervisionPage";

interface AuthorityStatCardsProps {
  activeSection?: "treasury" | "officers" | "approvals" | "refunds";
}

export function AuthorityStatCards({ activeSection }: AuthorityStatCardsProps) {
  const fdrRecords = CENTRAL_FDR_RECORDS;
  const officers = INITIAL_SCRUTINY_OFFICERS;
  const refundCases = useMemo(() => getApprovalCases(), []);

  const totalFundsPledged = useMemo(
    () => fdrRecords.reduce((acc, r) => acc + (r.principalAmount || 0), 0),
    [fdrRecords]
  );

  const pendingFDRs = useMemo(
    () =>
      fdrRecords.filter(
        (r) => r.scrutinyStatus === "SCRUTINY_PASSED" || r.verificationStatus === "PENDING_REVIEW"
      ),
    [fdrRecords]
  );

  const pendingRefunds = useMemo(
    () => refundCases.filter((c) => c.status === "PENDING_APPROVAL"),
    [refundCases]
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Total Funds Monitored */}
      <Link to="/treasury" className="block focus:outline-hidden group">
        <StatCard
          title="Total Funds Monitored"
          value={formatCurrency(totalFundsPledged)}
          icon={<Coins size={18} />}
          iconColor="purple"
          subtitle="Open Treasury Page →"
          className={`hover:border-purple-300 transition-all hover:shadow-xs group-hover:-translate-y-0.5 cursor-pointer ${
            activeSection === "treasury"
              ? "ring-2 ring-purple-600/50 bg-purple-50/20 shadow-xs border-purple-300"
              : ""
          }`}
        />
      </Link>

      {/* 2. Supervised Scrutiny Officers */}
      <Link to="/officers" className="block focus:outline-hidden group">
        <StatCard
          title="Supervised Scrutiny Officers"
          value={officers.length}
          icon={<Users size={18} />}
          iconColor="blue"
          subtitle="Manage Scrutiny Team →"
          className={`hover:border-blue-300 transition-all hover:shadow-xs group-hover:-translate-y-0.5 cursor-pointer ${
            activeSection === "officers"
              ? "ring-2 ring-blue-600/50 bg-blue-50/20 shadow-xs border-blue-300"
              : ""
          }`}
        />
      </Link>

      {/* 3. Pending Final Approval */}
      <Link to="/approvals" className="block focus:outline-hidden group">
        <StatCard
          title="Pending Final Approval"
          value={pendingFDRs.length}
          icon={<FileCheck2 size={18} />}
          iconColor="green"
          subtitle="Open Approvals Desk →"
          className={`hover:border-emerald-300 transition-all hover:shadow-xs group-hover:-translate-y-0.5 cursor-pointer ${
            activeSection === "approvals"
              ? "ring-2 ring-emerald-600/50 bg-emerald-50/20 shadow-xs border-emerald-300"
              : ""
          }`}
        />
      </Link>

      {/* 4. Pending Refund Claims */}
      <Link to="/refund-sanctions" className="block focus:outline-hidden group">
        <StatCard
          title="Pending Refund Claims"
          value={pendingRefunds.length}
          icon={<Wallet size={18} />}
          iconColor="red"
          subtitle="Review Refund Claims →"
          className={`hover:border-rose-300 transition-all hover:shadow-xs group-hover:-translate-y-0.5 cursor-pointer ${
            activeSection === "refunds"
              ? "ring-2 ring-rose-600/50 bg-rose-50/20 shadow-xs border-rose-300"
              : ""
          }`}
        />
      </Link>
    </div>
  );
}

