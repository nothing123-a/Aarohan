import { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileCheck,
  Shield,
  Download,
  Check,
  FileText,
  Send,
  Coins,
  RefreshCw,
  Calendar,
  Sparkles,
  ArrowRight,
  Printer,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Dialog,
  DataTable,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { CENTRAL_FDR_RECORDS, CENTRAL_APPROVAL_CASES, registerApprovalCase } from "@/data/centralDataset";
import { formatCurrency, formatDate } from "@/utils";
import { releaseService } from "@/services/fdrService";
import { BankDischargeNocModal } from "@/components/shared/BankDischargeNocModal";

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

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split("T")[0] || dateStr;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr.split("T")[0] || dateStr;
    }
  };

  // Tab state for dedicated Refund section
  const [activeTab, setActiveTab] = useState<"ALL" | "REFUND" | "RELEASE" | "NOC">(
    isDedicatedRefundRoute ? "REFUND" : "ALL"
  );

  const [selectedNocRow, setSelectedNocRow] = useState<ReleaseRequestRecord | null>(null);

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

  // Merge live database records with central approval cases and local state
  const effectiveReleaseList = useMemo(() => {
    const list: ReleaseRequestRecord[] = [];
    const seenIds = new Set<string>();

    if (apiResponse && apiResponse.length > 0) {
      for (const r of apiResponse) {
        list.push({
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
          decisionHistory:
            r.decision_history?.map((d: any) => ({
              stage: d.stage,
              officerName: d.officer_name || d.officerName,
              officerRole: d.officer_role || d.officerRole,
              decision: d.decision,
              timestamp: d.timestamp,
              remarks: d.reason || d.remarks || "",
            })) || [],
          nocVoucherRef:
            r.nocVoucherRef || (r.status === "APPROVED_PENDING_DISCHARGE" ? `AICTE/NOC/2026/DIS-${r.id}` : undefined),
        });
        seenIds.add(r.id);
      }
    }

    // Merge central approval cases (sync across authority and institution)
    for (const c of CENTRAL_APPROVAL_CASES) {
      const isApproved = c.status === "APPROVED" || c.status === "RELEASED" || c.status === "COMPLETED";
      const mappedStatus = isApproved
        ? ("APPROVED_PENDING_DISCHARGE" as const)
        : c.status === "REJECTED"
        ? ("REJECTED" as const)
        : c.status === "RETURNED"
        ? ("PENDING_SCRUTINY" as const)
        : ("PENDING_APPROVAL" as const);

      const nocRef =
        c.nocVoucherRef ||
        (isApproved ? `AICTE/NOC/2026/REL-${c.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}` : undefined);

      const unified: ReleaseRequestRecord = {
        id: c.id,
        fdrId: c.fdrId,
        fdrNumber: c.fdrNumber,
        institutionId: c.institutionId,
        institutionName: c.institutionName,
        bankName: c.bankName,
        principalAmount: c.principalAmount,
        requestType: c.requestType as any,
        justificationReason: c.scrutinyFinding,
        regulatoryClause: c.regulatoryClause || "APH Clause 7.6 / 11.2",
        submissionDate: c.requestedDate || "2026-10-29 10:00 UTC",
        supportingDocuments: c.supportingDocuments.map((d) => d.name),
        status: mappedStatus as any,
        applicantName: c.applicantName || "Institution Representative",
        decisionHistory: (c.previousDecisions || []).map((d) => ({
          stage: d.stage,
          officerName: d.officer,
          officerRole: "Approving Authority",
          decision: d.decision,
          timestamp: d.timestamp,
          remarks: d.remarks,
        })),
        nocVoucherRef: nocRef,
      };

      const existingIdx = list.findIndex((r) => r.id === c.id || r.fdrNumber === c.fdrNumber);
      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...unified,
          status: unified.status,
          nocVoucherRef: unified.nocVoucherRef || list[existingIdx].nocVoucherRef,
        };
      } else {
        list.push(unified);
        seenIds.add(c.id);
      }
    }

    // Merge static baseline items
    for (const l of releaseList) {
      if (!list.some((r) => r.id === l.id || r.fdrNumber === l.fdrNumber)) {
        list.push(l);
      }
    }

    return list;
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

    // Sync to Approving Authority Queue
    registerApprovalCase({
      id: `appr-${newReq.id}`,
      fdrId: activeFdr.id,
      fdrNumber: activeFdr.fdrNumber,
      institutionId: activeFdr.institutionId,
      institutionName: activeFdr.institutionName,
      bankName: activeFdr.bankName,
      principalAmount: activeFdr.principalAmount,
      requestType: newRequestType,
      requestedDate: new Date().toISOString(),
      status: "PENDING_APPROVAL",
      scrutinyFinding: newJustification,
      scrutinyOfficer: "Rajesh Kumar (Senior Scrutiny Officer)",
      scrutinyDate: new Date().toISOString(),
      supportingDocuments: [
        { name: newDocumentName, size: "1.8 MB", status: "VERIFIED" },
        { name: `${activeFdr.bankName.replace(/\s+/g, "_")}_Original_Certificate.pdf`, size: "2.5 MB", status: "VERIFIED" },
      ],
      previousDecisions: [
        {
          stage: "Institutional Submission",
          officer: user?.name || "Institution Representative",
          decision: "SUBMITTED",
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
          remarks: newJustification,
        },
      ],
      decisionReasonRequired: true,
      regulatoryClause: newRegulatoryClause,
      applicantName: user?.name || "Institution Representative",
    });

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
            ? "Track and submit institutional security deposit refund applications and exit clearance claims."
            : "Process security deposit refund applications and issue bank lien discharge vouchers (NOC)."
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
              title="Refresh live registry"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download size={14} />
              Export
            </Button>
            {isInstitutionRep && (
              <Button
                variant="primary"
                size="sm"
                asChild
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                <Link to="/refund-requests/new?type=refund">
                  <Coins size={14} />
                  Request for Refund
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* ─── Compact Statutory Safeguard Notice ────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-blue-600 flex-shrink-0" />
          <span>
            <strong>Statutory Notice:</strong> AICTE issues official Bank Discharge NOCs. Final refund encashment is credited directly by the depository bank.
          </span>
        </div>
        <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-semibold whitespace-nowrap hidden sm:inline-block">
          Rule 14.2
        </span>
      </div>

      {successAlert && (
        <Alert variant="success" title="Recorded" onDismiss={() => setSuccessAlert(null)}>
          {successAlert}
        </Alert>
      )}

      {/* ─── Clean Simplified Metrics ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Total Claims</span>
          <p className="text-2xl font-bold text-slate-900 font-plus-jakarta mt-0.5">
            {effectiveReleaseList.length}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Claim Value</span>
          <p className="text-2xl font-bold text-slate-900 font-plus-jakarta mt-0.5">
            ₹1.75 Cr
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Authorized NOCs</span>
          <p className="text-2xl font-bold text-emerald-600 font-plus-jakarta mt-0.5">
            {effectiveReleaseList.filter((r) => r.status === "APPROVED_PENDING_DISCHARGE").length}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Under Review</span>
          <p className="text-2xl font-bold text-amber-600 font-plus-jakarta mt-0.5">
            {effectiveReleaseList.filter((r) => r.status === "PENDING_SCRUTINY" || r.status === "SCRUTINY_RECOMMENDED").length}
          </p>
        </div>
      </div>

      {/* ─── Release Requests Table with Clean Filter Tabs ─────────────── */}
      <Card noPadding className="border-slate-200">
        <div className="p-3.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Applications Registry</h3>
            <span className="text-xs text-slate-400 font-mono">({displayList.length})</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({effectiveReleaseList.length})
            </button>

            <button
              onClick={() => setActiveTab("REFUND")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === "REFUND"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Coins size={12} />
              Refunds ({effectiveReleaseList.filter((r) => r.requestType === "PARTIAL_REFUND").length})
            </button>

            <button
              onClick={() => setActiveTab("RELEASE")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "RELEASE"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Full Releases ({effectiveReleaseList.filter((r) => r.requestType === "FULL_RELEASE").length})
            </button>

            <button
              onClick={() => setActiveTab("NOC")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "NOC"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              NOCs ({effectiveReleaseList.filter((r) => r.requestType === "NOC_ISSUANCE").length})
            </button>
          </div>
        </div>

        <DataTable<ReleaseRequestRecord>
          keyField="id"
          tableClassName="min-w-[1100px]"
          columns={[
            {
              key: "id",
              header: "Request Ref #",
              className: "min-w-[140px]",
              cell: (row) => (
                <div className="py-1">
                  <span className="font-mono text-xs font-bold text-slate-900 block hover:text-orange-600 transition-colors">
                    {row.id.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                    <Calendar size={11} className="text-slate-400" />
                    {formatTimestamp(row.submissionDate)}
                  </span>
                </div>
              ),
            },
            {
              key: "fdrNumber",
              header: "Related Instrument",
              className: "min-w-[190px]",
              cell: (row) => (
                <div className="py-1 space-y-0.5">
                  <Link to={`/fdr/${row.fdrId}`} className="font-mono text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline block">
                    {row.fdrNumber}
                  </Link>
                  <p className="text-xs font-medium text-slate-800">{row.bankName}</p>
                  <p className="text-xs font-mono font-extrabold text-slate-900">
                    {formatCurrency(row.principalAmount)}
                  </p>
                </div>
              ),
            },
            {
              key: "institutionName",
              header: "Institution",
              className: "min-w-[210px]",
              cell: (row) => (
                <div className="py-1">
                  <p className="text-xs font-semibold text-slate-900 leading-snug" title={row.institutionName}>
                    {row.institutionName}
                  </p>
                  <span className="inline-block mt-1 font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {row.institutionId}
                  </span>
                </div>
              ),
            },
            {
              key: "requestType",
              header: "Request Type",
              className: "min-w-[140px]",
              cell: (row) => {
                if (row.requestType === "PARTIAL_REFUND") {
                  return (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                      Partial Refund
                    </span>
                  );
                }
                if (row.requestType === "FULL_RELEASE") {
                  return (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 whitespace-nowrap">
                      Full Release
                    </span>
                  );
                }
                return (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap">
                    Lien NOC
                  </span>
                );
              },
            },
            {
              key: "justificationReason",
              header: "Regulatory Justification",
              className: "min-w-[240px] max-w-[320px]",
              cell: (row) => (
                <div className="py-1">
                  <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed" title={row.justificationReason}>
                    {row.justificationReason}
                  </p>
                  {row.regulatoryClause && (
                    <span className="text-[10px] text-orange-700/90 font-mono block mt-1 truncate" title={row.regulatoryClause}>
                      § {row.regulatoryClause}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "status",
              header: "Workflow Status",
              className: "min-w-[150px] whitespace-nowrap",
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
              className: "min-w-[150px] whitespace-nowrap",
              cell: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                  {(row.status === "APPROVED_PENDING_DISCHARGE" || row.nocVoucherRef) && (
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0"
                      onClick={() => setSelectedNocRow(row)}
                    >
                      <Printer size={12} className="mr-1" /> View NOC
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-semibold hover:border-orange-300 hover:text-orange-700 shrink-0"
                    onClick={() => {
                      setSelectedRequest(row);
                      setPermissionError(null);
                      setOfficerRemarks("");
                      setDetailModalOpen(true);
                    }}
                  >
                    Review Dossier
                  </Button>
                </div>
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
          {/* Quick link to dedicated form page */}
          <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-orange-600 flex-shrink-0" />
              <span className="text-xs text-orange-950 font-medium">
                Need multi-step bank account details, checklists, and document attachments?
              </span>
            </div>
            <Button size="xs" variant="primary" asChild className="whitespace-nowrap bg-orange-600 hover:bg-orange-500">
              <Link to="/refund-requests/new" onClick={() => setNewRequestModal(false)}>
                Open Full Form Page <ArrowRight size={12} className="ml-1" />
              </Link>
            </Button>
          </div>

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

            {/* Bank Discharge NOC Banner if Approved */}
            {(selectedRequest.status === "APPROVED_PENDING_DISCHARGE" || selectedRequest.nocVoucherRef) && (
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 block text-xs">
                      Official AICTE Bank Discharge NOC Authorized
                    </span>
                    <span className="font-mono text-emerald-800 text-[11px]">
                      Voucher Ref: {selectedRequest.nocVoucherRef || `AICTE/NOC/2026/DIS-${selectedRequest.id}`}
                    </span>
                  </div>
                </div>
                <Button
                  size="xs"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0"
                  onClick={() => setSelectedNocRow(selectedRequest)}
                >
                  <Printer size={12} className="mr-1" /> View Official NOC Voucher
                </Button>
              </div>
            )}

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

      {/* ─── MODAL: OFFICIAL AICTE BANK DISCHARGE NOC VOUCHER ─── */}
      <BankDischargeNocModal
        open={!!selectedNocRow}
        onClose={() => setSelectedNocRow(null)}
        data={
          selectedNocRow
            ? {
                voucherRef:
                  selectedNocRow.nocVoucherRef ||
                  `AICTE/NOC/2026/REL-${selectedNocRow.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}`,
                fdrNumber: selectedNocRow.fdrNumber,
                fdrId: selectedNocRow.fdrId,
                institutionId: selectedNocRow.institutionId,
                institutionName: selectedNocRow.institutionName,
                bankName: selectedNocRow.bankName,
                principalAmount: selectedNocRow.principalAmount,
                sanctionAmount: selectedNocRow.principalAmount,
                requestType: selectedNocRow.requestType,
                sanctionDate: selectedNocRow.submissionDate,
                regulatoryClause: selectedNocRow.regulatoryClause,
                approvingAuthority: "Dr. Rajesh Sharma, Member Secretary, AICTE",
              }
            : null
        }
      />
    </div>
  );
}
