import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Zap,
  Send,
  ArrowRight,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FDRStatusBadge } from "@/components/shared/FDRStatusBadge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDate } from "@/utils";
import { getScrutinyQueue, CentralFDRRecord } from "@/data/centralDataset";
import type { User } from "@/types";

interface ScrutinyOfficerDashboardProps {
  user: User;
}

export function ScrutinyOfficerDashboard({ user }: ScrutinyOfficerDashboardProps) {
  const [queue, setQueue] = useState<CentralFDRRecord[]>(getScrutinyQueue());
  const [selectedCase, setSelectedCase] = useState<CentralFDRRecord | null>(null);
  const [observationText, setObservationText] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Bank SFMS Simulation Modal State
  const [sfmsModalOpen, setSfmsModalOpen] = useState(false);
  const [sfmsQuerying, setSfmsQuerying] = useState(false);
  const [sfmsResult, setSfmsResult] = useState<any | null>(null);
  const [activeSfmsCase, setActiveSfmsCase] = useState<CentralFDRRecord | null>(null);

  // Tab filter
  const [filterTab, setFilterTab] = useState<"ALL" | "DISCREPANCY" | "PENDING">("ALL");

  const hasDiscrepancy = (item: CentralFDRRecord) =>
    item.scrutinyStatus === "DISCREPANCY_FLAGGED" || (item.discrepancies && item.discrepancies.length > 0);

  const filteredQueue = queue.filter((item) => {
    if (filterTab === "DISCREPANCY") return hasDiscrepancy(item);
    if (filterTab === "PENDING") return item.scrutinyStatus === "PENDING_SCRUTINY";
    return true;
  });

  const handleIssueObservation = () => {
    if (!selectedCase) return;
    setQueue((prev) =>
      prev.map((c) =>
        c.id === selectedCase.id
          ? { ...c, scrutinyStatus: "OBSERVATION_ISSUED", observationsCount: c.observationsCount + 1 }
          : c
      )
    );
    setActionSuccess(`Observation dispatched to ${selectedCase.institutionName}. Institution will be notified via portal alert.`);
    setTimeout(() => {
      setSelectedCase(null);
      setActionSuccess(null);
      setObservationText("");
    }, 1500);
  };

  const handlePassScrutiny = (item: CentralFDRRecord) => {
    setQueue((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, scrutinyStatus: "SCRUTINY_PASSED", status: "verified" } : c
      )
    );
    setActionSuccess(`Instrument #${item.fdrNumber} marked as VERIFIED and endorsed to Approval Cell.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleSimulateSfmsQuery = (item: CentralFDRRecord) => {
    setActiveSfmsCase(item);
    setSfmsModalOpen(true);
    setSfmsQuerying(true);
    setSfmsResult(null);

    setTimeout(() => {
      setSfmsQuerying(false);
      setSfmsResult({
        bankName: item.bankName,
        accountNumber: item.accountNumber || "38291048291",
        fdrReference: item.fdrNumber,
        principalAmount: item.principalAmount,
        lienStatus: "CONFIRMED_JOINT_LIEN",
        beneficiary: "Member Secretary, AICTE New Delhi",
        gatewayRef: `SFMS/AICTE/2026/TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
        responseCode: "CBS_MATCH_200",
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Scrutiny Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
          <FileCheck2 size={160} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold mb-3">
            <span>AICTE Technical Scrutiny Desk · Regulation Bureau</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-plus-jakarta tracking-tight">
            Document Verification & OCR Scrutiny Desk
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
            Welcome, <span className="font-semibold text-white">{user.name}</span> ({user.designation}). Scrutinize institution-pledged Fixed Deposit Receipts, verify Core Banking System lien integrity, examine OCR extractions, and flag discrepancies.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Assigned Queue: {queue.length} Active Dossiers
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Discrepancies Flagged: {queue.filter(hasDiscrepancy).length} Cases
            </span>
          </div>
        </div>
      </div>

      {actionSuccess && <Alert variant="success">{actionSuccess}</Alert>}

      {/* Scrutiny Desk Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Pending Initial Scrutiny"
          value={queue.filter((c) => c.scrutinyStatus === "PENDING_SCRUTINY").length}
          icon={<Clock size={18} />}
          iconColor="blue"
          subtitle="Awaiting officer review"
        />
        <StatCard
          title="OCR Discrepancies"
          value={queue.filter(hasDiscrepancy).length}
          icon={<AlertTriangle size={18} />}
          iconColor="red"
          subtitle="Candidate mismatches"
        />
        <StatCard
          title="Active Observations"
          value={queue.filter((c) => c.scrutinyStatus === "OBSERVATION_ISSUED").length}
          icon={<TrendingUp size={18} />}
          iconColor="purple"
          subtitle="Sent to institution"
        />
        <StatCard
          title="Verified & Endorsed"
          value={queue.filter((c) => c.scrutinyStatus === "SCRUTINY_PASSED").length}
          icon={<CheckCircle2 size={18} />}
          iconColor="green"
          subtitle="Ready for approval"
        />
      </div>

      {/* Primary Scrutiny Queue Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 font-plus-jakarta flex items-center gap-2">
              <FileCheck2 size={16} className="text-blue-600" />
              <span>Assigned Security Deposit Verification Dossiers</span>
            </CardTitle>
            <p className="text-xs text-slate-400">
              Examine submitted bank documents against AICTE regulatory lien mandates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                onClick={() => setFilterTab("ALL")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterTab === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({queue.length})
              </button>
              <button
                onClick={() => setFilterTab("DISCREPANCY")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterTab === "DISCREPANCY" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Discrepancies ({queue.filter(hasDiscrepancy).length})
              </button>
              <button
                onClick={() => setFilterTab("PENDING")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterTab === "PENDING" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pending ({queue.filter((q) => q.scrutinyStatus === "PENDING_SCRUTINY").length})
              </button>
            </div>
            <Button size="xs" variant="primary" asChild>
              <Link to="/verification">
                Full OCR Workbench <ArrowRight size={12} />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Instrument & Bank</th>
                <th className="py-3 px-4">Pledging Institution</th>
                <th className="py-3 px-4">Principal Amount</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">OCR Status</th>
                <th className="py-3 px-4">Scrutiny State</th>
                <th className="py-3 px-4 text-right">Officer Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQueue.map((item) => {
                const isDiscrepant = hasDiscrepancy(item);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/fdr/${item.id}`} className="font-mono font-bold text-blue-700 hover:underline">
                        {item.fdrNumber}
                      </Link>
                      <p className="text-[11px] text-slate-500">{item.bankName}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate" title={item.institutionName}>
                      {item.institutionName}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatCurrency(item.principalAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {formatDate(item.maturityDate)}
                    </td>
                    <td className="py-3 px-4">
                      {isDiscrepant ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Discrepancy Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Clean Extraction
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <FDRStatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        size="xs"
                        variant="outline"
                        title="Simulate Bank SFMS 2.0 API lien verification query"
                        onClick={() => handleSimulateSfmsQuery(item)}
                      >
                        <Zap size={11} className="text-amber-500" /> Bank API
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedCase(item)}
                      >
                        Issue Query
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handlePassScrutiny(item)}
                        disabled={item.scrutinyStatus === "SCRUTINY_PASSED"}
                      >
                        {item.scrutinyStatus === "SCRUTINY_PASSED" ? "Verified" : "Endorse"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Observation Modal */}
      <Dialog
        open={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title={`Raise Regulatory Observation · ${selectedCase?.fdrNumber}`}
        description={`Record formal observation under AICTE Approval Process Handbook (APH). An official query notice will be transmitted to ${selectedCase?.institutionName}.`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCase(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleIssueObservation} disabled={!observationText}>
              <Send size={13} /> Dispatch Regulatory Observation
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-700" />
              Identified Discrepancies on this Record:
            </p>
            <p className="text-[11px] text-amber-800">
              {selectedCase && hasDiscrepancy(selectedCase)
                ? "OCR scan detected branch IFSC stamp or principal denomination discrepancy against submitted form."
                : "Routine scrutiny query regarding missing branch manager joint lien confirmation."}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Formal Officer Clarification / Directive (Mandatory)
            </label>
            <Textarea
              rows={4}
              placeholder="Specify the defect or requested documentation (e.g. Please provide a clear scanned copy of the bank manager's lien endorsement letter on official branch letterhead)..."
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
            />
          </div>
        </div>
      </Dialog>

      {/* Bank SFMS 2.0 Core Banking Simulation Modal */}
      <Dialog
        open={sfmsModalOpen}
        onClose={() => setSfmsModalOpen(false)}
        title="SFMS 2.0 / Core Banking System (CBS) Gateway Inquiry"
        description="Simulated real-time lien validation protocol connecting directly to the issuing Public Sector Bank Core Banking Host."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSfmsModalOpen(false)}>
              Close Terminal
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          {sfmsQuerying ? (
            <div className="p-8 text-center space-y-3">
              <div className="inline-block animate-spin text-blue-600">
                <Zap size={32} />
              </div>
              <p className="font-semibold text-slate-800">
                Transmitting ISO 20022 Financial Inquiry to {activeSfmsCase?.bankName}...
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Querying Lien Master Register for FDR #{activeSfmsCase?.fdrNumber}
              </p>
            </div>
          ) : sfmsResult ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-700" />
                    Core Banking Host: LIEN CONFIRMED
                  </span>
                  <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    {sfmsResult.responseCode}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  The issuing bank branch confirms that this Fixed Deposit has been marked with an irrevocable joint lien in favor of the Member Secretary, AICTE.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl text-slate-200 font-mono text-[11px] space-y-1.5">
                <p className="text-orange-400 font-bold border-b border-slate-800 pb-1">
                  SFMS Response Payload (Audit Telemetry):
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <div>
                    <span className="text-slate-500 block">Bank Institution:</span>
                    <span className="font-bold text-white">{sfmsResult.bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Lien Holder:</span>
                    <span className="font-bold text-white">{sfmsResult.beneficiary}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Principal Amount:</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(sfmsResult.principalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Transaction Reference:</span>
                    <span className="font-bold text-slate-300">{sfmsResult.gatewayRef}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
