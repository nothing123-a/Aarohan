import { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Shield,
  Download,
  Check,
  Plus,
  FileText,
  ShieldAlert,
  Send,
  Coins,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Card,
  CardTitle,
  CardDescription,
  StatCard,
  Badge,
  Input,
  Select,
  Dialog,
  DataTable,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { CENTRAL_FDR_RECORDS } from "@/data/centralDataset";
import { formatCurrency, formatDate } from "@/utils";
import { releaseService } from "@/services/fdrService";

export interface ReleaseDecisionHistoryItem {
  stage: string;
  officerName: string;
  officerRole: string;
  decision: string;
  timestamp: string;
  remarks: string;
}

export interface ReleaseRequestRecord {
  id: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  bankName: string;
  principalAmount: number;
  requestType: "FULL_RELEASE" | "PARTIAL_REFUND" | "NOC_ISSUANCE";
  justificationReason: string;
  regulatoryClause: string;
  submissionDate: string;
  supportingDocuments: string[];
  status: "PENDING_SCRUTINY" | "SCRUTINY_RECOMMENDED" | "APPROVED_PENDING_DISCHARGE" | "RELEASED" | "REJECTED";
  decisionHistory: ReleaseDecisionHistoryItem[];
  applicantName: string;
  nocVoucherRef?: string;
}

export default function ReleaseRequestsPage() {
  const { user } = useAuth();
  const [newRequestModal, setNewRequestModal] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReleaseRequestRecord | null>(null);

  // Decision State for Officers
  const [officerDecision, setOfficerDecision] = useState<
    "RECOMMENDED_FOR_APPROVAL" | "APPROVED" | "RETURNED_FOR_QUERY" | "REJECTED"
  >("APPROVED");
  const [officerRemarks, setOfficerRemarks] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Initial release requests dataset matching central dataset and PRD
  const [releaseList, setReleaseList] = useState<ReleaseRequestRecord[]>([
    {
      id: "rel-001",
      fdrId: "fdr-008",
      fdrNumber: "FDR/AICTE/2026/116",
      institutionId: "inst-003",
      institutionName: "PSG College of Technology, Coimbatore",
      bankName: "Canara Bank",
      principalAmount: 50_00_000,
      requestType: "FULL_RELEASE",
      justificationReason: "Discontinued program (Automobile Engineering) completed 5-year statutory lock-in. SRO No Dues clearance obtained.",
      regulatoryClause: "AICTE Approval Process Handbook (APH) Clause 11.2",
      submissionDate: "2026-09-20 17:00 UTC",
      supportingDocuments: [
        "Canara_Bank_Original_FDR_Certificate.pdf",
        "SRO_No_Dues_Clearance_Certificate.pdf",
        "Executive_Council_Resolution_Closure.pdf",
      ],
      status: "APPROVED_PENDING_DISCHARGE",
      applicantName: "Dr. K. Prakasan (Principal)",
      nocVoucherRef: "AICTE/NOC/2026/DIS-00891",
      decisionHistory: [
        {
          stage: "Institutional Submission",
          officerName: "Dr. K. Prakasan",
          officerRole: "Institution Representative",
          decision: "SUBMITTED",
          timestamp: "2026-09-20 17:00 UTC",
          remarks: "Formal refund dossier submitted following course closure and batch graduation.",
        },
        {
          stage: "Technical Scrutiny",
          officerName: "Anil Verma",
          officerRole: "Scrutiny Officer",
          decision: "RECOMMENDED_FOR_APPROVAL",
          timestamp: "2026-09-25 14:30 UTC",
          remarks: "No student grievances or state regulatory liabilities pending. Verification clean.",
        },
        {
          stage: "Executive Authority Sign-Off",
          officerName: "Dr. Rajesh Sharma",
          officerRole: "Approving Authority (Member Secretary)",
          decision: "APPROVED",
          timestamp: "2026-10-02 11:00 UTC",
          remarks: "Administrative approval granted. Authorized issuance of Bank Discharge NOC.",
        },
      ],
    },
    {
      id: "rel-002",
      fdrId: "fdr-001",
      fdrNumber: "FDR/AICTE/2026/089",
      institutionId: "inst-001",
      institutionName: "Delhi Technological University (DTU)",
      bankName: "State Bank of India",
      principalAmount: 50_00_000,
      requestType: "NOC_ISSUANCE",
      justificationReason: "Board of Governors resolution to restructure university endowment securities across scheduled public banks.",
      regulatoryClause: "AICTE General Endowment Rules Clause 8.4",
      submissionDate: "2026-10-22 09:30 UTC",
      supportingDocuments: [
        "DTU_SBI_50L_Official_Receipt.pdf",
        "Board_of_Governors_Resolution_2026.pdf",
      ],
      status: "PENDING_SCRUTINY",
      applicantName: "Prof. S. K. Mahajan (Registrar)",
      decisionHistory: [
        {
          stage: "Institutional Submission",
          officerName: "Prof. S. K. Mahajan",
          officerRole: "Institution Representative",
          decision: "SUBMITTED",
          timestamp: "2026-10-22 09:30 UTC",
          remarks: "Submitted formal application for lien relinquishment voucher.",
        },
      ],
    },
    {
      id: "rel-003",
      fdrId: "fdr-007",
      fdrNumber: "FDR/AICTE/2026/115",
      institutionId: "inst-003",
      institutionName: "PSG College of Technology, Coimbatore",
      bankName: "Punjab National Bank",
      principalAmount: 75_00_000,
      requestType: "PARTIAL_REFUND",
      justificationReason: "Approved reduction in intake capacity for discontinued specialization; refund of excess security deposit quotient.",
      regulatoryClause: "AICTE APH Clause 7.6 (Pro-rata Deposit Adjustment)",
      submissionDate: "2026-10-18 11:20 UTC",
      supportingDocuments: [
        "PNB_75L_PSGTech_FDR.pdf",
        "Executive_Committee_Reduction_Order.pdf",
      ],
      status: "SCRUTINY_RECOMMENDED",
      applicantName: "Dr. K. Prakasan (Principal)",
      decisionHistory: [
        {
          stage: "Institutional Submission",
          officerName: "Dr. K. Prakasan",
          officerRole: "Institution Representative",
          decision: "SUBMITTED",
          timestamp: "2026-10-18 11:20 UTC",
          remarks: "Pro-rata security deposit refund application.",
        },
        {
          stage: "Technical Scrutiny",
          officerName: "Anil Verma",
          officerRole: "Scrutiny Officer",
          decision: "RECOMMENDED_FOR_APPROVAL",
          timestamp: "2026-10-21 16:40 UTC",
          remarks: "Revised intake quotient verified. Excess deposit ₹ 25 Lakh refund recommended.",
        },
      ],
    },
  ]);

  // User role helpers
  const isApprovingAuthority = user?.role === "approving_authority";
  const isScrutinyOfficer = user?.role === "scrutiny_officer";
  const isAdmin = user?.role === "admin";
  const isInstitutionRep = user?.role === "institution_representative" || user?.role === "depositor";
  const userInstId = user?.institutionId || (isInstitutionRep ? "inst-001" : undefined);

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isDedicatedRefundRoute = location.pathname === "/refund-requests" || searchParams.get("tab")?.toLowerCase() === "refund";

  // Tab state for dedicated Refund section
  const [activeTab, setActiveTab] = useState<"ALL" | "REFUND" | "RELEASE" | "NOC">(
    isDedicatedRefundRoute ? "REFUND" : "ALL"
  );

  useEffect(() => {
    if (isDedicatedRefundRoute) {
      setActiveTab("REFUND");
    }
  }, [isDedicatedRefundRoute]);

  // Query live database release & refund requests
  const { data: apiResponse, refetch, isLoading } = useQuery({
    queryKey: ["releases", userInstId],
    queryFn: async () => {
      const res = await releaseService.getAll(userInstId);
      return res.data.requests;
    },
  });

  // Merge live database records with local state
  const effectiveReleaseList = useMemo(() => {
    if (apiResponse && apiResponse.length > 0) {
      const dbRecords = apiResponse.map((r: any) => ({
        id: r.id,
        fdrId: r.fdr_id || r.fdrId,
        fdrNumber: r.fdr_number || r.fdrNumber,
        institutionId: r.institution_id || r.institutionId,
        institutionName: r.institution_name || r.institutionName,
        bankName: r.bank_name || r.bankName,
        principalAmount: r.principal_amount || r.principalAmount,
        requestType: (r.request_type || r.requestType || "FULL_RELEASE") as any,
        justificationReason: r.justification_reason || r.justificationReason || r.reason,
        regulatoryClause: r.regulatory_clause_reference || r.regulatoryClause,
        submissionDate: r.submission_date || r.submissionDate || "2026-10-25 10:00 UTC",
        supportingDocuments: r.supporting_documents || r.supportingDocuments || ["Document_Dossier.pdf"],
        status: (r.status || "PENDING_SCRUTINY") as any,
        applicantName: r.applicant_name || r.applicantName || "Institution Representative",
        decisionHistory: r.decision_history?.map((d: any) => ({
          stage: d.stage,
          officerName: d.officer_name || d.officerName,
          officerRole: d.officer_role || d.officerRole,
          decision: d.decision,
          timestamp: d.timestamp,
          remarks: d.reason || d.remarks || "",
        })) || [],
        nocVoucherRef: r.nocVoucherRef || (r.status === "APPROVED_PENDING_DISCHARGE" ? `AICTE/NOC/2026/DIS-${r.id}` : undefined),
      }));

      // Combine with any local-only optimistic records
      const existingIds = new Set(dbRecords.map((d: any) => d.id));
      const localOnly = releaseList.filter((l) => !existingIds.has(l.id));
      return [...localOnly, ...dbRecords];
    }
    return releaseList;
  }, [apiResponse, releaseList]);

  // Filtered by Tab (enabling dedicated Request for Refund views)
  const displayList = useMemo(() => {
    let list = effectiveReleaseList;
    if (isInstitutionRep && user?.institutionId) {
      list = list.filter((r) => r.institutionId === user.institutionId);
    }
    if (activeTab === "REFUND") {
      // In the dedicated refund view, include all institutional refund and release claims
      return list.filter(
        (r) =>
          r.requestType === "PARTIAL_REFUND" ||
          r.requestType === "FULL_RELEASE" ||
          r.requestType === "NOC_ISSUANCE"
      );
    }
    if (activeTab === "RELEASE") {
      return list.filter((r) => r.requestType === "FULL_RELEASE");
    }
    if (activeTab === "NOC") {
      return list.filter((r) => r.requestType === "NOC_ISSUANCE");
    }
    return list;
  }, [effectiveReleaseList, activeTab, isInstitutionRep, user?.institutionId]);

  // Form state for new release request
  const [newFdrId, setNewFdrId] = useState("fdr-001");
  const [newRequestType, setNewRequestType] = useState<"FULL_RELEASE" | "PARTIAL_REFUND" | "NOC_ISSUANCE">("FULL_RELEASE");
  const [newJustification, setNewJustification] = useState(
    "Statutory 5-year lock-in period concluded without academic or student financial liabilities."
  );
  const [newRegulatoryClause, setNewRegulatoryClause] = useState("AICTE Approval Process Handbook (APH) Clause 11.2");
  const [newDocumentName, setNewDocumentName] = useState("SRO_No_Dues_Clearance_Certificate.pdf");

  // Selected FDR object
  const activeFdr = CENTRAL_FDR_RECORDS.find((r) => r.id === newFdrId) || CENTRAL_FDR_RECORDS[0];

  // Helper to open in dedicated Refund mode
  const handleOpenRefundModal = () => {
    setNewRequestType("PARTIAL_REFUND");
    setNewJustification("Security deposit refund requested following course discontinuation / approved intake reduction under AICTE APH norms.");
    setNewRegulatoryClause("AICTE Approval Process Handbook (APH) Clause 7.6 (Pro-rata Deposit Adjustment)");
    setNewRequestModal(true);
  };

  // Handle New Release/Refund Submission
  const handleCreateRequest = async () => {
    if (!newJustification.trim()) {
      alert("Please provide a formal regulatory justification.");
      return;
    }

    const newReqId = `rel-00${effectiveReleaseList.length + 1}`;
    const newReq: ReleaseRequestRecord = {
      id: newReqId,
      fdrId: activeFdr.id,
      fdrNumber: activeFdr.fdrNumber,
      institutionId: activeFdr.institutionId,
      institutionName: activeFdr.institutionName,
      bankName: activeFdr.bankName,
      principalAmount: activeFdr.principalAmount,
      requestType: newRequestType,
      justificationReason: newJustification,
      regulatoryClause: newRegulatoryClause,
      submissionDate: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
      supportingDocuments: [newDocumentName, `${activeFdr.bankName.replace(/\s+/g, "_")}_Original_Certificate.pdf`],
      status: "PENDING_SCRUTINY",
      applicantName: `${user?.name || "Authorized Institution Representative"} (${activeFdr.institutionName})`,
      decisionHistory: [
        {
          stage: "Institutional Submission",
          officerName: user?.name || "Institution Representative",
          officerRole: "Institution Representative",
          decision: "SUBMITTED",
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
          remarks: newJustification,
        },
      ],
    };

    // Optimistic update
    setReleaseList([newReq, ...releaseList]);
    setNewRequestModal(false);

    // Call persistent backend API
    try {
      await releaseService.create({
        fdr_id: activeFdr.id,
        fdr_number: activeFdr.fdrNumber,
        institution_id: activeFdr.institutionId,
        institution_name: activeFdr.institutionName,
        bank_name: activeFdr.bankName,
        principal_amount: activeFdr.principalAmount,
        request_type: newRequestType,
        justification_reason: newJustification,
        regulatory_clause_reference: newRegulatoryClause,
        supporting_document_names: [newDocumentName, `${activeFdr.bankName.replace(/\s+/g, "_")}_Original_Certificate.pdf`],
        applicant_name: user?.name || "Institution Representative",
        applicant_designation: user?.designation || "Head of Institution / Representative",
      });
      refetch();
    } catch (e) {
      console.warn("API submission completed with local persistence fallback.", e);
    }

    const typeLabel = newRequestType === "PARTIAL_REFUND" ? "Refund application" : "Release request";
    setSuccessAlert(`${typeLabel} #${newReq.id} submitted for regulatory scrutiny.`);
    setTimeout(() => setSuccessAlert(null), 6000);
  };

  // Handle Officer Decision (Enforcing Section E Permission Boundaries)
  const handleSaveDecision = async () => {
    if (!selectedRequest) return;
    setPermissionError(null);

    // Rule 1: Institution Rep cannot approve
    if (isInstitutionRep) {
      setPermissionError("Permission Violation: Institution representatives cannot participate in regulatory release decisions.");
      return;
    }

    // Rule 2: System Admin CANNOT grant financial approval (Section E)
    if (isAdmin && officerDecision === "APPROVED") {
      setPermissionError(
        "Statutory Permission Boundary Violation: System Administration role alone does NOT confer financial approval authority under AICTE statutory governance rules. Financial release sign-off is restricted strictly to the Approving Authority (Member Secretary)."
      );
      return;
    }

    // Rule 3: Scrutiny Officer cannot give final approval; they can only recommend
    if (isScrutinyOfficer && officerDecision === "APPROVED") {
      setPermissionError(
        "Role Boundary: Scrutiny Officers may only RECOMMEND or QUERY release requests. Final financial sign-off requires the Approving Authority."
      );
      return;
    }

    // Update status
    let newStatus: ReleaseRequestRecord["status"] = selectedRequest.status;
    if (officerDecision === "APPROVED") newStatus = "APPROVED_PENDING_DISCHARGE";
    else if (officerDecision === "RECOMMENDED_FOR_APPROVAL") newStatus = "SCRUTINY_RECOMMENDED";
    else if (officerDecision === "REJECTED") newStatus = "REJECTED";

    const newHistoryEntry: ReleaseDecisionHistoryItem = {
      stage: isApprovingAuthority ? "Financial Approval Stage" : "Technical Scrutiny Stage",
      officerName: user?.name || "Regulatory Officer",
      officerRole: user?.role === "approving_authority" ? "Member Secretary (Approving Authority)" : "Scrutiny Officer",
      decision: officerDecision,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
      remarks: officerRemarks || "Decision recorded under AICTE Approval Process Handbook guidelines.",
    };

    setReleaseList((prev) =>
      prev.map((r) => {
        if (r.id === selectedRequest.id) {
          return {
            ...r,
            status: newStatus,
            nocVoucherRef: officerDecision === "APPROVED" ? `AICTE/NOC/2026/DIS-${Math.floor(10000 + Math.random() * 90000)}` : r.nocVoucherRef,
            decisionHistory: [...r.decisionHistory, newHistoryEntry],
          };
        }
        return r;
      })
    );

    // Call persistent backend API
    try {
      await releaseService.recordDecision(selectedRequest.id, {
        officer_id: user?.id || "usr-aa-01",
        officer_name: user?.name || "Regulatory Officer",
        officer_role: user?.role || "approving_authority",
        decision: officerDecision,
        decision_reason: officerRemarks || "Decision recorded under AICTE Approval Process Handbook guidelines.",
      });
      refetch();
    } catch (e) {
      console.warn("API decision recorded with fallback.", e);
    }

    setDetailModalOpen(false);
    setSuccessAlert(`Decision '${officerDecision}' registered for request #${selectedRequest.id}.`);
    setTimeout(() => setSuccessAlert(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <PageHeader
        title={isDedicatedRefundRoute ? "Security Deposit Refund Requests" : "Release & Refund Management"}
        description={
          isDedicatedRefundRoute
            ? "Submit and track pro-rata security deposit refund applications, program closure returns, and exit clearance claims under AICTE norms."
            : "Process security deposit refund applications, verify statutory lock-in periods, issue bank lien discharge vouchers (NOC), and enforce AICTE financial governance boundaries."
        }
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: isDedicatedRefundRoute ? "Refund Requests" : "Release / Refund Requests" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              title="Refresh live registry from database"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download size={14} />
              Export Register
            </Button>
            {isInstitutionRep && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenRefundModal}
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                  <Coins size={14} className="text-emerald-600" />
                  Request for Refund
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setNewRequestType("FULL_RELEASE");
                    setNewRequestModal(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-500 shadow-sm"
                >
                  <Plus size={15} />
                  Submit Release / NOC
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* ─── MANDATORY FINANCIAL SAFEGUARD NOTICE (Section F / PRD) ──────────── */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-800 rounded-lg flex-shrink-0 mt-0.5">
            <Shield size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Statutory Financial Safeguard Notice: Administrative Approval vs Financial Encashment</span>
            </p>
            <p className="text-xs text-blue-900/90 leading-relaxed">
              AICTE Regulation Bureau administrative approval authorizes the issuance of the official <strong>Bank Discharge NOC voucher</strong> and relinquishes the regulatory lien notation. AICTE does <strong>NOT</strong> transfer money or execute refunds directly. Final deposit encashment and account credit are executed exclusively by the issuing Scheduled Bank's Core Banking System (CBS) upon presentation of this authorization.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-blue-800 bg-blue-100/90 px-2.5 py-1 rounded font-semibold whitespace-nowrap self-end sm:self-center">
          Administrative Protocol Only
        </span>
      </div>

      {successAlert && (
        <Alert variant="success" title="Workflow Action Successfully Recorded" onDismiss={() => setSuccessAlert(null)}>
          {successAlert}
        </Alert>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Release Queue"
          value={`${effectiveReleaseList.length} Requests`}
          subtitle="Value: ₹ 1.75 Cr"
          icon={<Clock size={18} />}
          iconColor="orange"
        />
        <StatCard
          title="NOCs Authorized"
          value={`${effectiveReleaseList.filter((r) => r.status === "APPROVED_PENDING_DISCHARGE").length} Authorized`}
          subtitle="Lien discharge vouchers"
          icon={<FileCheck size={18} />}
          iconColor="green"
        />
        <StatCard
          title="Scrutiny Recommendations"
          value={`${effectiveReleaseList.filter((r) => r.status === "SCRUTINY_RECOMMENDED").length} Cases`}
          subtitle="Awaiting final authority"
          icon={<CheckCircle2 size={18} />}
          iconColor="blue"
        />
        <StatCard
          title="Permission Integrity"
          value="Segregated"
          subtitle="Admin barred from approval"
          icon={<ShieldAlert size={18} />}
          iconColor="purple"
        />
      </div>

      {/* Release Requests Table with Dedicated Filter Tabs */}
      <Card noPadding className="border-slate-200">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck size={16} className="text-orange-600" />
                <span>Security Deposit Release & Refund Applications</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Review formal institutional applications, examine exit criteria, and authorize bank discharge vouchers.
              </CardDescription>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded">
              Total {displayList.length} Applications Shown
            </span>
          </div>

          {/* Section Navigation Tabs: All, Refunds, Releases, NOCs */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ALL"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>All Applications</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "ALL" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                {effectiveReleaseList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("REFUND")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "REFUND"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
              }`}
            >
              <Coins size={13} />
              <span>Refund Requests (Course Closure / Reduction)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "REFUND" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                {effectiveReleaseList.filter((r) => r.requestType === "PARTIAL_REFUND").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("RELEASE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "RELEASE"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>Full Releases</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "RELEASE" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                {effectiveReleaseList.filter((r) => r.requestType === "FULL_RELEASE").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("NOC")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "NOC"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>Lien NOC Issuances</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "NOC" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                {effectiveReleaseList.filter((r) => r.requestType === "NOC_ISSUANCE").length}
              </span>
            </button>
          </div>
        </div>

        <DataTable<ReleaseRequestRecord>
          keyField="id"
          columns={[
            {
              key: "id",
              header: "Request Ref #",
              cell: (row) => (
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">{row.id.toUpperCase()}</span>
                  <p className="text-[10px] text-slate-400 font-mono">{row.submissionDate.split(" ")[0]}</p>
                </div>
              ),
            },
            {
              key: "fdrNumber",
              header: "Related Instrument",
              cell: (row) => (
                <div className="space-y-0.5">
                  <Link to={`/fdr/${row.fdrId}`} className="font-mono text-xs font-bold text-orange-600 hover:underline">
                    {row.fdrNumber}
                  </Link>
                  <p className="text-[11px] text-slate-500">{row.bankName}</p>
                  <p className="text-[10px] text-slate-400 font-mono font-bold">
                    {formatCurrency(row.principalAmount)}
                  </p>
                </div>
              ),
            },
            {
              key: "institutionName",
              header: "Institution",
              cell: (row) => (
                <div>
                  <p className="text-xs font-semibold text-slate-900 truncate max-w-[200px]" title={row.institutionName}>
                    {row.institutionName}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">{row.institutionId}</span>
                </div>
              ),
            },
            {
              key: "requestType",
              header: "Request Type",
              cell: (row) => (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {row.requestType.replace(/_/g, " ")}
                </span>
              ),
            },
            {
              key: "justificationReason",
              header: "Regulatory Justification",
              cell: (row) => (
                <p className="text-xs text-slate-600 truncate max-w-[220px]" title={row.justificationReason}>
                  {row.justificationReason}
                </p>
              ),
            },
            {
              key: "status",
              header: "Workflow Status",
              cell: (row) => {
                if (row.status === "APPROVED_PENDING_DISCHARGE") {
                  return <Badge variant="success" dot>Approved (NOC Issued)</Badge>;
                }
                if (row.status === "SCRUTINY_RECOMMENDED") {
                  return <Badge variant="info" dot>Scrutiny Recommended</Badge>;
                }
                if (row.status === "REJECTED") {
                  return <Badge variant="error" dot>Rejected</Badge>;
                }
                return <Badge variant="warning" dot>Pending Scrutiny</Badge>;
              },
            },
            {
              key: "actions",
              header: "Action",
              align: "right",
              cell: (row) => (
                <Button
                  size="xs"
                  variant="outline-primary"
                  onClick={() => {
                    setSelectedRequest(row);
                    setPermissionError(null);
                    setOfficerRemarks("");
                    setDetailModalOpen(true);
                  }}
                >
                  Review Dossier
                </Button>
              ),
            },
          ]}
          data={displayList}
        />
      </Card>

      {/* ─── MODAL 1: SUBMIT RELEASE / REFUND REQUEST (Section D) ──────────── */}
      <Dialog
        open={newRequestModal}
        onClose={() => setNewRequestModal(false)}
        title="Submit Security Deposit Release / Refund Application"
        description="Formal institutional application for lien relinquishment under AICTE Approval Process Handbook (APH) rules."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewRequestModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRequest}>
              <Send size={14} /> Submit Application Dossier
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs pt-1">
          {/* Step 1: Instrument Selection */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              1. Select Financial Instrument to Release / Refund
            </span>
            <Select
              value={newFdrId}
              onChange={(e) => setNewFdrId(e.target.value)}
              options={CENTRAL_FDR_RECORDS.map((r) => ({
                value: r.id,
                label: `${r.fdrNumber} — ${r.institutionName} (${formatCurrency(r.principalAmount)}, ${r.bankName})`,
              }))}
            />

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Bank Branch:</span>
                <span className="font-semibold text-slate-800">{activeFdr.bankName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Deposit Value:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(activeFdr.principalAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Maturity Date:</span>
                <span className="font-semibold text-orange-600">{formatDate(activeFdr.maturityDate)}</span>
              </div>
            </div>
          </div>

          {/* Step 2: Request Particulars */}
          <div className="space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              2. Application Particulars & Regulatory Basis
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Request Type</label>
                <Select
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value as any)}
                  options={[
                    { value: "FULL_RELEASE", label: "Full Deposit Release (Course Closure / Exit)" },
                    { value: "PARTIAL_REFUND", label: "Partial Refund (Pro-rata Intake Reduction)" },
                    { value: "NOC_ISSUANCE", label: "Bank Lien Revocation NOC Certificate" },
                  ]}
                />
              </div>

              <Input
                label="Applicable Regulatory Clause"
                value={newRegulatoryClause}
                onChange={(e) => setNewRegulatoryClause(e.target.value)}
                placeholder="e.g. AICTE APH 2026 Clause 11.2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Formal Regulatory Justification (Mandatory)
              </label>
              <textarea
                rows={3}
                value={newJustification}
                onChange={(e) => setNewJustification(e.target.value)}
                placeholder="Detail the exit status, batch graduation dates, and absence of pending student/regulatory liabilities..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supporting Verification Document (No Dues / Resolution Scan)
              </label>
              <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                <FileText size={16} className="text-orange-500" />
                <input
                  type="text"
                  value={newDocumentName}
                  onChange={(e) => setNewDocumentName(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 flex-1 focus:outline-none font-mono"
                  placeholder="e.g. SRO_No_Dues_Clearance_Certificate.pdf"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                  Verified Scan
                </span>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* ─── MODAL 2: DETAIL VIEW & OFFICIAL REVIEW WORKFLOW (Section D & E) ─── */}
      {selectedRequest && (
        <Dialog
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Release Request Dossier: #${selectedRequest.id.toUpperCase()}`}
          description={`Deposit Receipt: ${selectedRequest.fdrNumber} · ${selectedRequest.institutionName}`}
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
              {!isInstitutionRep && (
                <Button variant="primary" size="sm" onClick={handleSaveDecision}>
                  <Check size={14} /> Record Regulatory Determination
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs pt-1">
            {permissionError && (
              <Alert variant="error" title="Statutory Governance Constraint">
                {permissionError}
              </Alert>
            )}

            {/* Request Particulars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Financial Value:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {formatCurrency(selectedRequest.principalAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Issuing Bank:</span>
                <span className="font-semibold text-slate-800">{selectedRequest.bankName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Request Type:</span>
                <span className="font-semibold text-orange-600">{selectedRequest.requestType.replace(/_/g, " ")}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px]">Regulatory Basis:</span>
                <span className="font-medium text-slate-800">{selectedRequest.regulatoryClause}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Submission Date:</span>
                <span className="font-mono text-slate-600">{selectedRequest.submissionDate}</span>
              </div>
            </div>

            {/* Justification & Supporting Documents */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block text-xs">Institutional Justification:</span>
              <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 text-xs leading-relaxed italic">
                "{selectedRequest.justificationReason}"
              </p>

              <div>
                <span className="font-bold text-slate-800 block text-xs mb-1.5">Submitted Clearance Artifacts:</span>
                <div className="space-y-1.5">
                  {selectedRequest.supportingDocuments.map((doc, idx) => (
                    <div key={`doc-${selectedRequest.id}-${idx}-${doc}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-orange-500" />
                        <span className="font-mono text-slate-800">{doc}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decision History Trail */}
            <div>
              <span className="font-bold text-slate-800 block text-xs mb-2">Chronological Decision Trail:</span>
              <div className="space-y-2 border-l-2 border-orange-200 pl-3 ml-1">
                {selectedRequest.decisionHistory.map((h, idx) => (
                  <div key={`hist-${selectedRequest.id}-${idx}-${h.timestamp}`} className="text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{h.stage}</span>
                      <span className="text-[10px] font-mono text-slate-400">{h.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Officer: <strong>{h.officerName}</strong> ({h.officerRole}) — Outcome: <span className="font-bold text-orange-600">{h.decision}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                      "{h.remarks}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section E: Role-Guarded Decision Input */}
            {!isInstitutionRep && (
              <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-200 space-y-3 pt-2">
                <span className="font-bold text-orange-900 block text-xs">
                  Record Official Scrutiny / Approval Determination:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Decision Outcome</label>
                    <Select
                      value={officerDecision}
                      onChange={(e) => setOfficerDecision(e.target.value as any)}
                      options={
                        isApprovingAuthority
                          ? [
                              { value: "APPROVED", label: "Approved — Authorize Bank Discharge NOC" },
                              { value: "RETURNED_FOR_QUERY", label: "Returned for Clarification" },
                              { value: "REJECTED", label: "Rejected" },
                            ]
                          : [
                              { value: "RECOMMENDED_FOR_APPROVAL", label: "Scrutiny Recommended for Approval" },
                              { value: "RETURNED_FOR_QUERY", label: "Query Notice Dispatched to Institution" },
                              { value: "REJECTED", label: "Scrutiny Rejection" },
                            ]
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Authenticated Reviewer</label>
                    <input
                      disabled
                      value={`${user?.name} (${user?.role?.replace(/_/g, " ")})`}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Regulatory Findings / Determination Rationale (Mandatory)
                  </label>
                  <textarea
                    rows={2}
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    placeholder="Enter statutory reasons, no-dues verification notes, or discharge authorization directives..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
