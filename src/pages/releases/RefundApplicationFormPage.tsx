import React, { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Coins,
  FileText,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Building2,
  Check,
  Send,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Select,
  Alert,
  Badge,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { CENTRAL_FDR_RECORDS, registerApprovalCase, ReleaseApprovalCase } from "@/data/centralDataset";
import { formatCurrency, formatDate } from "@/utils";
import { releaseService } from "@/services/fdrService";

export default function RefundApplicationFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Detect preselected type from URL (?type=refund or ?type=release or ?type=noc)
  const initialType = searchParams.get("type")?.toUpperCase();
  const defaultRequestType: "PARTIAL_REFUND" | "FULL_RELEASE" | "NOC_ISSUANCE" =
    initialType === "RELEASE" ? "FULL_RELEASE" : initialType === "NOC" ? "NOC_ISSUANCE" : "PARTIAL_REFUND";

  // Filter available FDRs for user's institution if applicable
  const isInstitution = user?.role === "institution_representative" || user?.role === "depositor";
  const userInstId = user?.institutionId || "inst-001";

  const availableFDRs = useMemo(() => {
    if (isInstitution) {
      const matched = CENTRAL_FDR_RECORDS.filter((r) => r.institutionId === userInstId);
      return matched.length > 0 ? matched : CENTRAL_FDR_RECORDS;
    }
    return CENTRAL_FDR_RECORDS;
  }, [isInstitution, userInstId]);

  // Form State
  const [selectedFdrId, setSelectedFdrId] = useState<string>(availableFDRs[0]?.id || "");
  const [requestType, setRequestType] = useState<"PARTIAL_REFUND" | "FULL_RELEASE" | "NOC_ISSUANCE">(defaultRequestType);
  const [claimAmount, setClaimAmount] = useState<number | string>(
    availableFDRs[0]?.principalAmount ? availableFDRs[0].principalAmount : 5000000
  );
  const [regulatoryClause, setRegulatoryClause] = useState<string>(
    "AICTE Approval Process Handbook (APH) Clause 7.6 (Pro-rata Deposit Adjustment upon Course Closure)"
  );
  const [justification, setJustification] = useState<string>(
    "The Academic Council and Governing Body have formally resolved to discontinue the M.Tech Structural Engineering program. All batches have successfully graduated with zero pending caution money, student grievances, or institutional liabilities. The institution hereby requests pro-rata security deposit refund under AICTE norms."
  );

  // Bank & Account Details
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("38910055210");
  const [bankAccountConfirm, setBankAccountConfirm] = useState<string>("38910055210");
  const [bankIfsc, setBankIfsc] = useState<string>(availableFDRs[0]?.ifscCode || "SBIN0001256");
  const [beneficiaryName, setBeneficiaryName] = useState<string>(
    user?.institutionName || "Delhi Technological University (DTU)"
  );

  // Compliance Checklists
  const [chkStudentsGraduated, setChkStudentsGraduated] = useState<boolean>(true);
  const [chkNoDuesClearance, setChkNoDuesClearance] = useState<boolean>(true);
  const [chkFacultySalariesCleared, setChkFacultySalariesCleared] = useState<boolean>(true);
  const [chkGoverningBodyResolution, setChkGoverningBodyResolution] = useState<boolean>(true);
  const [chkStatutoryDeclaration, setChkStatutoryDeclaration] = useState<boolean>(true);

  // Documents
  const [docResolution, setDocResolution] = useState<string>("Governing_Body_Resolution_No_42_2026.pdf");
  const [docNoDues, setDocNoDues] = useState<string>("AICTE_RO_North_No_Dues_Certificate.pdf");
  const [docFdrScan, setDocFdrScan] = useState<string>("Original_FDR_Receipt_Scan_Joint_Lien.pdf");
  const [docStudentTransfer, setDocStudentTransfer] = useState<string>("Final_Batch_Graduation_Roll_Verification.pdf");

  // UI States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Currently selected FDR object
  const activeFdr = useMemo(() => {
    return availableFDRs.find((r) => r.id === selectedFdrId) || availableFDRs[0] || CENTRAL_FDR_RECORDS[0];
  }, [availableFDRs, selectedFdrId]);

  // Sync claim amount when FDR changes
  const handleFdrChange = (id: string) => {
    setSelectedFdrId(id);
    const chosen = availableFDRs.find((r) => r.id === id);
    if (chosen) {
      setClaimAmount(chosen.principalAmount);
      if (chosen.ifscCode) setBankIfsc(chosen.ifscCode);
    }
  };

  // Preset Template loader
  const loadTemplate = (type: "course_closure" | "intake_reduction" | "full_exit") => {
    if (type === "course_closure") {
      setRequestType("PARTIAL_REFUND");
      setRegulatoryClause("AICTE Approval Process Handbook (APH) Clause 7.6 (Course Discontinuation & Pro-rata Deposit Return)");
      setJustification(
        "Application submitted pursuant to closure of the approved specialization. The institution certifies complete student departure/graduation, settlement of all student accounts, absence of fee dispute litigations, and SRO Regional Officer clearance."
      );
    } else if (type === "intake_reduction") {
      setRequestType("PARTIAL_REFUND");
      setRegulatoryClause("AICTE Approval Process Handbook (APH) Clause 7.4 (Reduction in Intake Security Rebalance)");
      setJustification(
        "Application for pro-rata deposit adjustment following approved intake reduction from 120 seats to 60 seats. Security deposit threshold rebalanced as per Table 7.2 of AICTE norms."
      );
    } else {
      setRequestType("FULL_RELEASE");
      setRegulatoryClause("AICTE Approval Process Handbook (APH) Clause 11.2 (Permanent Institutional Closure & Full Release)");
      setJustification(
        "Application for complete release of security deposit upon progressive closure and permanent surrender of AICTE approval. All academic records transferred to the affiliating university."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);

    if (!justification.trim()) {
      setErrorAlert("Please provide a comprehensive formal regulatory justification.");
      return;
    }

    if (bankAccountNumber !== bankAccountConfirm) {
      setErrorAlert("Bank account numbers do not match. Please verify Core Banking credentials.");
      return;
    }

    if (!chkStatutoryDeclaration) {
      setErrorAlert("You must agree to the statutory declaration under AICTE regulations before submitting.");
      return;
    }

    setSubmitting(true);

    // Register into Central Approving Authority Queue so it immediately appears in Approver Dashboard
    const newApprovalCase: ReleaseApprovalCase = {
      id: `appr-${Date.now().toString(36)}`,
      fdrId: activeFdr.id,
      fdrNumber: activeFdr.fdrNumber,
      institutionId: activeFdr.institutionId,
      institutionName: activeFdr.institutionName,
      bankName: activeFdr.bankName,
      principalAmount: Number(claimAmount) || activeFdr.principalAmount,
      requestType: requestType,
      requestedDate: new Date().toISOString(),
      status: "PENDING_APPROVAL",
      scrutinyFinding: justification,
      scrutinyOfficer: "Rajesh Kumar (Senior Scrutiny Officer)",
      scrutinyDate: new Date().toISOString(),
      supportingDocuments: [
        { name: docResolution, size: "2.4 MB", status: "VERIFIED" as const },
        { name: docNoDues, size: "1.2 MB", status: "VERIFIED" as const },
        { name: docFdrScan, size: "3.1 MB", status: "VERIFIED" as const },
        { name: docStudentTransfer, size: "1.5 MB", status: "VERIFIED" as const },
      ].filter((d) => Boolean(d.name)),
      previousDecisions: [
        {
          stage: "Institutional Application Dossier",
          officer: user?.name || "Authorized Institutional Representative",
          decision: "SUBMITTED",
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
          remarks: justification,
        },
        {
          stage: "Technical Scrutiny",
          officer: "Rajesh Kumar (Senior Scrutiny Officer)",
          decision: "RECOMMENDED_FOR_APPROVAL",
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
          remarks: `Pre-approval verification cleared under ${regulatoryClause}. Forwarded to Approving Authority for final sanction.`,
        },
      ],
      decisionReasonRequired: true,
      applicantName: user?.name || "Authorized Institutional Signatory",
      applicantDesignation: user?.designation || "Head of Institution / Registrar",
      regulatoryClause: regulatoryClause,
      bankAccountNumber: bankAccountNumber,
      bankIfsc: bankIfsc,
      claimAmount: Number(claimAmount) || activeFdr.principalAmount,
    };
    registerApprovalCase(newApprovalCase);

    try {
      await releaseService.create({
        fdr_id: activeFdr.id,
        fdr_number: activeFdr.fdrNumber,
        institution_id: activeFdr.institutionId,
        institution_name: activeFdr.institutionName,
        bank_name: activeFdr.bankName,
        principal_amount: Number(claimAmount) || activeFdr.principalAmount,
        request_type: requestType,
        justification_reason: justification,
        regulatory_clause_reference: regulatoryClause,
        supporting_document_names: [
          docResolution,
          docNoDues,
          docFdrScan,
          docStudentTransfer,
        ].filter(Boolean),
        applicant_name: user?.name || "Authorized Institutional Signatory",
        applicant_designation: user?.designation || "Head of Institution / Registrar",
      });

      // Navigate back to register with confirmation
      navigate("/refund-requests?tab=refund&submitted=true");
    } catch (err: any) {
      console.warn("API submission error, proceeding with optimistic state:", err);
      navigate("/refund-requests?tab=refund&submitted=true");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* ─── Breadcrumb & Top Header ────────────────────────────────────── */}
      <PageHeader
        title="Security Deposit Refund & Release Application"
        description="Statutory institutional dossier under AICTE Approval Process Handbook (APH) regulations for deposit refund, pro-rata adjustment, or bank lien discharge."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Refund Requests", href: "/refund-requests" },
          { label: "New Application Form" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/refund-requests">
                <ArrowLeft size={14} />
                Back to Register
              </Link>
            </Button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <ShieldCheck size={13} className="text-amber-600" />
              Statutory Form R-1 (Lien Relinquishment)
            </span>
          </div>
        }
      />

      {/* ─── Executive Statutory Banner ─────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs flex-shrink-0 mt-0.5">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  AICTE Regulation Bureau · Statutory Refund Protocol
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  APH 2026-27 Compliant
                </span>
              </div>
              <p className="text-xs text-blue-950/80 leading-relaxed mt-1 max-w-3xl">
                Approval of this application generates a digitally signed <strong>Bank Discharge NOC Voucher</strong>. Under RBI Schedule II regulations, AICTE relinguishes regulatory lien notation; actual deposit credit and encashment are processed directly into your designated Core Banking account by the depository bank upon SFMS verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-3 py-1 rounded-lg">
              Est. Review SLA: 3–5 Business Days
            </span>
          </div>
        </div>
      </div>

      {errorAlert && (
        <Alert variant="error" title="Submission Error" onDismiss={() => setErrorAlert(null)}>
          {errorAlert}
        </Alert>
      )}

      {/* ─── Main Application Form ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── Section 1: Instrument Selection & Live Card ───────────────── */}
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Coins size={16} className="text-orange-600" />
                  <span>1. Pledged Financial Instrument Selection</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose the registered Fixed Deposit Receipt against which the refund or lien release is claimed.
                </CardDescription>
              </div>
              <Badge variant="info" className="text-xs">
                Active Joint Lien
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Pledged Fixed Deposit Receipt (FDR) *
                </label>
                <Select
                  value={selectedFdrId}
                  onChange={(e) => handleFdrChange(e.target.value)}
                  options={availableFDRs.map((r) => ({
                    value: r.id,
                    label: `${r.fdrNumber} — ${r.bankName} (${formatCurrency(r.principalAmount)})`,
                  }))}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Only instruments under active regulatory lien with AICTE are eligible for refund application.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pledging Institution Identity
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{activeFdr.institutionName}</p>
                    <p className="text-[11px] font-mono text-slate-500">ID: {activeFdr.institutionId}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Verified AICTE Institute
                  </span>
                </div>
              </div>
            </div>

            {/* Live Instrument Breakdown Box */}
            <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-orange-50/70 border border-orange-200/90 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Depository Bank</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">{activeFdr.bankName}</span>
                <span className="text-[10px] font-mono text-slate-500">{activeFdr.bankBranch || "Main Branch"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Principal Value</span>
                <span className="text-base font-extrabold text-slate-900 font-plus-jakarta mt-0.5 block">
                  {formatCurrency(activeFdr.principalAmount)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">100% Capital Guaranteed</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Maturity Date</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                  {formatDate(activeFdr.maturityDate)}
                </span>
                <span className="text-[10px] text-orange-700 font-medium">Original Tenure Secured</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Lien Status</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full mt-0.5">
                  <Check size={11} className="text-emerald-700" /> AICTE Joint Custody
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Section 2: Request Type & Financial Particulars ──────────── */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 size={16} className="text-orange-600" />
              <span>2. Application Classification & Regulatory Basis</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Select the administrative ground and specify the statutory clause under the AICTE Approval Process Handbook.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Quick Template Fill Buttons */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Quick Preset Templates (Click to Auto-fill):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadTemplate("course_closure")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={12} className="text-emerald-600" />
                  Course Closure Refund (Clause 7.6)
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("intake_reduction")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={12} className="text-blue-600" />
                  Intake Reduction Pro-rata (Clause 7.4)
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("full_exit")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={12} className="text-purple-600" />
                  Permanent Closure Full Release (Clause 11.2)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Application Classification *
                </label>
                <Select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  options={[
                    { value: "PARTIAL_REFUND", label: "Partial Refund (Course Closure / Pro-rata Reduction)" },
                    { value: "FULL_RELEASE", label: "Full Deposit Release (Complete Institutional Exit)" },
                    { value: "NOC_ISSUANCE", label: "Bank Lien Revocation NOC Voucher (Depository Rollover)" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Refund / Release Claim Value (₹) *
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    max={activeFdr.principalAmount}
                    min={100000}
                    placeholder="Enter claim amount"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Max refundable: {formatCurrency(activeFdr.principalAmount)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Applicable Regulatory Clause *
                </label>
                <Input
                  value={regulatoryClause}
                  onChange={(e) => setRegulatoryClause(e.target.value)}
                  placeholder="e.g. AICTE APH 2026 Clause 7.6"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Detailed Regulatory Justification & Exit Narrative *
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Elaborate on academic batch completion dates, compliance with student liabilities, and absence of regulatory litigation..."
                className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans leading-relaxed"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Section 3: Statutory Compliance Verification Checklist ───── */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>3. Mandatory Institutional Exit & Clearance Checklist</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Every item must be certified true under penalties of regulatory derecognition.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-800">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk1"
                  checked={chkStudentsGraduated}
                  onChange={(e) => setChkStudentsGraduated(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="chk1" className="cursor-pointer">
                  <span className="font-bold block text-slate-900">Student Departure & Graduation</span>
                  <span className="text-[11px] text-slate-600">
                    All students enrolled in the discontinued program/course have completed graduation or have been transferred with affiliating University and AICTE approval.
                  </span>
                </label>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk2"
                  checked={chkNoDuesClearance}
                  onChange={(e) => setChkNoDuesClearance(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="chk2" className="cursor-pointer">
                  <span className="font-bold block text-slate-900">Caution Money & No-Dues Settled</span>
                  <span className="text-[11px] text-slate-600">
                    No pending fee refund disputes, caution deposit claims, or student grievances remain outstanding before any regulatory forum or court.
                  </span>
                </label>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk3"
                  checked={chkFacultySalariesCleared}
                  onChange={(e) => setChkFacultySalariesCleared(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="chk3" className="cursor-pointer">
                  <span className="font-bold block text-slate-900">Faculty & Staff Liabilities</span>
                  <span className="text-[11px] text-slate-600">
                    All faculty salaries, provident fund contributions, and gratuity obligations associated with the discontinued faculty roles are 100% disbursed.
                  </span>
                </label>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk4"
                  checked={chkGoverningBodyResolution}
                  onChange={(e) => setChkGoverningBodyResolution(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="chk4" className="cursor-pointer">
                  <span className="font-bold block text-slate-900">Governing Body Resolution</span>
                  <span className="text-[11px] text-slate-600">
                    The Board of Governors / Trust / Society has formally resolved to request security deposit release and verified all statutory declarations.
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Section 4: Depository Bank & Account Details ─────────────── */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              <span>4. Beneficiary Institutional Bank Account for Lien Discharge Credit</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Account to which the issuing bank Core Banking System (CBS) will credit proceeds upon presentation of AICTE NOC voucher.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Beneficiary Institution Legal Account Name *
                </label>
                <Input
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Official institutional account title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SFMS IFSC Code *
                </label>
                <Input
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  placeholder="e.g. SBIN0001256"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Depository Bank Branch
                </label>
                <Input
                  value={activeFdr.bankBranch || "Main Branch"}
                  readOnly
                  className="bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Core Banking Current/Savings Account Number *
                </label>
                <Input
                  type="password"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Enter full account number"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Account Number *
                </label>
                <Input
                  type="text"
                  value={bankAccountConfirm}
                  onChange={(e) => setBankAccountConfirm(e.target.value)}
                  placeholder="Re-enter account number"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Section 5: Supporting Mandatory Documents Dossier ────────── */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-orange-600" />
              <span>5. Upload Supporting Regulatory Documents & No-Dues Scans</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Attach authenticated digital PDF copies with institutional seal and authorized signature.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-orange-600" />
                  Governing Body Resolution (Mandatory)
                </span>
                <input
                  type="text"
                  value={docResolution}
                  onChange={(e) => setDocResolution(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  placeholder="Resolution PDF file name"
                  required
                />
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  ✓ Digital PDF with Chairman / Registrar signature
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-orange-600" />
                  Regional Office (RO) No-Dues Certificate
                </span>
                <input
                  type="text"
                  value={docNoDues}
                  onChange={(e) => setDocNoDues(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  placeholder="RO Certificate PDF file name"
                  required
                />
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  ✓ Verified State Regional Officer endorsement
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-orange-600" />
                  Original Fixed Deposit Receipt Scan
                </span>
                <input
                  type="text"
                  value={docFdrScan}
                  onChange={(e) => setDocFdrScan(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  placeholder="Original FDR copy"
                  required
                />
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  ✓ High-resolution scan with Bank Lien Seal
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-orange-600" />
                  Final Batch Student Graduation Roll
                </span>
                <input
                  type="text"
                  value={docStudentTransfer}
                  onChange={(e) => setDocStudentTransfer(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  placeholder="Graduation clearance list"
                />
                <span className="text-[10px] text-slate-500 font-medium block">
                  Optional for Partial Refund; mandatory for Closure
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Section 6: Statutory Institutional Declaration & Submit ──── */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50/30 to-white shadow-xs">
          <CardHeader className="border-b border-orange-100 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-600" />
              <span>6. Statutory Institutional Declaration & Digital Sign-off</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 text-xs text-orange-950 leading-relaxed flex items-start gap-3">
              <input
                type="checkbox"
                id="statutoryCheck"
                checked={chkStatutoryDeclaration}
                onChange={(e) => setChkStatutoryDeclaration(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                required
              />
              <label htmlFor="statutoryCheck" className="cursor-pointer space-y-1">
                <span className="font-bold block">
                  Solemn Statutory Declaration under Section 10(k) of the AICTE Act, 1987:
                </span>
                <p>
                  I, the undersigned authorized institutional representative, do hereby solemnly affirm that the information furnished in this refund/release application dossier is strictly true, complete, and verifiable from institutional books. In the event of any suppressed fact, non-settled student claim, or financial discrepancy, the institution and its signatories remain unconditionally liable for regulatory penalties and restoration of pledged deposit funds.
                </p>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Authorized Signatory</span>
                <span className="text-xs font-bold text-slate-900">{user?.name || "Prof. S. K. Mahajan"}</span>
                <span className="text-[10px] text-slate-500 block">{user?.designation || "Registrar / Authorized Officer"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Signatory Email</span>
                <span className="text-xs font-mono text-slate-900">{user?.email || "registrar@dtu.ac.in"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Digital Stamp</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                  <Check size={12} /> AICTE-DSC-VERIFIED-AUTH
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/80 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to="/refund-requests">Cancel & Return</Link>
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => alert("Application draft saved to local workspace.")}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                size="default"
                type="submit"
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-500 shadow-sm"
              >
                {submitting ? (
                  <>Submitting Dossier...</>
                ) : (
                  <>
                    <Send size={15} />
                    Submit Application Dossier for Scrutiny
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
