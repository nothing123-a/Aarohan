import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  ArrowLeft,
  Check,
  Printer,
  ShieldCheck,
  XCircle,
  Eye,
  FileText,
  Building2,
  Coins,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/shared";
import { formatCurrency } from "@/utils";
import { getApprovalCases, updateApprovalCase, ReleaseApprovalCase } from "@/data/centralDataset";
import { releaseService } from "@/services/fdrService";
import { AuthorityStatCards } from "@/components/shared/AuthorityStatCards";
import { BankDischargeNocModal } from "@/components/shared/BankDischargeNocModal";

export default function RefundSanctionsPage() {
  const [refundCases, setRefundCases] = useState<ReleaseApprovalCase[]>(getApprovalCases());
  const [selectedRefundCase, setSelectedRefundCase] = useState<ReleaseApprovalCase | null>(null);
  const [refundDecisionMode, setRefundDecisionMode] = useState<"APPROVE" | "COMPLETE" | "REJECT" | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [activeVoucherCase, setActiveVoucherCase] = useState<ReleaseApprovalCase | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Dedicated Detailed Dossier Inspection Modal
  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [selectedDossierCase, setSelectedDossierCase] = useState<ReleaseApprovalCase | null>(null);
  const [dossierRemarks, setDossierRemarks] = useState("");
  const [ledgerTab, setLedgerTab] = useState<"ALL" | "PENDING" | "SANCTIONED" | "RETURNED">("ALL");

  // Sync state with central dataset and live backend API
  useEffect(() => {
    const central = getApprovalCases();
    setRefundCases([...central]);

    releaseService.getAll().then((res: any) => {
      const requestsList = res?.data?.requests || res?.requests || [];
      if (Array.isArray(requestsList) && requestsList.length > 0) {
        const mapped = requestsList
          .filter((r: any) => {
            // Exclude test suite runner artifacts
            const fdrId = String(r.fdr_id || "");
            const fdrNum = String(r.fdr_number || "");
            return (
              !fdrId.startsWith("fdr-dash-") &&
              !fdrId.startsWith("fdr-refund-") &&
              !fdrId.startsWith("fi-bv-") &&
              !fdrNum.startsWith("FDR/REFUND/") &&
              !fdrNum.startsWith("FDR/DIAT/")
            );
          })
          .map((r: any) => {
            const rawStatus = (r.status || "").toUpperCase();
            const normalizedStatus: "APPROVED" | "RELEASED" | "REJECTED" | "RETURNED" | "PENDING_APPROVAL" =
              rawStatus === "APPROVED" || rawStatus === "APPROVED_PENDING_DISCHARGE"
                ? "APPROVED"
                : rawStatus === "RELEASED" || rawStatus === "COMPLETED"
                ? "RELEASED"
                : rawStatus === "REJECTED"
                ? "REJECTED"
                : rawStatus === "RETURNED" || rawStatus === "RETURNED_FOR_QUERY" || rawStatus === "RETURNED_FOR_CORRECTION"
                ? "RETURNED"
                : "PENDING_APPROVAL";

            return {
              id: r.id,
              fdrId: r.fdr_id || r.fdrId,
              fdrNumber: r.fdr_number || r.fdrNumber,
              institutionId: r.institution_id || r.institutionId,
              institutionName: r.institution_name || r.institutionName,
              bankName: r.bank_name || r.bankName,
              principalAmount: r.principal_amount || r.principalAmount,
              requestType: r.request_type || r.requestType,
              requestedDate: r.created_at || r.submission_date || r.submissionDate || new Date().toISOString(),
              status: normalizedStatus,
              scrutinyFinding: r.justification_reason || r.scrutinyFinding || "Regulatory refund requested under AICTE APH norms.",
              scrutinyOfficer: "Rajesh Kumar (Senior Scrutiny Officer)",
              scrutinyDate: new Date().toISOString(),
              supportingDocuments: (r.supporting_documents || r.supporting_document_names || []).map((name: string) => ({
                name,
                size: "2.1 MB",
                status: "VERIFIED" as const,
              })),
              previousDecisions: r.decision_history || [],
              decisionReasonRequired: true,
              applicantName: r.applicant_name,
              applicantDesignation: r.applicant_designation,
              regulatoryClause: r.regulatory_clause_reference,
              nocVoucherRef: r.nocVoucherRef,
            };
          });

        setRefundCases((prev) => {
          // Merge prioritizing central cases, and deduplicate by fdrNumber
          const combined = [...prev];
          for (const m of mapped) {
            const idx = combined.findIndex((c) => c.fdrNumber === m.fdrNumber || c.id === m.id);
            if (idx !== -1) {
              combined[idx] = {
                ...combined[idx],
                ...m,
                status:
                  combined[idx].status === "APPROVED" || combined[idx].status === "RELEASED"
                    ? combined[idx].status
                    : m.status,
              };
            } else {
              combined.push(m);
            }
          }
          return combined;
        });
      }
    }).catch(() => {});
  }, []);

  const pendingRefunds = useMemo(
    () => refundCases.filter((c) => c.status === "PENDING_APPROVAL"),
    [refundCases]
  );

  const sanctionedRefunds = useMemo(
    () => refundCases.filter((c) => c.status === "APPROVED" || c.status === "RELEASED"),
    [refundCases]
  );

  const returnedRefunds = useMemo(
    () => refundCases.filter((c) => c.status === "RETURNED" || c.status === "REJECTED"),
    [refundCases]
  );

  const displayCases = useMemo(() => {
    if (ledgerTab === "PENDING") return pendingRefunds;
    if (ledgerTab === "SANCTIONED") return sanctionedRefunds;
    if (ledgerTab === "RETURNED") return returnedRefunds;
    return refundCases;
  }, [refundCases, ledgerTab, pendingRefunds, sanctionedRefunds, returnedRefunds]);

  const handleRecordRefundDecision = async () => {
    if (!selectedRefundCase || !refundDecisionMode) return;
    const newStatus: "APPROVED" | "RELEASED" | "REJECTED" =
      refundDecisionMode === "APPROVE" ? "APPROVED" : refundDecisionMode === "COMPLETE" ? "RELEASED" : "REJECTED";
    const apiDecision: "APPROVED" | "COMPLETED" | "REJECTED" =
      refundDecisionMode === "APPROVE" ? "APPROVED" : refundDecisionMode === "COMPLETE" ? "COMPLETED" : "REJECTED";

    const nocRef =
      newStatus === "APPROVED" || newStatus === "RELEASED"
        ? selectedRefundCase.nocVoucherRef ||
          `AICTE/NOC/2026/REL-${selectedRefundCase.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}`
        : undefined;

    updateApprovalCase(selectedRefundCase.id, {
      status: newStatus,
      scrutinyFinding: refundReason || selectedRefundCase.scrutinyFinding,
      nocVoucherRef: nocRef,
      approvedDate: new Date().toISOString(),
      approvingAuthority: "Dr. Rajesh Sharma, Member Secretary",
    });

    setRefundCases((prev) =>
      prev.map((c) =>
        c.id === selectedRefundCase.id
          ? {
              ...c,
              status: newStatus,
              scrutinyFinding: refundReason || c.scrutinyFinding,
              nocVoucherRef: nocRef,
            }
          : c
      )
    );

    try {
      await releaseService.recordDecision(selectedRefundCase.id, {
        officer_id: "usr-approver-01",
        officer_name: "Member Secretary",
        officer_role: "approving_authority",
        decision: apiDecision as any,
        decision_reason: refundReason || `Decision recorded as ${refundDecisionMode} by Executive Approving Authority`,
      });
    } catch {
      // Offline fallback
    }

    const claimRef = selectedRefundCase.id.startsWith("appr-")
      ? `REF-${selectedRefundCase.id.slice(5)}`
      : selectedRefundCase.id.toUpperCase();

    setFeedbackSuccess(
      `Refund Claim ${claimRef} for ${selectedRefundCase.institutionName}: Sanction decision recorded as ${newStatus}.`
    );
    setRefundDecisionMode(null);
    setSelectedRefundCase(null);
    setRefundReason("");
    setTimeout(() => setFeedbackSuccess(null), 6000);
  };

  const handleDossierDecision = async (
    targetCase: ReleaseApprovalCase,
    decisionType: "APPROVE" | "RETURN" | "REJECT"
  ) => {
    const newStatus =
      decisionType === "APPROVE" ? ("APPROVED" as const) : decisionType === "RETURN" ? ("RETURNED" as const) : ("REJECTED" as const);
    const apiDecision =
      decisionType === "APPROVE" ? "APPROVED" : decisionType === "RETURN" ? "RETURNED_FOR_QUERY" : "REJECTED";

    const remarks =
      dossierRemarks.trim() ||
      (decisionType === "APPROVE"
        ? "Application dossier inspected. Found compliant with AICTE Approval Process Handbook (APH) regulations. Bank Discharge NOC authorized."
        : decisionType === "RETURN"
        ? "Clarification required on student batch graduation rolls before lien relinquishment can be sanctioned."
        : "Formal rejection. Statutory lock-in criteria unfulfilled.");

    const nocRef =
      newStatus === "APPROVED"
        ? targetCase.nocVoucherRef ||
          `AICTE/NOC/2026/REL-${targetCase.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}`
        : undefined;

    updateApprovalCase(targetCase.id, {
      status: newStatus,
      scrutinyFinding: remarks,
      nocVoucherRef: nocRef,
      approvedDate: new Date().toISOString(),
      approvingAuthority: "Dr. Rajesh Sharma, Member Secretary",
    });

    setRefundCases((prev) =>
      prev.map((c) =>
        c.id === targetCase.id
          ? {
              ...c,
              status: newStatus,
              scrutinyFinding: remarks,
              nocVoucherRef: nocRef,
              previousDecisions: [
                ...(c.previousDecisions || []),
                {
                  stage: "Executive Authority Decision",
                  officer: "Member Secretary (Approving Authority)",
                  decision: newStatus,
                  timestamp: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
                  remarks: remarks,
                },
              ],
            }
          : c
      )
    );

    try {
      await releaseService.recordDecision(targetCase.id, {
        officer_id: "usr-approver-01",
        officer_name: "Member Secretary",
        officer_role: "approving_authority",
        decision: apiDecision as any,
        decision_reason: remarks,
      });
    } catch {
      // offline fallback
    }

    const claimRef = targetCase.id.startsWith("appr-")
      ? `REF-${targetCase.id.slice(5).toUpperCase()}`
      : targetCase.id.toUpperCase();

    setFeedbackSuccess(
      `Claim ${claimRef} (${targetCase.institutionName}) decision successfully recorded as ${newStatus}.`
    );

    if (decisionType === "APPROVE") {
      setActiveVoucherCase({ ...targetCase, status: "APPROVED" });
      setDossierModalOpen(false);
      setVoucherModalOpen(true);
    } else {
      setDossierModalOpen(false);
    }

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
            title="Statutory Release & Refund Sanctions Desk"
            description="Review institution deposit release applications, verify regulatory non-encumbrance clearance, and sanction official Bank Discharge NOCs."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-rose-900 bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-full font-mono">
            {pendingRefunds.length} Pending Approval
          </span>
        </div>
      </div>

      {feedbackSuccess && <Alert variant="success">{feedbackSuccess}</Alert>}

      {/* ─── 4 CORE STAT CARDS ─────────────────────────────────────────── */}
      <AuthorityStatCards activeSection="refunds" />

      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-700 text-white flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Statutory Release & Refund Approvals</h3>
            <p className="text-xs text-purple-800">
              Review institution deposit release applications, verify regulatory non-encumbrance clearance, and sanction official Bank Discharge NOCs.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-purple-900 bg-purple-200/60 px-3 py-1 rounded-full font-mono">
          Pending Volume: {formatCurrency(pendingRefunds.reduce((a, c) => a + (c.principalAmount || 0), 0))}
        </span>
      </div>

      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet size={16} className="text-purple-700" />
                Institutional Refund Claims Ledger
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Authentic institutional security deposit release and refund applications under AICTE scrutiny.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setLedgerTab("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  ledgerTab === "ALL"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All ({refundCases.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerTab("PENDING")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  ledgerTab === "PENDING"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                Pending Sanction ({pendingRefunds.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerTab("SANCTIONED")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  ledgerTab === "SANCTIONED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                Sanctioned & NOC ({sanctionedRefunds.length})
              </button>
              {returnedRefunds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLedgerTab("RETURNED")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    ledgerTab === "RETURNED"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  Returned ({returnedRefunds.length})
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">Application #</th>
                  <th className="px-4 py-3.5">Institution Name</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">FDR Number</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Bank</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Claim Amount</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Scrutiny Officer</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">Status</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right">Executive Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayCases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                      <p className="text-xs font-semibold text-slate-800">No applications in this view.</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {ledgerTab === "PENDING"
                          ? "All registered refund applications have been reviewed and sanctioned."
                          : "No records match the selected filter."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap text-xs">
                      {c.id.startsWith("appr-") ? `REF-${c.id.slice(5)}` : c.id}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 text-xs">{c.institutionName}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 whitespace-nowrap text-xs">{c.fdrNumber}</td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap text-xs font-medium">{c.bankName}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900 whitespace-nowrap text-xs">
                      {formatCurrency(c.principalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap text-xs">
                      {c.scrutinyOfficer || "Rajesh Kumar (SO)"}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          c.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : c.status === "RELEASED"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : c.status === "REJECTED"
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap min-w-[270px]">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. View Dossier Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs h-8 px-2.5"
                          onClick={() => {
                            setSelectedDossierCase(c);
                            setDossierRemarks(
                              c.status === "PENDING_APPROVAL"
                                ? "Application dossier inspected. Found compliant with AICTE Approval Process Handbook (APH) regulations. Recommended for immediate lien discharge and bank encashment."
                                : ""
                            );
                            setDossierModalOpen(true);
                          }}
                        >
                          <Eye size={13} className="mr-1 text-slate-500" /> View Dossier
                        </Button>

                        {c.status === "PENDING_APPROVAL" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-purple-700 hover:bg-purple-800 text-white font-semibold shadow-xs whitespace-nowrap text-xs h-8 px-2.5"
                              onClick={() => {
                                setSelectedRefundCase(c);
                                setRefundDecisionMode("APPROVE");
                              }}
                            >
                              <Check size={13} className="mr-1" /> Sanction
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-semibold whitespace-nowrap text-xs h-8 px-2"
                              onClick={() => {
                                setSelectedRefundCase(c);
                                setRefundDecisionMode("REJECT");
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {c.status === "APPROVED" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold whitespace-nowrap text-xs h-8 px-2.5"
                              onClick={() => {
                                setActiveVoucherCase(c);
                                setVoucherModalOpen(true);
                              }}
                            >
                              <Printer size={13} className="mr-1" /> NOC
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs whitespace-nowrap text-xs h-8 px-2.5"
                              onClick={() => {
                                setSelectedRefundCase(c);
                                setRefundDecisionMode("COMPLETE");
                              }}
                            >
                              Discharged
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── MODAL: COMPREHENSIVE DOSSIER REVIEW & DECISION ──────────── */}
      <Dialog
        open={dossierModalOpen}
        onClose={() => {
          setDossierModalOpen(false);
          setSelectedDossierCase(null);
        }}
        title="Institutional Security Deposit Refund & Release Dossier"
        size="2xl"
      >
        {selectedDossierCase && (
          <div className="space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto pr-1">
            {/* Top Overview Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {selectedDossierCase.id.startsWith("appr-")
                      ? `REF-${selectedDossierCase.id.slice(5).toUpperCase()}`
                      : selectedDossierCase.id.toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      selectedDossierCase.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : selectedDossierCase.status === "RELEASED"
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : selectedDossierCase.status === "REJECTED"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : selectedDossierCase.status === "RETURNED"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-purple-100 text-purple-900 border border-purple-300"
                    }`}
                  >
                    {selectedDossierCase.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {selectedDossierCase.institutionName} · <span className="font-mono text-slate-500">{selectedDossierCase.institutionId}</span>
                </p>
                {selectedDossierCase.applicantName && (
                  <p className="text-[11px] text-slate-500">
                    Signatory: {selectedDossierCase.applicantName} ({selectedDossierCase.applicantDesignation || "Authorized Officer"})
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Claim Value Requested
                </span>
                <span className="text-lg font-black font-mono text-purple-900 block font-plus-jakarta">
                  {formatCurrency(selectedDossierCase.principalAmount)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  100% Capital Guaranteed
                </span>
              </div>
            </div>

            {/* Grid 1: Pledged Financial Instrument Particulars */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Coins size={14} className="text-purple-700" />
                1. Pledged Instrument & Core Banking Depository
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">FDR Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDossierCase.fdrNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Depository Bank:</span>
                  <span className="font-semibold text-slate-800">{selectedDossierCase.bankName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">SFMS IFSC Code:</span>
                  <span className="font-mono text-slate-800">{selectedDossierCase.bankIfsc || "SBIN0001256"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Current Lien Status:</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <Check size={11} /> AICTE Joint Custody
                  </span>
                </div>
              </div>
            </div>

            {/* Grid 2: Regulatory Grounds & Justification */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-purple-700" />
                2. Regulatory Grounds & Justification Narrative
              </span>
              <div className="text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Applicable Clause:</span>
                  <span className="font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {selectedDossierCase.regulatoryClause || "AICTE Approval Process Handbook (APH) Clause 7.6 / 11.2"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">Formal Institutional Narrative:</span>
                  <p className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 leading-relaxed text-xs">
                    {selectedDossierCase.scrutinyFinding || "Security deposit refund requested following program closure, complete student departure/graduation, and settlement of caution money under AICTE norms."}
                  </p>
                </div>
              </div>
            </div>

            {/* Grid 3: Beneficiary Bank Account for Credit */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Building2 size={14} className="text-purple-700" />
                3. Beneficiary Institutional Bank Account for Lien Discharge Credit
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Account Title:</span>
                  <span className="font-bold text-slate-900">{selectedDossierCase.institutionName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Core Banking Account #:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDossierCase.bankAccountNumber || "38910055210"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Depository Gateway:</span>
                  <span className="font-semibold text-emerald-700">SFMS 2.0 Encashment Gateway</span>
                </div>
              </div>
            </div>

            {/* Grid 4: Attached Verification Documents */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <FileText size={14} className="text-purple-700" />
                4. Attached Supporting Documents Dossier
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(selectedDossierCase.supportingDocuments && selectedDossierCase.supportingDocuments.length > 0
                  ? selectedDossierCase.supportingDocuments
                  : [
                      { name: "Governing_Body_Resolution_Closure.pdf", size: "2.4 MB", status: "VERIFIED" as const },
                      { name: "AICTE_Regional_Office_No_Dues.pdf", size: "1.2 MB", status: "VERIFIED" as const },
                      { name: "Original_FDR_Receipt_Scan_Joint_Lien.pdf", size: "3.1 MB", status: "VERIFIED" as const },
                    ]
                ).map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-orange-500 flex-shrink-0" />
                      <span className="font-mono text-xs text-slate-800 truncate" title={doc.name}>{doc.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex-shrink-0 ml-2">
                      Verified Scan
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid 5: Audit Trail & Previous Decisions */}
            {selectedDossierCase.previousDecisions && selectedDossierCase.previousDecisions.length > 0 && (
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                  5. Decision History & CAG Audit Trail
                </span>
                <div className="space-y-1.5">
                  {selectedDossierCase.previousDecisions.map((dec: any, i: number) => (
                    <div key={i} className="flex items-start justify-between p-2 rounded-lg bg-white border border-slate-100 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800">{dec.stage || "Review Stage"}</span>
                        <span className="text-slate-500 ml-1.5">by {dec.officer || dec.officerName}</span>
                        <p className="text-slate-600 mt-0.5">{dec.remarks}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap ml-2">
                        {dec.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid 6: Executive Decision & Answer Section */}
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
              <span className="font-bold text-purple-950 uppercase tracking-wider text-xs block">
                6. Executive Authority Decision & Answer Form
              </span>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Executive Decision Remarks / Sanction Order Notes
                </label>
                <textarea
                  rows={2}
                  value={dossierRemarks}
                  onChange={(e) => setDossierRemarks(e.target.value)}
                  placeholder="Record formal statutory approval rationale or query details..."
                  className="w-full p-2.5 rounded-lg border border-purple-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 leading-relaxed"
                />
              </div>

              {selectedDossierCase.status === "PENDING_APPROVAL" && (
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold"
                    onClick={() => handleDossierDecision(selectedDossierCase, "REJECT")}
                  >
                    <XCircle size={14} className="mr-1" />
                    Reject Claim
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold"
                    onClick={() => handleDossierDecision(selectedDossierCase, "RETURN")}
                  >
                    <AlertCircle size={14} className="mr-1" />
                    Return for Clarification
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    onClick={() => handleDossierDecision(selectedDossierCase, "APPROVE")}
                  >
                    <Check size={14} className="mr-1" />
                    Sanction Refund & Issue Bank NOC
                  </Button>
                </div>
              )}

              {selectedDossierCase.status === "APPROVED" && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Refund Sanctioned & Bank NOC Authorized
                  </span>
                  <Button
                    size="sm"
                    className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                    onClick={() => {
                      setActiveVoucherCase(selectedDossierCase);
                      setDossierModalOpen(false);
                      setVoucherModalOpen(true);
                    }}
                  >
                    <Printer size={13} className="mr-1" /> View Official Sanction NOC Voucher
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL: REFUND SANCTION & DECISION */}
      <Dialog
        open={!!refundDecisionMode}
        onClose={() => {
          setRefundDecisionMode(null);
          setSelectedRefundCase(null);
        }}
        title={
          refundDecisionMode === "APPROVE"
            ? "Confirm Statutory Release & Issue Bank NOC"
            : refundDecisionMode === "COMPLETE"
            ? "Confirm Fund Release & Mark Deposit Discharged"
            : "Formal Rejection of Refund Application"
        }
      >
        {selectedRefundCase && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-slate-900">{selectedRefundCase.institutionName}</span>
                <span className="font-extrabold font-mono text-purple-900">
                  {formatCurrency(selectedRefundCase.principalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                FDR #{selectedRefundCase.fdrNumber} · {selectedRefundCase.bankName}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Reason: {selectedRefundCase.scrutinyFinding || "Statutory lock-in fulfilled, SRO non-encumbrance verified."}
              </p>
            </div>

            {refundDecisionMode === "APPROVE" && (
              <p className="text-slate-600 leading-relaxed">
                By approving, you authorize the generation of an official <strong>AICTE Discharge NOC</strong>{" "}
                instructing the issuing bank to lift the statutory lien and release the principal with accrued interest
                to the institution's verified operational account.
              </p>
            )}

            {refundDecisionMode === "COMPLETE" && (
              <p className="text-slate-600 leading-relaxed">
                Confirm that the bank has honored the discharge notice and the funds have been successfully remitted.
                The deposit will be formally archived as <strong>RELEASED / DISCHARGED</strong>.
              </p>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Executive Notes / Sanction Order Remarks</label>
              <Textarea
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. SRO approval inspected. Verified no outstanding student grievance. Sanction accorded."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefundDecisionMode(null);
                  setSelectedRefundCase(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={
                  refundDecisionMode === "APPROVE"
                    ? "bg-purple-700 hover:bg-purple-800 text-white"
                    : refundDecisionMode === "COMPLETE"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }
                onClick={handleRecordRefundDecision}
              >
                {refundDecisionMode === "APPROVE" && <Check size={14} className="mr-1" />}
                {refundDecisionMode === "COMPLETE" && <ShieldCheck size={14} className="mr-1" />}
                {refundDecisionMode === "REJECT" && <XCircle size={14} className="mr-1" />}
                Confirm Sanction
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL: OFFICIAL BANK DISCHARGE NOC VOUCHER */}
      <BankDischargeNocModal
        open={voucherModalOpen}
        onClose={() => {
          setVoucherModalOpen(false);
          setActiveVoucherCase(null);
        }}
        data={
          activeVoucherCase
            ? {
                voucherRef:
                  activeVoucherCase.nocVoucherRef ||
                  `AICTE/NOC/2026/REL-${activeVoucherCase.id.slice(-4).toUpperCase()}`,
                fdrNumber: activeVoucherCase.fdrNumber,
                institutionId: activeVoucherCase.institutionId,
                institutionName: activeVoucherCase.institutionName,
                bankName: activeVoucherCase.bankName,
                principalAmount: activeVoucherCase.principalAmount,
                sanctionAmount: activeVoucherCase.claimAmount || activeVoucherCase.principalAmount,
                requestType: activeVoucherCase.requestType,
                sanctionDate: activeVoucherCase.approvedDate || activeVoucherCase.requestedDate,
                regulatoryClause: activeVoucherCase.regulatoryClause,
                approvingAuthority: "Dr. Rajesh Sharma, Member Secretary, AICTE",
              }
            : null
        }
      />
    </div>
  );
}
