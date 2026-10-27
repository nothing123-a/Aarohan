import type { User, FDR, FDRDocument, FDRHistoryEntry } from "@/types";

export interface Institution {
  id: string;
  name: string;
  code: string;
  type: "University" | "Engineering College" | "Polytechnic" | "Management Institute";
  state: string;
  city: string;
  approvedIntake: number;
  totalDepositRequired: number;
}

export interface ScrutinyObservation {
  id: string;
  fdrId: string;
  officerName: string;
  date: string;
  category: "IFSC_MISMATCH" | "AMOUNT_DISCREPANCY" | "LIEN_UNVERIFIED" | "DOCUMENT_BLURRY";
  observation: string;
  status: "OPEN" | "RESOLVED";
  resolutionNotes?: string;
}

export interface ReleaseApprovalCase {
  id: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  bankName: string;
  principalAmount: number;
  requestType: "FULL_RELEASE" | "PARTIAL_REFUND" | "NOC_ISSUANCE";
  requestedDate: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "RETURNED";
  scrutinyFinding: string;
  scrutinyOfficer: string;
  scrutinyDate: string;
  supportingDocuments: { name: string; size: string; status: "VERIFIED" | "QUARANTINED" }[];
  previousDecisions: {
    stage: string;
    officer: string;
    decision: string;
    timestamp: string;
    remarks: string;
  }[];
  decisionReasonRequired: boolean;
}

// ─── 1. INSTITUTIONS ───────────────────────────────────────────────
export const CENTRAL_INSTITUTIONS: Institution[] = [
  {
    id: "inst-001",
    name: "Delhi Technological University (DTU)",
    code: "AICTE-NZ-00142",
    type: "University",
    state: "Delhi",
    city: "New Delhi",
    approvedIntake: 3200,
    totalDepositRequired: 1_50_00_000,
  },
  {
    id: "inst-002",
    name: "BITS Pilani — Goa Campus",
    code: "AICTE-WZ-00891",
    type: "Engineering College",
    state: "Goa",
    city: "Zuarinagar",
    approvedIntake: 1800,
    totalDepositRequired: 2_00_00_000,
  },
  {
    id: "inst-003",
    name: "PSG College of Technology, Coimbatore",
    code: "AICTE-SZ-00456",
    type: "Engineering College",
    state: "Tamil Nadu",
    city: "Coimbatore",
    approvedIntake: 2400,
    totalDepositRequired: 1_25_00_000,
  },
  {
    id: "inst-004",
    name: "Manipal Institute of Technology",
    code: "AICTE-SW-00712",
    type: "Engineering College",
    state: "Karnataka",
    city: "Manipal",
    approvedIntake: 2600,
    totalDepositRequired: 1_75_00_000,
  },
  {
    id: "inst-005",
    name: "College of Engineering Pune (COEP)",
    code: "AICTE-WZ-00201",
    type: "University",
    state: "Maharashtra",
    city: "Pune",
    approvedIntake: 2100,
    totalDepositRequired: 1_00_00_000,
  },
];

// ─── 2. CENTRAL FDR RECORDS ────────────────────────────────────────
// ─── 2. CENTRAL FDR RECORDS ────────────────────────────────────────
export type SubmissionStatus = "DRAFT" | "SUBMITTED" | "RETURNED" | "WITHDRAWN";

export type VerificationStatus =
  | "NOT_STARTED"
  | "PENDING_REVIEW"
  | "UNDER_SCRUTINY"
  | "VERIFIED"
  | "DISCREPANCY_FLAGGED"
  | "REJECTED";

export type LifecycleStatus =
  | "LODGED"
  | "ACTIVE_LIEN"
  | "MATURING_SOON"
  | "MATURED"
  | "RENEWAL_REQUESTED"
  | "RELEASE_REQUESTED"
  | "RELEASED"
  | "DISCHARGED";

export interface FDRDocumentItem {
  id: string;
  name: string;
  type: string;
  size: string;
  hash: string;
  scanStatus: "CLEAN" | "PROCESSING" | "QUARANTINED";
  uploadedAt: string;
  documentType: "fdr_certificate" | "bank_letter" | "board_resolution" | "other";
}

export interface FDRLifecycleEvent {
  id: string;
  event: string;
  actor: string;
  timestamp: string;
  remarks: string;
  type: "submission" | "scrutiny" | "lien" | "system" | "renewal" | "release";
}

export interface CentralFDRRecord extends Omit<FDR, "documents" | "history" | "tenureMonths" | "submittedBy"> {
  institutionId: string;
  institutionName: string;
  institutionCode?: string;
  lienConfirmedInCBS: boolean;
  observationsCount: number;
  assignedReviewer?: string;
  scrutinyStatus: "PENDING_SCRUTINY" | "SCRUTINY_PASSED" | "DISCREPANCY_FLAGGED" | "OBSERVATION_ISSUED";
  ocrConfidence: number;

  // Explicit 3-axis statuses per PRD, DATABASE.md, and ARCHITECTURE.md
  submissionStatus: SubmissionStatus;
  verificationStatus: VerificationStatus;
  lifecycleStatus: LifecycleStatus;

  issueDate: string;
  tenureMonths: number;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instrumentCategory?: string;
  documentsList?: FDRDocumentItem[];
  lifecycleEvents?: FDRLifecycleEvent[];
  discrepancies?: ScrutinyObservation[];

  submittedBy?: string;
  documents?: FDRDocument[];
  history?: FDRHistoryEntry[];
}

export const CENTRAL_FDR_RECORDS: CentralFDRRecord[] = [
  // ── DTU (inst-001) records ──
  {
    id: "fdr-001",
    fdrNumber: "FDR/AICTE/2026/089",
    institutionId: "inst-001",
    institutionName: "Delhi Technological University (DTU)",
    institutionCode: "AICTE-NZ-00142",
    depositorName: "Delhi Technological University (DTU)",
    depositorId: "inst-001",
    bankName: "State Bank of India",
    bankBranch: "Kashmere Gate, Delhi",
    accountNumber: "38910029381",
    ifscCode: "SBIN0001256",
    principalAmount: 50_00_000,
    interestRate: 7.25,
    maturityAmount: 53_62_500,
    issueDate: "2024-03-15",
    depositDate: "2024-03-15T00:00:00Z",
    maturityDate: "2026-11-20T00:00:00Z",
    tenureMonths: 32,
    status: "active",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "ACTIVE_LIEN",
    purpose: "security_deposit",
    instrumentCategory: "Establishment Security Deposit",
    department: "Computer Science & Engineering",
    contactPerson: "Prof. S. K. Mahajan (Registrar)",
    contactPhone: "+91 98110 23412",
    contactEmail: "registrar@dtu.ac.in",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    assignedReviewer: "Anil Verma (Scrutiny Officer)",
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 98.4,
    documentsList: [
      {
        id: "doc-001",
        name: "FDR_Original_Certificate_Scan.pdf",
        type: "application/pdf",
        size: "3.2 MB",
        hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        scanStatus: "CLEAN",
        uploadedAt: "2024-03-16T10:00:00Z",
        documentType: "fdr_certificate",
      },
      {
        id: "doc-002",
        name: "SBI_Lien_Confirmation_Letter.pdf",
        type: "application/pdf",
        size: "1.8 MB",
        hash: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
        scanStatus: "CLEAN",
        uploadedAt: "2024-03-18T14:20:00Z",
        documentType: "bank_letter",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-001",
        event: "Electronic Submission",
        actor: "Prof. S. K. Mahajan (DTU)",
        timestamp: "2024-03-16T10:00:00Z",
        remarks: "Initial FDR submission with digital certificate scan.",
        type: "submission",
      },
      {
        id: "ev-002",
        event: "Document Antivirus & Security Scan",
        actor: "System Sentinel",
        timestamp: "2024-03-16T10:01:12Z",
        remarks: "SHA-256 verified. Clean document stored in vault.",
        type: "system",
      },
      {
        id: "ev-003",
        event: "OCR Extraction & Cross-Verification",
        actor: "AI Scrutiny Engine",
        timestamp: "2024-03-16T10:02:45Z",
        remarks: "OCR Confidence 98.4%. Bank, amount, and dates match perfectly.",
        type: "scrutiny",
      },
      {
        id: "ev-004",
        event: "Official Scrutiny Clearance",
        actor: "Anil Verma (Scrutiny Officer)",
        timestamp: "2024-03-20T14:30:00Z",
        remarks: "All documents scrutinized and verified against AICTE norms.",
        type: "scrutiny",
      },
      {
        id: "ev-005",
        event: "CBS Lien Notation Confirmed",
        actor: "SBI Core Banking Gateway",
        timestamp: "2024-03-22T09:15:00Z",
        remarks: "Branch manager confirmed exclusive lien marked in SBI CBS.",
        type: "lien",
      },
    ],
    createdAt: "2024-03-16T10:00:00Z",
    updatedAt: "2024-03-20T14:30:00Z",
  },
  {
    id: "fdr-002",
    fdrNumber: "FDR/AICTE/2026/092",
    institutionId: "inst-001",
    institutionName: "Delhi Technological University (DTU)",
    institutionCode: "AICTE-NZ-00142",
    depositorName: "Delhi Technological University (DTU)",
    depositorId: "inst-001",
    bankName: "Punjab National Bank",
    bankBranch: "Civil Lines, Delhi",
    accountNumber: "48200192837",
    ifscCode: "PUNB0123400",
    principalAmount: 35_00_000,
    interestRate: 7.1,
    maturityAmount: 37_48_500,
    issueDate: "2024-06-10",
    depositDate: "2024-06-10T00:00:00Z",
    maturityDate: "2026-12-05T00:00:00Z",
    tenureMonths: 30,
    status: "under_review",
    submissionStatus: "SUBMITTED",
    verificationStatus: "DISCREPANCY_FLAGGED",
    lifecycleStatus: "ACTIVE_LIEN",
    purpose: "security_deposit",
    instrumentCategory: "Program Expansion Security Deposit",
    department: "Mechanical Engineering Extension",
    contactPerson: "Prof. S. K. Mahajan (Registrar)",
    contactPhone: "+91 98110 23412",
    contactEmail: "registrar@dtu.ac.in",
    lienConfirmedInCBS: false,
    observationsCount: 1,
    assignedReviewer: "Anil Verma (Scrutiny Officer)",
    scrutinyStatus: "OBSERVATION_ISSUED",
    ocrConfidence: 89.2,
    documentsList: [
      {
        id: "doc-003",
        name: "PNB_FDR_Scan_48200192837.pdf",
        type: "application/pdf",
        size: "2.4 MB",
        hash: "b45c298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899",
        scanStatus: "CLEAN",
        uploadedAt: "2026-09-12T09:15:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-006",
        event: "Electronic Submission",
        actor: "Prof. S. K. Mahajan (DTU)",
        timestamp: "2026-09-12T09:15:00Z",
        remarks: "Submitted for scrutiny review.",
        type: "submission",
      },
      {
        id: "ev-007",
        event: "Observation Issued",
        actor: "Anil Verma (Scrutiny Officer)",
        timestamp: "2026-09-14T11:20:00Z",
        remarks: "Branch IFSC confirmation letter does not bear branch manager digital token.",
        type: "scrutiny",
      },
    ],
    createdAt: "2026-09-12T09:15:00Z",
    updatedAt: "2026-09-14T11:20:00Z",
  },
  {
    id: "fdr-003",
    fdrNumber: "FDR/AICTE/2026/104",
    institutionId: "inst-001",
    institutionName: "Delhi Technological University (DTU)",
    institutionCode: "AICTE-NZ-00142",
    depositorName: "Delhi Technological University (DTU)",
    depositorId: "inst-001",
    bankName: "State Bank of India",
    bankBranch: "Bawana Road, Rohini",
    accountNumber: "38910044991",
    ifscCode: "SBIN0005521",
    principalAmount: 25_00_000,
    interestRate: 7.0,
    maturityAmount: 26_75_000,
    issueDate: "2026-10-01",
    depositDate: "2026-10-01T00:00:00Z",
    maturityDate: "2028-10-01T00:00:00Z",
    tenureMonths: 24,
    status: "submitted",
    submissionStatus: "SUBMITTED",
    verificationStatus: "PENDING_REVIEW",
    lifecycleStatus: "LODGED",
    purpose: "security_deposit",
    instrumentCategory: "New Department Endowment Deposit",
    department: "AI & Data Science Department",
    contactPerson: "Prof. S. K. Mahajan (Registrar)",
    contactPhone: "+91 98110 23412",
    contactEmail: "registrar@dtu.ac.in",
    lienConfirmedInCBS: false,
    observationsCount: 0,
    assignedReviewer: "Anil Verma (Scrutiny Officer)",
    scrutinyStatus: "PENDING_SCRUTINY",
    ocrConfidence: 96.8,
    documentsList: [
      {
        id: "doc-004",
        name: "SBI_FDR_25L_Scan.pdf",
        type: "application/pdf",
        size: "2.1 MB",
        hash: "c67d198fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b712",
        scanStatus: "CLEAN",
        uploadedAt: "2026-10-02T16:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-008",
        event: "Electronic Submission",
        actor: "Prof. S. K. Mahajan (DTU)",
        timestamp: "2026-10-02T16:00:00Z",
        remarks: "Submitted and assigned to scrutiny queue.",
        type: "submission",
      },
    ],
    createdAt: "2026-10-02T16:00:00Z",
    updatedAt: "2026-10-02T16:00:00Z",
  },
  {
    id: "fdr-004",
    fdrNumber: "FDR/AICTE/2026/012-DFT",
    institutionId: "inst-001",
    institutionName: "Delhi Technological University (DTU)",
    institutionCode: "AICTE-NZ-00142",
    depositorName: "Delhi Technological University (DTU)",
    depositorId: "inst-001",
    bankName: "HDFC Bank Ltd",
    bankBranch: "Connaught Place, Delhi",
    accountNumber: "501009182736",
    ifscCode: "HDFC0000003",
    principalAmount: 40_00_000,
    interestRate: 7.3,
    maturityAmount: 42_92_000,
    issueDate: "2026-10-20",
    depositDate: "2026-10-20T00:00:00Z",
    maturityDate: "2027-10-20T00:00:00Z",
    tenureMonths: 12,
    status: "draft",
    submissionStatus: "DRAFT",
    verificationStatus: "NOT_STARTED",
    lifecycleStatus: "LODGED",
    purpose: "security_deposit",
    instrumentCategory: "Establishment Security Deposit",
    department: "Electrical Engineering",
    contactPerson: "Prof. S. K. Mahajan (Registrar)",
    contactPhone: "+91 98110 23412",
    contactEmail: "registrar@dtu.ac.in",
    lienConfirmedInCBS: false,
    observationsCount: 0,
    scrutinyStatus: "PENDING_SCRUTINY",
    ocrConfidence: 0,
    documentsList: [],
    lifecycleEvents: [
      {
        id: "ev-009",
        event: "Draft Created",
        actor: "Prof. S. K. Mahajan (DTU)",
        timestamp: "2026-10-21T11:00:00Z",
        remarks: "Saved as draft. Pending bank confirmation upload.",
        type: "submission",
      },
    ],
    createdAt: "2026-10-21T11:00:00Z",
    updatedAt: "2026-10-21T11:00:00Z",
  },

  // ── BITS Pilani (inst-002) records ──
  {
    id: "fdr-005",
    fdrNumber: "FDR/AICTE/2026/042",
    institutionId: "inst-002",
    institutionName: "BITS Pilani — Goa Campus",
    institutionCode: "AICTE-WZ-00891",
    depositorName: "BITS Pilani — Goa Campus",
    depositorId: "inst-002",
    bankName: "HDFC Bank Ltd",
    bankBranch: "Vasco da Gama, Goa",
    accountNumber: "502008172635",
    ifscCode: "HDFC0000214",
    principalAmount: 1_00_00_000,
    interestRate: 7.4,
    maturityAmount: 1_07_40_000,
    issueDate: "2023-11-15",
    depositDate: "2023-11-15T00:00:00Z",
    maturityDate: "2026-11-12T00:00:00Z", // Maturing within 16 days
    tenureMonths: 36,
    status: "renewal_pending",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "MATURING_SOON",
    purpose: "security_deposit",
    instrumentCategory: "Campus Establishment Security Deposit",
    department: "Electronics & Communication",
    contactPerson: "Dr. Radhika Rao (Dean)",
    contactPhone: "+91 832 258 0101",
    contactEmail: "dean@goa.bits-pilani.ac.in",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    assignedReviewer: "Anil Verma (Scrutiny Officer)",
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 99.1,
    documentsList: [
      {
        id: "doc-005",
        name: "BITS_FDR_HDFC_1Cr.pdf",
        type: "application/pdf",
        size: "4.1 MB",
        hash: "d99a298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b331",
        scanStatus: "CLEAN",
        uploadedAt: "2023-11-16T12:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-010",
        event: "Electronic Submission",
        actor: "Dr. Radhika Rao",
        timestamp: "2023-11-16T12:00:00Z",
        remarks: "Submitted.",
        type: "submission",
      },
      {
        id: "ev-011",
        event: "30-Day Maturity Warning Dispatched",
        actor: "System Sentinel",
        timestamp: "2026-10-13T00:00:00Z",
        remarks: "FDR matures on 12 Nov 2026. Renewal request initiated by institution.",
        type: "system",
      },
    ],
    createdAt: "2023-11-16T12:00:00Z",
    updatedAt: "2026-10-15T10:00:00Z",
  },
  {
    id: "fdr-006",
    fdrNumber: "FDR/AICTE/2026/043",
    institutionId: "inst-002",
    institutionName: "BITS Pilani — Goa Campus",
    institutionCode: "AICTE-WZ-00891",
    depositorName: "BITS Pilani — Goa Campus",
    depositorId: "inst-002",
    bankName: "State Bank of India",
    bankBranch: "Sancoale, Goa",
    accountNumber: "39201928374",
    ifscCode: "SBIN0010720",
    principalAmount: 1_00_00_000,
    interestRate: 7.25,
    maturityAmount: 1_07_25_000,
    issueDate: "2024-01-10",
    depositDate: "2024-01-10T00:00:00Z",
    maturityDate: "2027-01-10T00:00:00Z",
    tenureMonths: 36,
    status: "active",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "ACTIVE_LIEN",
    purpose: "security_deposit",
    instrumentCategory: "Joint Security Deposit with AICTE",
    department: "Chemical Engineering",
    contactPerson: "Dr. Radhika Rao (Dean)",
    contactPhone: "+91 832 258 0101",
    contactEmail: "dean@goa.bits-pilani.ac.in",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 97.5,
    documentsList: [
      {
        id: "doc-006",
        name: "SBI_1Cr_Certificate.pdf",
        type: "application/pdf",
        size: "3.5 MB",
        hash: "e77b298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b800",
        scanStatus: "CLEAN",
        uploadedAt: "2024-01-11T14:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-012",
        event: "Lien Endorsed",
        actor: "SBI Core Banking Gateway",
        timestamp: "2024-01-15T16:00:00Z",
        remarks: "Joint lien confirmed.",
        type: "lien",
      },
    ],
    createdAt: "2024-01-11T14:00:00Z",
    updatedAt: "2024-01-15T16:00:00Z",
  },

  // ── PSG Tech (inst-003) records ──
  {
    id: "fdr-007",
    fdrNumber: "FDR/AICTE/2026/115",
    institutionId: "inst-003",
    institutionName: "PSG College of Technology, Coimbatore",
    institutionCode: "AICTE-SZ-00456",
    depositorName: "PSG College of Technology, Coimbatore",
    depositorId: "inst-003",
    bankName: "Punjab National Bank",
    bankBranch: "Peelamedu, Coimbatore",
    accountNumber: "19283746501",
    ifscCode: "PUNB0034100",
    principalAmount: 75_00_000,
    interestRate: 7.2,
    maturityAmount: 80_40_000,
    issueDate: "2024-08-01",
    depositDate: "2024-08-01T00:00:00Z",
    maturityDate: "2027-08-01T00:00:00Z",
    tenureMonths: 36,
    status: "active",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "ACTIVE_LIEN",
    purpose: "security_deposit",
    instrumentCategory: "Autonomous Intake Guarantee Deposit",
    department: "Robotics & Automation",
    contactPerson: "Dr. K. Prakasan (Principal)",
    contactPhone: "+91 422 257 2177",
    contactEmail: "principal@psgtech.edu",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 98.7,
    documentsList: [
      {
        id: "doc-007",
        name: "PNB_75L_PSGTech.pdf",
        type: "application/pdf",
        size: "2.9 MB",
        hash: "f11a298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999",
        scanStatus: "CLEAN",
        uploadedAt: "2024-08-02T10:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-013",
        event: "Verified & Active",
        actor: "Anil Verma",
        timestamp: "2024-08-05T15:00:00Z",
        remarks: "Verification complete.",
        type: "scrutiny",
      },
    ],
    createdAt: "2024-08-02T10:00:00Z",
    updatedAt: "2024-08-05T15:00:00Z",
  },
  {
    id: "fdr-008",
    fdrNumber: "FDR/AICTE/2026/116",
    institutionId: "inst-003",
    institutionName: "PSG College of Technology, Coimbatore",
    institutionCode: "AICTE-SZ-00456",
    depositorName: "PSG College of Technology, Coimbatore",
    depositorId: "inst-003",
    bankName: "Canara Bank",
    bankBranch: "Avinashi Road, Coimbatore",
    accountNumber: "09281726354",
    ifscCode: "CNRB0001092",
    principalAmount: 50_00_000,
    interestRate: 7.15,
    maturityAmount: 53_57_500,
    issueDate: "2021-09-01",
    depositDate: "2021-09-01T00:00:00Z",
    maturityDate: "2026-09-01T00:00:00Z",
    tenureMonths: 60,
    status: "release_pending",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "RELEASE_REQUESTED",
    purpose: "security_deposit",
    instrumentCategory: "Discontinued Course Guarantee Deposit",
    department: "Automobile Engineering Division (Discontinued Program)",
    contactPerson: "Dr. K. Prakasan (Principal)",
    contactPhone: "+91 422 257 2177",
    contactEmail: "principal@psgtech.edu",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    assignedReviewer: "Anil Verma (Scrutiny Officer)",
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 99.4,
    documentsList: [
      {
        id: "doc-008",
        name: "Canara_Bank_FDR_50L.pdf",
        type: "application/pdf",
        size: "3.1 MB",
        hash: "c22a298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b123",
        scanStatus: "CLEAN",
        uploadedAt: "2021-09-02T11:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-014",
        event: "Release Application Submitted",
        actor: "Dr. K. Prakasan",
        timestamp: "2026-09-20T17:00:00Z",
        remarks: "Submitted formal NOC & release dossier following course closure.",
        type: "release",
      },
    ],
    createdAt: "2021-09-02T11:00:00Z",
    updatedAt: "2026-09-20T17:00:00Z",
  },

  // ── Manipal (inst-004) records ──
  {
    id: "fdr-009",
    fdrNumber: "FDR/AICTE/2026/077",
    institutionId: "inst-004",
    institutionName: "Manipal Institute of Technology",
    institutionCode: "AICTE-SW-00712",
    depositorName: "Manipal Institute of Technology",
    depositorId: "inst-004",
    bankName: "Bank of Baroda",
    bankBranch: "Tiger Circle, Manipal",
    accountNumber: "28192837465",
    ifscCode: "BARB0MANIPA",
    principalAmount: 35_00_000,
    interestRate: 7.3,
    maturityAmount: 37_55_500,
    issueDate: "2024-04-12",
    depositDate: "2024-04-12T00:00:00Z",
    maturityDate: "2027-04-12T00:00:00Z",
    tenureMonths: 36,
    status: "active",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "ACTIVE_LIEN",
    purpose: "security_deposit",
    instrumentCategory: "Security Deposit for Establishment",
    department: "Biomedical Engineering",
    contactPerson: "Dr. C. S. Rao (Director)",
    contactPhone: "+91 820 292 4000",
    contactEmail: "director.mit@manipal.edu",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 95.9,
    documentsList: [
      {
        id: "doc-009",
        name: "BOB_35L_FDR.pdf",
        type: "application/pdf",
        size: "2.3 MB",
        hash: "b77c298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b777",
        scanStatus: "CLEAN",
        uploadedAt: "2024-04-13T09:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-015",
        event: "Active & Verified",
        actor: "Anil Verma",
        timestamp: "2024-04-18T12:00:00Z",
        remarks: "Verified against AICTE deposit norms.",
        type: "scrutiny",
      },
    ],
    createdAt: "2024-04-13T09:00:00Z",
    updatedAt: "2024-04-18T12:00:00Z",
  },
  {
    id: "fdr-010",
    fdrNumber: "FDR/AICTE/2026/079",
    institutionId: "inst-004",
    institutionName: "Manipal Institute of Technology",
    institutionCode: "AICTE-SW-00712",
    depositorName: "Manipal Institute of Technology",
    depositorId: "inst-004",
    bankName: "ICICI Bank Ltd",
    bankBranch: "Udupi Main",
    accountNumber: "019283746501",
    ifscCode: "ICIC0000192",
    principalAmount: 65_00_000,
    interestRate: 7.2,
    maturityAmount: 69_68_000,
    issueDate: "2024-05-18",
    depositDate: "2024-05-18T00:00:00Z",
    maturityDate: "2026-11-28T00:00:00Z", // Maturing within 32 days
    tenureMonths: 30,
    status: "active",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "MATURING_SOON",
    purpose: "security_deposit",
    instrumentCategory: "Aeronautical Intake Guarantee Deposit",
    department: "Aeronautical Sciences",
    contactPerson: "Dr. C. S. Rao (Director)",
    contactPhone: "+91 820 292 4000",
    contactEmail: "director.mit@manipal.edu",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 96.2,
    documentsList: [
      {
        id: "doc-010",
        name: "ICICI_65L_FDR.pdf",
        type: "application/pdf",
        size: "3.7 MB",
        hash: "e88b298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b888",
        scanStatus: "CLEAN",
        uploadedAt: "2024-05-19T10:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-016",
        event: "Automated Renewal Reminder",
        actor: "System Sentinel",
        timestamp: "2026-10-25T00:00:00Z",
        remarks: "Maturity due on 28 Nov 2026. Reminder alert sent to institution.",
        type: "system",
      },
    ],
    createdAt: "2024-05-19T10:00:00Z",
    updatedAt: "2024-05-22T14:00:00Z",
  },

  // ── COEP (inst-005) records ──
  {
    id: "fdr-011",
    fdrNumber: "FDR/AICTE/2026/055",
    institutionId: "inst-005",
    institutionName: "College of Engineering Pune (COEP)",
    institutionCode: "AICTE-WZ-00201",
    depositorName: "College of Engineering Pune (COEP)",
    depositorId: "inst-005",
    bankName: "State Bank of India",
    bankBranch: "Shivajinagar, Pune",
    accountNumber: "38192837465",
    ifscCode: "SBIN0001110",
    principalAmount: 1_00_00_000,
    interestRate: 7.35,
    maturityAmount: 1_07_35_000,
    issueDate: "2024-02-10",
    depositDate: "2024-02-10T00:00:00Z",
    maturityDate: "2027-02-10T00:00:00Z",
    tenureMonths: 36,
    status: "active",
    submissionStatus: "SUBMITTED",
    verificationStatus: "VERIFIED",
    lifecycleStatus: "ACTIVE_LIEN",
    purpose: "security_deposit",
    instrumentCategory: "Security Deposit for Establishment",
    department: "Instrumentation & Control",
    contactPerson: "Prof. D. N. Sonawane (Registrar)",
    contactPhone: "+91 20 2550 7000",
    contactEmail: "registrar@coep.ac.in",
    lienConfirmedInCBS: true,
    observationsCount: 0,
    scrutinyStatus: "SCRUTINY_PASSED",
    ocrConfidence: 98.2,
    documentsList: [
      {
        id: "doc-011",
        name: "SBI_COEP_1Cr_FDR.pdf",
        type: "application/pdf",
        size: "3.4 MB",
        hash: "a11b298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b111",
        scanStatus: "CLEAN",
        uploadedAt: "2024-02-11T12:00:00Z",
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: "ev-017",
        event: "Active & Lien Endorsed",
        actor: "Anil Verma",
        timestamp: "2024-02-15T15:00:00Z",
        remarks: "Joint lien confirmed.",
        type: "lien",
      },
    ],
    createdAt: "2024-02-11T12:00:00Z",
    updatedAt: "2024-02-15T15:00:00Z",
  },
];

// ─── 3. OBSERVATIONS ──────────────────────────────────────────────
export const CENTRAL_OBSERVATIONS: ScrutinyObservation[] = [
  {
    id: "obs-001",
    fdrId: "fdr-002",
    officerName: "Anil Verma (Scrutiny Officer)",
    date: "2026-09-14T11:20:00Z",
    category: "LIEN_UNVERIFIED",
    observation: "Issuing branch IFSC (PUNB0123400) confirmation letter does not bear the branch manager's digital verification token. Please upload revised bank confirmation.",
    status: "OPEN",
  },
];

// ─── 4. RELEASE & APPROVAL CASES ──────────────────────────────────
export const CENTRAL_APPROVAL_CASES: ReleaseApprovalCase[] = [
  {
    id: "appr-001",
    fdrId: "fdr-008",
    fdrNumber: "FDR/AICTE/2026/116",
    institutionId: "inst-003",
    institutionName: "PSG College of Technology, Coimbatore",
    bankName: "Canara Bank",
    principalAmount: 50_00_000,
    requestType: "FULL_RELEASE",
    requestedDate: "2026-09-20T17:00:00Z",
    status: "PENDING_APPROVAL",
    scrutinyFinding: "Discontinued program (Automobile Engineering) completed 5-year statutory lock-in. No pending student grievances or regulatory dues reported by Southern Regional Office. Core branch lien release recommended.",
    scrutinyOfficer: "Anil Verma (Senior Scrutiny Officer)",
    scrutinyDate: "2026-09-25T14:30:00Z",
    supportingDocuments: [
      { name: "Original_FDR_CanaraBank_Certificate.pdf", size: "2.4 MB", status: "VERIFIED" },
      { name: "SRO_No_Dues_Clearance_Certificate.pdf", size: "1.1 MB", status: "VERIFIED" },
      { name: "Executive_Council_Resolution_Closure.pdf", size: "3.8 MB", status: "VERIFIED" },
    ],
    previousDecisions: [
      {
        stage: "Institutional Application",
        officer: "Principal, PSG Tech",
        decision: "SUBMITTED",
        timestamp: "2026-09-20 17:00",
        remarks: "Submitted formal request for security deposit refund after batch exit.",
      },
      {
        stage: "Technical Scrutiny",
        officer: "Anil Verma (Scrutiny Officer)",
        decision: "RECOMMENDED_FOR_APPROVAL",
        timestamp: "2026-09-25 14:30",
        remarks: "All statutory criteria satisfied under AICTE Approval Process Handbook (APH) Clause 11.2.",
      },
    ],
    decisionReasonRequired: true,
  },
  {
    id: "appr-002",
    fdrId: "fdr-005",
    fdrNumber: "FDR/AICTE/2026/042",
    institutionId: "inst-002",
    institutionName: "BITS Pilani — Goa Campus",
    bankName: "HDFC Bank Ltd",
    principalAmount: 1_00_00_000,
    requestType: "FULL_RELEASE",
    requestedDate: "2026-10-15T10:00:00Z",
    status: "PENDING_APPROVAL",
    scrutinyFinding: "Tenure rollover request to renew for an additional 3 years at revised interest rate 7.45% per annum. Replacement certificate lien validated in Core Banking System.",
    scrutinyOfficer: "Anil Verma (Senior Scrutiny Officer)",
    scrutinyDate: "2026-10-18T16:00:00Z",
    supportingDocuments: [
      { name: "HDFC_Lien_Rollover_Letter_VascoBranch.pdf", size: "1.8 MB", status: "VERIFIED" },
      { name: "BITS_Registrar_Declaration_Form.pdf", size: "940 KB", status: "VERIFIED" },
    ],
    previousDecisions: [
      {
        stage: "Renewal Application",
        officer: "Director, BITS Pilani Goa",
        decision: "SUBMITTED",
        timestamp: "2026-10-15 10:00",
        remarks: "Extension of security deposit lien in favor of Member Secretary, AICTE.",
      },
      {
        stage: "Technical Scrutiny",
        officer: "Anil Verma (Scrutiny Officer)",
        decision: "RECOMMENDED_FOR_APPROVAL",
        timestamp: "2026-10-18 16:00",
        remarks: "Continuous lien verified; recommend approving deposit extension voucher.",
      },
    ],
    decisionReasonRequired: true,
  },
];

// ─── 5. DEMO USERS ────────────────────────────────────────────────
export const CENTRAL_DEMO_USERS: Record<string, User> = {
  institution: {
    id: "usr-inst-01",
    name: "Dr. Rajesh Sharma",
    email: "registrar@dtu.ac.in",
    role: "institution_representative",
    institutionId: "inst-001",
    institutionName: "Delhi Technological University (DTU)",
    department: "Administration / Finance Office",
    designation: "Registrar & Authorized Signatory",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2026-10-27T00:00:00Z",
  },
  officer: {
    id: "usr-off-01",
    name: "Anil Verma",
    email: "officer@aicte.gov.in",
    role: "scrutiny_officer",
    department: "AICTE Regulation Bureau (Technical Scrutiny Cell)",
    designation: "Senior Scrutiny Officer",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2026-10-27T00:00:00Z",
  },
  approver: {
    id: "usr-appr-01",
    name: "Dr. Abhay Jere",
    email: "approver@aicte.gov.in",
    role: "approving_authority",
    department: "AICTE Regulation Bureau",
    designation: "Member Secretary / Financial Approving Authority",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2026-10-27T00:00:00Z",
  },
  admin: {
    id: "usr-adm-01",
    name: "Suresh Sharma",
    email: "admin@aicte.gov.in",
    role: "admin",
    department: "AICTE IT & Governance Wing",
    designation: "Lead Portal System Administrator (No Financial Sign-Off)",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2026-10-27T00:00:00Z",
  },
};

// ─── 6. DYNAMIC DERIVATION HELPERS ─────────────────────────────────

/**
 * Derives statistical totals strictly for a specific institution.
 */
export function getInstitutionStats(institutionId: string) {
  const records = CENTRAL_FDR_RECORDS.filter((r) => r.institutionId === institutionId);
  const now = new Date();
  const in60d = new Date(now.getTime() + 60 * 86400000);

  const totalInstruments = records.length;
  const draftSubmissions = records.filter((r) => r.status === "draft").length;
  const awaitingScrutiny = records.filter((r) => r.status === "submitted").length;
  const requiringInfo = records.filter(
    (r) => r.status === "under_review" || r.scrutinyStatus === "OBSERVATION_ISSUED"
  ).length;

  const upcomingMaturities = records.filter((r) => {
    const mat = new Date(r.maturityDate);
    return mat >= now && mat <= in60d;
  }).length;

  const renewalRequests = records.filter((r) => r.status === "renewal_pending").length;
  const releaseRequests = records.filter((r) => r.status === "release_pending").length;

  const totalPrincipalPledged = records
    .filter((r) => r.status !== "draft" && r.status !== "rejected")
    .reduce((acc, r) => acc + r.principalAmount, 0);

  return {
    totalInstruments,
    draftSubmissions,
    awaitingScrutiny,
    requiringInfo,
    upcomingMaturities,
    renewalRequests,
    releaseRequests,
    totalPrincipalPledged,
    records,
  };
}

/**
 * Derives statistical totals portfolio-wide across all institutions.
 */
export function getPortfolioStats() {
  const records = CENTRAL_FDR_RECORDS;
  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 86400000);

  const totalInstruments = records.length;
  const totalPrincipalValue = records.reduce((acc, r) => acc + r.principalAmount, 0);

  const pendingScrutinyCases = records.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  ).length;

  const unresolvedDiscrepancies = records.filter(
    (r) => r.scrutinyStatus === "DISCREPANCY_FLAGGED" || r.scrutinyStatus === "OBSERVATION_ISSUED"
  ).length;

  const upcomingMaturities = records.filter((r) => {
    const mat = new Date(r.maturityDate);
    return mat >= now && mat <= in30d;
  }).length;

  const expiredRequiringAttention = records.filter((r) => {
    const mat = new Date(r.maturityDate);
    return mat < now && r.status === "active";
  }).length;

  const pendingReleaseRefundRequests = records.filter(
    (r) => r.status === "release_pending"
  ).length;

  return {
    totalInstruments,
    totalPrincipalValue,
    pendingScrutinyCases,
    unresolvedDiscrepancies,
    upcomingMaturities,
    expiredRequiringAttention,
    pendingReleaseRefundRequests,
  };
}

/**
 * Retrieves the Scrutiny Officer verification queue.
 */
export function getScrutinyQueue() {
  return CENTRAL_FDR_RECORDS.filter(
    (r) =>
      r.status === "submitted" ||
      r.status === "under_review" ||
      r.scrutinyStatus === "OBSERVATION_ISSUED"
  );
}

/**
 * Retrieves the Approving Authority decision queue.
 */
export function getApprovalCases() {
  return CENTRAL_APPROVAL_CASES;
}

/**
 * Look up a specific FDR record by its internal UUID id or FDR number.
 */
export function getFDRById(id: string): CentralFDRRecord | undefined {
  return CENTRAL_FDR_RECORDS.find(
    (r) => r.id === id || r.fdrNumber.toLowerCase() === id.toLowerCase()
  );
}

/**
 * Creates and registers a new FDR record into the central registry.
 * Generates an internal UUID (non-user-provided), sets up documents,
 * audit trail, and computes maturity value.
 */
export function createFDRRecord(payload: Partial<CentralFDRRecord>): CentralFDRRecord {
  const newId = `fdr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const issueDate = payload.issueDate || now.split("T")[0];
  const maturityDate = payload.maturityDate || new Date(Date.now() + 365 * 86400000).toISOString();
  const principal = Number(payload.principalAmount) || 10_00_000;
  const rate = Number(payload.interestRate) || 7.0;
  const tenureMonths = payload.tenureMonths || 12;
  const computedMaturity = payload.maturityAmount || Math.round(principal + (principal * rate * (tenureMonths / 12)) / 100);

  const isDraft = payload.submissionStatus === "DRAFT";

  const newRecord: CentralFDRRecord = {
    id: newId,
    fdrNumber: payload.fdrNumber || `FDR/AICTE/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
    institutionId: payload.institutionId || "inst-001",
    institutionName: payload.institutionName || "Delhi Technological University (DTU)",
    institutionCode: payload.institutionCode || "AICTE-NZ-00142",
    depositorName: payload.depositorName || payload.institutionName || "Delhi Technological University (DTU)",
    depositorId: payload.institutionId || "inst-001",
    bankName: payload.bankName || "State Bank of India",
    bankBranch: payload.bankBranch || "Main Branch",
    accountNumber: payload.accountNumber || "38910000000",
    ifscCode: (payload.ifscCode || "SBIN0000001").toUpperCase(),
    principalAmount: principal,
    interestRate: rate,
    maturityAmount: computedMaturity,
    issueDate,
    depositDate: `${issueDate}T00:00:00Z`,
    maturityDate: maturityDate.includes("T") ? maturityDate : `${maturityDate}T00:00:00Z`,
    tenureMonths,
    status: isDraft ? "draft" : "submitted",
    submissionStatus: isDraft ? "DRAFT" : "SUBMITTED",
    verificationStatus: isDraft ? "NOT_STARTED" : "PENDING_REVIEW",
    lifecycleStatus: "LODGED",
    purpose: payload.purpose || "security_deposit",
    instrumentCategory: payload.instrumentCategory || "Establishment Security Deposit",
    department: payload.department || "General Engineering",
    contactPerson: payload.contactPerson || "Registrar Office",
    contactPhone: payload.contactPhone || "+91 98110 00000",
    contactEmail: payload.contactEmail || "registrar@institution.edu.in",
    lienConfirmedInCBS: false,
    observationsCount: 0,
    scrutinyStatus: "PENDING_SCRUTINY",
    ocrConfidence: isDraft ? 0 : 97.2,
    documentsList: payload.documentsList && payload.documentsList.length > 0 ? payload.documentsList : [
      {
        id: `doc-${Date.now()}-1`,
        name: `${(payload.bankName || "Bank").replace(/\s+/g, "_")}_FDR_Certificate_Scan.pdf`,
        type: "application/pdf",
        size: "2.8 MB",
        hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        scanStatus: "CLEAN",
        uploadedAt: now,
        documentType: "fdr_certificate",
      },
    ],
    lifecycleEvents: [
      {
        id: `ev-${Date.now()}-1`,
        event: isDraft ? "FDR Saved as Draft" : "Electronic FDR Submission",
        actor: payload.contactPerson || payload.depositorName || "Authorized Institution Representative",
        timestamp: now,
        remarks: isDraft
          ? "FDR details saved in draft registry. Pending final review and submission."
          : "FDR submitted for AICTE regulatory scrutiny and bank lien endorsement.",
        type: "submission",
      },
      ...(!isDraft
        ? [
            {
              id: `ev-${Date.now()}-2`,
              event: "Automated Document Security Check",
              actor: "System Sentinel",
              timestamp: now,
              remarks: "Antivirus scanner cleared file payload. Cryptographic SHA-256 registered.",
              type: "system" as const,
            },
          ]
        : []),
    ],
    createdAt: now,
    updatedAt: now,
  };

  CENTRAL_FDR_RECORDS.unshift(newRecord);
  return newRecord;
}

/**
 * Updates an existing FDR record in memory.
 */
export function updateFDRRecord(id: string, updates: Partial<CentralFDRRecord>): CentralFDRRecord | undefined {
  const index = CENTRAL_FDR_RECORDS.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  CENTRAL_FDR_RECORDS[index] = {
    ...CENTRAL_FDR_RECORDS[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return CENTRAL_FDR_RECORDS[index];
}

