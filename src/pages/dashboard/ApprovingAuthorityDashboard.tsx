import { useState } from "react";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Printer,
  QrCode,
  Lock,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/utils";
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

  // NOC Certificate Preview Modal State
  const [nocModalOpen, setNocModalOpen] = useState(false);
  const [activeNocCase, setActiveNocCase] = useState<ReleaseApprovalCase | null>(null);

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

    setFeedbackSuccess(`Statutory Decision registered: Case #${selectedCase.fdrNumber} marked as ${newStatus}. Bank Discharge NOC issued.`);
    setTimeout(() => {
      setSelectedCase(null);
      setDecisionModalMode(null);
      setFeedbackSuccess(null);
      setDecisionReason("");
    }, 1500);
  };

  const handleOpenNoc = (item: ReleaseApprovalCase) => {
    setActiveNocCase(item);
    setNocModalOpen(true);
  };

  const totalPendingSanction = cases
    .filter((c) => c.status === "PENDING_APPROVAL")
    .reduce((sum, c) => sum + c.principalAmount, 0);

  const totalApprovedDischarge = cases
    .filter((c) => c.status === "APPROVED")
    .reduce((sum, c) => sum + c.principalAmount, 0);

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
            Security Deposit Release & Sanctions Desk
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 mt-1 max-w-2xl leading-relaxed">
            Welcome, <span className="font-semibold text-white">{user.name}</span> ({user.designation}). You hold statutory authority under the AICTE Act to sanction or withhold fixed deposit lien relinquishments and issue Bank Discharge NOC vouchers.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-purple-900/60 border border-purple-500/30">
              Clearance Level: AICTE Member Secretary (Final Sign-Off)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-purple-900/60 border border-purple-500/30">
              Four-Eyes Rule: Scrutiny Officer Endorsement Mandatory Before Approval
            </span>
          </div>
        </div>
      </div>

      {/* Executive Financial Sanction Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Pending Sanction Value"
          value={formatCurrency(totalPendingSanction)}
          icon={<Clock size={18} />}
          iconColor="purple"
          subtitle={`${cases.filter((c) => c.status === "PENDING_APPROVAL").length} Cases awaiting sign-off`}
        />
        <StatCard
          title="Sanctioned Releases"
          value={formatCurrency(totalApprovedDischarge)}
          icon={<CheckCircle2 size={18} />}
          iconColor="green"
          subtitle="NOC Vouchers issued"
        />
        <StatCard
          title="Scrutiny Endorsement"
          value="100% VERIFIED"
          icon={<ShieldCheck size={18} />}
          iconColor="blue"
          subtitle="Pre-audited by scrutiny officers"
        />
        <StatCard
          title="Statutory Risk Index"
          value="0 DEFICIT"
          icon={<Lock size={18} />}
          iconColor="green"
          subtitle="No pending student liabilities"
        />
      </div>

      {/* Approval Queue Cases */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 font-plus-jakarta flex items-center gap-2">
            <span>Security Deposit Release Applications</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
              {cases.filter((c) => c.status === "PENDING_APPROVAL").length} Pending Decisions
            </span>
          </h2>
          <span className="text-xs text-slate-400">Restricted to Member Secretary clearance</span>
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
                    <Badge variant="success">APPROVED (NOC DISCHARGED)</Badge>
                  )}
                  {item.status === "REJECTED" && (
                    <Badge variant="error">REJECTED</Badge>
                  )}
                  {item.status === "RETURNED" && (
                    <Badge variant="warning">RETURNED WITH QUERIES</Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-slate-900 font-plus-jakarta mt-1">
                  {item.institutionName}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  FDR #{item.fdrNumber} · {item.bankName} · Pledged Principal: <span className="font-bold text-slate-900">{formatCurrency(item.principalAmount)}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {item.status === "APPROVED" ? (
                  <Button size="xs" variant="primary" onClick={() => handleOpenNoc(item)}>
                    <Printer size={13} /> View Official Discharge NOC
                  </Button>
                ) : (
                  <>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleOpenDecision(item, "RETURN")}
                    >
                      <RotateCcw size={12} /> Return Query
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => handleOpenDecision(item, "REJECT")}
                    >
                      <XCircle size={12} /> Reject
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleOpenDecision(item, "APPROVE")}
                    >
                      <CheckCircle2 size={12} /> Authorize Release
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Institutional Grounds */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Technical Scrutiny Finding</span>
                  <p className="text-slate-800 font-medium leading-relaxed italic">
                    "{item.scrutinyFinding}"
                  </p>
                  <p className="text-[11px] text-purple-700 font-semibold pt-1">
                    Endorsed by: {item.scrutinyOfficer} ({item.scrutinyDate})
                  </p>
                </div>

                {/* Supporting Artifacts */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Verified Dossier Documents</span>
                  <div className="space-y-1">
                    {item.supportingDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100 text-[11px]">
                        <span className="font-medium text-slate-700 truncate max-w-[160px]">{doc.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prior Scrutiny Decisions */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Scrutiny Officer Review Trail</span>
                  <div className="space-y-1.5">
                    {item.previousDecisions.map((dec, idx) => (
                      <div key={idx} className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                        <div className="flex items-center justify-between text-slate-800 font-bold">
                          <span>{dec.officer}</span>
                          <span className="text-[10px] font-mono text-slate-400">{dec.timestamp}</span>
                        </div>
                        <p className="text-[10px] font-semibold text-purple-700">{dec.decision}</p>
                        <p className="text-[10px] text-slate-500 italic truncate" title={dec.remarks}>"{dec.remarks}"</p>
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
                  Confirm {decisionModalMode} & Sign
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
                  <p className="font-bold">Authorized Signatory: {user.name} ({user.designation})</p>
                  <p className="text-[11px] text-purple-800">
                    Disbursement Amount: {formatCurrency(selectedCase.principalAmount)} ({selectedCase.bankName})
                  </p>
                </div>

                <Textarea
                  label="Formal Statutory Sanction Order (Mandatory for Audit Trail)"
                  placeholder="Record formal statutory grounds under AICTE Regulations for this decision..."
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={4}
                  required
                />

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px]">
                  All decisions are cryptographically recorded in the CAG statutory audit trail with timestamp and officer digital token.
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Official AICTE Bank Discharge NOC Certificate Dialog */}
      {activeNocCase && (
        <Dialog
          open={nocModalOpen}
          onClose={() => setNocModalOpen(false)}
          title="Official AICTE Bank Lien Discharge Voucher"
          description="Formal statutory communication to the Branch Manager authorizing lien revocation."
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-mono text-slate-400">
                Verification Voucher: AICTE/NOC/2026/DIS-00891
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer size={13} /> Print Certificate
                </Button>
                <Button variant="primary" size="sm" onClick={() => setNocModalOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          }
        >
          <div className="p-6 bg-white border-2 border-slate-300 rounded-xl space-y-4 text-xs font-serif text-slate-900 leading-relaxed shadow-xs">
            {/* AICTE Header */}
            <div className="text-center border-b-2 border-orange-600 pb-3 space-y-1 font-sans">
              <p className="text-[10px] font-bold tracking-widest text-orange-700 uppercase">
                All India Council for Technical Education (AICTE)
              </p>
              <h3 className="text-base font-extrabold text-slate-900">
                REGULATION BUREAU · FINANCIAL CLEARANCE CELL
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Nelson Mandela Marg, Vasant Kunj, New Delhi — 110070 · https://aicte-india.org
              </p>
            </div>

            {/* Reference and Date */}
            <div className="flex items-center justify-between font-mono text-[11px] pt-1">
              <span>Ref: <strong>AICTE/REG/NOC/2026/DIS-00891</strong></span>
              <span>Date: <strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong></span>
            </div>

            {/* Address */}
            <div className="space-y-0.5 text-xs">
              <p className="font-bold">To,</p>
              <p>The Branch Manager,</p>
              <p className="font-semibold">{activeNocCase.bankName}, Main University Branch</p>
            </div>

            {/* Subject */}
            <div className="p-2 bg-slate-50 border-l-4 border-orange-500 font-sans text-xs">
              <strong>SUBJECT:</strong> Relinquishment and Revocation of AICTE Lien over Fixed Deposit Receipt No. <strong>{activeNocCase.fdrNumber}</strong> of ₹ {activeNocCase.principalAmount.toLocaleString("en-IN")}/-
            </div>

            {/* Letter Body */}
            <div className="space-y-2 text-xs text-justify font-sans text-slate-800">
              <p>
                Sir/Madam,
              </p>
              <p>
                This is with reference to the Security Deposit FDR No. <strong>{activeNocCase.fdrNumber}</strong> for the sum of <strong>{formatCurrency(activeNocCase.principalAmount)}</strong> deposited by <strong>{activeNocCase.institutionName}</strong> under joint lien with the Member Secretary, AICTE.
              </p>
              <p>
                The competent authority has scrutinized the institutional closure/refund application and verified that no regulatory liabilities or pending student dues exist. Accordingly, <strong>No Objection is hereby conveyed</strong> to the relinquishment of the AICTE joint lien over the aforementioned FDR.
              </p>
              <p>
                The bank is hereby authorized to release the principal sum along with accrued interest to the registered account of the institution.
              </p>
            </div>

            {/* Signature & Verification Block */}
            <div className="pt-4 border-t border-slate-200 flex items-end justify-between font-sans">
              <div className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200">
                <QrCode size={40} className="text-slate-800" />
                <div className="text-[9px] font-mono text-slate-500">
                  <p className="font-bold text-slate-700">Digital Verification QR</p>
                  <p>Scan to verify NOC authenticity</p>
                  <p className="text-orange-600">portal.aicte-india.org/verify</p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="inline-block p-1 bg-emerald-50 border border-emerald-300 rounded text-[9px] font-bold text-emerald-800 font-mono mb-1">
                  DIGITALLY SIGNED & AUTHORIZED
                </div>
                <p className="font-bold text-xs text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-600 font-medium">{user.designation}</p>
                <p className="text-[10px] text-slate-500">All India Council for Technical Education</p>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
