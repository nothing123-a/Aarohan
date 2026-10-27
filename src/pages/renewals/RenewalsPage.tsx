import { useState } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  Plus,
  CheckCircle2,
  FileText,
  Upload,
  ArrowRight,
  ShieldCheck,
  Check,
  Link as LinkIcon,
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

export interface RenewalRelationshipItem {
  id: string;
  predecessorFdrId: string;
  predecessorFdrNumber: string;
  institutionId: string;
  institutionName: string;
  originalBank: string;
  originalPrincipal: number;
  originalMaturity: string;
  originalStatus: string;
  replacementFdrId: string;
  replacementFdrNumber: string;
  replacementBank: string;
  replacementPrincipal: number;
  newMaturityDate: string;
  tenureMonths: number;
  status: "PENDING_REVIEW" | "APPROVED" | "COMPLETED" | "REJECTED";
  supportingDocument: string;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
}

export default function RenewalsPage() {
  const { user } = useAuth();
  const [newRenewalModal, setNewRenewalModal] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRelationshipItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED">("APPROVED");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Initial renewals dataset linking predecessors and replacements
  const [renewalsList, setRenewalsList] = useState<RenewalRelationshipItem[]>([
    {
      id: "rn-01",
      predecessorFdrId: "fdr-005",
      predecessorFdrNumber: "FDR/AICTE/2026/042",
      institutionId: "inst-002",
      institutionName: "BITS Pilani — Goa Campus",
      originalBank: "HDFC Bank Ltd",
      originalPrincipal: 1_00_00_000,
      originalMaturity: "2026-10-15",
      originalStatus: "ACTIVE_LIEN",
      replacementFdrId: "fdr-rep-005",
      replacementFdrNumber: "FDR/AICTE/2026/10291",
      replacementBank: "HDFC Bank Ltd",
      replacementPrincipal: 1_00_00_000,
      newMaturityDate: "2029-10-15",
      tenureMonths: 36,
      status: "APPROVED",
      supportingDocument: "HDFC_Lien_Rollover_Letter_VascoBranch.pdf",
      submittedBy: "Director, BITS Pilani Goa",
      submittedAt: "2026-10-15 10:00 UTC",
      reviewedBy: "Anil Verma (Scrutiny Officer)",
      reviewedAt: "2026-10-18 16:00 UTC",
      reviewRemarks: "Tenure rollover replacement verified in CBS with active AICTE lien endorsement.",
    },
    {
      id: "rn-02",
      predecessorFdrId: "fdr-002",
      predecessorFdrNumber: "FDR/AICTE/2026/092",
      institutionId: "inst-001",
      institutionName: "Delhi Technological University (DTU)",
      originalBank: "Punjab National Bank",
      originalPrincipal: 35_00_000,
      originalMaturity: "2026-12-05",
      originalStatus: "MATURING_SOON",
      replacementFdrId: "fdr-rep-002",
      replacementFdrNumber: "FDR/AICTE/2026/99104",
      replacementBank: "Punjab National Bank",
      replacementPrincipal: 35_00_000,
      newMaturityDate: "2028-12-05",
      tenureMonths: 24,
      status: "PENDING_REVIEW",
      supportingDocument: "PNB_Extension_Letter_CivilLines.pdf",
      submittedBy: "Prof. S. K. Mahajan (DTU)",
      submittedAt: "2026-10-24 12:00 UTC",
    },
    {
      id: "rn-03",
      predecessorFdrId: "fdr-001",
      predecessorFdrNumber: "FDR/AICTE/2026/089",
      institutionId: "inst-001",
      institutionName: "Delhi Technological University (DTU)",
      originalBank: "State Bank of India",
      originalPrincipal: 50_00_000,
      originalMaturity: "2026-11-20",
      originalStatus: "ACTIVE_LIEN",
      replacementFdrId: "fdr-rep-001",
      replacementFdrNumber: "FDR/AICTE/2026/00994",
      replacementBank: "State Bank of India",
      replacementPrincipal: 50_00_000,
      newMaturityDate: "2029-11-20",
      tenureMonths: 36,
      status: "COMPLETED",
      supportingDocument: "SBI_3Yr_Extended_Lien_Confirmation.pdf",
      submittedBy: "Prof. S. K. Mahajan (DTU)",
      submittedAt: "2026-10-12 14:00 UTC",
      reviewedBy: "Dr. Rajesh Sharma (Approving Authority)",
      reviewedAt: "2026-10-14 11:30 UTC",
      reviewRemarks: "3-year tenure rollover ratified. CBS deposit certificate verified clean.",
    },
  ]);

  // Form State for new renewal submission
  const [selectedPredecessorId, setSelectedPredecessorId] = useState("fdr-002");
  const [newFdrNumber, setNewFdrNumber] = useState("FDR/AICTE/2026/99312");
  const [newBankName, setNewBankName] = useState("Punjab National Bank");
  const [newAmount, setNewAmount] = useState("3500000");
  const [newMaturityDate, setNewMaturityDate] = useState("2029-12-05");
  const [newTenureMonths, setNewTenureMonths] = useState(36);
  const [supportingDocName, setSupportingDocName] = useState("PNB_Extension_Lien_Pledge_Token.pdf");
  const [applicantJustification, setApplicantJustification] = useState(
    "Contractual renewal of institutional security deposit for extended 3-year term under AICTE Approval Process Handbook (APH) norms."
  );

  // Institution permission boundaries
  const isOfficer = user?.role === "scrutiny_officer" || user?.role === "approving_authority" || user?.role === "admin";
  const isInstitutionRep = user?.role === "institution_representative" || user?.role === "depositor";

  // Selected predecessor object
  const activePredecessor = CENTRAL_FDR_RECORDS.find((r) => r.id === selectedPredecessorId) || CENTRAL_FDR_RECORDS[1];

  // Handle Submit Renewal Request
  const handleCreateRenewal = () => {
    // 1. Validate same authorized institution boundary (Section C rule)
    const userInstId = user?.institutionId || "inst-001";
    if (isInstitutionRep && activePredecessor.institutionId !== userInstId) {
      alert("Validation Error: Predecessor and replacement must belong to your authorized institution.");
      return;
    }

    const principalNum = parseFloat(newAmount);
    if (isNaN(principalNum) || principalNum < activePredecessor.principalAmount) {
      alert(`Validation Error: Replacement amount must be at least ₹ ${activePredecessor.principalAmount.toLocaleString("en-IN")}.`);
      return;
    }

    const newRenewal: RenewalRelationshipItem = {
      id: `rn-0${renewalsList.length + 1}`,
      predecessorFdrId: activePredecessor.id,
      predecessorFdrNumber: activePredecessor.fdrNumber,
      institutionId: activePredecessor.institutionId,
      institutionName: activePredecessor.institutionName,
      originalBank: activePredecessor.bankName,
      originalPrincipal: activePredecessor.principalAmount,
      originalMaturity: activePredecessor.maturityDate.split("T")[0],
      originalStatus: activePredecessor.lifecycleStatus,
      replacementFdrId: `fdr-rep-${Date.now().toString(36)}`,
      replacementFdrNumber: newFdrNumber,
      replacementBank: newBankName,
      replacementPrincipal: principalNum,
      newMaturityDate: newMaturityDate,
      tenureMonths: newTenureMonths,
      status: "PENDING_REVIEW",
      supportingDocument: supportingDocName,
      submittedBy: `${user?.name || "Institution Representative"} (${activePredecessor.institutionName})`,
      submittedAt: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
    };

    // Predecessor record is NOT overwritten; new replacement linked with self-referencing pointer
    setRenewalsList([newRenewal, ...renewalsList]);
    setNewRenewalModal(false);
    setSuccessAlert(
      `Replacement instrument ${newFdrNumber} registered and linked to predecessor ${activePredecessor.fdrNumber} (AICTE Vault ID: ${newRenewal.replacementFdrId}).`
    );
    setTimeout(() => setSuccessAlert(null), 6000);
  };

  // Handle Official Review Decision
  const handleSaveReview = () => {
    if (!selectedRenewal) return;

    if (isInstitutionRep) {
      alert("Separation of Duties Violation: Institution representatives cannot approve renewal instruments.");
      return;
    }

    setRenewalsList((prev) =>
      prev.map((r) => {
        if (r.id === selectedRenewal.id) {
          return {
            ...r,
            status: reviewDecision === "APPROVED" ? "APPROVED" : reviewDecision === "REJECTED" ? "REJECTED" : "PENDING_REVIEW",
            reviewedBy: `${user?.name || "Anil Verma"} (${user?.role?.replace(/_/g, " ") || "Scrutiny Officer"})`,
            reviewedAt: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
            reviewRemarks: reviewRemarks || "Replacement instrument parameters ratified against regulatory requirements.",
          };
        }
        return r;
      })
    );

    setReviewModalOpen(false);
    setSuccessAlert(`Review decision '${reviewDecision}' recorded for ${selectedRenewal.replacementFdrNumber}.`);
    setTimeout(() => setSuccessAlert(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Renewal & Replacement Management"
        description="Administer fixed deposit renewals, link successor instruments to predecessors with self-referencing relationships, and enforce AICTE institutional deposit continuity."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Renewal & Replacement" },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewRenewalModal(true)}
            className="bg-orange-600 hover:bg-orange-500 shadow-sm"
          >
            <Plus size={15} />
            Submit Renewal / Replacement
          </Button>
        }
      />

      {successAlert && (
        <Alert variant="success" title="Workflow Action Successfully Recorded" onDismiss={() => setSuccessAlert(null)}>
          {successAlert}
        </Alert>
      )}

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Renewal Requests"
          value={`${renewalsList.filter((r) => r.status === "PENDING_REVIEW").length} Requests`}
          subtitle="Value: ₹ 3.85 Cr"
          icon={<RefreshCw size={18} />}
          iconColor="orange"
        />
        <StatCard
          title="Successor Linkages"
          value={`${renewalsList.length} Linked`}
          subtitle="Self-referencing pairs"
          icon={<LinkIcon size={18} />}
          iconColor="blue"
        />
        <StatCard
          title="Approved Rollovers"
          value={`${renewalsList.filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length} Instruments`}
          subtitle="All liens verified in CBS"
          icon={<CheckCircle2 size={18} />}
          iconColor="green"
        />
        <StatCard
          title="Preserved Predecessors"
          value="100% History"
          subtitle="Zero destructive overwrites"
          icon={<ShieldCheck size={18} />}
          iconColor="purple"
        />
      </div>

      {/* Section C: Renewal & Replacement Registry */}
      <Card noPadding className="border-slate-200">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw size={16} className="text-orange-600" />
              <span>Successor & Predecessor Instrument Registry</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Every replacement is cryptographically linked to its predecessor; original records are immutably preserved.
            </CardDescription>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded">
            {renewalsList.length} Succession Transitions
          </span>
        </div>

        <DataTable<RenewalRelationshipItem>
          keyField="id"
          columns={[
            {
              key: "id",
              header: "Request Ref",
              cell: (row) => (
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">{row.id.toUpperCase()}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-mono text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                      <LinkIcon size={9} />
                      LINKED
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: "predecessorFdrNumber",
              header: "Original Instrument (Predecessor)",
              cell: (row) => (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs font-bold text-slate-800">{row.predecessorFdrNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{row.originalBank}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatCurrency(row.originalPrincipal)} · Matured: {row.originalMaturity}
                  </p>
                </div>
              ),
            },
            {
              key: "replacementFdrNumber",
              header: "Proposed Replacement (Successor)",
              cell: (row) => (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 font-mono">
                    <ArrowRight size={12} className="text-orange-500" />
                    <span>{row.replacementFdrNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium">{row.replacementBank}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {formatCurrency(row.replacementPrincipal)} · Mat: {row.newMaturityDate} ({row.tenureMonths}m)
                  </p>
                </div>
              ),
            },
            {
              key: "institutionName",
              header: "Institution",
              cell: (row) => (
                <div>
                  <p className="text-xs font-semibold text-slate-900 truncate max-w-[180px]" title={row.institutionName}>
                    {row.institutionName}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">{row.institutionId}</span>
                </div>
              ),
            },
            {
              key: "supportingDocument",
              header: "Supporting Evidence",
              cell: (row) => (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <FileText size={13} className="text-orange-500 flex-shrink-0" />
                  <span className="truncate max-w-[140px] font-mono text-[10px]" title={row.supportingDocument}>
                    {row.supportingDocument}
                  </span>
                </div>
              ),
            },
            {
              key: "status",
              header: "Transition Status",
              cell: (row) => {
                if (row.status === "COMPLETED") {
                  return <Badge variant="success" dot>Completed & Re-Liened</Badge>;
                }
                if (row.status === "APPROVED") {
                  return <Badge variant="info" dot>Approved by Authority</Badge>;
                }
                if (row.status === "REJECTED") {
                  return <Badge variant="error" dot>Rejected</Badge>;
                }
                return <Badge variant="warning" dot>Pending Review</Badge>;
              },
            },
            {
              key: "actions",
              header: "Actions",
              align: "right",
              cell: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                  {isOfficer && (
                    <Button
                      size="xs"
                      variant="outline-primary"
                      onClick={() => {
                        setSelectedRenewal(row);
                        setReviewRemarks(row.reviewRemarks || "");
                        setReviewModalOpen(true);
                      }}
                    >
                      Review
                    </Button>
                  )}
                  <Button size="xs" variant="ghost" asChild>
                    <Link to={`/fdr/${row.predecessorFdrId}`}>View Predecessor</Link>
                  </Button>
                </div>
              ),
            },
          ]}
          data={renewalsList}
        />
      </Card>

      {/* ─── MODAL 1: SUBMIT RENEWAL / REPLACEMENT (Section C) ─────────────── */}
      <Dialog
        open={newRenewalModal}
        onClose={() => setNewRenewalModal(false)}
        title="Submit Instrument Renewal & Replacement"
        description="Register successor deposit details, establish predecessor relationship, and validate deposit continuity under AICTE regulations."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewRenewalModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRenewal}>
              <Check size={14} /> Establish Succession Link & Submit
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs pt-1">
          {/* Step 1: Predecessor Instrument Selection */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              1. Select Predecessor Instrument to Renew / Replace
            </span>
            <Select
              value={selectedPredecessorId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedPredecessorId(nextId);
                const rec = CENTRAL_FDR_RECORDS.find((r) => r.id === nextId);
                if (rec) {
                  setNewBankName(rec.bankName);
                  setNewAmount(String(rec.principalAmount));
                }
              }}
              options={CENTRAL_FDR_RECORDS.map((r) => ({
                value: r.id,
                label: `${r.fdrNumber} — ${r.institutionName} (₹ ${r.principalAmount.toLocaleString("en-IN")}, Exp: ${r.maturityDate.split("T")[0]})`,
              }))}
            />

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Issuing Bank:</span>
                <span className="font-semibold text-slate-800">{activePredecessor.bankName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Predecessor Principal:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(activePredecessor.principalAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Current Maturity:</span>
                <span className="font-semibold text-orange-600">{formatDate(activePredecessor.maturityDate)}</span>
              </div>
            </div>
          </div>

          {/* Step 2: Successor Replacement Particulars */}
          <div className="space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              2. Successor / Replacement Deposit Particulars
            </span>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="New Replacement FDR Reference #"
                value={newFdrNumber}
                onChange={(e) => setNewFdrNumber(e.target.value)}
                placeholder="e.g. FDR/AICTE/2026/99312"
              />
              <Input
                label="Scheduled Bank Name"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Replacement Principal (₹)"
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <Input
                label="New Maturity Date"
                type="date"
                value={newMaturityDate}
                onChange={(e) => setNewMaturityDate(e.target.value)}
              />
              <Input
                label="Tenure (Months)"
                type="number"
                value={newTenureMonths}
                onChange={(e) => setNewTenureMonths(parseInt(e.target.value) || 36)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supporting Bank Letter / Rollover Agreement (PDF)
              </label>
              <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                <Upload size={16} className="text-orange-500" />
                <input
                  type="text"
                  value={supportingDocName}
                  onChange={(e) => setSupportingDocName(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 flex-1 focus:outline-none font-mono"
                  placeholder="Upload Bank Endorsement Letter"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                  Verified Scan
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Justification
              </label>
              <textarea
                rows={2}
                value={applicantJustification}
                onChange={(e) => setApplicantJustification(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Statutory Notice */}
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-950 text-[11px] space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-orange-900">
              <ShieldCheck size={14} className="text-orange-600" />
              <span>Immutable Predecessor Preservation Rule:</span>
            </span>
            <p className="leading-relaxed">
              Submitting a renewal creates a successor relationship linked via <code>predecessor_instrument_id</code>. The predecessor record will <strong>NOT</strong> be deleted or silently overwritten. Its historical lien audits and original certificates remain permanently accessible.
            </p>
          </div>
        </div>
      </Dialog>

      {/* ─── MODAL 2: OFFICIAL RENEWAL REVIEW (Section C & E) ──────────────── */}
      {selectedRenewal && (
        <Dialog
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Review Replacement: ${selectedRenewal.replacementFdrNumber}`}
          description="Evaluate successor instrument parameters against regulatory requirements before approving succession transition."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveReview}>
                <Check size={14} /> Record Succession Decision
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs pt-1">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Predecessor Instrument:</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedRenewal.predecessorFdrNumber}</p>
                <p className="text-[11px] text-slate-500">{selectedRenewal.originalBank}</p>
                <p className="font-mono text-[11px] text-slate-700">{formatCurrency(selectedRenewal.originalPrincipal)}</p>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-orange-600 uppercase block">Successor Replacement:</span>
                <p className="font-mono font-bold text-orange-600 mt-0.5">{selectedRenewal.replacementFdrNumber}</p>
                <p className="text-[11px] text-slate-500">{selectedRenewal.replacementBank}</p>
                <p className="font-mono text-[11px] text-slate-700">{formatCurrency(selectedRenewal.replacementPrincipal)}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Regulatory Decision
              </label>
              <Select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value as any)}
                options={[
                  { value: "APPROVED", label: "Approved — Successor Validated & Lien Ratified" },
                  { value: "MORE_INFO_REQUIRED", label: "More Information Required — Awaiting Revised Bank Letter" },
                  { value: "REJECTED", label: "Rejected — Non-compliant with APH Deposit Schedule" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Review Remarks / CBS Memo References
              </label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter regulatory clearance findings and core banking lien verification reference..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
