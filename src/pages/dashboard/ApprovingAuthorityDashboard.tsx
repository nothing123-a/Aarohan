import { useState } from "react";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDate } from "@/utils";
import { getApprovalCases, ReleaseApprovalCase } from "@/data/centralDataset";
import type { User } from "@/types";

interface ApprovingAuthorityDashboardProps {
  user: User;
}

export function ApprovingAuthorityDashboard({ user }: ApprovingAuthorityDashboardProps) {
  const [cases, setCases] = useState<ReleaseApprovalCase[]>(getApprovalCases());
  const [selectedCase, setSelectedCase] = useState<ReleaseApprovalCase | null>(null);
  const [decisionModalMode, setDecisionModalMode] = useState<"APPROVE" | "REJECT" | "RETURN" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const handleOpenDecision = (item: ReleaseApprovalCase, mode: "APPROVE" | "REJECT" | "RETURN") => {
    setSelectedCase(item);
    setDecisionModalMode(mode);
    setDecisionReason("");
    setFeedbackSuccess(null);
  };

  const handleExecuteDecision = () => {
    if (!selectedCase || !decisionModalMode) return;

    const newStatus =
      decisionModalMode === "APPROVE" ? "APPROVED" : decisionModalMode === "REJECT" ? "REJECTED" : "RETURNED";

    setCases((prev) =>
      prev.map((c) =>
        c.id === selectedCase.id
          ? {
              ...c,
              status: newStatus,
              previousDecisions: [
                ...c.previousDecisions,
                {
                  stage: "Statutory Approval",
                  officer: `${user.name} (${user.designation})`,
                  decision: newStatus,
                  timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
                  remarks: decisionReason,
                },
              ],
            }
          : c
      )
    );

    setFeedbackSuccess(`Decision recorded: Case #${selectedCase.fdrNumber} marked as ${newStatus}. Statutory discharge voucher generated.`);
    setTimeout(() => {
      setSelectedCase(null);
      setDecisionModalMode(null);
      setFeedbackSuccess(null);
      setDecisionReason("");
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Approving Authority Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
          <ShieldCheck size={160} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/30 text-xs font-bold mb-3 text-purple-200">
            <span>Executive Approving Authority Desk · Financial Sanctioning Cell</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-plus-jakarta tracking-tight">
            Security Deposit Release & Sanctions
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 mt-1 max-w-2xl leading-relaxed">
            Welcome, <span className="font-semibold text-white">{user.name}</span> ({user.designation}). You hold statutory authority to approve or discharge security deposit liens pledged to AICTE.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-purple-900/60 border border-purple-500/30">
              Clearance Level: AICTE Regulation Bureau Approving Authority (Executive Sign-Off)
            </span>
          </div>
        </div>
      </div>

      {/* Approval Queue Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 font-plus-jakarta flex items-center gap-2">
            <span>Cases Reaching Approval Stage</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
              {cases.filter((c) => c.status === "PENDING_APPROVAL").length} Pending Decisions
            </span>
          </h2>
          <span className="text-xs text-slate-400">Strictly visible to authorized Approving Authorities</span>
        </div>

        {cases.map((item) => (
          <Card key={item.id} className="overflow-hidden border-slate-200 shadow-xs">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 font-mono">CASE #{item.id.toUpperCase()}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold uppercase">
                    {item.requestType.replace("_", " ")}
                  </span>
                  {item.status === "APPROVED" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 font-bold">
                      APPROVED
                    </span>
                  )}
                  {item.status === "REJECTED" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                      REJECTED
                    </span>
                  )}
                  {item.status === "RETURNED" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      RETURNED
                    </span>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-slate-900 font-plus-jakarta mt-1">
                  {item.institutionName}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  FDR #{item.fdrNumber} · {item.bankName} · Pledged Principal: <span className="font-bold text-slate-900">{formatCurrency(item.principalAmount)}</span>
                </p>
              </div>

              {/* Action Buttons (Only shown if pending) */}
              {item.status === "PENDING_APPROVAL" ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    onClick={() => handleOpenDecision(item, "RETURN")}
                  >
                    <RotateCcw size={13} />
                    <span>Return Case</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-700 border-red-300 hover:bg-red-50"
                    onClick={() => handleOpenDecision(item, "REJECT")}
                  >
                    <XCircle size={13} />
                    <span>Reject</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="shadow-orange"
                    onClick={() => handleOpenDecision(item, "APPROVE")}
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve Release</span>
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium">
                  Decision finalized by {user.name}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Scrutiny Findings */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-purple-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-purple-600" />
                    Technical Scrutiny Finding & Recommendation:
                  </span>
                  <span className="font-normal font-mono text-[11px] text-purple-700">
                    {item.scrutinyOfficer} · {formatDate(item.scrutinyDate)}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px] pt-1">
                  {item.scrutinyFinding}
                </p>
              </div>

              {/* Supporting Documents & Decision History Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Supporting Documents */}
                <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500" />
                    Relevant Supporting Documents ({item.supportingDocuments.length})
                  </p>
                  <div className="space-y-1.5">
                    {item.supportingDocuments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
                      >
                        <span className="font-medium text-slate-700 truncate max-w-[220px]">{doc.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{doc.size}</span>
                          <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold text-[9px]">
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision History Trail */}
                <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-500" />
                    Prior Scrutiny Decisions & Audit History
                  </p>
                  <div className="space-y-2">
                    {item.previousDecisions.map((dec, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-bold">{dec.stage}: {dec.officer}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{dec.timestamp}</span>
                        </div>
                        <p className="text-[10px] font-semibold text-purple-700">{dec.decision}</p>
                        <p className="text-[11px] text-slate-500 italic">"{dec.remarks}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Decision Execution Dialog */}
      {selectedCase && decisionModalMode && (
        <Dialog
          open={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          size="md"
          title={
            decisionModalMode === "APPROVE"
              ? "Approve Statutory Security Deposit Release"
              : decisionModalMode === "REJECT"
              ? "Reject Security Deposit Release Request"
              : "Return Case to Scrutiny Officer with Queries"
          }
          description={`FDR Reference: #${selectedCase.fdrNumber} · ${selectedCase.institutionName}`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCase(null)}>
                Cancel
              </Button>
              {!feedbackSuccess && (
                <Button
                  variant={decisionModalMode === "APPROVE" ? "primary" : "destructive"}
                  size="sm"
                  onClick={handleExecuteDecision}
                  disabled={!decisionReason.trim()}
                >
                  Confirm {decisionModalMode}
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 py-2">
            {feedbackSuccess ? (
              <Alert variant="success">{feedbackSuccess}</Alert>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-950 space-y-1">
                  <p className="font-bold">Authorized Approving Authority: {user.name}</p>
                  <p className="text-[11px] text-purple-800">
                    Release Amount: {formatCurrency(selectedCase.principalAmount)} ({selectedCase.bankName})
                  </p>
                </div>

                <Textarea
                  label="Statutory Decision Reason (Mandatory for Audit Trail)"
                  placeholder="Record formal statutory grounds under AICTE Regulations for this decision..."
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={4}
                  required
                />

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px]">
                  All decisions are cryptographically recorded in the CAG statutory audit trail with timestamp and officer token.
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
