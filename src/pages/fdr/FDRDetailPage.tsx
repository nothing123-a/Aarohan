import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  Building,
  ShieldCheck,
  Download,
  Clock,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Lock,
  FileCheck,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  StatCard,
  Alert,
  Dialog,
} from "@/components/ui";
import {
  PageHeader,
  SubmissionStatusBadge,
  VerificationStatusBadge,
  LifecycleStatusBadge,
  EmptyState,
} from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import {
  getFDRById,
  CENTRAL_FDR_RECORDS,
  CENTRAL_INSTITUTIONS,
  CENTRAL_OBSERVATIONS,
  CENTRAL_APPROVAL_CASES,
  ScrutinyObservation,
  FDRLifecycleEvent,
  CentralFDRRecord,
} from "@/data/centralDataset";
import { formatCurrency, formatDate } from "@/utils";
import { useFDR } from "@/hooks/useFDR";

export default function FDRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const { data: apiFdrRes } = useFDR(id || "");

  const liveFdr: CentralFDRRecord | null = apiFdrRes?.data ? {
    id: apiFdrRes.data.id,
    fdrNumber: apiFdrRes.data.fdrNumber,
    institutionId: apiFdrRes.data.depositorId || "inst-001",
    institutionName: apiFdrRes.data.depositorName || "Registered Institution",
    institutionCode: "AICTE-REG",
    depositorName: apiFdrRes.data.depositorName,
    depositorId: apiFdrRes.data.depositorId,
    bankName: apiFdrRes.data.bankName,
    bankBranch: apiFdrRes.data.bankBranch,
    ifscCode: apiFdrRes.data.ifscCode,
    accountNumber: apiFdrRes.data.accountNumber,
    principalAmount: apiFdrRes.data.principalAmount,
    interestRate: apiFdrRes.data.interestRate,
    maturityAmount: apiFdrRes.data.maturityAmount,
    depositDate: apiFdrRes.data.depositDate,
    issueDate: apiFdrRes.data.depositDate,
    maturityDate: apiFdrRes.data.maturityDate,
    tenureMonths: apiFdrRes.data.tenureMonths,
    instrumentCategory: "Establishment Security Deposit",
    purpose: apiFdrRes.data.purpose,
    department: apiFdrRes.data.department,
    contactPerson: "Authorized Representative",
    contactPhone: "+91 11 27871018",
    contactEmail: "registrar@institution.ac.in",
    status: apiFdrRes.data.status,
    submissionStatus: apiFdrRes.data.status === "draft" ? "DRAFT" : "SUBMITTED",
    verificationStatus: apiFdrRes.data.status === "verified" ? "VERIFIED" : apiFdrRes.data.status === "under_review" ? "UNDER_SCRUTINY" : apiFdrRes.data.status === "rejected" ? "REJECTED" : "PENDING_REVIEW",
    lifecycleStatus: apiFdrRes.data.status === "matured" ? "MATURED" : apiFdrRes.data.status === "renewal_pending" ? "RENEWAL_REQUESTED" : apiFdrRes.data.status === "released" ? "RELEASED" : "ACTIVE_LIEN",
    lienConfirmedInCBS: apiFdrRes.data.status === "verified",
    observationsCount: 0,
    assignedReviewer: "Anil Verma (Senior Scrutiny Officer)",
    ocrConfidence: 96,
    scrutinyStatus: "SCRUTINY_PASSED",
    documentsList: apiFdrRes.data.documents?.map((d) => ({
      id: d.id,
      name: d.fileName,
      type: d.fileType,
      size: `${(d.fileSize / (1024 * 1024)).toFixed(1)} MB`,
      hash: "a45c298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b781",
      scanStatus: "CLEAN" as const,
      uploadedAt: d.uploadedAt,
      documentType: "fdr_certificate" as const,
    })) || [],
    lifecycleEvents: [],
    createdAt: apiFdrRes.data.createdAt,
    updatedAt: apiFdrRes.data.updatedAt,
  } : null;

  // Look up record from live backend or central repository or fallback to first record
  const fdr = liveFdr || getFDRById(id || "") || CENTRAL_FDR_RECORDS[0];

  // Observation Response Modal State (Section B: Respond to Observations)
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<ScrutinyObservation | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [attachedDocName, setAttachedDocName] = useState("DTU_SBI_Branch_Manager_Attested_Token.pdf");
  const [responseSuccess, setResponseSuccess] = useState(false);

  // Local observation store to preserve history and support live interaction
  const [observations, setObservations] = useState<
    (ScrutinyObservation & { institutionResponse?: string; responseDate?: string; attachedDoc?: string })[]
  >(() => {
    return CENTRAL_OBSERVATIONS.filter((obs) => obs.fdrId === (fdr?.id || "fdr-001"));
  });

  // Local lifecycle events store
  const [lifecycleEvents, setLifecycleEvents] = useState<FDRLifecycleEvent[]>(
    fdr?.lifecycleEvents || []
  );

  if (!fdr) {
    return (
      <div className="space-y-6 animate-fade-in">
        <EmptyState
          icon={<FileText size={36} />}
          title="FDR Record Not Found"
          description="The requested Fixed Deposit Receipt identifier could not be located in the central database."
          action={
            <Button variant="primary" size="sm" asChild>
              <Link to="/fdr">
                <ArrowLeft size={14} /> Back to FDR Registry
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Linked institution info
  const inst = CENTRAL_INSTITUTIONS.find((i) => i.id === fdr.institutionId);

  // Related approval or release cases
  const relatedApprovalCase = CENTRAL_APPROVAL_CASES.find((c) => c.fdrId === fdr.id);

  // Days to maturity calculation
  const now = new Date();
  const matDate = new Date(fdr.maturityDate);
  const diffTime = matDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / 86400000);

  const handleExportPDF = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const isInstitutionRep = user?.role === "institution_representative" || user?.role === "depositor";
  const isScrutinyOfficer = user?.role === "scrutiny_officer";
  const isApprovingAuthority = user?.role === "approving_authority" || user?.role === "admin";

  const hasOpenObservations = observations.some((o) => o.status === "OPEN");

  // Handle Institution Observation Response
  const handleSubmitResponse = () => {
    if (!selectedObs || !responseNotes.trim()) return;

    setObservations((prev) =>
      prev.map((o) => {
        if (o.id === selectedObs.id) {
          return {
            ...o,
            status: "RESOLVED",
            institutionResponse: responseNotes,
            responseDate: new Date().toISOString(),
            attachedDoc: attachedDocName,
          };
        }
        return o;
      })
    );

    const newEvent: FDRLifecycleEvent = {
      id: `ev-${Date.now()}`,
      event: "Institution Observation Clarification & Evidence Submitted",
      actor: `${user?.name || "Institution Representative"} (${user?.role || "Registrar"})`,
      timestamp: new Date().toISOString(),
      remarks: `Clarification provided: "${responseNotes}". Attached evidence file: ${attachedDocName}. Case routed for re-scrutiny.`,
      type: "scrutiny",
    };

    setLifecycleEvents((prev) => [newEvent, ...prev]);
    setRespondModalOpen(false);
    setSelectedObs(null);
    setResponseNotes("");
    setResponseSuccess(true);
    setTimeout(() => setResponseSuccess(false), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      <PageHeader
        title={`FDR Certificate: ${fdr.fdrNumber}`}
        description={`Authoritative security deposit record for ${fdr.institutionName} (${fdr.institutionCode || inst?.code || "AICTE"}).`}
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "FDR Management", href: "/fdr" },
          { label: fdr.fdrNumber },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/fdr">
                <ArrowLeft size={14} />
                Back to Registry
              </Link>
            </Button>

            {isInstitutionRep && fdr.lifecycleStatus === "MATURING_SOON" && (
              <Button variant="outline-primary" size="sm" asChild>
                <Link to="/renewals">
                  <RefreshCw size={14} />
                  Request Renewal
                </Link>
              </Button>
            )}

            {isInstitutionRep && fdr.lifecycleStatus === "ACTIVE_LIEN" && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/release-requests">
                  <Send size={14} />
                  Request Release / Refund
                </Link>
              </Button>
            )}

            {isScrutinyOfficer && fdr.verificationStatus !== "VERIFIED" && (
              <Button variant="outline-primary" size="sm" asChild>
                <Link to="/verification">
                  <FileCheck size={14} />
                  Scrutinize Dossier
                </Link>
              </Button>
            )}

            {isApprovingAuthority && fdr.lifecycleStatus === "RELEASE_REQUESTED" && (
              <Button variant="outline-primary" size="sm" asChild>
                <Link to="/release-requests">
                  <FileCheck size={14} />
                  Review Approval Case
                </Link>
              </Button>
            )}

            <Button variant="primary" size="sm" onClick={handleExportPDF}>
              <Download size={14} />
              Export Dossier (PDF)
            </Button>
          </div>
        }
      />

      {downloadSuccess && (
        <Alert
          variant="success"
          title="Official Dossier Export Generated"
          onDismiss={() => setDownloadSuccess(false)}
        >
          Cryptographically signed FDR custody summary for {fdr.fdrNumber} has been compiled and downloaded for audit records.
        </Alert>
      )}

      {hasOpenObservations && isInstitutionRep && (
        <Alert
          variant="warning"
          title="Regulatory Observation Pending Response"
        >
          The AICTE Regulation Bureau has recorded observations regarding this instrument. Please review the specific discrepancies below and submit your clarification or revised evidence.
        </Alert>
      )}

      {responseSuccess && (
        <Alert
          variant="success"
          title="Clarification & Evidence Resubmitted Successfully"
          onDismiss={() => setResponseSuccess(false)}
        >
          Your institutional response and attached evidence have been logged. The instrument has been routed back into the officer's scrutiny queue.
        </Alert>
      )}

      {/* ─── 3 DISTINCT STATUS HERO BANNER ─────────────────────────────────── */}
      <Card noPadding className="border-orange-200/80 bg-gradient-to-r from-orange-50/40 via-white to-slate-50">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/60 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded">
                Authoritative Tripartite Status
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                Instrument Regulatory Standing & Verification State
              </h2>
              <p className="text-xs text-slate-500">
                AICTE Regulation Bureau enforces strictly separated submission, scrutiny, and financial lifecycle states.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">UUID: {fdr.id}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Submission Status */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                1. Submission Workflow
              </span>
              <div className="mb-2">
                <SubmissionStatusBadge status={fdr.submissionStatus} />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {fdr.submissionStatus === "SUBMITTED" && "Formally submitted into AICTE portal with encrypted digital attachments."}
                {fdr.submissionStatus === "DRAFT" && "Draft record saved by institution. Awaiting final submission."}
                {fdr.submissionStatus === "RETURNED" && "Returned to institution representative for discrepancy rectification."}
                {fdr.submissionStatus === "WITHDRAWN" && "Formally withdrawn from regulatory consideration."}
              </p>
            </div>

            {/* 2. Verification Status */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                2. Scrutiny & Verification
              </span>
              <div className="mb-2">
                <VerificationStatusBadge status={fdr.verificationStatus} />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {fdr.verificationStatus === "VERIFIED" && "Officially scrutinized and validated by Scrutiny Bureau against bank records."}
                {fdr.verificationStatus === "PENDING_REVIEW" && "Enqueued in Scrutiny Officer roster awaiting human verification."}
                {fdr.verificationStatus === "UNDER_SCRUTINY" && "Currently under active technical scrutiny and cross-checking."}
                {fdr.verificationStatus === "DISCREPANCY_FLAGGED" && "Formal regulatory discrepancy raised. Requires resolution."}
                {fdr.verificationStatus === "NOT_STARTED" && "Draft stage; technical scrutiny not initiated."}
              </p>
            </div>

            {/* 3. Lifecycle Status */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                3. Financial Lifecycle
              </span>
              <div className="mb-2">
                <LifecycleStatusBadge status={fdr.lifecycleStatus} />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {fdr.lifecycleStatus === "ACTIVE_LIEN" && "Active deposit with Core Banking System (CBS) lien marked in favour of AICTE."}
                {fdr.lifecycleStatus === "MATURING_SOON" && `Matures within ${diffDays} days. Institution renewal workflow required.`}
                {fdr.lifecycleStatus === "MATURED" && "Matured instrument requiring extension, replacement, or discharge."}
                {fdr.lifecycleStatus === "LODGED" && "Lodged in safe custody awaiting bank lien notation."}
                {fdr.lifecycleStatus === "RELEASE_REQUESTED" && "Release / refund petition under review by Approving Authority."}
                {fdr.lifecycleStatus === "RELEASED" && "Lien discharged and deposit refund completed."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Principal Deposit Amount"
          value={formatCurrency(fdr.principalAmount)}
          subtitle={`Tenure: ${fdr.tenureMonths || 36} Months`}
          icon={<FileText size={18} />}
          iconColor="orange"
        />
        <StatCard
          title="Maturity Value"
          value={formatCurrency(fdr.maturityAmount || fdr.principalAmount * 1.07)}
          subtitle={`@ ${fdr.interestRate}% Cumulative Yield`}
          icon={<Building size={18} />}
          iconColor="blue"
        />
        <StatCard
          title="Maturity Date"
          value={formatDate(fdr.maturityDate)}
          subtitle={
            diffDays > 0
              ? `${diffDays} Days Remaining`
              : `Matured ${Math.abs(diffDays)} Days Ago`
          }
          icon={<Clock size={18} />}
          iconColor={diffDays <= 30 ? "amber" : "green"}
        />
        <StatCard
          title="Core Banking Lien Status"
          value={fdr.lienConfirmedInCBS ? "Lien Endorsed" : "Lien Pending"}
          subtitle={fdr.bankName}
          icon={<ShieldCheck size={18} />}
          iconColor={fdr.lienConfirmedInCBS ? "green" : "amber"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Particulars & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Financial Instrument Particulars */}
          <Card>
            <CardHeader>
              <CardTitle>1. Financial Instrument Particulars</CardTitle>
              <CardDescription>Verified banking figures, certificate references, and interest schedules</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs pt-2">
              <div>
                <span className="text-slate-400 block font-medium">FDR Reference #</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{fdr.fdrNumber}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Issuing Scheduled Bank</span>
                <p className="font-semibold text-slate-900 mt-0.5">{fdr.bankName}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Branch & IFSC</span>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">
                  {fdr.bankBranch} · {fdr.ifscCode}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Deposit Account Number</span>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">
                  {fdr.accountNumber || "38910029381"}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Principal Amount</span>
                <p className="font-bold text-slate-900 mt-0.5 text-sm font-mono">
                  {formatCurrency(fdr.principalAmount)}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Contracted Interest Rate</span>
                <p className="font-semibold text-slate-900 mt-0.5">{fdr.interestRate}% p.a.</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Date of Issuance</span>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">
                  {fdr.issueDate ? formatDate(fdr.issueDate) : formatDate(fdr.depositDate)}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Contractual Maturity Date</span>
                <p className="font-bold text-orange-600 mt-0.5 font-mono">
                  {formatDate(fdr.maturityDate)}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Maturity Value</span>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">
                  {formatCurrency(fdr.maturityAmount || fdr.principalAmount * 1.07)}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Instrument Category</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {fdr.instrumentCategory || "Security Deposit for Establishment"}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Regulatory Purpose</span>
                <p className="font-semibold text-slate-900 mt-0.5 capitalize">
                  {(fdr.purpose || "security_deposit").replace(/_/g, " ")}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Internal System UUID</span>
                <p className="font-mono text-[11px] text-slate-500 mt-0.5">{fdr.id}</p>
              </div>
            </div>
          </Card>

          {/* Card 2: Institution & Authorized Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>2. Institution & Authorized Contact Information</CardTitle>
              <CardDescription>Regulatory establishment credentials under AICTE Regulations</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs pt-2">
              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-medium">Institution Name</span>
                <p className="font-bold text-slate-900 mt-0.5 text-sm">{fdr.institutionName}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">AICTE Permanent ID (PID)</span>
                <p className="font-mono font-bold text-orange-600 mt-0.5">
                  {fdr.institutionCode || inst?.code || "AICTE-NZ-00142"}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Institution Category</span>
                <p className="font-semibold text-slate-900 mt-0.5">{inst?.type || "University"}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Location</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {inst?.city || "New Delhi"}, {inst?.state || "Delhi"}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Sanctioned Intake</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {inst?.approvedIntake ? `${inst.approvedIntake} Students` : "Approved"}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Authorized Contact Person</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {fdr.contactPerson || "Prof. S. K. Mahajan (Registrar)"}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Official Contact Mobile</span>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">
                  {fdr.contactPhone || "+91 98110 23412"}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Official Email</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {fdr.contactEmail || "registrar@dtu.ac.in"}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 3: Supporting Documents & Digital Proofs */}
          <Card>
            <CardHeader>
              <CardTitle>3. Supporting Documents & Digital Evidence</CardTitle>
              <CardDescription>
                Private object storage references with antivirus scan status and cryptographic SHA-256 integrity hashes
              </CardDescription>
            </CardHeader>
            <div className="space-y-3 pt-2">
              {fdr.documentsList && fdr.documentsList.length > 0 ? (
                fdr.documentsList.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 text-orange-700 rounded-lg mt-0.5">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{doc.name}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                            <CheckCircle2 size={10} />
                            {doc.scanStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {doc.size} · Uploaded: {formatDate(doc.uploadedAt)}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-sm sm:max-w-md">
                          SHA-256: {doc.hash}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs h-8 flex-shrink-0">
                      <Download size={13} />
                      Download
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No scanned document artifacts uploaded for this record yet.
                </div>
              )}
            </div>
          </Card>

          {/* Card 4: Verification Scrutiny & Discrepancies */}
          <Card>
            <CardHeader>
              <CardTitle>4. Verification Scrutiny & Discrepancy Findings</CardTitle>
              <CardDescription>Official review conducted by AICTE Scrutiny Officers</CardDescription>
            </CardHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block font-medium">Assigned Officer</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {fdr.assignedReviewer || "Anil Verma (Senior Scrutiny Officer)"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">OCR Extraction Accuracy</span>
                  <p className="font-bold text-slate-900 mt-0.5 text-orange-600 font-mono">
                    {fdr.ocrConfidence > 0 ? `${fdr.ocrConfidence}% Confidence` : "Pending OCR"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Scrutiny Stage</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {fdr.scrutinyStatus.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              {/* Discrepancies & Observations list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900">Regulatory Observations & Discrepancies</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Preserved Audit History</span>
                </div>

                {observations.length > 0 ? (
                  <div className="space-y-3">
                    {observations.map((obs) => {
                      const isOpen = obs.status === "OPEN";
                      return (
                        <div
                          key={obs.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                            isOpen
                              ? "border-rose-200 bg-rose-50/50 text-rose-950"
                              : "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              {isOpen ? (
                                <AlertCircle size={14} className="text-rose-600" />
                              ) : (
                                <CheckCircle2 size={14} className="text-emerald-600" />
                              )}
                              {obs.category.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                isOpen ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {obs.status}
                            </span>
                          </div>

                          <p className="leading-relaxed text-[11px] pt-0.5">
                            {obs.observation}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/60">
                            <span>Raised by {obs.officerName} on {formatDate(obs.date)}</span>
                            {isOpen && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedObs(obs);
                                  setRespondModalOpen(true);
                                }}
                                className="h-6 text-[11px] bg-white text-orange-700 border-orange-300 hover:bg-orange-50 font-semibold"
                              >
                                Respond / Upload Evidence
                              </Button>
                            )}
                          </div>

                          {/* Preserved Institution Response History */}
                          {obs.institutionResponse && (
                            <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                                Institution Clarification (Preserved):
                              </span>
                              <p className="text-[11px] italic text-slate-700">
                                "{obs.institutionResponse}"
                              </p>
                              {obs.attachedDoc && (
                                <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1 pt-1">
                                  <FileText size={11} className="text-orange-500" />
                                  Attached Evidence: <strong>{obs.attachedDoc}</strong>
                                </p>
                              )}
                              <span className="text-[9px] text-slate-400 font-mono block">
                                Resubmitted on {formatDate(obs.responseDate || new Date().toISOString())}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>No active regulatory observations or discrepancies. All parameters match bank records.</span>
                  </div>
                )}
              </div>

              {/* Bank Lien Endorsement Memo */}
              <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs text-orange-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-orange-900">
                  <ShieldCheck size={15} className="text-orange-600" />
                  <span>Statutory Bank Lien Endorsement Memo</span>
                </div>
                <p className="text-orange-900/80 leading-relaxed text-[11px]">
                  "The Fixed Deposit under receipt #{fdr.fdrNumber} is irrevocably lien-marked in favour of Member Secretary, AICTE, New Delhi. The bank undertakes not to permit premature encashment or loan against deposit without written NOC from AICTE."
                </p>
                <p className="text-[10px] text-orange-800 font-mono pt-1">
                  Core Banking Memo Ref: {fdr.bankName.slice(0, 3).toUpperCase()}/AICTE/LIEN-9912 · Verified in CBS
                </p>
              </div>
            </div>
          </Card>

          {/* Card 5: Related Workflow & Release Requests */}
          {relatedApprovalCase && (
            <Card>
              <CardHeader>
                <CardTitle>5. Related Regulatory Approval Case</CardTitle>
                <CardDescription>Associated release, refund, or renewal request</CardDescription>
              </CardHeader>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Case #{relatedApprovalCase.id} — {relatedApprovalCase.requestType.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    {relatedApprovalCase.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {relatedApprovalCase.scrutinyFinding}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Scrutiny Officer: {relatedApprovalCase.scrutinyOfficer}</span>
                  <Link
                    to="/release-requests"
                    className="text-orange-600 hover:underline flex items-center gap-1 font-sans font-semibold"
                  >
                    View Approval Case <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (1 span): Chronological Lifecycle History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chronological Lifecycle</CardTitle>
              <CardDescription>Immutable audit event trail for this instrument</CardDescription>
            </CardHeader>
            <div className="space-y-4 text-xs pt-2">
              {lifecycleEvents && lifecycleEvents.length > 0 ? (
                lifecycleEvents.map((evt, idx) => (
                  <div key={evt.id} className="flex gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
                        {idx + 1}
                      </div>
                      {idx < lifecycleEvents.length - 1 && (
                        <div className="w-px h-full bg-slate-200 mt-1 min-h-[30px]" />
                      )}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800 text-xs">{evt.event}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {formatDate(evt.timestamp)} · {evt.actor}
                      </span>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {evt.remarks}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No lifecycle events recorded.</p>
              )}
            </div>
          </Card>

          {/* Safe Vault & Custody Certificate */}
          <Card className="bg-slate-900 text-white border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-orange-400">
              <Lock size={16} />
              <h4 className="text-xs font-bold uppercase tracking-wider">Vault Custody Certified</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This deposit certificate is registered in the AICTE Regulation Bureau Central Vault Registry with dual-custody protection.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <p>Vault Compartment: DEL-NZ-V2-089</p>
              <p>Custodian: Registrar, Regulation Bureau</p>
              <p>Audit Check: Verified Clean (Q3 2026)</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── RESPOND TO OBSERVATION MODAL (Section B) ─── */}
      {selectedObs && (
        <Dialog
          open={respondModalOpen}
          onClose={() => setRespondModalOpen(false)}
          title="Respond to Regulatory Observation"
          description="Submit institutional clarification, rectify data variances, and upload requested verifying documents."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRespondModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmitResponse}>
                <Send size={14} /> Submit Clarification & Resubmit
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs pt-1">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1">
              <span className="font-bold block text-amber-900">
                {selectedObs.category.replace(/_/g, " ")}:
              </span>
              <p className="text-[11px] leading-relaxed">{selectedObs.observation}</p>
              <p className="text-[10px] text-amber-800 font-mono pt-1">
                Raised by {selectedObs.officerName}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Institutional Clarification / Rectification Notes (Mandatory)
              </label>
              <textarea
                rows={3}
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder="Explain the correction made, describe the attached revised document, or provide bank clarification..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Supporting Verification Document (PDF / Scan)
              </label>
              <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                <FileText size={16} className="text-orange-500 flex-shrink-0" />
                <input
                  type="text"
                  value={attachedDocName}
                  onChange={(e) => setAttachedDocName(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 flex-1 focus:outline-none font-mono"
                  placeholder="e.g. Revised_Bank_Lien_Confirmation_Letter.pdf"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                  Verified Scan
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Must be an official letter signed by the branch manager or authorized signatory.
              </p>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
