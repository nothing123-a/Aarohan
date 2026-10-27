import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck2,
  CheckCircle2,
  ShieldCheck,
  Building,
  Check,
  AlertCircle,
  FileText,
  RotateCcw,
  Layers,
  FileWarning,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
  Dialog,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import {
  CENTRAL_FDR_RECORDS,
  CentralFDRRecord,
} from "@/data/centralDataset";
import { formatCurrency, formatDate } from "@/utils";

// Interface for comparison field rows
interface ComparisonField {
  id: string;
  label: string;
  submitted: string;
  extracted: string;
  confidence: number;
  isMatch: boolean;
  severity: "NONE" | "CRITICAL" | "WARNING";
  notes?: string;
}

// Pre-seeded Scrutiny Case Definition
interface ScrutinyCase {
  id: string;
  fdrId: string;
  title: string;
  badgeLabel: string;
  badgeColor: string;
  scenarioType: "CLEAN_MATCH" | "SEEDED_DISCREPANCY" | "LOW_QUALITY_SCAN" | "PROCESSING_FAILURE";
  fdrRecord: CentralFDRRecord;
  ocrConfidence: number;
  engineUsed: string;
  rawOcrText: string;
  documentMeta: {
    filename: string;
    size: string;
    sha256: string;
    mimeType: string;
    scanStatus: "CLEAN" | "QUARANTINED" | "REJECTED";
    uploadedAt: string;
  };
  fields: ComparisonField[];
  discrepancies: Array<{
    id: string;
    field: string;
    expected: string;
    observed: string;
    status: "OPEN" | "RESOLVED" | "ACCEPTED_WITH_EXPLANATION" | "NOT_APPLICABLE";
    severity: "CRITICAL" | "WARNING";
    description: string;
    resolutionNotes?: string;
    resolvedBy?: string;
    resolvedAt?: string;
  }>;
}

export default function VerificationPage() {
  const { user } = useAuth();

  // ─── PRE-SEEDED TEST CASES (Satisfies Prompt Acceptance Criteria) ────
  const SCRUTINY_CASES: ScrutinyCase[] = [
    // Case 1: Clean Verification Case (100% Concordance)
    {
      id: "case-01",
      fdrId: "fdr-001",
      title: "DTU — State Bank of India (₹ 50 Lakh)",
      badgeLabel: "Clean Match (100%)",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      scenarioType: "CLEAN_MATCH",
      fdrRecord: CENTRAL_FDR_RECORDS[0],
      ocrConfidence: 98.4,
      engineUsed: "PyMuPDF 2.0 Text Layer & Tesseract OCR v5.3",
      rawOcrText: `STATE BANK OF INDIA\nKASHMERE GATE BRANCH, DELHI-110006\nIFSC: SBIN0001256\nFIXED DEPOSIT RECEIPT\nReceipt No: FDR/AICTE/2026/089\nDate: 15/03/2024\nReceived from: DELHI TECHNOLOGICAL UNIVERSITY (DTU)\nPrincipal Amount: Rs. 50,00,000.00 (Fifty Lakh Rupees Only)\nInterest Rate: 7.25% p.a. Cumulative\nMaturity Date: 20/11/2026\nMaturity Value: Rs. 53,62,500.00\nLien Marked in favour of: Member Secretary, AICTE, New Delhi`,
      documentMeta: {
        filename: "DTU_SBI_50L_Official_Receipt.pdf",
        size: "3.2 MB",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        mimeType: "application/pdf",
        scanStatus: "CLEAN",
        uploadedAt: "2024-03-16 10:00 UTC",
      },
      fields: [
        {
          id: "f-1",
          label: "FDR Reference Number",
          submitted: "FDR/AICTE/2026/089",
          extracted: "FDR/AICTE/2026/089",
          confidence: 99.2,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-2",
          label: "Issuing Scheduled Bank",
          submitted: "State Bank of India",
          extracted: "State Bank of India",
          confidence: 99.8,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-3",
          label: "Branch IFSC Code",
          submitted: "SBIN0001256",
          extracted: "SBIN0001256",
          confidence: 98.5,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-4",
          label: "Principal Deposit Amount",
          submitted: "₹ 50,00,000.00",
          extracted: "₹ 50,00,000.00",
          confidence: 98.9,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-5",
          label: "Date of Issuance",
          submitted: "2024-03-15",
          extracted: "2024-03-15",
          confidence: 97.4,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-6",
          label: "Contractual Maturity Date",
          submitted: "2026-11-20",
          extracted: "2026-11-20",
          confidence: 98.1,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-7",
          label: "Contracted Interest Rate",
          submitted: "7.25%",
          extracted: "7.25%",
          confidence: 96.5,
          isMatch: true,
          severity: "NONE",
        },
      ],
      discrepancies: [],
    },

    // Case 2: Deliberately Seeded Discrepancy Case (Amount & IFSC Mismatch)
    {
      id: "case-02",
      fdrId: "fdr-002",
      title: "DTU — Punjab National Bank (₹ 35 Lakh Submitted)",
      badgeLabel: "Deliberately Seeded Discrepancies",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      scenarioType: "SEEDED_DISCREPANCY",
      fdrRecord: CENTRAL_FDR_RECORDS[1],
      ocrConfidence: 89.2,
      engineUsed: "PyMuPDF 2.0 Text Layer & Tesseract OCR v5.3",
      rawOcrText: `PUNJAB NATIONAL BANK\nCIVIL LINES BRANCH, DELHI-110054\nIFSC: PUNB0999900 [DISCREPANCY]\nTERM DEPOSIT RECEIPT\nReceipt No: FDR/AICTE/2026/092\nDate of Issue: 10/06/2024\nDepositor: DELHI TECHNOLOGICAL UNIVERSITY (DTU)\nPrincipal Amount: Rs. 30,00,000.00 (Thirty Lakh Rupees Only) [DISCREPANCY - Submitted 35L]\nInterest Rate: 7.10% p.a.\nMaturity Date: 05/11/2026 [DISCREPANCY - Submitted 05/12/2026]\nLien Endorsement: Branch Manager Digital Signature Token Missing`,
      documentMeta: {
        filename: "PNB_Scanned_Deposit_35L_Dossier.pdf",
        size: "2.4 MB",
        sha256: "b45c298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899",
        mimeType: "application/pdf",
        scanStatus: "CLEAN",
        uploadedAt: "2026-09-12 09:15 UTC",
      },
      fields: [
        {
          id: "f-21",
          label: "FDR Reference Number",
          submitted: "FDR/AICTE/2026/092",
          extracted: "FDR/AICTE/2026/092",
          confidence: 97.8,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-22",
          label: "Issuing Scheduled Bank",
          submitted: "Punjab National Bank",
          extracted: "Punjab National Bank",
          confidence: 99.1,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-23",
          label: "Branch IFSC Code",
          submitted: "PUNB0123400",
          extracted: "PUNB0999900",
          confidence: 96.2,
          isMatch: false,
          severity: "WARNING",
          notes: "IFSC on branch memo differs from submitted form.",
        },
        {
          id: "f-24",
          label: "Principal Deposit Amount",
          submitted: "₹ 35,00,000.00",
          extracted: "₹ 30,00,000.00",
          confidence: 98.4,
          isMatch: false,
          severity: "CRITICAL",
          notes: "CRITICAL: Scanned receipt states Thirty Lakh (₹ 30,00,000), but institution claimed Thirty-Five Lakh.",
        },
        {
          id: "f-25",
          label: "Date of Issuance",
          submitted: "2024-06-10",
          extracted: "2024-06-10",
          confidence: 95.0,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-26",
          label: "Contractual Maturity Date",
          submitted: "2026-12-05",
          extracted: "2026-11-05",
          confidence: 94.6,
          isMatch: false,
          severity: "CRITICAL",
          notes: "Maturity on receipt is 05 Nov 2026, 1 month earlier than submitted.",
        },
        {
          id: "f-27",
          label: "Contracted Interest Rate",
          submitted: "7.10%",
          extracted: "7.10%",
          confidence: 95.8,
          isMatch: true,
          severity: "NONE",
        },
      ],
      discrepancies: [
        {
          id: "disc-01",
          field: "Principal Deposit Amount",
          expected: "₹ 35,00,000.00",
          observed: "₹ 30,00,000.00",
          status: "OPEN",
          severity: "CRITICAL",
          description: "Major financial variance: Receipt amount is ₹ 30,00,000, which is ₹ 5,00,000 below submitted obligation value.",
        },
        {
          id: "disc-02",
          field: "Branch IFSC Code",
          expected: "PUNB0123400",
          observed: "PUNB0999900",
          status: "ACCEPTED_WITH_EXPLANATION",
          severity: "WARNING",
          description: "Branch IFSC code mismatch between bank letter and application.",
          resolutionNotes: "Branch IFSC revised by PNB pursuant to national clearing zone restructuring. Verified in RBI directory.",
          resolvedBy: "Anil Verma (Senior Scrutiny Officer)",
          resolvedAt: "2026-09-14 11:35 UTC",
        },
        {
          id: "disc-03",
          field: "Contractual Maturity Date",
          expected: "2026-12-05",
          observed: "2026-11-05",
          status: "OPEN",
          severity: "CRITICAL",
          description: "Contractual maturity date on physical FDR is 1 month shorter than regulatory tenure.",
        },
      ],
    },

    // Case 3: Low-Quality / Blurry Scan Test Case
    {
      id: "case-03",
      fdrId: "fdr-003",
      title: "DTU — SBI (₹ 25 Lakh) [Low-Quality Scan Test]",
      badgeLabel: "Low Quality Scan (<60% OCR)",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      scenarioType: "LOW_QUALITY_SCAN",
      fdrRecord: CENTRAL_FDR_RECORDS[2],
      ocrConfidence: 48.2,
      engineUsed: "PyMuPDF Pixmap Filter & Tesseract Layout OCR",
      rawOcrText: `ST..E B..K OF IN..A\nB..WANA R..D, ROHINI\nIFSC: SBIN0005521 (LOW CONTRAST)\nFIXED DEP..T RECEIPT\nReceipt No: FDR/AICTE/2026/104\nDate: 01/10/2026 (?)\nAmount: Rs. 25,??,??? (BLURRY TEXT)\n[WARNING: OCR Confidence 48.2% is below regulatory threshold 60.0%]\nManual high-resolution re-upload strongly recommended.`,
      documentMeta: {
        filename: "SBI_25L_Blurry_Photo_Scan.jpg",
        size: "1.1 MB",
        sha256: "c67d198fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b712",
        mimeType: "image/jpeg",
        scanStatus: "CLEAN",
        uploadedAt: "2026-10-02 16:00 UTC",
      },
      fields: [
        {
          id: "f-31",
          label: "FDR Reference Number",
          submitted: "FDR/AICTE/2026/104",
          extracted: "FDR/AICTE/2026/104",
          confidence: 62.1,
          isMatch: true,
          severity: "NONE",
        },
        {
          id: "f-32",
          label: "Issuing Scheduled Bank",
          submitted: "State Bank of India",
          extracted: "State Bank of India",
          confidence: 55.4,
          isMatch: true,
          severity: "WARNING",
          notes: "Extracted with partial character degradation.",
        },
        {
          id: "f-33",
          label: "Principal Deposit Amount",
          submitted: "₹ 25,00,000.00",
          extracted: "₹ 25,00,000.00 (Uncertain)",
          confidence: 42.0,
          isMatch: true,
          severity: "WARNING",
          notes: "Optical clarity below 50%. Digits partially blurred.",
        },
        {
          id: "f-34",
          label: "Contractual Maturity Date",
          submitted: "2028-10-01",
          extracted: "2028-10-01",
          confidence: 51.0,
          isMatch: true,
          severity: "WARNING",
        },
      ],
      discrepancies: [
        {
          id: "disc-31",
          field: "Document Optical Quality",
          expected: "Resolution >= 300 DPI",
          observed: "Estimated 96 DPI Blur Scan",
          status: "OPEN",
          severity: "WARNING",
          description: "Document image resolution too low for automated legal verification. OCR confidence: 48.2%.",
        },
      ],
    },

    // Case 4: Unsupported / Corrupted File Rejection
    {
      id: "case-04",
      fdrId: "fdr-004",
      title: "Encrypted / Corrupted Container Test Case",
      badgeLabel: "Processing Failed",
      badgeColor: "bg-red-50 text-red-700 border-red-200",
      scenarioType: "PROCESSING_FAILURE",
      fdrRecord: CENTRAL_FDR_RECORDS[3],
      ocrConfidence: 0.0,
      engineUsed: "Security Gateway Antivirus Inspector",
      rawOcrText: `[ERROR] EXTRACTION_REJECTED: Password-encrypted or corrupted PDF container.\nThe document requires a private password key or contains malformed xref tables.\nSecurity scan rejected processing.`,
      documentMeta: {
        filename: "Encrypted_Bank_Memo_Protected.pdf",
        size: "450 KB",
        sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        mimeType: "application/pdf",
        scanStatus: "REJECTED",
        uploadedAt: "2026-10-21 11:00 UTC",
      },
      fields: [],
      discrepancies: [
        {
          id: "disc-41",
          field: "Document Ingestion",
          expected: "Decrypted Standard PDF/A",
          observed: "AES-256 Encrypted Container",
          status: "OPEN",
          severity: "CRITICAL",
          description: "Password protected document. Cannot execute automated scrutiny or OCR indexing.",
        },
      ],
    },
  ];

  // View Mode: 'queue' (Authorized Scrutiny Queue) vs 'workspace' (Individual Case Scrutiny)
  const [viewMode, setViewMode] = useState<"queue" | "workspace">("queue");
  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState("all");

  // Active Scrutiny Case State
  const [activeCaseIndex, setActiveCaseIndex] = useState(1); // Default to Case 2 (deliberately seeded discrepancy)
  const currentCase = SCRUTINY_CASES[activeCaseIndex] || SCRUTINY_CASES[0];

  // Review started tracker
  const [reviewedCases, setReviewedCases] = useState<Record<string, boolean>>({
    "case-01": true,
    "case-02": true,
  });

  // Observation Modal State (Section A & B: Create Observations & Request Additional Info)
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [obsCategory, setObsCategory] = useState<
    "IFSC_MISMATCH" | "AMOUNT_DISCREPANCY" | "LIEN_UNVERIFIED" | "DOCUMENT_BLURRY" | "REGULATORY_CLAUSE_NONCOMPLIANCE"
  >("AMOUNT_DISCREPANCY");
  const [obsText, setObsText] = useState("");
  const [obsRequestedAction, setObsRequestedAction] = useState("");
  const [observationSuccess, setObservationSuccess] = useState(false);

  // Dynamic discrepancies state so reviewers can resolve interactively
  const [caseDiscrepancies, setCaseDiscrepancies] = useState<Record<string, ScrutinyCase["discrepancies"]>>({
    "case-01": SCRUTINY_CASES[0].discrepancies,
    "case-02": SCRUTINY_CASES[1].discrepancies,
    "case-03": SCRUTINY_CASES[2].discrepancies,
    "case-04": SCRUTINY_CASES[3].discrepancies,
  });

  const activeDiscrepancies = caseDiscrepancies[currentCase.id] || [];

  // Resolution Modal State
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<ScrutinyCase["discrepancies"][0] | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<"RESOLVED" | "ACCEPTED_WITH_EXPLANATION" | "NOT_APPLICABLE">("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);

  // Tab View for Document Preview (Visual vs Raw OCR text)
  const [docViewTab, setDocViewTab] = useState<"visual" | "ocr_text">("visual");

  // Re-run OCR simulated progress
  const [isRerunningOcr, setIsRerunningOcr] = useState(false);
  const [rerunSuccess, setRerunSuccess] = useState(false);

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState<"VERIFIED" | "DISCREPANCY_FLAGGED" | "RETURNED_FOR_CORRECTION">("DISCREPANCY_FLAGGED");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionSuccess, setDecisionSuccess] = useState(false);

  // Check separation of duties: Institution representative CANNOT approve own instruments
  const isInstitutionRep = user?.role === "institution_representative" || user?.role === "depositor";

  // Open Discrepancies Count
  const openDiscrepanciesCount = useMemo(() => {
    return activeDiscrepancies.filter((d) => d.status === "OPEN").length;
  }, [activeDiscrepancies]);

  // Handle Discrepancy Resolution
  const handleSaveResolution = () => {
    if (!selectedDiscrepancy) return;

    setCaseDiscrepancies((prev) => {
      const currentList = prev[currentCase.id] || [];
      const updatedList = currentList.map((d) => {
        if (d.id === selectedDiscrepancy.id) {
          return {
            ...d,
            status: resolutionStatus,
            resolutionNotes: resolutionNotes || "Resolved by Scrutiny Officer following bank clarification.",
            resolvedBy: `${user?.name || "Anil Verma"} (${user?.role?.replace(/_/g, " ") || "Scrutiny Officer"})`,
            resolvedAt: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
          };
        }
        return d;
      });
      return { ...prev, [currentCase.id]: updatedList };
    });

    setResolutionModalOpen(false);
    setSelectedDiscrepancy(null);
    setResolutionNotes("");
  };

  // Handle Start Review
  const handleStartReview = () => {
    setReviewedCases((prev) => ({ ...prev, [currentCase.id]: true }));
  };

  // Handle Create Observation
  const handleCreateObservation = () => {
    if (!obsText.trim() || !obsRequestedAction.trim()) return;

    const newDisc: ScrutinyCase["discrepancies"][0] = {
      id: `disc-${Date.now()}`,
      field: obsCategory.replace(/_/g, " "),
      expected: "Institutional Compliance with AICTE Norms",
      observed: obsText,
      status: "OPEN",
      severity: "CRITICAL",
      description: `Observation: ${obsText}. Required Action: ${obsRequestedAction}`,
    };

    setCaseDiscrepancies((prev) => ({
      ...prev,
      [currentCase.id]: [newDisc, ...(prev[currentCase.id] || [])],
    }));

    setObservationModalOpen(false);
    setObsText("");
    setObsRequestedAction("");
    setObservationSuccess(true);
    setTimeout(() => setObservationSuccess(false), 5000);
  };

  // Re-run OCR handler
  const handleRerunOcr = () => {
    setIsRerunningOcr(true);
    setRerunSuccess(false);
    setTimeout(() => {
      setIsRerunningOcr(false);
      setRerunSuccess(true);
      setTimeout(() => setRerunSuccess(false), 4000);
    }, 1200);
  };

  // Submit Official Scrutiny Decision
  const handleSaveDecision = () => {
    if (isInstitutionRep) {
      alert("Separation of Duties Violation: Institution representatives cannot record regulatory outcomes.");
      return;
    }
    setDecisionSuccess(true);
    setDecisionModalOpen(false);
    setTimeout(() => setDecisionSuccess(false), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Technical Scrutiny & Verification Workspace"
        description="Authorized scrutiny portal for AICTE Regulation Bureau. Review submitted FDRs, cross-match extracted OCR layers, register observations, and issue regulatory decisions."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Technical Scrutiny" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 mr-2 text-xs">
              <button
                onClick={() => setViewMode("queue")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === "queue"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Scrutiny Queue (8)
              </button>
              <button
                onClick={() => setViewMode("workspace")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === "workspace"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Case Workspace
              </button>
            </div>

            {viewMode === "workspace" && (
              <>
                {!reviewedCases[currentCase.id] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartReview}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Start Review
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setObservationModalOpen(true)}
                  className="border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <AlertCircle size={14} className="text-amber-600" />
                  Create Observation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isRerunningOcr}
                  onClick={handleRerunOcr}
                  className="border-slate-300"
                >
                  <RotateCcw size={14} />
                  Re-run Extraction
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isInstitutionRep}
                  onClick={() => setDecisionModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-500 shadow-sm"
                  title={isInstitutionRep ? "Institution representatives cannot approve own instruments" : undefined}
                >
                  <FileCheck2 size={15} />
                  Record Scrutiny Finding
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* ─── MANDATORY REGULATORY SAFEGUARD BANNER (PRD / AGENTS.md Rule) ───── */}
      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg flex-shrink-0 mt-0.5">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Statutory Scrutiny Mandate: OCR Extraction is Not Bank Verification</span>
            </p>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              Automated OCR matching provides <strong>clerical assistance only</strong> and does <strong>NOT</strong> prove document authenticity. A matching FDR reference or principal amount does not confirm validity. Official deposit verification requires independent confirmation with issuing bank Core Banking Systems (CBS) and authorized official sign-off.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded font-semibold whitespace-nowrap self-end sm:self-center">
          AICTE Regulation Bureau
        </span>
      </div>

      {observationSuccess && (
        <Alert variant="warning" title="Regulatory Observation Dispatched">
          Official observation notice has been dispatched to the institution representative. Required clarification and document upload instructions logged.
        </Alert>
      )}

      {decisionSuccess && (
        <Alert variant="success" title="Official Scrutiny Finding Recorded">
          Technical scrutiny dossier for <strong>{currentCase.fdrRecord.fdrNumber}</strong> has been logged into the central audit trail. Status updated to <strong>{decisionOutcome}</strong>.
        </Alert>
      )}

      {rerunSuccess && (
        <Alert variant="info" title="OCR Pipeline Executed Successfully">
          PyMuPDF text extraction & layout heuristics completed with confidence score: <strong>{currentCase.ocrConfidence}%</strong>.
        </Alert>
      )}

      {/* ─── TOP SUMMARY METRICS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Scrutiny Queue</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">4 Cases</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Layers size={18} />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Discrepancies</p>
            <p className={`text-xl font-bold mt-0.5 ${openDiscrepanciesCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {openDiscrepanciesCount} Open
            </p>
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${openDiscrepanciesCount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
            <AlertCircle size={18} />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">OCR Accuracy Indicator</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{currentCase.ocrConfidence}%</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Pipeline</p>
            <p className="text-xs font-bold text-slate-800 mt-1 truncate max-w-[120px]">PyMuPDF 2.0</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText size={18} />
          </div>
        </div>
      </div>

      {/* ─── AUTHORIZED SCRUTINY QUEUE VIEW ─────────────────────────────── */}
      {viewMode === "queue" ? (
        <Card className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers size={18} className="text-orange-600" />
                <span>Authorized Regulatory Scrutiny Queue</span>
              </CardTitle>
              <CardDescription>
                Regulatory review register of all financial deposit instruments lodged for scrutiny and verification by the AICTE Regulation Bureau.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search FDR #, Institution, Bank..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-56"
              />
              <select
                value={queueStatusFilter}
                onChange={(e) => setQueueStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Verification Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="UNDER_SCRUTINY">Under Scrutiny</option>
                <option value="DISCREPANCY_FLAGGED">Discrepancy Flagged</option>
                <option value="VERIFIED">Verified</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-3 px-3">Instrument Ref #</th>
                  <th className="py-3 px-3">Institution</th>
                  <th className="py-3 px-3">Submission Date</th>
                  <th className="py-3 px-3">Principal (₹)</th>
                  <th className="py-3 px-3">Submission Status</th>
                  <th className="py-3 px-3">Verification Status</th>
                  <th className="py-3 px-3">Assigned Reviewer</th>
                  <th className="py-3 px-3 text-center">Discrepancies</th>
                  <th className="py-3 px-3">Required Next Action</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CENTRAL_FDR_RECORDS.filter((r) => {
                  const matchSearch =
                    r.fdrNumber.toLowerCase().includes(queueSearch.toLowerCase()) ||
                    r.institutionName.toLowerCase().includes(queueSearch.toLowerCase()) ||
                    r.bankName.toLowerCase().includes(queueSearch.toLowerCase());
                  const matchFilter =
                    queueStatusFilter === "all" || r.verificationStatus === queueStatusFilter;
                  return matchSearch && matchFilter;
                }).map((fdr) => {
                  const isUnderScrutiny = reviewedCases[fdr.id] || fdr.verificationStatus === "UNDER_SCRUTINY";
                  const hasDiscrepancy = fdr.verificationStatus === "DISCREPANCY_FLAGGED";

                  return (
                    <tr key={fdr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <Link to={`/fdr/${fdr.id}`} className="hover:text-orange-600 transition-colors">
                          {fdr.fdrNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        <p className="truncate max-w-[200px]" title={fdr.institutionName}>
                          {fdr.institutionName}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {fdr.institutionCode || "AICTE"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono whitespace-nowrap">
                        {formatDate(fdr.depositDate || fdr.issueDate)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(fdr.principalAmount)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {fdr.submissionStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            fdr.verificationStatus === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : fdr.verificationStatus === "DISCREPANCY_FLAGGED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : fdr.verificationStatus === "UNDER_SCRUTINY"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {fdr.verificationStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                            AV
                          </span>
                          <span className="text-[11px] font-medium">{fdr.assignedReviewer || "Anil Verma"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {fdr.observationsCount > 0 || hasDiscrepancy ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            {fdr.observationsCount || 2} Open
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            0
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {hasDiscrepancy
                          ? "Awaiting Institution Response to Observation"
                          : fdr.verificationStatus === "VERIFIED"
                          ? "Verification Completed — Lien Marked"
                          : isUnderScrutiny
                          ? "Review in progress — Record outcome"
                          : "Start Preliminary Technical Review"}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isUnderScrutiny && fdr.verificationStatus !== "VERIFIED" && (
                            <button
                              onClick={() => {
                                setReviewedCases((prev) => ({ ...prev, [fdr.id]: true }));
                                setViewMode("workspace");
                                setActiveCaseIndex(fdr.id === "fdr-001" ? 0 : 1);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                            >
                              Start Review
                            </button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              // Map clicked FDR to appropriate test case
                              if (fdr.id === "fdr-001") setActiveCaseIndex(0);
                              else if (fdr.id === "fdr-002") setActiveCaseIndex(1);
                              else if (fdr.id === "fdr-004") setActiveCaseIndex(3);
                              else setActiveCaseIndex(1);
                              setViewMode("workspace");
                            }}
                          >
                            Review Workspace
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <>
          {/* ─── ACCEPTANCE CRITERIA SCENARIO SWITCHER TABS ────────────────────── */}
          <Card noPadding className="bg-slate-50 border-slate-200">
            <div className="p-3.5 border-b border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Acceptance Testing Scrutiny Dossiers (PRD Demonstration Cases)
                </span>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Select a pre-seeded test case to review rule-based matching, seeded discrepancies, blur scan, or failure handling:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="h-7 text-xs bg-white">
                  <Link to="/fdr">
                    <ExternalLink size={12} />
                    View in FDR Registry
                  </Link>
                </Button>
              </div>
            </div>

            {/* Tab buttons */}
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {SCRUTINY_CASES.map((sc, idx) => {
                const isSelected = activeCaseIndex === idx;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setActiveCaseIndex(idx)}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      isSelected
                        ? "bg-white border-orange-500 shadow-sm ring-1 ring-orange-500/30"
                        : "bg-white/60 hover:bg-white border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400">Case {idx + 1}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sc.badgeColor}`}>
                        {sc.badgeLabel}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{sc.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      OCR: {sc.ocrConfidence}% · {sc.discrepancies.length} Discrepanc{sc.discrepancies.length === 1 ? "y" : "ies"}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

      {/* ─── HUMAN REVIEW WORKSPACE (Split layout: Document preview vs Side-by-side comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT PANE (5 cols): DOCUMENT PREVIEW & OCR RAW TEXT ────────────── */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <CardTitle className="text-sm">Scanned Document Artifact</CardTitle>
                <CardDescription className="text-xs">Private Object Storage Vault Reference</CardDescription>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setDocViewTab("visual")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    docViewTab === "visual"
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Visual Scan
                </button>
                <button
                  onClick={() => setDocViewTab("ocr_text")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    docViewTab === "ocr_text"
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Raw OCR Layer
                </button>
              </div>
            </div>

            {/* Document Viewer Frame */}
            {docViewTab === "visual" ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                {currentCase.scenarioType === "PROCESSING_FAILURE" ? (
                  <div className="p-8 text-center space-y-3 bg-red-50/50">
                    <FileWarning size={36} className="mx-auto text-red-500" />
                    <p className="text-xs font-bold text-red-900">Encrypted Container Rejection</p>
                    <p className="text-[11px] text-red-700 max-w-xs mx-auto leading-relaxed">
                      This container is protected by 256-bit AES encryption. Automated extraction cannot decrypt password-protected attachments.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/30 min-h-[360px] flex flex-col justify-between border-2 border-dashed border-slate-300/80 rounded-lg m-2 relative">
                    {/* Simulated Authentic Certificate Watermark */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                        <div className="flex items-center gap-2">
                          <Building size={16} className="text-slate-700" />
                          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            {currentCase.fields.find((f) => f.id.includes("2"))?.extracted || "Scheduled Bank"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          AICTE Joint Lien
                        </span>
                      </div>

                      <div className="space-y-1 text-center py-2">
                        <p className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                          Fixed Deposit Receipt (Custody Copy)
                        </p>
                        <p className="text-[10px] font-mono text-slate-600">
                          Certificate Reference: {currentCase.fdrRecord.fdrNumber}
                        </p>
                      </div>

                      <div className="p-3 bg-white/90 rounded border border-slate-200 text-[11px] space-y-1.5 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Beneficiary:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[170px]">
                            {currentCase.fdrRecord.institutionName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Principal Deposit:</span>
                          <span className="font-bold text-orange-600">
                            {currentCase.fields.find((f) => f.label.includes("Principal"))?.extracted || formatCurrency(currentCase.fdrRecord.principalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Branch IFSC:</span>
                          <span className="font-bold text-slate-800">
                            {currentCase.fields.find((f) => f.label.includes("IFSC"))?.extracted || currentCase.fdrRecord.ifscCode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Maturity Date:</span>
                          <span className="font-bold text-slate-800">
                            {currentCase.fields.find((f) => f.label.includes("Maturity"))?.extracted || formatDate(currentCase.fdrRecord.maturityDate)}
                          </span>
                        </div>
                      </div>

                      {/* Seeded Discrepancy Overlay Box if applicable */}
                      {currentCase.scenarioType === "SEEDED_DISCREPANCY" && (
                        <div className="p-2 bg-rose-50 border border-rose-300 rounded text-[10px] text-rose-900 font-sans">
                          <strong>Deliberately Seeded Flag:</strong> Amount printed on certificate is <strong>₹ 30,00,000</strong>, differing from institution application (₹ 35,00,000).
                        </div>
                      )}

                      {currentCase.scenarioType === "LOW_QUALITY_SCAN" && (
                        <div className="p-2 bg-amber-50 border border-amber-300 rounded text-[10px] text-amber-900 font-sans">
                          <strong>Low Resolution Scan:</strong> Estimated 96 DPI document scan with character degradation. OCR Confidence: 48.2%.
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Seal: Authorized Officer</span>
                      <span>Status: Scanned Document</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto whitespace-pre-wrap">
                {currentCase.rawOcrText}
              </div>
            )}

            {/* Document Metadata & Cryptographic Hashes */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Original Filename:</span>
                <span className="font-mono font-bold text-slate-800">{currentCase.documentMeta.filename}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Antivirus Scan Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                  <CheckCircle2 size={11} />
                  {currentCase.documentMeta.scanStatus}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">File Size:</span>
                <span className="font-mono text-slate-700">{currentCase.documentMeta.size}</span>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">SHA-256 Checksum:</span>
                <span className="font-mono text-[10px] text-slate-600 break-all select-all">
                  {currentCase.documentMeta.sha256}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── RIGHT PANE (7 cols): SIDE-BY-SIDE FIELD COMPARISON & RESOLUTION ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Side-by-Side Comparison Matrix */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Field-by-Field Semantic Comparison</CardTitle>
                  <CardDescription className="text-xs">
                    Automated reconciliation of submitted application data against OCR extracted layer
                  </CardDescription>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Engine: {currentCase.engineUsed.split("&")[0]}
                </span>
              </div>
            </CardHeader>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Submitted Value</th>
                    <th className="py-2.5 px-3">Extracted Value</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentCase.fields.length > 0 ? (
                    currentCase.fields.map((f) => (
                      <tr
                        key={f.id}
                        className={`transition-colors ${
                          !f.isMatch
                            ? f.severity === "CRITICAL"
                              ? "bg-rose-50/60 hover:bg-rose-50"
                              : "bg-amber-50/60 hover:bg-amber-50"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {f.label}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {f.submitted}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className={!f.isMatch ? "text-rose-700 font-bold" : "text-slate-700"}>
                            {f.extracted}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-sans">
                            {f.confidence}% conf.
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {f.isMatch ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 size={10} /> Match
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                                f.severity === "CRITICAL"
                                  ? "text-rose-700 bg-rose-100 border-rose-300"
                                  : "text-amber-800 bg-amber-100 border-amber-300"
                              }`}
                            >
                              <AlertCircle size={10} />
                              {f.severity === "CRITICAL" ? "Mismatch" : "Review"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                        No structured fields could be extracted from this container.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Card 2: Identified Discrepancies & Resolution Workspace */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Identified Discrepancies & Resolution Actions</CardTitle>
                  <CardDescription className="text-xs">
                    Resolve, accept with justification, or flag discrepancies under DATABASE.md Section 5.8
                  </CardDescription>
                </div>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {openDiscrepanciesCount} Open
                </span>
              </div>
            </CardHeader>

            <div className="space-y-3 pt-1">
              {activeDiscrepancies.length > 0 ? (
                activeDiscrepancies.map((disc) => {
                  const isOpen = disc.status === "OPEN";
                  return (
                    <div
                      key={disc.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                        isOpen
                          ? "bg-rose-50/40 border-rose-200 shadow-xs"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              disc.severity === "CRITICAL"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {disc.severity}
                          </span>
                          <span className="font-bold text-slate-900">{disc.field}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              disc.status === "OPEN"
                                ? "bg-rose-100 text-rose-800"
                                : disc.status === "RESOLVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : disc.status === "ACCEPTED_WITH_EXPLANATION"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {disc.status.replace(/_/g, " ")}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs bg-white"
                            onClick={() => {
                              setSelectedDiscrepancy(disc);
                              setResolutionStatus("RESOLVED");
                              setResolutionNotes(disc.resolutionNotes || "");
                              setResolutionModalOpen(true);
                            }}
                          >
                            {isOpen ? "Resolve" : "Edit Resolution"}
                          </Button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        {disc.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-slate-200/80 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">Submitted Value:</span>
                          <span className="font-semibold text-slate-800">{disc.expected}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">Extracted Value:</span>
                          <span className="font-bold text-rose-700">{disc.observed}</span>
                        </div>
                      </div>

                      {disc.resolutionNotes && (
                        <div className="pt-1.5 border-t border-slate-200/80 text-[11px] space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Resolution Audit Trail:</span>
                          <p className="text-slate-700 italic bg-white p-2 rounded border border-slate-200">
                            "{disc.resolutionNotes}"
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Resolved by {disc.resolvedBy} on {disc.resolvedAt}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-xs font-bold text-emerald-950">Clean Dossier — Zero Discrepancies</p>
                  <p className="text-[11px] text-emerald-800">
                    All extracted parameters match the submitted institution application in full.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      </>
      )}

      {/* ─── CREATE OBSERVATION / REQUEST CLARIFICATION MODAL (Section A & B) ───── */}
      <Dialog
        open={observationModalOpen}
        onClose={() => setObservationModalOpen(false)}
        title="Create Regulatory Observation"
        description="Issue an official observation to the institution and request corrective evidence or re-upload."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setObservationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateObservation}>
              <Check size={14} /> Register Observation & Dispatch Notice
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observation Category
            </label>
            <Select
              value={obsCategory}
              onChange={(e) => setObsCategory(e.target.value as any)}
              options={[
                { value: "AMOUNT_DISCREPANCY", label: "Principal Deposit Amount Discrepancy" },
                { value: "IFSC_MISMATCH", label: "Bank Branch / IFSC Code Mismatch" },
                { value: "LIEN_UNVERIFIED", label: "Bank Lien Endorsement Incomplete / Token Missing" },
                { value: "DOCUMENT_BLURRY", label: "Document Illegible / Low Resolution Scan (< 300 DPI)" },
                { value: "REGULATORY_CLAUSE_NONCOMPLIANCE", label: "Clause Non-Compliance under AICTE Regulations" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Specific Scrutiny Observation
            </label>
            <textarea
              rows={3}
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="State the exact discrepancy or non-compliance observed during document cross-scrutiny..."
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Required Institution Action / Evidence Requested
            </label>
            <textarea
              rows={2}
              value={obsRequestedAction}
              onChange={(e) => setObsRequestedAction(e.target.value)}
              placeholder="Specify the exact document or rectified declaration the institution representative must upload..."
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </Dialog>

      {/* ─── DISCREPANCY RESOLUTION MODAL ──────────────────────────────────── */}
      {selectedDiscrepancy && (
        <Dialog
          open={resolutionModalOpen}
          onClose={() => setResolutionModalOpen(false)}
          title={`Resolve Discrepancy: ${selectedDiscrepancy.field}`}
          description="Record an official regulatory resolution decision without erasing historical audit records."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setResolutionModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveResolution}>
                <Check size={14} /> Save Resolution Decision
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-slate-500 font-medium">Variance Detail:</p>
              <p className="text-slate-800 font-semibold">{selectedDiscrepancy.description}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Resolution Action (DATABASE.md Approved States)
              </label>
              <Select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value as any)}
                options={[
                  { value: "RESOLVED", label: "Resolved (Corrected bank certificate verified)" },
                  { value: "ACCEPTED_WITH_EXPLANATION", label: "Accepted with Explanation (Official Justification Recorded)" },
                  { value: "NOT_APPLICABLE", label: "Not Applicable (Discrepancy ruled non-consequential)" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reviewer Resolution Notes / Justification (Mandatory)
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the regulatory basis for resolving or accepting this discrepancy..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </Dialog>
      )}

      {/* ─── OFFICIAL SCRUTINY DECISION MODAL ──────────────────────────────── */}
      <Dialog
        open={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title="Record Technical Scrutiny Outcome"
        description="Official determination following clerical OCR-assisted scrutiny and document inspection."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDecisionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDecision}>
              <Check size={14} /> Confirm Official Finding
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs pt-1">
          {isInstitutionRep && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs">
              <strong>Separation of Duties Notice:</strong> You are currently authenticated as an Institution Representative. Regulatory governance rules prohibit institution representatives from signing off on their own institution's instruments. Please switch to Scrutiny Officer or Approving Authority in the top bar to record official determinations.
            </div>
          )}

          {openDiscrepanciesCount > 0 && decisionOutcome === "VERIFIED" && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs">
              <strong>Regulatory Warning:</strong> There are currently {openDiscrepanciesCount} unresolved discrepancies. Approval requires all discrepancies to be resolved or officially accepted with explanation.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Scrutiny Bureau Finding
            </label>
            <Select
              value={decisionOutcome}
              onChange={(e) => setDecisionOutcome(e.target.value as any)}
              options={[
                { value: "DISCREPANCY_FLAGGED", label: "Discrepancy Flagged — Notice Issued to Institution" },
                { value: "RETURNED_FOR_CORRECTION", label: "Returned for Correction — Resubmission Required" },
                { value: "VERIFIED", label: "Technical Scrutiny Cleared — Recommended for Lien Endorsement" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Scrutiny Officer Remarks / Directives
            </label>
            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Enter official scrutiny findings, directives to the institution, or bank confirmation references..."
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
