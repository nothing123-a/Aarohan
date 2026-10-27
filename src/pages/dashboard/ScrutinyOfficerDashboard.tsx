import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck2,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle2,
  TrendingUp,
  Search,
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

  const handleIssueObservation = () => {
    if (!selectedCase) return;
    setQueue((prev) =>
      prev.map((c) =>
        c.id === selectedCase.id
          ? { ...c, scrutinyStatus: "OBSERVATION_ISSUED", observationsCount: c.observationsCount + 1 }
          : c
      )
    );
    setActionSuccess(`Observation successfully logged and dispatched to ${selectedCase.institutionName}.`);
    setTimeout(() => {
      setSelectedCase(null);
      setActionSuccess(null);
      setObservationText("");
    }, 1200);
  };

  const handlePassScrutiny = (item: CentralFDRRecord) => {
    setQueue((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, scrutinyStatus: "SCRUTINY_PASSED", status: "verified" } : c
      )
    );
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
            Scrutiny & Document Verification Queue
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
            Welcome, <span className="font-semibold text-white">{user.name}</span> ({user.designation}). Scrutinize institution-pledged Fixed Deposit Receipts, verify Core Banking System lien integrity, and flag discrepancies.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Assigned Queue: {queue.length} Active Cases
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              Department: AICTE Regulation Bureau (Technical Scrutiny Cell)
            </span>
          </div>
        </div>
      </div>

      {/* Scrutiny Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Cases Awaiting Review"
          value={queue.filter((c) => c.status === "submitted").length}
          icon={<Clock size={18} />}
          iconColor="orange"
          subtitle="Unprocessed submissions"
        />
        <StatCard
          title="Discrepancies / Observations"
          value={queue.filter((c) => c.scrutinyStatus === "OBSERVATION_ISSUED").length}
          icon={<AlertTriangle size={18} />}
          iconColor="red"
          subtitle="Institution response pending"
        />
        <StatCard
          title="Average OCR Confidence"
          value="95.2%"
          icon={<CheckCircle2 size={18} />}
          iconColor="green"
          subtitle="Direct digital extraction"
        />
        <StatCard
          title="Scrutiny Turnaround Rate"
          value="1.8 Days"
          icon={<TrendingUp size={18} />}
          iconColor="blue"
          subtitle="Within 3-day SLA target"
        />
      </div>

      {/* Focused Scrutiny Queue Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 font-plus-jakarta flex items-center gap-2">
              <span>Authorized Cases Awaiting Scrutiny</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                {queue.length} Cases
              </span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned and authorized fixed deposit records pending scrutiny validation.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/verification">
              <Search size={14} />
              <span>Side-by-Side OCR Scrutiny Mode</span>
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left">Submission Date</th>
                  <th className="py-3 px-4 text-left">Institution Name</th>
                  <th className="py-3 px-4 text-left">FDR Reference</th>
                  <th className="py-3 px-4 text-right">Principal Amount</th>
                  <th className="py-3 px-4 text-left">Maturity Date</th>
                  <th className="py-3 px-4 text-left">Assigned Reviewer</th>
                  <th className="py-3 px-4 text-center">Observations</th>
                  <th className="py-3 px-4 text-center">Review Status</th>
                  <th className="py-3 px-4 text-right">Scrutiny Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {queue.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <p className="font-bold text-slate-900">{item.institutionName}</p>
                      <p className="text-[10px] text-slate-400">{item.department}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {item.fdrNumber}
                      <p className="text-[10px] text-slate-400 font-sans font-normal">{item.bankName}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.principalAmount)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(item.maturityDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-700">
                        {item.assignedReviewer || user.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.observationsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                          <AlertTriangle size={10} />
                          {item.observationsCount} Open Query
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <FDRStatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedCase(item)}
                      >
                        Raise Observation
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handlePassScrutiny(item)}
                        disabled={item.status === "verified"}
                      >
                        {item.status === "verified" ? "Verified" : "Pass Scrutiny"}
                      </Button>
                      <Button size="xs" variant="ghost" asChild>
                        <Link to={`/fdr/${item.id}`}>
                          <Eye size={12} />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Observation Modal */}
      {selectedCase && (
        <Dialog
          open={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          size="md"
          title="Issue Scrutiny Observation"
          description={`FDR Reference: #${selectedCase.fdrNumber} · ${selectedCase.institutionName}`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCase(null)}>
                Cancel
              </Button>
              {!actionSuccess && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleIssueObservation}
                  disabled={!observationText.trim()}
                >
                  Log & Dispatch Observation
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 py-2">
            {actionSuccess ? (
              <Alert variant="success">{actionSuccess}</Alert>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 space-y-1">
                  <p className="font-bold">Case Information:</p>
                  <p>Bank: {selectedCase.bankName} ({selectedCase.bankBranch})</p>
                  <p>Lien Principal: {formatCurrency(selectedCase.principalAmount)}</p>
                </div>

                <Textarea
                  label="Scrutiny Observation Details"
                  placeholder="Specify the document defect, branch manager token requirement, or discrepancy noted..."
                  value={observationText}
                  onChange={(e) => setObservationText(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
