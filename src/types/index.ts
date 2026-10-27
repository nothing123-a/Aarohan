// ─── Auth & User Types ─────────────────────────────────────────────
export type UserRole =
  | "institution_representative"
  | "scrutiny_officer"
  | "approving_authority"
  | "admin"
  | "officer"
  | "verifier"
  | "depositor";

export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId?: string;
  institutionName?: string;
  department?: string;
  designation?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Fixed Deposit Receipt (FDR) Types ────────────────────────────
export type FDRStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "verified"
  | "active"
  | "matured"
  | "renewal_pending"
  | "renewal_approved"
  | "release_pending"
  | "release_approved"
  | "released"
  | "rejected"
  | "cancelled";

export type FDRPurpose =
  | "security_deposit"
  | "earnest_money"
  | "performance_guarantee"
  | "bid_security"
  | "advance_payment_guarantee"
  | "other";

export interface FDR {
  id: string;
  fdrNumber: string;
  depositorName: string;
  depositorId: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  principalAmount: number;
  interestRate: number;
  maturityAmount: number;
  depositDate: string;
  maturityDate: string;
  tenureMonths: number;
  purpose: FDRPurpose;
  contractNumber?: string;
  projectName?: string;
  department: string;
  status: FDRStatus;
  submittedBy: string;
  verifiedBy?: string;
  approvedBy?: string;
  remarks?: string;
  documents: FDRDocument[];
  history: FDRHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FDRDocument {
  id: string;
  fdrId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  documentType: "fdr_certificate" | "bank_letter" | "contract" | "identity_proof" | "other";
  uploadedBy: string;
  uploadedAt: string;
}

export interface FDRHistoryEntry {
  id: string;
  fdrId: string;
  action: string;
  fromStatus: FDRStatus;
  toStatus: FDRStatus;
  performedBy: string;
  performedByName: string;
  remarks?: string;
  timestamp: string;
}

// ─── Security Deposit Types ────────────────────────────────────────
export type SecurityDepositStatus =
  | "active"
  | "maturity_due"
  | "renewal_requested"
  | "renewal_approved"
  | "release_requested"
  | "release_approved"
  | "released"
  | "replaced"
  | "forfeited";

export interface SecurityDeposit {
  id: string;
  depositNumber: string;
  contractorName: string;
  contractorId: string;
  contractNumber: string;
  projectName: string;
  department: string;
  depositAmount: number;
  fdrIds: string[];
  fdrs: FDR[];
  status: SecurityDepositStatus;
  startDate: string;
  endDate: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Request / Workflow Types ─────────────────────────────────────
export type RequestType = "submission" | "renewal" | "replacement" | "release";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface WorkflowRequest {
  id: string;
  requestNumber: string;
  requestType: RequestType;
  fdrId: string;
  fdr: FDR;
  requestedBy: string;
  requestedByName: string;
  assignedTo?: string;
  status: RequestStatus;
  reason: string;
  remarks?: string;
  attachments: FDRDocument[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ─── Dashboard / Analytics Types ──────────────────────────────────
export interface DashboardStats {
  totalFDRs: number;
  activeFDRs: number;
  maturingIn30Days: number;
  maturingIn7Days: number;
  pendingVerification: number;
  pendingRelease: number;
  totalDepositValue: number;
  totalMaturityValue: number;
}

// ─── API Response Types ───────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Notification Types ───────────────────────────────────────────
export type NotificationType = "info" | "warning" | "success" | "error";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: "fdr" | "security_deposit" | "request";
  createdAt: string;
}
