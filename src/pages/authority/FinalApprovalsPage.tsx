import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowLeft, Check, AlertCircle, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/shared";
import { AuthorityStatCards } from "@/components/shared/AuthorityStatCards";
import { formatCurrency } from "@/utils";
import { CENTRAL_FDR_RECORDS, CentralFDRRecord } from "@/data/centralDataset";

export default function FinalApprovalsPage() {
  const [pendingFDRs, setPendingFDRs] = useState<CentralFDRRecord[]>(() =>
    CENTRAL_FDR_RECORDS.filter(
      (r) => r.scrutinyStatus === "SCRUTINY_PASSED" || r.verificationStatus === "PENDING_REVIEW"
    )
  );

  const [selectedFDRForApproval, setSelectedFDRForApproval] = useState<CentralFDRRecord | null>(null);
  const [approvalModalMode, setApprovalModalMode] = useState<"APPROVE" | "QUERY" | "REJECT" | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const handleRecordFDRDecision = () => {
    if (!selectedFDRForApproval || !approvalModalMode) return;
    const fdrNumber = selectedFDRForApproval.fdrNumber;
    const decisionText =
      approvalModalMode === "APPROVE"
        ? "SANCTIONED & CONFIRMED IN MASTER REGISTER"
        : approvalModalMode === "QUERY"
        ? "RETURNED TO SCRUTINY OFFICER FOR RE-AUDIT"
        : "FORMALLY REJECTED BY EXECUTIVE AUTHORITY";

    setPendingFDRs((prev) => prev.filter((r) => r.id !== selectedFDRForApproval.id));
    setFeedbackSuccess(`FDR ${fdrNumber}: Executive Decision Recorded — ${decisionText}.`);
    setApprovalModalMode(null);
    setSelectedFDRForApproval(null);
    setApprovalNotes("");
    setTimeout(() => setFeedbackSuccess(null), 6000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="p-0 h-auto text-slate-500 hover:text-slate-800">
              <Link to="/dashboard" className="flex items-center gap-1 text-xs">
                <ArrowLeft size={13} /> Back to Dashboard
              </Link>
            </Button>
          </div>
          <PageHeader
            title="Final FDR Executive Sanctions Desk"
            description="Fixed Deposit Receipts that have completed scrutiny officer examination and OCR concordance, awaiting final executive approval."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-full font-mono">
            {pendingFDRs.length} Instruments Awaiting Sign-Off
          </span>
        </div>
      </div>

      {feedbackSuccess && <Alert variant="success">{feedbackSuccess}</Alert>}

      {/* ─── 4 CORE STAT CARDS ─────────────────────────────────────────── */}
      <AuthorityStatCards activeSection="approvals" />

      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Executive FDR Approval Register</h3>
            <p className="text-xs text-slate-600">
              Fixed Deposit Receipts that have completed scrutiny officer examination and OCR concordance, awaiting final executive approval.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-900 bg-emerald-200/60 px-3 py-1 rounded-full font-mono">
          Ready for Sanction: {pendingFDRs.length}
        </span>
      </div>

      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Instruments Awaiting Executive Sign-Off
            </CardTitle>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full w-fit">
              {pendingFDRs.length} Cases Pending Sign-Off
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pendingFDRs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-600 opacity-60" />
              All scrutinized fixed deposit records have been signed off.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">FDR / Certificate #</th>
                    <th className="px-4 py-3.5">Pledging College</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Issuing Bank & Branch</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Principal Amount</th>
                    <th className="px-4 py-3.5 whitespace-nowrap text-center">Scrutiny Status</th>
                    <th className="px-4 py-3.5 whitespace-nowrap text-center">OCR Accuracy</th>
                    <th className="px-4 py-3.5 whitespace-nowrap text-right">Executive Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingFDRs.map((fdr) => (
                    <tr key={fdr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <Link to={`/fdr/${fdr.id}`} className="hover:text-emerald-700 transition-colors">
                          {fdr.fdrNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 text-xs">{fdr.institutionName}</td>
                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap text-xs">
                        <span className="font-medium text-slate-900">{fdr.bankName}</span>
                        {fdr.bankBranch && <span className="text-slate-500 ml-1">({fdr.bankBranch})</span>}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900 whitespace-nowrap text-xs">
                        {formatCurrency(fdr.principalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check size={11} className="text-emerald-600" /> Scrutiny Cleared
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          {fdr.ocrConfidence || 98.4}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap min-w-[250px]">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs whitespace-nowrap text-xs h-8 px-3"
                            onClick={() => {
                              setSelectedFDRForApproval(fdr);
                              setApprovalModalMode("APPROVE");
                            }}
                          >
                            <Check size={13} className="mr-1" /> Grant Approval
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold whitespace-nowrap text-xs h-8 px-3"
                            onClick={() => {
                              setSelectedFDRForApproval(fdr);
                              setApprovalModalMode("QUERY");
                            }}
                          >
                            Return for Query
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: FDR FINAL APPROVAL / QUERY / REJECTION */}
      <Dialog
        open={!!approvalModalMode}
        onClose={() => {
          setApprovalModalMode(null);
          setSelectedFDRForApproval(null);
        }}
        title={
          approvalModalMode === "APPROVE"
            ? "Confirm Executive Final Approval"
            : approvalModalMode === "QUERY"
            ? "Return Dossier with Query to Scrutiny Officer"
            : "Formally Reject Deposit Instrument"
        }
      >
        {selectedFDRForApproval && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-mono font-bold text-sm text-slate-900">{selectedFDRForApproval.fdrNumber}</p>
                  <p className="text-slate-600">{selectedFDRForApproval.institutionName}</p>
                </div>
                <span className="font-extrabold text-sm text-slate-900">
                  {formatCurrency(selectedFDRForApproval.principalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Issuing Depository: {selectedFDRForApproval.bankName} · Scrutiny Cleared
              </p>
            </div>

            {approvalModalMode === "APPROVE" && (
              <p className="text-slate-600 leading-relaxed">
                By confirming, you formally validate the AICTE joint lien on this fixed deposit. The instrument will be
                marked as <strong>CONFIRMED ACTIVE LIEN</strong> in the nationwide master ledger and the institution will
                receive an official sanction confirmation.
              </p>
            )}

            {approvalModalMode === "QUERY" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clarification Required from Officer</label>
                <Textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Scanned certificate stamp blurry near branch manager signature. Re-verify with issuing branch."
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setApprovalModalMode(null);
                  setSelectedFDRForApproval(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={
                  approvalModalMode === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : approvalModalMode === "QUERY"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }
                onClick={handleRecordFDRDecision}
              >
                {approvalModalMode === "APPROVE" && <Check size={14} className="mr-1" />}
                {approvalModalMode === "QUERY" && <AlertCircle size={14} className="mr-1" />}
                {approvalModalMode === "REJECT" && <XCircle size={14} className="mr-1" />}
                Confirm Decision
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

